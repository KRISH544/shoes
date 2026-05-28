import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { runReleaseScan } from "@/lib/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    const querySecret = new URL(request.url).searchParams.get("secret");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

    if (bearer !== secret && querySecret !== secret) {
      return jsonError("Unauthorized.", 401);
    }
  }

  const summary = await runReleaseScan();
  return NextResponse.json({ summary });
}
