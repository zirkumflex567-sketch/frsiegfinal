import { describe, expect, it } from "vitest";
import {
  parseJsonSafely,
  resolveApiErrorMessage,
} from "./page";

describe("admin/login page helpers", () => {
  it("returns API error when payload provides non-empty error string", () => {
    expect(resolveApiErrorMessage({ error: "Ungültige Zugangsdaten." }, "Login fehlgeschlagen.")).toBe(
      "Ungültige Zugangsdaten.",
    );
  });

  it("falls back to deterministic error for malformed payload shapes", () => {
    expect(resolveApiErrorMessage({ error: "" }, "Login fehlgeschlagen.")).toBe("Login fehlgeschlagen.");
    expect(resolveApiErrorMessage({ message: "x" }, "Login fehlgeschlagen.")).toBe("Login fehlgeschlagen.");
    expect(resolveApiErrorMessage(null, "Login fehlgeschlagen.")).toBe("Login fehlgeschlagen.");
  });

  it("returns null when response body is malformed JSON", async () => {
    const response = new Response("not-json", {
      status: 500,
      headers: { "content-type": "application/json" },
    });

    await expect(parseJsonSafely(response)).resolves.toBeNull();
  });
});
