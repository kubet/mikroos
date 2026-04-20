import { describe, it, expect } from "vitest";
import { skills, searchSkills, getSkill, skillsList } from "../src/engine/skills";

describe("skills", () => {
  it("has at least 5 skills", () => {
    expect(skills.length).toBeGreaterThanOrEqual(5);
  });

  it("each skill has required fields", () => {
    for (const s of skills) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.content.length).toBeGreaterThan(50);
    }
  });

  describe("searchSkills", () => {
    it("finds react skill", () => {
      const results = searchSkills("react");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("react");
    });

    it("finds by description content", () => {
      const results = searchSkills("CDN");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for no match", () => {
      expect(searchSkills("zzzznothing")).toEqual([]);
    });
  });

  describe("getSkill", () => {
    it("gets skill by exact name", () => {
      expect(getSkill("react")?.name).toBe("react");
      expect(getSkill("vue")?.name).toBe("vue");
    });

    it("is case insensitive", () => {
      expect(getSkill("React")?.name).toBe("react");
    });

    it("returns undefined for unknown", () => {
      expect(getSkill("nope")).toBeUndefined();
    });
  });

  it("skillsList includes all names", () => {
    const list = skillsList();
    for (const s of skills) {
      expect(list).toContain(s.name);
    }
  });

  it("skill content has file templates", () => {
    const react = getSkill("react")!;
    expect(react.content).toContain("index.html");
    expect(react.content).toContain("app.jsx");
    expect(react.content).toContain("style.css");
    expect(react.content.toLowerCase()).toContain("write");
  });
});
