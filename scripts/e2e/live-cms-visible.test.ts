import { describe, expect, it } from "vitest";
import {
  normalizePathPrefix,
  buildRuntimeConfig,
  buildStatusPayload,
  buildUrl,
  parseResponseJson,
  SmokeError,
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
    expect(normalizePathPrefix(" /nested/path/ ")).toBe("/nested/path");
  });

  it("builds urls with normalized path prefixes", () => {
    const config = {
      ...buildRuntimeConfig({
        FRSIEG_BASE_URL: "http://localhost:3000/",
        FRSIEG_PATH_PREFIX: "///fr-sieg///",
      }),
    };

    expect(buildUrl(config, "/admin/login")).toBe("http://localhost:3000/fr-sieg/admin/login");
    expect(buildUrl(config, "admin")).toBe("http://localhost:3000/fr-sieg/admin");
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
      detail: { timeoutMs: 20000 },
    });

    expect(payload.ok).toBe(false);
    expect(payload.step).toBe("save");
    expect(payload.action).toBe("save-content");
    expect(payload.endpoint).toBe("/api/admin/content-pages/home");
    expect(payload.artifactPath).toContain("pw-live-cms-error.png");
    expect(payload.message).toContain("500");
    expect(payload.detail).toEqual({ timeoutMs: 20000 });
    expect(payload.finalUrl).toContain("/admin");
  });

  it("defaults optional action/endpoint/detail fields to null", () => {
    const payload = buildStatusPayload({
      ok: false,
      step: "login-page",
      artifactPath: ".gsd/pw-live-cms-error-login-page.png",
      message: "navigation timeout",
    });

    expect(payload.action).toBeNull();
    expect(payload.endpoint).toBeNull();
    expect(payload.detail).toBeNull();
  });

  it("parses valid endpoint JSON bodies", async () => {
    const response = {
      text: async () => JSON.stringify({ ok: true, id: "home" }),
      status: () => 200,
    };

    await expect(
      parseResponseJson(response as never, {
        step: "save",
        action: "save-content",
        endpoint: "/api/admin/pages/:id",
      }),
    ).resolves.toEqual({ ok: true, id: "home" });
  });

  it("throws SmokeError with context when endpoint JSON is malformed", async () => {
    const response = {
      text: async () => "{not-json",
      status: () => 502,
    };

    await expect(
      parseResponseJson(response as never, {
        step: "login-submit",
        action: "admin-login",
        endpoint: "/api/admin/login",
      }),
    ).rejects.toMatchObject({
      name: "SmokeError",
      message: "Malformed JSON response from endpoint",
      context: expect.objectContaining({
        step: "login-submit",
        action: "admin-login",
        endpoint: "/api/admin/login",
        status: 502,
      }),
    });
  });

  it("exposes SmokeError instances for machine-readable triage", () => {
    const error = new SmokeError("save failed", {
      step: "save",
      action: "save-content",
      endpoint: "/api/admin/pages/:id",
    });

    expect(error.name).toBe("SmokeError");
    expect(error.context).toEqual({
      step: "save",
      action: "save-content",
      endpoint: "/api/admin/pages/:id",
    });
  });
});
