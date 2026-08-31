import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function PATCH(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const taskId = parseInt(params.taskId, 10);

    const body = await request.json();
    const { status, title, description, priority, assignee_name } = body;

    const existing = await sql`
      SELECT * FROM tasks WHERE id = ${taskId} AND project_id = ${projectId} LIMIT 1;
    `;

    if (existing.length === 0) {
      return NextResponse.json({ detail: "Task not found" }, { status: 404 });
    }

    const current = existing[0];
    const newStatus = status !== undefined ? status : current.status;
    const newTitle = title !== undefined ? title : current.title;
    const newDesc = description !== undefined ? description : current.description;
    const newPriority = priority !== undefined ? priority : current.priority;
    const newAssignee = assignee_name !== undefined ? assignee_name : current.assignee_name;

    const updated = await sql`
      UPDATE tasks
      SET 
        status = ${newStatus},
        title = ${newTitle},
        description = ${newDesc},
        priority = ${newPriority},
        assignee_name = ${newAssignee},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId} AND project_id = ${projectId}
      RETURNING *;
    `;

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const taskId = parseInt(params.taskId, 10);

    await sql`
      DELETE FROM tasks
      WHERE id = ${taskId} AND project_id = ${projectId};
    `;

    return NextResponse.json({ status: "deleted", task_id: taskId });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
