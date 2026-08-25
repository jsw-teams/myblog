import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://blog.openjsu.com",
  outDir: "./public",
  publicDir: "./static"
});
