/**
 * Client-side floorplan resize. Scales to a max long-edge in pixels and
 * re-encodes as JPEG so the upload payload stays small — keeps Claude vision
 * token costs sane without needing a server-side sharp pipeline.
 *
 * Returns a Blob (the caller wraps it in a File when posting).
 */
export interface ResizeOptions {
  maxLongEdge?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/png";
}

export async function resizeImage(
  file: File,
  { maxLongEdge = 1600, quality = 0.88, mimeType = "image/jpeg" }: ResizeOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { naturalWidth: w0, naturalHeight: h0 } = img;
    const longest = Math.max(w0, h0);
    const scale = longest > maxLongEdge ? maxLongEdge / longest : 1;
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    // Slight smoothing helps when downscaling architectural drawings.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) throw new Error("Failed to encode resized image");
    return { blob, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image file"));
    img.src = src;
  });
}
