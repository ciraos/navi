"use client";

import { useEffect } from "react";

/**
 * 订阅后端的导航变更事件（SSE）。
 * 断线由浏览器自动重连；另外每 fallbackMs 兜底轮询一次，切回页面时立即同步。
 */
export function useLiveUpdates(onUpdate: () => void, fallbackMs = 60000) {
  useEffect(() => {
    let debounce: number | undefined;
    let closed = false;

    // 一次操作可能连发多个事件（比如排序会连续 PATCH），合并成一次刷新
    const trigger = () => {
      if (closed) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(onUpdate, 150);
    };

    const source = new EventSource("/api/events");
    source.addEventListener("nav", trigger);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") onUpdate();
    }, fallbackMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") onUpdate();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      closed = true;
      window.clearTimeout(debounce);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      source.removeEventListener("nav", trigger);
      source.close();
    };
  }, [onUpdate, fallbackMs]);
}
