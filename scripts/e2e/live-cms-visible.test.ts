import { describe, expect, it } from "vitest";
import {
  normalizePathPrefix,
  buildRuntimeConfig,
  buildStatusPayload,
} from "./live-cms-visible.cjs";

describe("live-cms-visible helpers", () => {
  it("normalizes empty and slash-only prefixes to root", () => {
    expect(normalizePathPrefix("")).toBe("");
    expect(normalizePathPrefix("/")).toBe("");
    expect(normalizePathPrefix("///")).toBe("");
  });

  it("normalizes path prefix to one leading slash without trailing slash", () => {
    expect(normalizePathPrefix("fr-sieg")).toBe("/fr-sieg");
    expect(normalizePathPrefix("/fr-sieg/")).toBe("/fr-sieg");
  });

  it("builds local-first defaults while preserving env overrides", () => {
    const localConfig = buildRuntimeConfig({});
    expect(localConfig.baseUrl).toBe("http://localhost:3000");
    expect(localConfig.pathPrefix).toBe("");

    const overridden = buildRuntimeConfig({
      FRSIEG_BASE_URL: "https://h-town.duckdns.org",
      FRSIEG_PATH_PREFIX: "/fr-sieg/",
    });
    expect(overridden.baseUrl).toBe("https://h-town.duckdns.org");
    expect(overridden.pathPrefix).toBe("/fr-sieg");
  });

  it("emits machine-readable payloads with artifact path and failure context", () => {
    const payload = buildStatusPayload({
      ok: false,
      step: "save",
      action: "save-content",
      endpoint: "/api/admin/content-pages/home",
      artifactPath: ".gsd/pw-live-cms-error.png",
      message: "500 from save endpoint",
      finalUrl: "http://localhost:3000/admin",
    });

    expect(payload.ok).toBe(false);
    expect(payload.step).toBe("save");
    expect(payload.action).toBe("save-content");
    expect(payload.endpoint).toBe("/api/admin/content-pages/home");
    expect(payload.artifactPath).toContain("pw-live-cms-error.png");
    expect(payload.message).toContain("500");
    expect(payload.finalUrl).toContain("/admin");
  });
});
