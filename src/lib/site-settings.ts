import "server-only";

import { query } from "./db";
import type { SiteMeta, SiteSettings } from "./types";

type SettingsRow = {
  site_name: string | null;
  icp: string | null;
  police: string | null;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await query<SettingsRow>(
    "SELECT site_name, icp, police FROM site_settings WHERE id = 1",
  );
  return rows[0] ?? { site_name: null, icp: null, police: null };
}

export async function getSiteMeta(): Promise<SiteMeta> {
  const settings = await getSiteSettings();
  const name = settings.site_name?.trim() || process.env.SITE_NAME?.trim() || "Navi 导航";
  const description =
    process.env.SITE_DESCRIPTION?.trim() || "一个轻量、干净的个人导航站";

  return {
    name,
    description,
    icp: settings.icp?.trim() || null,
    police: settings.police?.trim() || null,
  };
}
