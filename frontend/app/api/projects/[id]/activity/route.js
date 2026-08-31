import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const activities = await sql`
      SELECT 
        id,
        project_id,
        user_name,
        action_type,
        title,
        details,
        created_at
      FROM activity_logs
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();
    const { action_type = "general", title, details = "", user_name = "Saqlain" } = body;

    if (!title) {
      return NextResponse.json({ detail: "Title is required" }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO activity_logs (project_id, user_name, action_type, title, details)
      VALUES (${projectId}, ${user_name}, ${action_type}, ${title}, ${details})
      RETURNING *;
    `;

    return NextResponse.json(inserted[0]);
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    await sql`
      DELETE FROM activity_logs
      WHERE project_id = ${projectId};
    `;

    return NextResponse.json({ success: true, message: "Activity feed cleared" });
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
