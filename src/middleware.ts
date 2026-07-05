import { NextResponse, type NextRequest } from "next/server";

/** Gate /admin behind the ADMIN_PASSWORD session cookie set by /api/login. */
export function middleware(request: NextRequest) {
  const session = request.cookies.get("fallow_admin")?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (expected && session === expected) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
