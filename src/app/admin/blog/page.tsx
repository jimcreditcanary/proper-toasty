// /admin/blog — blog post manager (was /dashboard/admin/blog).
//
// Moved here so it sits inside the AdminLayout — same role-gated
// shell as /admin/users, /admin/performance, /admin/installer-
// requests, etc. The previous location was wrapped by the dashboard
// layout, which doesn't pass `role` to SiteHeader, so the user
// dropdown fell into the homeowner branch ("Dashboard" link to
// /dashboard) instead of the admin branch ("Admin portal" + cross-
// portal links + Blog Manager). Fixed by relocation rather than
// patching the dashboard layout because the blog manager is an
// admin tool, not a user-facing surface — it belongs under /admin.

import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { AdminBlogManager } from "@/components/admin-blog-manager";

// AdminLayout already gates on role + redirects unauthenticated /
// non-admin users, so the page itself just renders.
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (admin as any)
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, category, author, cover_image, published, published_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const blogPosts = (posts ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    slug: p.slug as string,
    title: p.title as string,
    excerpt: p.excerpt as string,
    category: p.category as string,
    author: p.author as string,
    cover_image: (p.cover_image as string | null) ?? null,
    published: p.published as boolean,
    published_at: (p.published_at as string) ?? null,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
  }));

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Blog manager"
      pageSubtitle="Create, edit, and publish blog posts."
    >
      <AdminBlogManager posts={blogPosts} />
    </PortalShell>
  );
}
