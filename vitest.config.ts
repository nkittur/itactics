import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
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
  test: {
    globals: true,
  },
});
