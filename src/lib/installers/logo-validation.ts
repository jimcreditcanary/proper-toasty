// Logo dimension validation for /api/installer/profile/logo.
//
// Pure-JS readers for the four MIME types we accept (PNG / JPEG /
// WEBP / SVG) so we don't pull in a runtime image-decoding dep. Each
// reader parses the format's header bytes and returns
// { width, height } in pixels (or units, for SVG viewBox).
//
// Why we enforce square: any non-1:1 logo letterboxes inside the
// 48-px circular avatar slot on every installer card, looking odd
// or just plain wrong. Reject at upload time + surface a clear
// "export it 1:1" error so designers fix the asset, not us.
//
// Strict equality. A 256×257 export gets rejected — fine, designers
// should export 1:1. The error copy points at the easy fix.

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Returns image dimensions for the supported MIME types, or null if
 * the format isn't one we handle / the header is unparseable. The
 * caller decides what to do with null — the route surfaces it as a
 * 400 "couldn't read dimensions" error rather than silently passing
 * the upload through.
 */
export function getImageDimensions(
  buf: Uint8Array,
  mimeType: string,
): Dimensions | null {
  switch (mimeType) {
    case "image/png":
      return readPng(buf);
    case "image/jpeg":
      return readJpeg(buf);
    case "image/webp":
      return readWebp(buf);
    case "image/svg+xml":
      return readSvg(buf);
    default:
      return null;
  }
}

export function isSquare(dim: Dimensions): boolean {
  // Strict — see file-header comment.
  return dim.width === dim.height && dim.width > 0;
}

// ─── PNG ──────────────────────────────────────────────────────────
//
// 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
// IHDR chunk starts at offset 8:
//   bytes  8-11 → chunk length (always 13 for IHDR)
//   bytes 12-15 → "IHDR"
//   bytes 16-19 → width  (uint32 big-endian)
//   bytes 20-23 → height (uint32 big-endian)

function readPng(buf: Uint8Array): Dimensions | null {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  // IHDR marker
  if (
    buf[12] !== 0x49 ||
    buf[13] !== 0x48 ||
    buf[14] !== 0x44 ||
    buf[15] !== 0x52
  ) {
    return null;
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: dv.getUint32(16, false), height: dv.getUint32(20, false) };
}

// ─── JPEG ─────────────────────────────────────────────────────────
//
// SOI marker at offset 0: FF D8. Then a sequence of markers — each
// FF XX followed (for most) by a 2-byte big-endian length. We walk
// through them until we hit a Start-Of-Frame marker (SOF0…SOF15
// excluding DHT/DAC/JPG). The SOF payload begins with:
//   precision(1) + height(uint16 BE) + width(uint16 BE) + ...

function readJpeg(buf: Uint8Array): Dimensions | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 2;
  while (pos < buf.length) {
    if (buf[pos] !== 0xff) return null;
    // Markers without a payload (RST*, SOI, EOI, TEM) — single byte.
    const marker = buf[pos + 1];
    pos += 2;
    if (marker === 0xd8 || marker === 0xd9) return null; // unexpected
    // SOF0..SOF15 except DHT(0xC4), JPG(0xC8), DAC(0xCC)
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (pos + 2 > buf.length) return null;
    const segLen = dv.getUint16(pos, false);
    if (isSof) {
      if (pos + segLen > buf.length || segLen < 7) return null;
      const height = dv.getUint16(pos + 3, false);
      const width = dv.getUint16(pos + 5, false);
      return { width, height };
    }
    pos += segLen;
  }
  return null;
}

// ─── WEBP ─────────────────────────────────────────────────────────
//
// All variants share the RIFF wrapper:
//   bytes  0-3  → "RIFF"
//   bytes  4-7  → file size (uint32 LE)
//   bytes  8-11 → "WEBP"
//   bytes 12-15 → chunk fourcc ("VP8 ", "VP8L", or "VP8X")
//
// VP8  (lossy):  width/height at byte 26-29, 14-bit values stored LE
// VP8L (lossless): bit-packed width-1(14)+height-1(14) starting byte 21
// VP8X (extended): width-1 (3-byte LE) at 24, height-1 (3-byte LE) at 27

function readWebp(buf: Uint8Array): Dimensions | null {
  if (buf.length < 30) return null;
  if (
    buf[0] !== 0x52 || buf[1] !== 0x49 || buf[2] !== 0x46 || buf[3] !== 0x46 ||
    buf[8] !== 0x57 || buf[9] !== 0x45 || buf[10] !== 0x42 || buf[11] !== 0x50
  ) {
    return null;
  }
  const fourcc =
    String.fromCharCode(buf[12]) +
    String.fromCharCode(buf[13]) +
    String.fromCharCode(buf[14]) +
    String.fromCharCode(buf[15]);

  if (fourcc === "VP8 ") {
    // 3-byte sync code (9D 01 2A) at bytes 23-25, then width/height.
    const width = (buf[26] | (buf[27] << 8)) & 0x3fff;
    const height = (buf[28] | (buf[29] << 8)) & 0x3fff;
    return { width, height };
  }
  if (fourcc === "VP8L") {
    // Signature byte 0x2F at 20, then 4 bytes bit-packed.
    if (buf[20] !== 0x2f) return null;
    const b0 = buf[21];
    const b1 = buf[22];
    const b2 = buf[23];
    const b3 = buf[24];
    const width = 1 + (b0 | ((b1 & 0x3f) << 8));
    const height = 1 + (((b1 >> 6) & 0x03) | (b2 << 2) | ((b3 & 0x0f) << 10));
    return { width, height };
  }
  if (fourcc === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  return null;
}

// ─── SVG ──────────────────────────────────────────────────────────
//
// SVG is XML so there's no binary header. Parse the first ~4KB
// looking for a viewBox attribute (preferred — that's what the
// renderer uses for aspect) OR explicit width/height attributes
// on the root <svg> tag. We don't bother with a real XML parser
// for an attribute extraction; a regex is fine.
//
// SVGs without dimensions at all (rare) get null — the route
// rejects with a "couldn't read dimensions" error and asks the
// installer to add a viewBox.

function readSvg(buf: Uint8Array): Dimensions | null {
  // Look at the first ~8KB; SVG headers are tiny in practice.
  const slice = buf.subarray(0, Math.min(buf.length, 8192));
  const text = new TextDecoder("utf-8").decode(slice);

  // Prefer viewBox — that's the authoritative aspect ratio.
  const viewBoxMatch = /viewBox\s*=\s*["']([^"']+)["']/i.exec(text);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const width = parts[2];
      const height = parts[3];
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  }

  // Fall back to width + height on the root tag. Strip "px"/"pt"/etc.
  const widthMatch = /<svg[^>]*\swidth\s*=\s*["']([^"']+)["']/i.exec(text);
  const heightMatch = /<svg[^>]*\sheight\s*=\s*["']([^"']+)["']/i.exec(text);
  if (widthMatch && heightMatch) {
    const width = parseFloat(widthMatch[1]);
    const height = parseFloat(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  return null;
}
