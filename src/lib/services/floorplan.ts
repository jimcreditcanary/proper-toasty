import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "floorplans";

export const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — generous upper bound post-resize

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  return "jpg";
}

function randomId(): string {
  // 16-byte hex — unique enough for a v1 anonymous path.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Uploads a resized floorplan into the private `floorplans` bucket using the
 * service-role client. Returns the object key the caller should store on the
 * check record. Path convention for now:
 *   anon-uploads/{uuid}/{timestamp}-floorplan.{ext}
 * When auth gets wired in a later phase this moves to {user_id}/{check_id}/...
 */
export async function uploadFloorplan(
  data: Uint8Array,
  mimeType: string
): Promise<{ objectKey: string }> {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }
  if (data.byteLength > MAX_BYTES) {
    throw new Error(`File too large: ${data.byteLength} bytes`);
  }

  const admin = createAdminClient();
  const key = `anon-uploads/${randomId()}/${Date.now()}-floorplan.${extensionFor(mimeType)}`;

  const { error } = await admin.storage.from(BUCKET).upload(key, data, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return { objectKey: key };
}

/**
 * Short-lived signed URL for reading a private floorplan. Used by Step 5
 * (Claude vision) and the analysis pipeline. NOT exposed to the browser.
 */
export async function signedReadUrl(
  objectKey: string,
  expiresInSeconds = 300
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, expiresInSeconds);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}
