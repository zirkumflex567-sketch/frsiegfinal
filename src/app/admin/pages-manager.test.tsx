import { describe, expect, it } from "vitest";
import {
  parseJsonSafely,
  resolveApiErrorMessage,
} from "./pages-manager";

describe("admin/pages-manager helpers", () => {
  it("uses endpoint-provided error when available", () => {
    expect(resolveApiErrorMessage({ error: "Speichern nicht möglich." }, "Speichern fehlgeschlagen.")).toBe(
      "Speichern nicht möglich.",
    );
  });

  it("falls back for malformed/unknown error payloads", () => {
    expect(resolveApiErrorMessage({ error: 500 }, "Speichern fehlgeschlagen.")).toBe(
      "Speichern fehlgeschlagen.",
    );
    expect(resolveApiErrorMessage("bad", "Speichern fehlgeschlagen.")).toBe(
      "Speichern fehlgeschlagen.",
    );
  });

  it("parses valid JSON and returns null for malformed JSON", async () => {
    const okResponse = new Response(JSON.stringify({ pages: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const malformedResponse = new Response("<html>nope</html>", {
      status: 502,
      headers: { "content-type": "application/json" },
    });

    await expect(parseJsonSafely(okResponse)).resolves.toEqual({ pages: [] });
    await expect(parseJsonSafely(malformedResponse)).resolves.toBeNull();
  });
});
