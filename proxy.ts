export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/profile/:path*",
    "/api/transactions/:path*",
    "/api/dashboard/:path*",
    "/api/notifications/:path*",
    "/api/user/:path*",
  ],
};
