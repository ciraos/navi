import "server-only";

import { NextResponse } from "next/server";

export function errorResponse(status: number, detail: string): NextResponse {
  return NextResponse.json({ detail }, { status });
}

export function pgCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
