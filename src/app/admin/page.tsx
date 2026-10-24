"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { IconTile } from "@/components/SiteCard";
import { SiteLogo } from "@/components/SiteLogo";
import { Alert, Button, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AuthStatus, Category, NavPayload, Site, SiteMeta } from "@/lib/types";

// ── 小图标 ──────────────────────────────────────────────

const PATHS = {
  plus: "M12 5v14M5 12h14",
  up: "m18 15-6-6-6 6",
  down: "m6 9 6 6 6-6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
  external: "M7 17 17 7M9 7h8v8",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
} as const;

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition",
        "hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
        danger ? "hover:text-red-500" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

// ── 分类编辑弹窗 ────────────────────────────────────────

function CategoryEditor({
  category,
  nextOrder,
  onClose,
  onSaved,
}: {
  category: Category | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (message: string, selectCategoryId?: number) => Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? nextOrder));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("分类名不能为空");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: trimmed,
        icon: icon.trim() || null,
        description: description.trim() || null,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
      };
      let createdId: number | undefined;
      if (category) {
        await api.updateCategory(category.id, payload);
      } else {
        const created = await api.createCategory(payload);
        createdId = created.id;
      }
      await onSaved(category ? "分类已更新" : "分类已创建", createdId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onClose();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={category ? "编辑分类" : "新建分类"}
      description={category ? "修改后会立即反映到首页。" : "给站点建一个归类，比如「开发」「设计」。"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="分类名">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：开发工具"
            maxLength={80}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="图标" hint="emoji 或单个字符，可留空">
            <Input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="🛠️"
              maxLength={16}
            />
          </Field>
          <Field label="排序" hint="小的在前">
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="描述" hint="可选，显示在首页分类名旁边">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="写代码相关的工具与文档"
            maxLength={255}
            rows={2}
          />
        </Field>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? "保存中…" : category ? "保存修改" : "创建分类"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── 站点编辑弹窗 ────────────────────────────────────────

function SiteEditor({
  site,
  categories,
  defaultCategoryId,
  nextOrder,
  onClose,
  onSaved,
}: {
  site: Site | null;
  categories: Category[];
  defaultCategoryId: number;
  nextOrder: number;
  onClose: () => void;
  onSaved: (message: string, selectCategoryId?: number) => Promise<void>;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(
    String(site?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? ""),
  );
  const [title, setTitle] = useState(site?.title ?? "");
  const [url, setUrl] = useState(site?.url ?? "");
  const [description, setDescription] = useState(site?.description ?? "");
  const [icon, setIcon] = useState(site?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(String(site?.sort_order ?? nextOrder));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle) {
      setError("站点名不能为空");
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setError("链接需要以 http:// 或 https:// 开头");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload = {
        category_id: Number(categoryId),
        title: trimmedTitle,
        url: trimmedUrl,
        description: description.trim() || null,
        icon: icon.trim() || null,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
      };
      if (site) await api.updateSite(site.id, payload);
      else await api.createSite(payload);
      await onSaved(site ? "站点已更新" : "站点已添加", payload.category_id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onClose();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={site ? "编辑站点" : "添加站点"}
      description={site ? "改完保存即可生效。" : "填上名称和链接，图标可以留空自动生成。"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="站点名">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：GitHub"
            maxLength={120}
            required
            autoFocus
          />
        </Field>

        <Field label="链接">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com"
            inputMode="url"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="所属分类">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="排序" hint="小的在前">
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="描述" hint="可选，一句话说明这个站点">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="代码托管"
            maxLength={500}
            rows={2}
          />
        </Field>

        <Field label="图标" hint="emoji、图片 URL 或留空使用首字母">
          <div className="flex items-center gap-2">
            <IconTile site={{ title: title || "N", icon: icon.trim() || null }} />
            <Input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="🐙 或 https://…/icon.png"
              maxLength={512}
              className="flex-1"
            />
          </div>
        </Field>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? "保存中…" : site ? "保存修改" : "添加站点"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── 站点设置弹窗（备案信息）──────────────────────────────

function SiteSettingsEditor({
  site,
  onClose,
  onSaved,
}: {
  site: SiteMeta;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(site.name);
  const [icp, setIcp] = useState(site.icp ?? "");
  const [police, setPolice] = useState(site.police ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.updateSiteSettings({
        site_name: siteName.trim() || null,
        icp: icp.trim() || null,
        police: police.trim() || null,
      });
      await onSaved("备案信息已保存");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onClose();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="站点设置"
      description="站点名称和备案信息会同步到前台。"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="站点名称" hint="显示在首页标题、页头和页脚；留空使用默认名称">
          <Input
            value={siteName}
            onChange={(event) => setSiteName(event.target.value)}
            placeholder="Navi 导航"
            maxLength={80}
            autoFocus
          />
        </Field>

        <Field label="ICP 备案号" hint="例如：粤ICP备12345678号-1">
          <Input
            value={icp}
            onChange={(event) => setIcp(event.target.value)}
            placeholder="粤ICP备xxxxxxxx号"
            maxLength={120}
          />
        </Field>

        <Field label="公安备案号" hint="例如：粤公网安备 44030002000001号">
          <Input
            value={police}
            onChange={(event) => setPolice(event.target.value)}
            placeholder="粤公网安备 xxxxxxxxxx号"
            maxLength={120}
          />
        </Field>

        <p className="rounded-xl border border-border bg-surface-hover/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
          ICP 备案会链接到工信部备案系统；公安备案会自动提取其中的编号，链接到公安备案查询页。
        </p>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── 后台主页面 ──────────────────────────────────────────

type DeleteTarget =
  | { kind: "category"; category: Category }
  | { kind: "site"; site: Site };

export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [nav, setNav] = useState<NavPayload | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [categoryEditor, setCategoryEditor] = useState<{ category: Category | null } | null>(null);
  const [siteEditor, setSiteEditor] = useState<{ site: Site | null; categoryId: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 首次进入：校验登录态并拉取数据
  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const current = await api.status();
        if (!alive) return;
        if (!current.initialized) {
          router.replace("/setup");
          return;
        }
        if (!current.authenticated) {
          router.replace("/login");
          return;
        }
        setStatus(current);

        const payload = await api.nav();
        if (!alive) return;
        setNav(payload);
        setSelectedId(payload.categories[0]?.id ?? null);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "加载后台失败");
      }
    }

    void boot();
    return () => {
      alive = false;
    };
  }, [router]);

  // 操作成功后的轻提示
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (nav?.site.name) document.title = `管理后台 · ${nav.site.name}`;
  }, [nav?.site.name]);

  const refresh = useCallback(async () => {
    const payload = await api.nav();
    setNav(payload);
    setSelectedId((previous) =>
      previous !== null && payload.categories.some((category) => category.id === previous)
        ? previous
        : (payload.categories[0]?.id ?? null),
    );
  }, []);

  const categories = useMemo(() => nav?.categories ?? [], [nav]);
  const selected = useMemo(
    () => categories.find((category) => category.id === selectedId) ?? null,
    [categories, selectedId],
  );

  const totalSites = categories.reduce((sum, category) => sum + category.sites.length, 0);
  const totalClicks = categories.reduce(
    (sum, category) => sum + category.sites.reduce((value, site) => value + site.clicks, 0),
    0,
  );
  const nextCategoryOrder = categories.length
    ? Math.max(...categories.map((category) => category.sort_order)) + 10
    : 0;
  const nextSiteOrder = selected?.sites.length
    ? Math.max(...selected.sites.map((site) => site.sort_order)) + 10
    : 0;

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/login");
      return;
    }
    setError(err instanceof Error ? err.message : "操作失败");
  }

  async function mutate(action: () => Promise<string>) {
    setError(null);
    setBusy(true);
    try {
      const message = await action();
      await refresh();
      setToast(message);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  /** 按当前顺序重新编号，交换相邻两项后只把变化过的写回后端。 */
  function moveCategory(id: number, delta: number) {
    const ordered = [...categories];
    const index = ordered.findIndex((category) => category.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void mutate(async () => {
      await Promise.all(
        ordered.map((category, position) =>
          category.sort_order === position * 10
            ? Promise.resolve()
            : api.updateCategory(category.id, { sort_order: position * 10 }),
        ),
      );
      return "分类顺序已更新";
    });
  }

  function moveSite(id: number, delta: number) {
    if (!selected) return;
    const ordered = [...selected.sites];
    const index = ordered.findIndex((site) => site.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void mutate(async () => {
      await Promise.all(
        ordered.map((site, position) =>
          site.sort_order === position * 10
            ? Promise.resolve()
            : api.updateSite(site.id, { sort_order: position * 10 }),
        ),
      );
      return "站点顺序已更新";
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setBusy(true);
    try {
      if (deleteTarget.kind === "category") {
        await api.deleteCategory(deleteTarget.category.id);
        setToast("分类及其站点已删除");
      } else {
        await api.deleteSite(deleteTarget.site.id);
        setToast("站点已删除");
      }
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setDeleteTarget(null);
        router.replace("/login");
        return;
      }
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Cookie 已失效也无所谓，直接回登录页
    }
    router.replace("/login");
    router.refresh();
  }

  async function handleSaved(message: string, selectCategoryId?: number) {
    setCategoryEditor(null);
    setSiteEditor(null);
    setSettingsOpen(false);
    try {
      await refresh();
      if (selectCategoryId !== undefined) setSelectedId(selectCategoryId);
      setToast(message);
    } catch (err) {
      handleError(err);
    }
  }

  if (!status || !nav) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        {error ? (
          <div className="w-full max-w-sm space-y-3">
            <Alert>{error}</Alert>
            <Button className="w-full" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Spinner /> 正在加载后台…
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <SiteLogo />
            <span className="hidden text-sm font-semibold sm:block">管理后台</span>
          </Link>

          <span className="hidden max-w-[220px] truncate rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted md:block">
            {status.user?.email}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                查看首页
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              站点设置
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
            <p className="mt-1 text-sm text-muted">维护分类与站点，改动会立即同步到首页。</p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[260px]">
            <Stat label="分类" value={categories.length} />
            <Stat label="站点" value={totalSites} />
            <Stat label="总点击" value={totalClicks} />
          </div>
        </div>

        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <h2 className="text-sm font-semibold">分类</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCategoryEditor({ category: null })}
                >
                  <Icon d={PATHS.plus} className="h-3.5 w-3.5" />
                  新建
                </Button>
              </div>

              <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-muted">
                    还没有分类，先建一个吧
                  </p>
                ) : (
                  categories.map((category) => {
                    const active = category.id === selectedId;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedId(category.id)}
                        className={[
                          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                          active
                            ? "bg-accent/10 text-foreground"
                            : "text-muted hover:bg-surface-hover hover:text-foreground",
                        ].join(" ")}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface text-sm">
                          {category.icon || <Icon d={PATHS.folder} className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${active ? "font-semibold" : ""}`}
                        >
                          {category.name}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted">
                          {category.sites.length}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <p className="mt-2 px-2 text-[11px] leading-relaxed text-muted/70">
              分类顺序决定首页展示顺序，在上方工具栏里调整。
            </p>
          </aside>

          <section className="min-w-0">
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">
                          {selected.icon || "📁"}
                        </span>
                        <h2 className="truncate text-lg font-semibold tracking-tight">
                          {selected.name}
                        </h2>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {selected.description || "暂无描述"} · {selected.sites.length} 个站点
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <IconButton
                        label="分类上移"
                        disabled={busy || categories[0]?.id === selected.id}
                        onClick={() => moveCategory(selected.id, -1)}
                      >
                        <Icon d={PATHS.up} />
                      </IconButton>
                      <IconButton
                        label="分类下移"
                        disabled={busy || categories[categories.length - 1]?.id === selected.id}
                        onClick={() => moveCategory(selected.id, 1)}
                      >
                        <Icon d={PATHS.down} />
                      </IconButton>
                      <IconButton
                        label="编辑分类"
                        onClick={() => setCategoryEditor({ category: selected })}
                      >
                        <Icon d={PATHS.edit} />
                      </IconButton>
                      <IconButton
                        label="删除分类"
                        danger
                        disabled={busy}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget({ kind: "category", category: selected });
                        }}
                      >
                        <Icon d={PATHS.trash} />
                      </IconButton>
                      <Button
                        size="sm"
                        className="ml-1"
                        onClick={() => setSiteEditor({ site: null, categoryId: selected.id })}
                      >
                        <Icon d={PATHS.plus} className="h-3.5 w-3.5" />
                        添加站点
                      </Button>
                    </div>
                  </div>
                </div>

                {selected.sites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
                    <p className="text-sm font-medium">这个分类还没有站点</p>
                    <p className="mt-1 text-xs text-muted">添加第一个，然后就能在首页看到了。</p>
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => setSiteEditor({ site: null, categoryId: selected.id })}
                    >
                      <Icon d={PATHS.plus} className="h-3.5 w-3.5" />
                      添加站点
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.sites.map((site, index) => (
                      <div
                        key={site.id}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-accent/35"
                      >
                        <IconTile site={site} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{site.title}</span>
                            {site.description ? (
                              <span className="hidden truncate text-xs text-muted sm:inline">
                                · {site.description}
                              </span>
                            ) : null}
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 flex items-center gap-1 text-xs text-muted transition hover:text-accent"
                          >
                            <span className="truncate">{site.url}</span>
                            <Icon d={PATHS.external} className="h-3 w-3 shrink-0" />
                          </a>
                        </div>

                        <span className="hidden shrink-0 text-[11px] tabular-nums text-muted md:block">
                          {site.clicks} 点击
                        </span>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <IconButton
                            label="上移"
                            disabled={busy || index === 0}
                            onClick={() => moveSite(site.id, -1)}
                          >
                            <Icon d={PATHS.up} />
                          </IconButton>
                          <IconButton
                            label="下移"
                            disabled={busy || index === selected.sites.length - 1}
                            onClick={() => moveSite(site.id, 1)}
                          >
                            <Icon d={PATHS.down} />
                          </IconButton>
                          <IconButton
                            label="编辑站点"
                            onClick={() => setSiteEditor({ site, categoryId: site.category_id })}
                          >
                            <Icon d={PATHS.edit} />
                          </IconButton>
                          <IconButton
                            label="删除站点"
                            danger
                            disabled={busy}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({ kind: "site", site });
                            }}
                          >
                            <Icon d={PATHS.trash} />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-full min-h-[320px] place-items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
                <div>
                  <p className="text-sm font-medium">还没有任何分类</p>
                  <p className="mt-1 text-xs text-muted">先创建一个分类，再往里添加站点。</p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setCategoryEditor({ category: null })}
                  >
                    <Icon d={PATHS.plus} className="h-3.5 w-3.5" />
                    新建分类
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {settingsOpen ? (
        <SiteSettingsEditor
          site={nav.site}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {categoryEditor ? (
        <CategoryEditor
          category={categoryEditor.category}
          nextOrder={nextCategoryOrder}
          onClose={() => setCategoryEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {siteEditor ? (
        <SiteEditor
          site={siteEditor.site}
          categories={categories}
          defaultCategoryId={siteEditor.categoryId}
          nextOrder={nextSiteOrder}
          onClose={() => setSiteEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <Modal
          open
          title={deleteTarget.kind === "category" ? "删除这个分类？" : "删除这个站点？"}
          description={
            deleteTarget.kind === "category"
              ? "分类下的站点会一起删除，且无法恢复。"
              : "删除后无法恢复，首页会立即消失。"
          }
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-hover/60 px-3 py-2.5 text-sm">
              {deleteTarget.kind === "category" ? (
                <span>
                  {deleteTarget.category.icon ? `${deleteTarget.category.icon} ` : ""}
                  <span className="font-medium">{deleteTarget.category.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {deleteTarget.category.sites.length} 个站点
                  </span>
                </span>
              ) : (
                <span className="font-medium">{deleteTarget.site.title}</span>
              )}
            </div>

            {deleteError ? <Alert>{deleteError}</Alert> : null}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
                取消
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={busy}>
                {busy ? <Spinner /> : null}
                {busy ? "删除中…" : "确认删除"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
