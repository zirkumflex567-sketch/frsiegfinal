import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db/pool";
import { ensureCoreSchema } from "@/lib/db/bootstrap";

export async function GET() {
  try {
    await ensureCoreSchema();
    const dbPool = getDbPool();
    await dbPool.query("SELECT 1");

    return NextResponse.json({
      ok: true,
      service: "frsiegv2",
      database: "up",
    });
  } catch (error) {
    console.error("health check failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        ok: false,
        service: "frsiegv2",
        database: "down",
      },
      { status: 500 },
    );
  }
}
