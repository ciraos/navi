#!/usr/bin/env node
/**
 * 开发启动器：
 * - 端口空闲时先清空 .next，再启动 next dev
 * - 启动成功后自动打开 http://localhost:3000
 * - 端口已被占用时视为已在运行，直接退出（不重复清缓存、不重复开页面）
 *
 * 可用环境变量：
 *   NAVI_DEV_PORT=3000   指定端口
 *   NAVI_NO_OPEN=1       不自动打开浏览器
 *   NAVI_KEEP_CACHE=1    保留 .next 缓存
 */
import { existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.NAVI_DEV_PORT ?? "3000";
const url = `http://localhost:${port}`;

async function isRunning() {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(1200),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

if (await isRunning()) {
  console.log(`[dev] ${url} 已在运行，直接复用（跳过清缓存与打开页面）`);
  process.exit(0);
}

if (process.env.NAVI_KEEP_CACHE === "1") {
  console.log("[dev] NAVI_KEEP_CACHE=1，保留 .next 缓存");
} else if (existsSync(path.join(root, ".next"))) {
  rmSync(path.join(root, ".next"), { recursive: true, force: true });
  console.log("[dev] 已清空 .next 缓存");
}

const child = spawn(
  process.execPath,
  [path.join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", port],
  { cwd: root, stdio: "inherit" },
);

function openBrowser() {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const opener = spawn(command, args, { detached: true, stdio: "ignore" });
  opener.unref();
  console.log(`[dev] 已在浏览器打开 ${url}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await isRunning()) {
      if (process.env.NAVI_NO_OPEN !== "1") openBrowser();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.warn(`[dev] 等待 ${url} 超时，请查看上方 next dev 的输出`);
}

void waitForServer();

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
