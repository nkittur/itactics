import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/itactics/",
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@hex": resolve(__dirname, "src/hex"),
      "@combat": resolve(__dirname, "src/combat"),
      "@entities": resolve(__dirname, "src/entities"),
      "@data": resolve(__dirname, "src/data"),
      "@ui": resolve(__dirname, "src/ui"),
      "@rendering": resolve(__dirname, "src/rendering"),
      "@input": resolve(__dirname, "src/input"),
      "@utils": resolve(__dirname, "src/utils"),
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ["@babylonjs/core", "@babylonjs/gui", "@babylonjs/loaders"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
