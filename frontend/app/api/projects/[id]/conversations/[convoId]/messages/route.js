import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const convoId = parseInt(params.convoId, 10);

    const convoResult = await sql`
      SELECT id, project_id, owner_id, session_id, title, created_at, updated_at
      FROM conversations
      WHERE id = ${convoId} AND project_id = ${projectId}
      LIMIT 1;
    `;

    if (convoResult.length === 0) {
      return NextResponse.json({ detail: "Conversation not found" }, { status: 404 });
    }

    const messages = await sql`
      SELECT id, conversation_id, sender_id, role, content, model_used, created_at
      FROM messages
      WHERE conversation_id = ${convoId}
      ORDER BY created_at ASC;
    `;

    return NextResponse.json({
      conversation: convoResult[0],
      messages: messages,
    });
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
