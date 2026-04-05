#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const distDir = path.join(projectRoot, "dist");
const outDir = path.join(projectRoot, "release-artifacts", "windows-exe-only");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function newestFile(candidates) {
  return candidates
    .map((file) => ({ file, mtime: statSync(path.join(distDir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.file;
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

console.log("Building app...");
run(npmCmd, ["run", "build"]);

console.log("Building Windows setup + portable executables...");
run(npxCmd, ["electron-builder", "--win", "--x64", "--publish", "never"]);

const exeFiles = readdirSync(distDir).filter((file) => file.toLowerCase().endsWith(".exe"));
const setupExe = newestFile(exeFiles.filter((file) => /setup/i.test(file)));
const portableExe = newestFile(exeFiles.filter((file) => !/setup/i.test(file)));

if (!setupExe || !portableExe) {
  console.error("Could not find both setup and portable executables in dist/.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

copyFileSync(path.join(distDir, setupExe), path.join(outDir, setupExe));
copyFileSync(path.join(distDir, portableExe), path.join(outDir, portableExe));

console.log("\nDone. Exactly two executables are available in:");
console.log(`  ${outDir}`);
console.log(`  - ${setupExe}`);
console.log(`  - ${portableExe}`);
