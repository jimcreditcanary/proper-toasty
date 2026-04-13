import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blogTable(admin: ReturnType<typeof createAdminClient>) {
  return (admin as any).from("blog_posts");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (data?.role !== "admin") return null;
  return admin;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { error } = await blogTable(admin).insert({
      slug: body.slug,
      title: body.title,
      excerpt: body.excerpt || "",
      content: body.content || "",
      category: body.category || "Guides",
      author: body.author || "WhoAmIPaying",
      published: body.published ?? false,
      published_at: body.published ? new Date().toISOString() : null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      slug: body.slug,
      title: body.title,
      excerpt: body.excerpt,
      category: body.category,
      author: body.author,
      published: body.published,
      updated_at: new Date().toISOString(),
    };

    // Only update content if provided (toggle publish sends empty content)
    if (body.content) {
      update.content = body.content;
    }

    // Set published_at when first published
    if (body.published) {
      // Only set if not already published
      const { data: existing } = await blogTable(admin)
        .select("published_at")
        .eq("id", body.id)
        .single();

      if (!existing?.published_at) {
        update.published_at = new Date().toISOString();
      }
    }

    const { error } = await blogTable(admin)
      .update(update)
      .eq("id", body.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
