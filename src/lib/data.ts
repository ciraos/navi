import "server-only";

import { query } from "./db";
import { getSiteMeta } from "./site-settings";
import type { Category, NavPayload, Site } from "./types";

export type CategoryRow = {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
};

export type SiteRow = {
  id: number;
  category_id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  clicks: number;
  created_at: Date;
  updated_at: Date;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    category_id: row.category_id,
    title: row.title,
    url: row.url,
    description: row.description,
    icon: row.icon,
    sort_order: row.sort_order,
    clicks: row.clicks,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

export function toCategory(row: CategoryRow, sites: Site[] = []): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    sort_order: row.sort_order,
    sites,
  };
}

const SITE_COLUMNS = `id, category_id, title, url, description, icon, sort_order, clicks, created_at, updated_at`;
const CATEGORY_COLUMNS = `id, name, icon, description, sort_order`;

export async function getNavPayload(): Promise<NavPayload> {
  const [categories, sites, site] = await Promise.all([
    query<CategoryRow>(`SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY sort_order, id`),
    query<SiteRow>(
      `SELECT ${SITE_COLUMNS} FROM sites ORDER BY category_id, sort_order, id`,
    ),
    getSiteMeta(),
  ]);

  const sitesByCategory = new Map<number, Site[]>();
  for (const row of sites) {
    const list = sitesByCategory.get(row.category_id) ?? [];
    list.push(toSite(row));
    sitesByCategory.set(row.category_id, list);
  }

  return {
    site,
    categories: categories.map((category) =>
      toCategory(category, sitesByCategory.get(category.id) ?? []),
    ),
  };
}

export async function getCategoryById(id: number): Promise<CategoryRow | null> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getSiteById(id: number): Promise<SiteRow | null> {
  const rows = await query<SiteRow>(
    `SELECT ${SITE_COLUMNS} FROM sites WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
