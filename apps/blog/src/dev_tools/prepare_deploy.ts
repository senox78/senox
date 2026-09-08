#!/usr/bin/env bun

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const blogRoot = path.resolve(import.meta.dirname, "../..");
const deploymentRoot = path.resolve(blogRoot, "../../dist");

await mkdir(deploymentRoot, { recursive: true });
for (const file of ["_headers", "_redirects", "robots.txt"]) {
  await copyFile(
    path.join(blogRoot, "public", file),
    path.join(deploymentRoot, file),
  );
}
