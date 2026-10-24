"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seedDemo, setSeedDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .status()
      .then((status) => {
        if (!alive) return;
        document.title = status.initialized
          ? `系统已初始化 · ${status.site.name}`
          : `首次设置 · ${status.site.name}`;
        if (status.initialized) setAlreadyDone(true);
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
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      await api.setup(email.trim(), password, seedDemo);
      router.replace("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyDone(true);
      } else {
        setError(err instanceof Error ? err.message : "创建账号失败");
      }
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <Spinner /> 正在检查系统状态…
        </span>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <AuthShell
        title="系统已经初始化"
        subtitle="管理员账号已经创建过了，直接登录即可。"
        footer={
          <span>
            忘记密码？可以直接在数据库里重置 users 表的 password_hash，或者清空 users 表后重新初始化。
          </span>
        }
      >
        <Button className="w-full" onClick={() => router.push("/login")}>
          去登录
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="欢迎，先创建管理员账号"
      subtitle="这是本站的第一次启动。注册的这个账号将是唯一的管理员，用来管理分类和站点。"
      footer="账号信息只保存在你自己的数据库里。"
    >
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

        <Field label="密码" hint="至少 8 位">
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field label="确认密码">
          <Input
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-surface-hover/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(event) => setSeedDemo(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-xs leading-relaxed text-muted">
            同时写入一组示例分类和站点
            <span className="block text-muted/70">之后可以随时删改</span>
          </span>
        </label>

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? "正在创建…" : "创建管理员并进入后台"}
        </Button>
      </form>
    </AuthShell>
  );
}
