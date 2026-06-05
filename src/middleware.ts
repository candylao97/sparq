import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedRoutes: Record<string, string[]> = {
  "/customer": ["CUSTOMER"],
  "/provider": ["PROVIDER"],
  "/admin": ["ADMIN"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!req.auth?.user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!roles.includes(req.auth.user.role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/customer/:path*", "/provider/:path*", "/admin/:path*"],
};
