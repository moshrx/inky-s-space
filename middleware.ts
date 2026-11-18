import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The visits dashboard retains its own server-side password check.
  if (pathname === "/inky/visits" ||
      (pathname === "/api/visits" && ["GET", "HEAD"].includes(request.method)) ||
      (pathname === "/api/visit" && request.method === "POST")) {
    return NextResponse.next();
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "This app is closed." },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (pathname === "/" || pathname.startsWith("/_next/") ||
      ["/favicon.ico", "/favicon-32x32.png", "/apple-touch-icon.png", "/site.webmanifest"].includes(pathname)) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/";
  destination.search = "";
  return NextResponse.redirect(destination);
}

export const config = { matcher: "/:path*" };
