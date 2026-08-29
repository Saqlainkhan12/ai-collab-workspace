import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const conversations = await sql`
      SELECT id, project_id, owner_id, session_id, title, parent_conversation_id, created_at, updated_at
      FROM conversations
      WHERE project_id = ${projectId}
      ORDER BY updated_at DESC;
    `;

    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json().catch(() => ({}));
    const title = body.title || "New conversation";
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const users = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1;`;
    const userId = users.length > 0 ? users[0].id : 1;

    const inserted = await sql`
      INSERT INTO conversations (project_id, owner_id, session_id, title)
      VALUES (${projectId}, ${userId}, ${sessionId}, ${title})
      RETURNING id, project_id, owner_id, session_id, title, created_at, updated_at;
    `;

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
