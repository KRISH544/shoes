import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function getParams<T>(params: T | Promise<T>) {
  return Promise.resolve(params);
}
