"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SiteLogo } from "@/components/SiteLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <SiteLogo size="lg" className="mb-4" />
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">{children}</div>

        {footer ? <div className="mt-5 text-center text-xs text-muted">{footer}</div> : null}

        <p className="mt-8 text-center text-[11px] text-muted/70">
          <Link href="/" className="transition hover:text-foreground">
            ← 返回导航首页
          </Link>
        </p>
      </div>
    </div>
  );
}
