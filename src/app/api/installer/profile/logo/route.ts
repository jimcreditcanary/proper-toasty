// /api/installer/profile/logo — upload + remove the installer's logo.
//
// POST   — multipart form with field "file". Validates MIME + size,
//          writes to the public installer-logos Supabase Storage
//          bucket, updates installers.logo_url for the caller.
// DELETE — clears installers.logo_url + best-effort removes the
//          previous storage object.
//
// Auth: must be signed-in + bound to an installer record. We resolve
// the installer by user_id; un-claimed accounts get a 403.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "installer-logos";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB — matches bucket policy in m064.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "jpg";
}

interface InstallerRow {
  id: number;
  user_id: string | null;
  logo_url: string | null;
}

async function loadInstallerForCaller(): Promise<
  | { ok: true; installer: InstallerRow; userId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in" };

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, user_id, logo_url")
    .eq("user_id", user.id)
    .maybeSingle<InstallerRow>();
  if (!installer) {
    return {
      ok: false,
      status: 403,
      error: "Account not bound to an installer profile",
    };
  }
  return { ok: true, installer, userId: user.id };
}

/** Strip the public-URL prefix to get the storage key for delete.
 *  Example URL: https://xxx.supabase.co/storage/v1/object/public/installer-logos/42/1715769600000.png
 *  → key: 42/1715769600000.png */
function logoUrlToKey(url: string | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function POST(req: Request) {
  const ctx = await loadInstallerForCaller();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not parse upload" },
      { status: 400 },
    );
  }
  if (!file) {
    return NextResponse.json(
      { ok: false, error: "No file in upload" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File is over the 2 MB limit" },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported file type: ${file.type}` },
      { status: 415 },
    );
  }

  const admin = createAdminClient();
  const ext = extensionFor(file.type);
  // Path scheme: <installerId>/<timestamp>.<ext>. Including a
  // timestamp avoids hitting CDN-cached previous logos after a
  // replace + makes the per-installer namespace flat + auditable.
  const key = `${ctx.installer.id}/${Date.now()}.${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(key, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    console.error("[profile/logo] upload failed", uploadErr);
    return NextResponse.json(
      { ok: false, error: "Storage upload failed" },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(key);

  const { error: updateErr } = await admin
    .from("installers")
    .update({ logo_url: publicUrl })
    .eq("id", ctx.installer.id);
  if (updateErr) {
    console.error("[profile/logo] db update failed", updateErr);
    // Best-effort cleanup of the just-uploaded object so the bucket
    // doesn't accumulate orphans on db-update failure.
    await admin.storage.from(BUCKET).remove([key]);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  // Best-effort: drop the previous logo file. Fire-and-forget — the
  // user has a new logo regardless of whether cleanup succeeds.
  const prevKey = logoUrlToKey(ctx.installer.logo_url);
  if (prevKey && prevKey !== key) {
    void admin.storage
      .from(BUCKET)
      .remove([prevKey])
      .then(({ error }) => {
        if (error) {
          console.warn(
            "[profile/logo] previous-logo cleanup failed",
            error.message,
          );
        }
      });
  }

  return NextResponse.json({ ok: true, logoUrl: publicUrl });
}

export async function DELETE() {
  const ctx = await loadInstallerForCaller();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status },
    );
  }

  const admin = createAdminClient();
  const prevKey = logoUrlToKey(ctx.installer.logo_url);

  const { error: updateErr } = await admin
    .from("installers")
    .update({ logo_url: null })
    .eq("id", ctx.installer.id);
  if (updateErr) {
    console.error("[profile/logo] db clear failed", updateErr);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  if (prevKey) {
    const { error: rmErr } = await admin.storage
      .from(BUCKET)
      .remove([prevKey]);
    if (rmErr) {
      console.warn(
        "[profile/logo] storage delete failed",
        rmErr.message,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
