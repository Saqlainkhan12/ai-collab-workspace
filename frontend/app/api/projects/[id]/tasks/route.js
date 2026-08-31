import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const tasks = await sql`
      SELECT id, project_id, title, description, status, priority, assignee_name, source, created_at, updated_at
      FROM tasks
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC;
    `;

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const body = await request.json();
    const {
      title,
      description = "",
      status = "todo",
      priority = "medium",
      assignee_name = "Unassigned",
      source = "manual",
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ detail: "Task title is required" }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO tasks (project_id, title, description, status, priority, assignee_name, source)
      VALUES (${projectId}, ${title.trim()}, ${description.trim()}, ${status}, ${priority}, ${assignee_name}, ${source})
      RETURNING *;
    `;

    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
