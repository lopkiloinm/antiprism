import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRERENDERED_ID = "new";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const path = base ? pathname.replace(new RegExp(`^${base}`), "") || "/" : pathname;

  // Match /project/:id where id is not our prerendered placeholder
  const match = path.match(/^\/project\/([^/]+)\/?$/);
  if (match && match[1] !== PRERENDERED_ID) {
    const projectId = match[1];
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = `${base}/project/${PRERENDERED_ID}`;
    rewriteUrl.searchParams.set("__id", projectId);
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/project/:path*",
};
