import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "gki-lkm-patcher";
const PKG_NAME = "gki_lkm_patcher";
const toolDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(toolDir, "pkg");
const outDir = resolve(toolDir, "../../src/wasm", NAME);
const wasmPack = process.platform === "win32" ? "wasm-pack.exe" : "wasm-pack";

rmSync(pkgDir, { recursive: true, force: true });

// Apple's ar drops the symbol index of wasm objects; use the LLVM archiver bundled with Rust.
const env = { ...process.env };
if (process.platform === "darwin" && !env.AR_wasm32_unknown_unknown) {
  const sysroot = spawnSync("rustc", ["--print", "sysroot"], { encoding: "utf8" }).stdout.trim();
  const rustlib = resolve(sysroot, "lib/rustlib");
  const host = existsSync(rustlib) ? readdirSync(rustlib).find((d) => existsSync(resolve(rustlib, d, "bin/llvm-ar"))) : undefined;
  if (host) env.AR_wasm32_unknown_unknown = resolve(rustlib, host, "bin/llvm-ar");
}

const build = spawnSync(
  wasmPack,
  ["build", toolDir, "--target", "bundler", "--release", "--out-dir", "pkg"],
  { stdio: "inherit", env },
);

if (build.status !== 0) process.exit(build.status ?? 1);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const f of [`${PKG_NAME}.js`, `${PKG_NAME}_bg.js`, `${PKG_NAME}_bg.wasm`]) {
  copyFileSync(resolve(pkgDir, f), resolve(outDir, f));
}
console.log(`bundler pkg written to ${outDir}`);
