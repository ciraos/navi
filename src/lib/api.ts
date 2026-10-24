import type {
  AuthStatus,
  Category,
  CategoryInput,
  NavPayload,
  Site,
  SiteInput,
  SiteSettings,
  TokenResponse,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ErrorBody = { detail?: unknown };

function toMessage(status: number, body: ErrorBody | null): string {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  // 兼容 detail 为 [{ msg }] 的旧格式
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    return first?.msg ?? "提交的内容不合法";
  }
  if (status === 401) return "登录已过期，请重新登录";
  if (status === 403) return "没有权限执行该操作";
  if (status === 404) return "请求的资源不存在";
  return `请求失败（HTTP ${status}）`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, toMessage(res.status, body as ErrorBody | null));
  }
  return body as T;
}

export const api = {
  // ── 认证 ──────────────────────────────────────────────
  status: () => request<AuthStatus>("/api/auth/status"),

  setup: (email: string, password: string, seedDemo: boolean) =>
    request<TokenResponse>("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ email, password, seed_demo: seedDemo }),
    }),

  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ detail: string }>("/api/auth/logout", { method: "POST" }),

  me: () => request<User>("/api/auth/me"),

  // ── 导航数据 ──────────────────────────────────────────
  nav: () => request<NavPayload>("/api/nav"),

  // ── 全站设置 ──────────────────────────────────────────
  updateSiteSettings: (input: SiteSettings) =>
    request<SiteSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(input) }),

  // ── 分类 ──────────────────────────────────────────────
  createCategory: (input: CategoryInput) =>
    request<Category>("/api/categories", { method: "POST", body: JSON.stringify(input) }),

  updateCategory: (id: number, input: Partial<CategoryInput>) =>
    request<Category>(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteCategory: (id: number) =>
    request<{ detail: string }>(`/api/categories/${id}`, { method: "DELETE" }),

  // ── 站点 ──────────────────────────────────────────────
  createSite: (input: SiteInput) =>
    request<Site>("/api/sites", { method: "POST", body: JSON.stringify(input) }),

  updateSite: (id: number, input: Partial<SiteInput>) =>
    request<Site>(`/api/sites/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  deleteSite: (id: number) =>
    request<{ detail: string }>(`/api/sites/${id}`, { method: "DELETE" }),

  clickSite: (id: number) => request<{ detail: string }>(`/api/sites/${id}/click`, { method: "POST" }),
};
