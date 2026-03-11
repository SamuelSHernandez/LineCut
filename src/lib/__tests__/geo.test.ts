import { describe, it, expect } from "vitest";
import { getDistanceMiles, formatDistance } from "@/lib/geo";

describe("getDistanceMiles (Haversine)", () => {
  it("returns 0 for identical coordinates", () => {
    const distance = getDistanceMiles(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });

  it("calculates known distance: NYC to LA (~2445 miles)", () => {
    // NYC: 40.7128, -74.0060
    // LA:  34.0522, -118.2437
    const distance = getDistanceMiles(40.7128, -74.006, 34.0522, -118.2437);
    // Known distance is approximately 2451 miles
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("calculates short distance: Katz's to Times Square (~2.5 miles)", () => {
    // Katz's Deli: 40.72232, -73.98738
    // Times Square: 40.758, -73.9855
    const distance = getDistanceMiles(40.72232, -73.98738, 40.758, -73.9855);
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
  });

  it("calculates very short distance within geofence radius", () => {
    // Two points ~50 meters apart near Katz's
    // 1 degree lat = ~69 miles, so 0.0003 degrees ~ 20 meters
    const distance = getDistanceMiles(40.72232, -73.98738, 40.72262, -73.98738);
    const meters = distance * 1609.344;
    expect(meters).toBeGreaterThan(20);
    expect(meters).toBeLessThan(50);
  });

  it("determines inside/outside 100m radius correctly", () => {
    const KATZS_LAT = 40.72232;
    const KATZS_LNG = -73.98738;
    const RADIUS_METERS = 100;

    // Point ~30 meters away (should be inside)
    const closeDistance = getDistanceMiles(
      KATZS_LAT + 0.0002,
      KATZS_LNG,
      KATZS_LAT,
      KATZS_LNG
    );
    expect(closeDistance * 1609.344).toBeLessThan(RADIUS_METERS);

    // Point ~500 meters away (should be outside)
    const farDistance = getDistanceMiles(
      KATZS_LAT + 0.005,
      KATZS_LNG,
      KATZS_LAT,
      KATZS_LNG
    );
    expect(farDistance * 1609.344).toBeGreaterThan(RADIUS_METERS);
  });
});

describe("formatDistance", () => {
  it("formats short distances as blocks", () => {
    expect(formatDistance(0.1)).toBe("2 blocks");
    expect(formatDistance(0.25)).toBe("5 blocks");
  });

  it("uses singular 'block' for 1 block", () => {
    expect(formatDistance(0.05)).toBe("1 block");
  });

  it("formats longer distances as miles", () => {
    expect(formatDistance(1.5)).toBe("1.5 mi");
    expect(formatDistance(2.0)).toBe("2.0 mi");
  });

  it("uses blocks for distances under 0.5 miles", () => {
    expect(formatDistance(0.49)).toContain("block");
  });

  it("uses miles for distances 0.5 miles and above", () => {
    expect(formatDistance(0.5)).toContain("mi");
  });
});
