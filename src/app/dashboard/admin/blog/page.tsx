import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminBlogManager } from "@/components/admin-blog-manager";

export default async function AdminBlogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") redirect("/dashboard");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (admin as any)
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, author, cover_image, published, published_at, created_at, updated_at")
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-slate-900">Blog Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, edit, and publish blog posts
          </p>
        </div>
      </div>
      <div className="mt-6">
        <AdminBlogManager posts={blogPosts} />
      </div>
    </div>
  );
}
