"use client";

import type { CSSProperties } from "react";

import { api } from "@/lib/api";
import type { Site } from "@/lib/types";

/** 黄金角：让相邻 id 的色相尽量拉开，且几乎不会重复。 */
const GOLDEN_ANGLE = 137.508;

function hashOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function hueOf(seed: number | string): number {
  const value = typeof seed === "number" ? seed : hashOf(seed);
  return (value * GOLDEN_ANGLE) % 360;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 图标块：图片图标 / emoji / 首字母渐变块 */
export function IconTile({
  site,
  size = "md",
}: {
  site: Pick<Site, "title" | "icon"> & { id?: number };
  size?: "md" | "lg";
}) {
  const dimension = size === "lg" ? "h-12 w-12 text-xl" : "h-10 w-10 text-base";
  const rounded = size === "lg" ? "rounded-2xl" : "rounded-xl";

  const icon = site.icon;
  const hue = hueOf(site.id ?? site.title);
  const secondHue = (hue + 28) % 360;

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 图标来自用户配置，域名不可预知
      <img
        src={icon}
        alt=""
        className={`${dimension} ${rounded} shrink-0 border border-border bg-surface object-cover`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  const emoji = icon?.trim() ?? "";
  if (emoji && emoji.length <= 4) {
    return (
      <span
        className={`${dimension} ${rounded} icon-emoji-tile grid shrink-0 place-items-center border border-border`}
        style={{ "--tile-hue": `${hue}` } as CSSProperties}
        aria-hidden
      >
        {emoji}
      </span>
    );
  }

  return (
    <span
      className={`${dimension} ${rounded} grid shrink-0 place-items-center font-semibold text-white shadow-sm`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 68% 42%), hsl(${secondHue} 72% 30%))`,
      }}
      aria-hidden
    >
      {site.title.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function SiteCard({ site }: { site: Site }) {
  const host = hostOf(site.url);

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void api.clickSite(site.id).catch(() => {});
      }}
      className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-black/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:shadow-black/40"
    >
      <IconTile site={site} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold">{site.title}</span>
          <svg
            className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">
          {site.description?.trim() || host}
        </span>
        {site.description ? (
          <span className="mt-1 block truncate text-[11px] text-muted/60">{host}</span>
        ) : null}
      </span>
    </a>
  );
}
