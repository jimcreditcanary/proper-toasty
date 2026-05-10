// Legacy redirect — the blog manager moved to /admin/blog so it
// inherits the AdminLayout (proper role-aware nav, consistent
// PortalShell). Bookmarks land here and bounce.

import { permanentRedirect } from "next/navigation";

export default function LegacyAdminBlogRedirect(): never {
  permanentRedirect("/admin/blog");
}
