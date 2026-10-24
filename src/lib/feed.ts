import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site-url";
import type { Category, NavPayload, Site } from "./types";

const MAX_ITEMS = 50;

type FeedEntry = { site: Site; category: Category };

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function dateOf(value: string | null | undefined): Date {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function entryDate(entry: FeedEntry): Date {
  const created = dateOf(entry.site.created_at);
  const updated = dateOf(entry.site.updated_at);
  return updated > created ? updated : created;
}

function collectEntries(nav: NavPayload | null): FeedEntry[] {
  return (nav?.categories ?? [])
    .flatMap((category) => category.sites.map((site) => ({ site, category })))
    .sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime())
    .slice(0, MAX_ITEMS);
}

function siteMeta(nav: NavPayload | null) {
  return {
    name: nav?.site.name?.trim() || SITE_NAME,
    description: nav?.site.description?.trim() || SITE_DESCRIPTION,
  };
}

function itemDescription(entry: FeedEntry): string {
  const parts = [entry.category.name, entry.site.description]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.join(" · ") || entry.site.url;
}

/** 最近一次站点更新时间，供 sitemap 使用；没有数据时返回当前时间。 */
export function latestSiteDate(nav: NavPayload | null): Date {
  const timestamps = (nav?.categories ?? [])
    .flatMap((category) => category.sites)
    .map((site) => dateOf(site.updated_at).getTime())
    .filter((time) => time > 0);

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
}

export function buildRss(nav: NavPayload | null): string {
  const meta = siteMeta(nav);
  const entries = collectEntries(nav);
  const lastBuild = entries.length > 0 ? entryDate(entries[0]) : new Date();

  const items = entries
    .map((entry) => {
      const { site, category } = entry;
      return `    <item>
      <title>${escapeXml(site.title)}</title>
      <link>${escapeXml(site.url)}</link>
      <guid isPermaLink="false">navi:site:${site.id}</guid>
      <pubDate>${dateOf(site.created_at).toUTCString()}</pubDate>
      <category>${escapeXml(category.name)}</category>
      <description>${escapeXml(itemDescription(entry))}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.name)}</title>
    <link>${escapeXml(`${SITE_URL}/`)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <generator>Navi</generator>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function buildAtom(nav: NavPayload | null): string {
  const meta = siteMeta(nav);
  const entries = collectEntries(nav);
  const updated = entries.length > 0 ? entryDate(entries[0]) : new Date();

  const items = entries
    .map((entry) => {
      const { site, category } = entry;
      const published = dateOf(site.created_at);
      const modified = dateOf(site.updated_at) > published ? dateOf(site.updated_at) : published;

      return `  <entry>
    <title>${escapeXml(site.title)}</title>
    <link href="${escapeXml(site.url)}" />
    <id>urn:navi:site:${site.id}</id>
    <published>${published.toISOString()}</published>
    <updated>${modified.toISOString()}</updated>
    <category term="${escapeXml(category.name)}" />
    <summary type="text">${escapeXml(itemDescription(entry))}</summary>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>${escapeXml(meta.name)}</title>
  <subtitle>${escapeXml(meta.description)}</subtitle>
  <link href="${escapeXml(`${SITE_URL}/`)}" />
  <link href="${escapeXml(`${SITE_URL}/atom.xml`)}" rel="self" type="application/atom+xml" />
  <id>${escapeXml(`${SITE_URL}/`)}</id>
  <updated>${updated.toISOString()}</updated>
  <generator>Navi</generator>
${items}
</feed>
`;
}
