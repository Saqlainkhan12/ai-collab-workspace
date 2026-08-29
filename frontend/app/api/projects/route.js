import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request) {
  try {
    await ensureDbInitialized();
    const sql = getSql();

    const projects = await sql`
      SELECT 
        id, 
        name, 
        description, 
        icon, 
        theme, 
        instructions, 
        owner_id, 
        created_at, 
        updated_at
      FROM projects
      ORDER BY created_at DESC;
    `;

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { detail: error.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await ensureDbInitialized();
    const sql = getSql();

    const body = await request.json();
    const { name, description = "", icon = "✦", theme = "dark", instructions = "" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { detail: "Project name is required" },
        { status: 400 }
      );
    }

    // Ensure default user exists
    let users = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1;`;
    let userId;
    if (users.length === 0) {
      const insertedUser = await sql`
        INSERT INTO users (name, email)
        VALUES ('Saqlain', 'saqlain@workspace.ai')
        RETURNING id;
      `;
      userId = insertedUser[0].id;
    } else {
      userId = users[0].id;
    }

    // Insert project
    const insertedProjects = await sql`
      INSERT INTO projects (name, description, icon, theme, instructions, owner_id)
      VALUES (${name.trim()}, ${description.trim()}, ${icon || "✦"}, ${theme || "dark"}, ${instructions || ""}, ${userId})
      RETURNING id, name, description, icon, theme, instructions, owner_id, created_at, updated_at;
    `;

    const project = insertedProjects[0];

    // Insert owner member record
    await sql`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (${project.id}, ${userId}, 'owner')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    `;

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { detail: error.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
