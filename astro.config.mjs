import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://blog.js.gripe",
  outDir: "./public",
  publicDir: "./static"
});
