<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 本地开发约定

- 这是 Next.js 全栈项目：页面在 `src/app`，API 在 `src/app/api`，数据库访问在 `src/lib/db.ts`，没有独立后端进程。
- 启动项目用 `pnpm dev`：会先清空 `.next` 缓存，启动成功后自动打开 http://localhost:3000，不需要再询问。
- 如果 http://localhost:3000 已经在运行、或页面已经打开，直接复用即可，不要重启服务、不要重复打开页面。
- 需要保留缓存时用 `NAVI_KEEP_CACHE=1 pnpm dev`；`pnpm dev:fast` 是不清缓存、不自动开页面的原始 `next dev`。
- 数据库连接、JWT、站点配置都来自根目录 `.env`，改完需要重启 dev。
