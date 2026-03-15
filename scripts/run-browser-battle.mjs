/**
 * Run a battle in the browser (for full-stack / visual verification).
 *
 *   --visible   Show the browser window so you can watch the battle.
 *   (default)   Headless browser: real renderer (WebGL), no window, captures console.
 *
 * For fast Node-only runs use: npm run test:headless
 *
 * First-time setup: npx playwright install chromium
 *
 * Usage:
 *   npm run test:browser              # headless browser
 *   npm run test:browser -- --visible # visible browser (watch it run)
 *   node scripts/run-browser-battle.mjs --no-start-server  # server already running
 */
import { spawn } from "child_process";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOG_PATH = resolve(ROOT, "audit/demo-battle.log");
const DEFAULT_PORT = 5173;
const BATTLE_TIMEOUT_MS = 120_000;
const SERVER_READY_TIMEOUT_MS = 15_000;

const args = process.argv.slice(2);
const noStartServer = args.includes("--no-start-server");
const visible = args.includes("--visible");

const logLines = [];
function add(level, ...parts) {
  const line = `[${new Date().toISOString()}] [${level}] ${parts.map(String).join(" ")}`;
  logLines.push(line);
  console.log(line);
}

function getBaseUrl(port) {
  return `http://localhost:${port}/itactics`;
}

async function waitForServer(port) {
  const baseUrl = getBaseUrl(port);
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const r = await fetch(baseUrl + "/", { redirect: "follow" });
      if (r.ok || r.status === 304) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Parse port from Vite server output line like "➜  Local:   http://localhost:5174/itactics/" */
function parsePortFromServerLine(line) {
  const m = line.match(/localhost:(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  let serverProc = null;
  let port = DEFAULT_PORT;

  if (!noStartServer) {
    add("INFO", "Starting Vite dev server...");
    serverProc = spawn("npm", ["run", "dev"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    serverProc.stdout?.on("data", (d) => {
      const text = d.toString();
      add("SERVER", text.trim());
      const parsed = parsePortFromServerLine(text);
      if (parsed != null) port = parsed;
    });
    serverProc.stderr?.on("data", (d) => {
      const text = d.toString();
      add("SERVER", text.trim());
      const parsed = parsePortFromServerLine(text);
      if (parsed != null) port = parsed;
    });
    await new Promise((r) => setTimeout(r, 2000));
    const ready = await waitForServer(port);
    if (!ready) {
      add("ERROR", "Dev server did not become ready in time. Try running 'npm run dev' in another terminal, then: node scripts/run-browser-battle.mjs --no-start-server");
      if (serverProc) serverProc.kill();
      process.exit(1);
    }
    add("INFO", "Dev server ready on port", port);
  }

  const battleUrl = `${getBaseUrl(port)}/?demoBattle=1&auto=1${visible ? "&visible=1" : ""}`;

  let exitCode = 0;
  try {
    const { chromium } = await import("playwright");

    if (visible) add("INFO", "Launching visible browser (window will open)...");

    const browser = await chromium.launch({
      headless: !visible,
      args: [
        "--use-gl=swiftshader",
        "--use-angle=swiftshader",
        "--enable-features=WebGL",
        "--ignore-gpu-blocklist",
      ],
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleEntries = [];
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      const loc = msg.location();
      const entry = { type, text, url: loc?.url ?? "", line: loc?.lineNumber ?? 0 };
      consoleEntries.push(entry);
      add("CONSOLE", `[${type}] ${text}`);
    });
    page.on("pageerror", (err) => {
      consoleEntries.push({ type: "error", text: err.message + "\n" + err.stack, url: "", line: 0 });
      add("PAGE_ERROR", err.message);
      exitCode = 1;
    });

    add("INFO", "Navigating to", battleUrl);
    await page.goto(battleUrl, { waitUntil: "networkidle", timeout: 15_000 });

    try {
      const speedBtn = page.locator(".speed-toggle");
      await speedBtn.click();
      await speedBtn.click();
      add("INFO", "Set battle speed to 4x");
    } catch (_) {
      add("INFO", "Speed toggle not found, running at 1x");
    }

    add("INFO", "Waiting for battle to end (max", BATTLE_TIMEOUT_MS / 1000, "s)...");
    let battleEnded = false;
    const battleStart = Date.now();
    let lastLog = 0;
    while (Date.now() - battleStart < BATTLE_TIMEOUT_MS) {
      const done = await page.evaluate(() => (window).__battleEnded === true);
      if (done) {
        battleEnded = true;
        break;
      }
      const elapsed = Math.floor((Date.now() - battleStart) / 1000);
      if (elapsed >= lastLog + 15) {
        lastLog = elapsed;
        add("INFO", "Still waiting for battle to end...", elapsed, "s elapsed");
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (battleEnded) {
      const victory = await page.evaluate(() => (window).__battleVictory === true);
      add("INFO", "Battle ended. Victory:", victory);
    } else {
      add("WARN", "Battle did not end within timeout.");
      exitCode = 1;
    }

    // Prefer canonical audit log from the game (same format as headless)
    const auditLogFromPage = await page.evaluate(() => (window).__battleAuditLog || null);
    await browser.close();

    const hasErrors = consoleEntries.some((e) => e.type === "error" || e.type === "warning");
    if (hasErrors) exitCode = 1;

    const logDir = dirname(LOG_PATH);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const out = createWriteStream(LOG_PATH, "utf8");
    if (auditLogFromPage && typeof auditLogFromPage === "string") {
      out.write(auditLogFromPage);
    } else {
      out.write("# Demo battle audit log (browser fallback — no in-page log)\n\n");
      out.write(`Run at: ${new Date().toISOString()}\n`);
      out.write(`Mode: ${visible ? "browser-visible" : "browser"}\n`);
      out.write(`URL: ${battleUrl}\n`);
      out.write(`Battle ended: ${battleEnded}\n\n`);
      out.write("## Console output\n\n");
      for (const e of consoleEntries) {
        out.write(`[${e.type}] ${e.text}\n`);
        if (e.url) out.write(`  at ${e.url}:${e.line}\n`);
      }
      out.write("\n## Script log (timestamps)\n\n");
      for (const line of logLines) {
        out.write(line + "\n");
      }
    }
    out.end();
    add("INFO", "Log written to", LOG_PATH);
  } catch (err) {
    add("ERROR", err.message);
    if (err.stack) logLines.push(err.stack);
    exitCode = 1;
  } finally {
    if (serverProc) {
      serverProc.kill();
      add("INFO", "Dev server stopped.");
    }
  }
  process.exit(exitCode);
}

main();
