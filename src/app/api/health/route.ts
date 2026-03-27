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
    return NextResponse.json(
      {
        ok: false,
        service: "frsiegv2",
        database: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
