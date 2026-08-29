import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const members = await sql`
      SELECT 
        pm.id,
        pm.user_id,
        u.name,
        u.email,
        pm.role,
        pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ${projectId}
      ORDER BY pm.joined_at ASC;
    `;

    return NextResponse.json(members);
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
    const { email, role = "member" } = body;

    let users = await sql`SELECT id, name, email FROM users WHERE email = ${email} LIMIT 1;`;
    let user;
    if (users.length === 0) {
      const name = email.split("@")[0];
      const inserted = await sql`
        INSERT INTO users (name, email)
        VALUES (${name}, ${email})
        RETURNING id, name, email;
      `;
      user = inserted[0];
    } else {
      user = users[0];
    }

    const insertedMember = await sql`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (${projectId}, ${user.id}, ${role})
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET role = ${role}
      RETURNING id, project_id, user_id, role, joined_at;
    `;

    return NextResponse.json({
      id: insertedMember[0].id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: insertedMember[0].role,
    });
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
