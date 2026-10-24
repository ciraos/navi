import "server-only";

import type { PoolClient } from "pg";

const DEMO_DATA: Array<{
  name: string;
  icon: string;
  description: string;
  sites: Array<{ title: string; url: string; description: string }>;
}> = [
  {
    name: "常用",
    icon: "⭐",
    description: "每天都会点开的地方",
    sites: [
      { title: "Google", url: "https://www.google.com", description: "搜索" },
      { title: "GitHub", url: "https://github.com", description: "代码托管" },
      { title: "YouTube", url: "https://www.youtube.com", description: "视频" },
      { title: "X", url: "https://x.com", description: "社交媒体" },
    ],
  },
  {
    name: "开发",
    icon: "🛠️",
    description: "写代码相关的工具与文档",
    sites: [
      { title: "MDN", url: "https://developer.mozilla.org", description: "Web 技术文档" },
      { title: "Next.js", url: "https://nextjs.org/docs", description: "React 全栈框架" },
      { title: "Vercel", url: "https://vercel.com", description: "部署与托管" },
      { title: "Stack Overflow", url: "https://stackoverflow.com", description: "提问与搜索" },
    ],
  },
  {
    name: "设计",
    icon: "🎨",
    description: "配色、图标与灵感",
    sites: [
      { title: "Figma", url: "https://www.figma.com", description: "界面设计" },
      { title: "Dribbble", url: "https://dribbble.com", description: "设计灵感" },
      { title: "Coolors", url: "https://coolors.co", description: "配色方案" },
    ],
  },
  {
    name: "效率",
    icon: "⚡",
    description: "让日常更顺手的工具",
    sites: [
      { title: "Notion", url: "https://www.notion.so", description: "笔记与协作" },
      { title: "Excalidraw", url: "https://excalidraw.com", description: "手绘风白板" },
      { title: "TinyPNG", url: "https://tinypng.com", description: "图片压缩" },
    ],
  },
];

export async function seedDemo(client: PoolClient): Promise<void> {
  for (const [categoryIndex, category] of DEMO_DATA.entries()) {
    const result = await client.query<{ id: number }>(
      `INSERT INTO categories (name, icon, description, sort_order, created_at)
       VALUES ($1, $2, $3, $4, now() AT TIME ZONE 'UTC')
       RETURNING id`,
      [category.name, category.icon, category.description, categoryIndex * 10],
    );
    const categoryId = result.rows[0].id;

    for (const [siteIndex, site] of category.sites.entries()) {
      await client.query(
        `INSERT INTO sites
          (category_id, title, url, description, icon, sort_order, clicks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NULL, $5, 0, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC')`,
        [categoryId, site.title, site.url, site.description, siteIndex * 10],
      );
    }
  }
}
