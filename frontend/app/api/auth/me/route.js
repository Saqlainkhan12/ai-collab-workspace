import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET() {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const users = await sql`SELECT id, name, email FROM users ORDER BY id ASC LIMIT 1;`;
    if (users.length === 0) {
      return NextResponse.json({ id: 1, name: "Saqlain", email: "saqlain@workspace.ai" });
    }
    return NextResponse.json(users[0]);
  } catch (error) {
    return NextResponse.json({ id: 1, name: "Saqlain", email: "saqlain@workspace.ai" });
  }
}
