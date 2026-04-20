import { describe, it, expect } from "vitest";
import { uid } from "../src/engine/uid";

describe("uid", () => {
  it("returns a string of length 8", () => {
    const id = uid();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(8);
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("contains only alphanumeric chars", () => {
    expect(uid()).toMatch(/^[a-z0-9]+$/);
  });
});
