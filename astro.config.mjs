import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "static",
  site: "https://blog.js.gripe",
  outDir: "./public",
  publicDir: "./static",
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith("/404.html")
    })
  ]
});
