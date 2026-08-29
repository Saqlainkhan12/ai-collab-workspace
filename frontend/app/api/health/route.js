import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db";

export async function GET() {
  await ensureDbInitialized();
  return NextResponse.json({
    status: "ok",
    service: "AI Collaborative Project Workspace API",
    version: "1.0.0",
  });
}
