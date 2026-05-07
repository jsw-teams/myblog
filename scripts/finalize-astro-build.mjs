#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const publicDir = path.resolve("public");
const generatedSitemap = path.join(publicDir, "sitemap-0.xml");
const canonicalSitemap = path.join(publicDir, "sitemap.xml");

await fs.copyFile(generatedSitemap, canonicalSitemap);
