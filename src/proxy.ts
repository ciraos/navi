import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "navi_token";

/**
 * 后台路由的乐观守卫：只检查 Cookie 是否存在，不做数据库校验。
 * 真正的鉴权仍然由 API 在每个请求上执行（401 时前端会跳回登录页）。
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
