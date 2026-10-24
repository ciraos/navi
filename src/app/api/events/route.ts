import { connection } from "next/server";
import { Client } from "pg";

import { getDatabaseUrl } from "@/lib/db";

export async function GET(request: Request) {
  await connection();

  const encoder = new TextEncoder();
  let client: Client | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (client) {
      const current = client;
      client = null;
      void current.end().catch(() => {});
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };

      send("retry: 2000\n\n");

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // 已经关闭
        }
      });

      client = new Client({
        connectionString: getDatabaseUrl(),
        keepAlive: true,
      });

      client.on("notification", (message) => {
        if (message.channel === "navi_events") {
          send("event: nav\ndata: 1\n\n");
        }
      });

      client.on("error", (error) => {
        console.error("[events] pg client error", error);
        cleanup();
        try {
          controller.close();
        } catch {
          // 已经关闭
        }
      });

      try {
        await client.connect();
        if (closed) return;
        await client.query("LISTEN navi_events");
        if (closed) return;
      } catch (error) {
        console.error("[events] LISTEN 失败", error);
        cleanup();
        try {
          controller.close();
        } catch {
          // 已经关闭
        }
        return;
      }

      heartbeat = setInterval(() => send(": keep-alive\n\n"), 20_000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
