// Tests for the installer-notification email resolver. The whole
// point of this helper is to fall back to the bound user's auth
// email when installers.email is null — a pattern that broke
// silently in production before the fix because many MCS rows
// have null emails.

import { describe, expect, it, vi } from "vitest";
import { resolveInstallerNotifyEmail } from "../notify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

// Minimal admin-client stub — only auth.admin.getUserById is used by
// the helper. We type-assert via unknown so we don't need to mock
// the entire SupabaseClient surface.
function buildAdmin(opts: {
  user?: { email: string | null } | null;
  shouldThrow?: boolean;
  shouldError?: boolean;
}): AdminClient {
  return {
    auth: {
      admin: {
        getUserById: vi.fn(async () => {
          if (opts.shouldThrow) throw new Error("boom");
          if (opts.shouldError) {
            return {
              data: { user: null },
              error: { message: "user not found", code: 404 },
            };
          }
          return {
            data: opts.user ? { user: opts.user } : { user: null },
            error: null,
          };
        }),
      },
    },
  } as unknown as AdminClient;
}

// ─── Direct email path ─────────────────────────────────────────────

describe("resolveInstallerNotifyEmail — direct email", () => {
  it("returns installers.email when set", async () => {
    const admin = buildAdmin({});
    const out = await resolveInstallerNotifyEmail(admin, {
      email: "ops@installer.com",
      user_id: "any",
    });
    expect(out).toBe("ops@installer.com");
  });

  it("trims surrounding whitespace on the direct email", async () => {
    const admin = buildAdmin({});
    const out = await resolveInstallerNotifyEmail(admin, {
      email: "  ops@installer.com   ",
      user_id: "any",
    });
    expect(out).toBe("ops@installer.com");
  });

  it("does NOT call the auth lookup when direct email is set", async () => {
    const admin = buildAdmin({ user: { email: "fallback@x.com" } });
    await resolveInstallerNotifyEmail(admin, {
      email: "primary@x.com",
      user_id: "user-123",
    });
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });
});

// ─── Auth-email fallback ──────────────────────────────────────────

describe("resolveInstallerNotifyEmail — auth fallback", () => {
  it("returns the bound user's auth email when installer.email is null", async () => {
    const admin = buildAdmin({ user: { email: "owner@gmail.com" } });
    const out = await resolveInstallerNotifyEmail(admin, {
      email: null,
      user_id: "user-123",
    });
    expect(out).toBe("owner@gmail.com");
    expect(admin.auth.admin.getUserById).toHaveBeenCalledWith("user-123");
  });

  it("treats empty/whitespace-only direct email as null + falls back", async () => {
    const admin = buildAdmin({ user: { email: "owner@gmail.com" } });
    const out = await resolveInstallerNotifyEmail(admin, {
      email: "   ",
      user_id: "user-123",
    });
    expect(out).toBe("owner@gmail.com");
  });

  it("returns null when both installer.email and user.email are missing", async () => {
    const admin = buildAdmin({ user: { email: null } });
    const out = await resolveInstallerNotifyEmail(admin, {
      email: null,
      user_id: "user-123",
    });
    expect(out).toBeNull();
  });

  it("returns null when user_id is also null (nothing to look up)", async () => {
    const admin = buildAdmin({});
    const out = await resolveInstallerNotifyEmail(admin, {
      email: null,
      user_id: null,
    });
    expect(out).toBeNull();
    expect(admin.auth.admin.getUserById).not.toHaveBeenCalled();
  });
});

// ─── Failure modes ────────────────────────────────────────────────
//
// Both branches return null + log; the caller decides whether to
// skip the email or fail the request.

describe("resolveInstallerNotifyEmail — failure modes", () => {
  it("returns null when the auth lookup errors", async () => {
    const admin = buildAdmin({ shouldError: true });
    const out = await resolveInstallerNotifyEmail(admin, {
      email: null,
      user_id: "user-123",
    });
    expect(out).toBeNull();
  });

  it("swallows thrown exceptions and returns null", async () => {
    const admin = buildAdmin({ shouldThrow: true });
    const out = await resolveInstallerNotifyEmail(admin, {
      email: null,
      user_id: "user-123",
    });
    expect(out).toBeNull();
  });
});
