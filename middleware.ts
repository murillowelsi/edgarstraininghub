import { rewrite } from "@vercel/functions";

/*
 * Raise Your Hands subdomain: "/" must serve raise-your-hands.html, not the EZ app's index.html.
 * vercel.json rewrites only apply when no file matches, and "/" always matches index.html, so link
 * previews (WhatsApp, iMessage…) showed the EZ title and icon. Routing Middleware runs before the
 * filesystem. Only the root on the raiseyourhands.* host is touched; the main site is not.
 */
export const config = {
  matcher: ["/", "/index.html"],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  if (!url.hostname.startsWith("raiseyourhands.")) return;
  return rewrite(new URL("/raise-your-hands.html", url));
}
