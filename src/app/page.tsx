"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import SiteCard from "@/components/SiteCard";
import { SiteLogo } from "@/components/SiteLogo";
import { Alert, Button, Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useLiveUpdates } from "@/lib/use-live-updates";
import type { AuthStatus, NavPayload } from "@/lib/types";

function policeFilingUrl(text: string): string {
  const code = text.match(/\d{6,}/)?.[0];
  return code
    ? `https://beian.mps.gov.cn/#/query/webSearch?code=${code}`
    : "https://beian.mps.gov.cn/";
}

function SkeletonGrid() {
  return (
    <div className="space-y-10">
      {[0, 1].map((section) => (
        <section key={section} className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-surface" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div
                key={item}
                className="h-[74px] animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [nav, setNav] = useState<NavPayload | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const current = await api.status();
        if (!alive) return;
        setStatus(current);

        // 第一次使用：跳转到引导页注册管理员
        if (!current.initialized) {
          router.replace("/setup");
          return;
        }

        const payload = await api.nav();
        if (alive) setNav(payload);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "加载失败");
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [router]);

  // 后台改动后自动同步；SSE 为主，轮询/切回页面兜底
  const refreshNav = useCallback(async () => {
    try {
      const payload = await api.nav();
      setNav(payload);
    } catch {
      // 静默失败，保留当前内容，等待下次事件或轮询
    }
  }, []);

  useLiveUpdates(refreshNav);

  // 后台改站点名称后，浏览器标题也跟着变
  useEffect(() => {
    if (nav?.site.name) document.title = nav.site.name;
  }, [nav?.site.name]);

  const categories = useMemo(() => {
    const list = nav?.categories ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return list;
    return list
      .map((category) => ({
        ...category,
        sites: category.sites.filter((site) =>
          `${site.title} ${site.description ?? ""} ${site.url}`.toLowerCase().includes(keyword),
        ),
      }))
      .filter((category) => category.sites.length > 0);
  }, [nav, query]);

  const totalSites = nav?.categories.reduce((sum, category) => sum + category.sites.length, 0) ?? 0;
  const filings = nav?.site;
  const hasFilings = Boolean(filings?.icp || filings?.police);
  const loading = !nav && !error;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <SiteLogo />
            <span className="hidden text-sm font-semibold sm:block">
              {nav?.site.name ?? "Navi 导航"}
            </span>
          </Link>

          <div className="relative max-w-sm flex-1 sm:mx-auto">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索站点…"
              aria-label="搜索站点"
              className="h-9 pl-9"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {status?.authenticated ? (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  管理后台
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  登录
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 sm:px-6">
        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {nav?.site.name ?? "Navi 导航"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {nav?.site.description ?? "把常用的站点收在一处，随时打开。"}
          </p>
          {nav ? (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{nav.categories.length} 个分类</span>
              <span aria-hidden>·</span>
              <span>{totalSites} 个站点</span>
              {query ? (
                <>
                  <span aria-hidden>·</span>
                  <span>筛选出 {categories.reduce((sum, c) => sum + c.sites.length, 0)} 个</span>
                </>
              ) : null}
            </p>
          ) : null}
        </section>

        {nav && !query && nav.categories.length > 0 ? (
          <nav
            aria-label="分类导航"
            className="mb-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {nav.categories.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
              >
                {category.icon ? <span className="mr-1">{category.icon}</span> : null}
                {category.name}
              </a>
            ))}
          </nav>
        ) : null}

        {error ? (
          <div className="space-y-3">
            <Alert>{error}</Alert>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        ) : loading ? (
          <SkeletonGrid />
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
            <p className="text-sm font-medium">
              {query ? "没有匹配的站点" : "还没有添加任何站点"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {query ? "换个关键词试试" : "登录后台，把常用站点整理进来"}
            </p>
            {!query ? (
              <Link href="/admin" className="mt-4 inline-block">
                <Button size="sm">去后台添加</Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-32 animate-fade-up"
              >
                <div className="mb-4 flex items-baseline gap-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    {category.icon ? <span aria-hidden>{category.icon}</span> : null}
                    {category.name}
                  </h2>
                  <span className="text-xs text-muted">{category.sites.length}</span>
                  {category.description ? (
                    <span className="hidden truncate text-xs text-muted/80 sm:block">
                      · {category.description}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.sites.map((site) => (
                    <SiteCard key={site.id} site={site} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              {nav?.site.name ?? "Navi 导航"} · 由 Next.js 驱动
            </span>
            <span className="flex items-center gap-1.5">
              {status?.authenticated ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  已登录 · {status.user?.email}
                </>
              ) : (
                <Link href="/login" className="transition hover:text-foreground">
                  管理员登录
                </Link>
              )}
            </span>
          </div>

          {hasFilings && filings ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-[11px] text-muted/80">
              {filings.icp ? (
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-foreground"
                >
                  {filings.icp}
                </a>
              ) : null}
              {filings.icp && filings.police ? <span aria-hidden>·</span> : null}
              {filings.police ? (
                <a
                  href={policeFilingUrl(filings.police)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-foreground"
                >
                  {filings.police}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </footer>

      {status === null && !error ? (
        <div className="pointer-events-none fixed right-4 bottom-4 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-sm">
          <Spinner /> 正在连接后端…
        </div>
      ) : null}
    </div>
  );
}
