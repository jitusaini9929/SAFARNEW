import { describe, it, expect } from "vitest";
import {
  computeAndroidOnTrackStatus,
} from "../InsightsPanel";

// ── computeAndroidOnTrackStatus ─────────────────────────────────────────────

describe("computeAndroidOnTrackStatus", () => {
  it("returns on_track when remaining is 0", () => {
    expect(computeAndroidOnTrackStatus(5, 3, 10, 0)).toBe("on_track");
  });

  it("returns needs_data when requiredPerDay is null", () => {
    expect(computeAndroidOnTrackStatus(null, 3, 10, 5)).toBe("needs_data");
  });

  it("returns needs_data when requiredPerDay is undefined", () => {
    expect(computeAndroidOnTrackStatus(undefined, 3, 10, 5)).toBe("needs_data");
  });

  it("returns needs_data when daysBuffer is null", () => {
    expect(computeAndroidOnTrackStatus(2, 3, null, 5)).toBe("needs_data");
  });

  it("returns on_track when pace is comfortable and buffer is positive", () => {
    expect(computeAndroidOnTrackStatus(2, 3, 5, 10)).toBe("on_track");
  });

  it("returns at_risk when pace is slightly above goal (within 1.5x)", () => {
    // 4 / 3 = 1.33x — at_risk threshold
    expect(computeAndroidOnTrackStatus(4, 3, 2, 10)).toBe("at_risk");
  });

  it("returns behind when pace exceeds 1.5x daily goal (within 2.5x)", () => {
    // 6 / 3 = 2.0x — behind threshold
    expect(computeAndroidOnTrackStatus(6, 3, -2, 10)).toBe("behind");
  });

  it("returns broken when pace exceeds 2.5x daily goal", () => {
    // 10 / 3 = 3.33x — broken threshold
    expect(computeAndroidOnTrackStatus(10, 3, -5, 10)).toBe("broken");
  });

  it("returns on_track at exact daily goal with positive buffer", () => {
    expect(computeAndroidOnTrackStatus(3, 3, 0, 10)).toBe("on_track");
  });
});

