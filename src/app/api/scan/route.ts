import { NextResponse } from "next/server";
import { runReleaseScan } from "@/lib/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const summary = await runReleaseScan();
  return NextResponse.json({ summary });
}
