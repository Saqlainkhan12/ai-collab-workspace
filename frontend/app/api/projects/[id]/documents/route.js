import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const documents = await sql`
      SELECT id, filename, file_type, status, error_message, created_at
      FROM documents
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC;
    `;

    return NextResponse.json(
      documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        file_type: doc.file_type,
        status: doc.status,
        error: doc.error_message,
        created_at: doc.created_at,
      }))
    );
  } catch (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
