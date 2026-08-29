import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name || "document.txt";
    const fileType = file.type || "text/plain";
    const textContent = await file.text();

    const users = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1;`;
    const userId = users.length > 0 ? users[0].id : 1;

    const insertedDocs = await sql`
      INSERT INTO documents (project_id, filename, file_type, file_path, uploaded_by, status)
      VALUES (${projectId}, ${filename}, ${fileType}, ${filename}, ${userId}, 'completed')
      RETURNING id, filename, status, created_at;
    `;

    const docId = insertedDocs[0].id;

    // Simple chunking (split into 500 character paragraphs)
    const chunks = textContent.match(/[\s\S]{1,500}/g) || [textContent];

    for (let i = 0; i < chunks.length; i++) {
      await sql`
        INSERT INTO document_chunks (document_id, project_id, chunk_index, content)
        VALUES (${docId}, ${projectId}, ${i}, ${chunks[i]});
      `;
    }

    return NextResponse.json({
      status: "uploaded",
      document_id: docId,
      filename: filename,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
