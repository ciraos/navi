import "server-only";

import { getNavPayload } from "./data";
import type { NavPayload } from "./types";

/** 服务端读取导航数据，供 sitemap / RSS / Atom / manifest 使用。失败时返回 null。 */
export async function fetchNav(): Promise<NavPayload | null> {
  try {
    return await getNavPayload();
  } catch (error) {
    console.error("[nav-data] 读取失败", error);
    return null;
  }
}
