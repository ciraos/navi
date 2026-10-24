import { connection } from "next/server";

import { getNavPayload } from "@/lib/data";

export async function GET() {
  await connection();
  return Response.json(await getNavPayload());
}
