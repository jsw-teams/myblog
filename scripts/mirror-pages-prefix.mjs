#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const prefix = "myblog";
const mirrorDir = path.join(publicDir, prefix);

async function copyEntry(entryName) {
  if (entryName === prefix) return;
  await fs.cp(path.join(publicDir, entryName), path.join(mirrorDir, entryName), {
    recursive: true,
    force: true,
    dereference: true
  });
}

await fs.rm(mirrorDir, { recursive: true, force: true });
await fs.mkdir(mirrorDir, { recursive: true });

const entries = await fs.readdir(publicDir);
await Promise.all(entries.map(copyEntry));

