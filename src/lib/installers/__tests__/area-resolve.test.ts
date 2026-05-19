// Pure-function tests for resolveInstallerArea — the helper that
// turns an installer row into the area-context used on the
// installer-bylined blog post page (directory slug + label + lat/lng
// for the "other installers nearby" query).

import { describe, expect, it } from "vitest";
import { resolveInstallerArea } from "../area-resolve";

describe("resolveInstallerArea", () => {
  it("matches by postcode district when it lines up with a pilot town", () => {
    // S1 is in PILOT_TOWNS for Sheffield.
    const area = resolveInstallerArea({
      postcode: "S1 4HA",
      county: null,
      latitude: 0,
      longitude: 0,
    });
    expect(area).not.toBeNull();
    expect(area?.slug).toBe("sheffield");
    expect(area?.label).toBe("Sheffield");
    // lat/lng should come from the curated town, not the installer
    // row — the installer might be on the postcode boundary while
    // we want the town centroid.
    expect(area?.lat).toBeGreaterThan(53);
    expect(area?.lng).toBeLessThan(0);
  });

  it("falls back to county match when the postcode district isn't curated", () => {
    // "South Yorkshire" lives in Sheffield's town entry.
    const area = resolveInstallerArea({
      postcode: "ZZ99 9ZZ",
      county: "South Yorkshire",
      latitude: 0,
      longitude: 0,
    });
    expect(area?.slug).toBe("sheffield");
    expect(area?.label).toBe("Sheffield");
  });

  it("falls back to installer lat/lng + county label when nothing matches", () => {
    const area = resolveInstallerArea({
      postcode: "ZZ99 9ZZ",
      county: "Made-Up County",
      latitude: 51.5,
      longitude: -0.1,
    });
    expect(area).not.toBeNull();
    expect(area?.slug).toBeNull();
    expect(area?.label).toBe("Made-Up County");
    expect(area?.lat).toBe(51.5);
    expect(area?.lng).toBe(-0.1);
  });

  it("uses a postcode-area label when county is missing too", () => {
    const area = resolveInstallerArea({
      postcode: "ZZ99 9ZZ",
      county: null,
      latitude: 51.5,
      longitude: -0.1,
    });
    expect(area?.slug).toBeNull();
    expect(area?.label).toBe("the ZZ99 area");
  });

  it("returns null when there's nothing to anchor on at all", () => {
    const area = resolveInstallerArea({
      postcode: null,
      county: null,
      latitude: null,
      longitude: null,
    });
    expect(area).toBeNull();
  });

  it("is case-insensitive on postcode district", () => {
    const area = resolveInstallerArea({
      postcode: "s2 3aa",
      county: null,
      latitude: 0,
      longitude: 0,
    });
    expect(area?.slug).toBe("sheffield");
  });
});
