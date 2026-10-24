import { query } from "@/lib/db";
import { errorResponse, parseId } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const siteId = parseId(id);
  if (!siteId) return errorResponse(404, "站点不存在");

  const rows = await query<{ id: number }>(
    "UPDATE sites SET clicks = clicks + 1 WHERE id = $1 RETURNING id",
    [siteId],
  );
  if (!rows[0]) return errorResponse(404, "站点不存在");

  return Response.json({ detail: "ok" });
}
