// Tests for the pure-JS image dimension parsers used by the logo
// upload route. We don't actually decode the image — we just verify
// that the format-specific header parsers extract width/height from
// well-formed fixtures.
//
// Fixtures are built byte-by-byte rather than read from disk to
// keep the test self-contained + obvious about what's being parsed.

import { describe, expect, it } from "vitest";
import { getImageDimensions, isSquare } from "../logo-validation";

// ─── PNG ────────────────────────────────────────────────────────────

function makePng(width: number, height: number): Uint8Array {
  // 8-byte signature + 4-byte chunk length + "IHDR" + width + height
  // + 5 trailing bytes (bit-depth, colour-type, compression, filter,
  // interlace). We don't need the rest of the file for the parser
  // to succeed.
  const buf = new Uint8Array(33);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // chunk length 13
  buf.set([0, 0, 0, 13], 8);
  // IHDR
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  const dv = new DataView(buf.buffer);
  dv.setUint32(16, width, false);
  dv.setUint32(20, height, false);
  return buf;
}

describe("getImageDimensions — PNG", () => {
  it("reads dimensions from a square PNG header", () => {
    const dims = getImageDimensions(makePng(512, 512), "image/png");
    expect(dims).toEqual({ width: 512, height: 512 });
  });
  it("reads dimensions from a non-square PNG header", () => {
    const dims = getImageDimensions(makePng(800, 600), "image/png");
    expect(dims).toEqual({ width: 800, height: 600 });
  });
  it("returns null on a bad PNG signature", () => {
    const buf = makePng(100, 100);
    buf[0] = 0; // corrupt the signature
    expect(getImageDimensions(buf, "image/png")).toBeNull();
  });
});

// ─── JPEG ───────────────────────────────────────────────────────────

function makeJpeg(width: number, height: number): Uint8Array {
  // Layout:
  //   [0]   0xFF  ┐ SOI
  //   [1]   0xD8  ┘
  //   [2]   0xFF  ┐ SOF0 marker
  //   [3]   0xC0  ┘
  //   [4-5] uint16 BE — segment length (8 = self + 6 payload bytes)
  //   [6]   precision
  //   [7-8] uint16 BE — height
  //   [9-10] uint16 BE — width
  //   [11]  components (1)
  //
  // Buffer is exactly the segment bounds — length=8 means the
  // segment runs from byte 4 to byte 11. The parser checks
  // pos + segLen <= buf.length, so we need 12 bytes total.
  const buf = new Uint8Array(12);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xc0;
  const dv = new DataView(buf.buffer);
  dv.setUint16(4, 8, false);
  buf[6] = 8; // precision
  dv.setUint16(7, height, false);
  dv.setUint16(9, width, false);
  buf[11] = 1;
  return buf;
}

describe("getImageDimensions — JPEG", () => {
  it("reads dimensions from a square JPEG SOF0 marker", () => {
    const dims = getImageDimensions(makeJpeg(256, 256), "image/jpeg");
    expect(dims).toEqual({ width: 256, height: 256 });
  });
  it("reads dimensions from a non-square JPEG", () => {
    const dims = getImageDimensions(makeJpeg(1920, 1080), "image/jpeg");
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });
  it("returns null on a missing SOI marker", () => {
    const buf = makeJpeg(100, 100);
    buf[0] = 0x00;
    expect(getImageDimensions(buf, "image/jpeg")).toBeNull();
  });
});

// ─── WEBP (VP8X) ───────────────────────────────────────────────────
//
// VP8X is the only variant easy to construct by hand — VP8L's
// bit-packed layout is too fiddly for a fixture builder. VP8X
// covers the most-common extended-format case and exercises the
// RIFF/WEBP/fourcc parsing path the other variants share.

function makeWebpVp8x(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30);
  // "RIFF" + size + "WEBP"
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0, 0, 0, 0], 4); // size — irrelevant for parsing dims
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // "VP8X" fourcc
  buf.set([0x56, 0x50, 0x38, 0x58], 12);
  // 3-byte width-1 LE at offset 24
  const w = width - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  const h = height - 1;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

describe("getImageDimensions — WEBP (VP8X)", () => {
  it("reads dimensions from a square VP8X header", () => {
    const dims = getImageDimensions(makeWebpVp8x(1024, 1024), "image/webp");
    expect(dims).toEqual({ width: 1024, height: 1024 });
  });
  it("reads dimensions from a non-square VP8X header", () => {
    const dims = getImageDimensions(makeWebpVp8x(3000, 2000), "image/webp");
    expect(dims).toEqual({ width: 3000, height: 2000 });
  });
});

// ─── SVG ────────────────────────────────────────────────────────────

function makeSvg(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

describe("getImageDimensions — SVG", () => {
  it("reads dimensions from a viewBox", () => {
    const svg = makeSvg(
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"></svg>`,
    );
    expect(getImageDimensions(svg, "image/svg+xml")).toEqual({
      width: 200,
      height: 200,
    });
  });
  it("reads dimensions from a non-square viewBox", () => {
    const svg = makeSvg(
      `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"></svg>`,
    );
    expect(getImageDimensions(svg, "image/svg+xml")).toEqual({
      width: 400,
      height: 300,
    });
  });
  it("falls back to width+height when viewBox is missing", () => {
    const svg = makeSvg(
      `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"></svg>`,
    );
    expect(getImageDimensions(svg, "image/svg+xml")).toEqual({
      width: 128,
      height: 128,
    });
  });
  it("returns null when the SVG has no dimensions", () => {
    const svg = makeSvg(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);
    expect(getImageDimensions(svg, "image/svg+xml")).toBeNull();
  });
});

// ─── isSquare ───────────────────────────────────────────────────────

describe("isSquare", () => {
  it("returns true for equal width + height", () => {
    expect(isSquare({ width: 256, height: 256 })).toBe(true);
  });
  it("returns false for one-pixel off", () => {
    // Strict — see logo-validation.ts file-header.
    expect(isSquare({ width: 256, height: 257 })).toBe(false);
  });
  it("returns false for zero dimensions", () => {
    expect(isSquare({ width: 0, height: 0 })).toBe(false);
  });
});
