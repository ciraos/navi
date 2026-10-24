import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "管理后台",
  description: "维护导航站的分类与站点",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
