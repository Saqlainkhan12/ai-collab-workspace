import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const projects = await sql`
      SELECT id, name, description, icon, theme, instructions, owner_id, created_at, updated_at
      FROM projects
      WHERE id = ${projectId}
      LIMIT 1;
    `;

    if (projects.length === 0) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(projects[0]);
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();

    const existing = await sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1;`;
    if (existing.length === 0) {
      return NextResponse.json({ detail: "Project not found" }, { status: 404 });
    }

    const current = existing[0];
    const name = body.name !== undefined ? body.name : current.name;
    const description = body.description !== undefined ? body.description : current.description;
    const icon = body.icon !== undefined ? body.icon : current.icon;
    const theme = body.theme !== undefined ? body.theme : current.theme;
    const instructions = body.instructions !== undefined ? body.instructions : current.instructions;

    const updated = await sql`
      UPDATE projects
      SET 
        name = ${name},
        description = ${description},
        icon = ${icon},
        theme = ${theme},
        instructions = ${instructions},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId}
      RETURNING id, name, description, icon, theme, instructions, owner_id, created_at, updated_at;
    `;

    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    await sql`DELETE FROM projects WHERE id = ${projectId};`;

    return NextResponse.json({ status: "deleted", project_id: projectId });
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
