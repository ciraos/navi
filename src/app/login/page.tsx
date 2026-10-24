"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .status()
      .then((status) => {
        if (!alive) return;
        document.title = `登录 · ${status.site.name}`;
        // 还没初始化 → 去引导页；已登录 → 直接进后台
        if (!status.initialized) router.replace("/setup");
        else if (status.authenticated) router.replace("/admin");
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "无法连接后端");
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(email.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <Spinner /> 正在检查登录状态…
        </span>
      </div>
    );
  }

  return (
    <AuthShell title="管理员登录" subtitle="登录后可以管理分类、站点与排序。">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="邮箱">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </Field>

        <Field label="密码">
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? "正在登录…" : "登录"}
        </Button>
      </form>
    </AuthShell>
  );
}
