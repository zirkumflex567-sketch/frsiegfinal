import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureCoreSchemaMock = vi.fn();
const dbQueryMock = vi.fn();
const getDbPoolMock = vi.fn();

vi.mock("@/lib/db/bootstrap", () => ({
  ensureCoreSchema: ensureCoreSchemaMock,
}));

vi.mock("@/lib/db/pool", () => ({
  getDbPool: getDbPoolMock,
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDbPoolMock.mockReturnValue({ query: dbQueryMock });
  });

  it("returns machine-readable healthy contract when schema + db probe succeed", async () => {
    ensureCoreSchemaMock.mockResolvedValue(undefined);
    dbQueryMock.mockResolvedValue({ rows: [{ "?column?": 1 }] });

    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "frsiegv2",
      database: "up",
    });
    expect(ensureCoreSchemaMock).toHaveBeenCalledTimes(1);
    expect(dbQueryMock).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns deterministic degraded contract when bootstrap fails", async () => {
    ensureCoreSchemaMock.mockRejectedValue(new Error("database://user:pass@host unavailable"));

    const { GET } = await import("./route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      service: "frsiegv2",
      database: "down",
    });
    expect(body).not.toHaveProperty("error");
    expect(dbQueryMock).not.toHaveBeenCalled();
  });

  it("returns deterministic degraded contract when db probe fails", async () => {
    ensureCoreSchemaMock.mockResolvedValue(undefined);
    dbQueryMock.mockRejectedValue(new Error("db timeout"));

    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      service: "frsiegv2",
      database: "down",
    });
  });
});
