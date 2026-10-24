import "server-only";

import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { query } from "./db";

const BCRYPT_MAX_BYTES = 72;

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  is_admin: boolean;
  created_at: Date;
  last_login_at: Date | null;
};

export type PublicUser = {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
};

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    is_admin: user.is_admin,
    created_at: user.created_at.toISOString(),
    last_login_at: user.last_login_at ? user.last_login_at.toISOString() : null,
  };
}

function cookieName(): string {
  return process.env.COOKIE_NAME?.trim() || "navi_token";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET_KEY 未配置或长度不足 16 位");
  }
  if ((process.env.JWT_ALGORITHM?.trim() || "HS256") !== "HS256") {
    throw new Error("当前只支持 HS256 JWT");
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(
  user: Pick<UserRow, "id" | "email" | "is_admin">,
): Promise<{ token: string; expiresIn: number }> {
  const minutes = Number(process.env.JWT_EXPIRE_MINUTES ?? 10080);
  const expiresIn = (Number.isFinite(minutes) && minutes > 0 ? minutes : 10080) * 60;
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ email: user.email, adm: user.is_admin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(getJwtSecret());

  return { token, expiresIn };
}

function tokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(cookieName())?.value;
  if (cookie) return cookie;

  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return null;
}

export async function getCurrentUser(request: NextRequest): Promise<UserRow | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;

  const secret = getJwtSecret();
  let userId: number;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    userId = Number(payload.sub);
    if (!Number.isInteger(userId)) return null;
  } catch {
    return null;
  }

  const rows = await query<UserRow>(
    `SELECT id, email, password_hash, is_admin, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** 返回用户，或可直接返回给客户端的 401/403 响应。 */
export async function requireAdmin(
  request: NextRequest,
): Promise<UserRow | NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ detail: "未登录或登录已过期" }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ detail: "需要管理员权限" }, { status: 403 });
  }
  return user;
}

function cookieOptions(maxAge: number) {
  const raw = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase();
  const sameSite = raw === "strict" || raw === "none" ? raw : "lax";

  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite,
    path: "/",
    maxAge,
  } as const;
}

export async function authResponse(
  user: UserRow,
  status = 200,
): Promise<NextResponse> {
  const { token, expiresIn } = await createAccessToken(user);
  const response = NextResponse.json(
    {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
      user: toPublicUser(user),
    },
    { status },
  );
  response.cookies.set(cookieName(), token, cookieOptions(expiresIn));
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(cookieName(), "", cookieOptions(0));
  return response;
}

export function passwordTooLong(password: string): boolean {
  return Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES;
}

export async function hashPassword(password: string): Promise<string> {
  if (passwordTooLong(password)) {
    throw new Error(`密码超过 ${BCRYPT_MAX_BYTES} 字节`);
  }
  return hash(password, 12);
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = "";
  let bytes = 0;

  for (const char of value) {
    const size = Buffer.byteLength(char, "utf8");
    if (bytes + size > maxBytes) break;
    result += char;
    bytes += size;
  }
  return result;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    const candidate = passwordTooLong(password)
      ? truncateUtf8(password, BCRYPT_MAX_BYTES)
      : password;
    return await compare(candidate, passwordHash);
  } catch {
    return false;
  }
}

export async function countUsers(): Promise<number> {
  const rows = await query<{ count: number }>("SELECT COUNT(*)::int AS count FROM users");
  return rows[0]?.count ?? 0;
}
