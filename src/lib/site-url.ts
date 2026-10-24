/** 用于 sitemap / RSS / Atom / manifest 的站点信息。部署时用环境变量覆盖。 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Navi 导航";

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() || "一个轻量、干净的个人导航站";
