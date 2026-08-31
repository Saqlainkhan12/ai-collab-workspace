import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function DELETE(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const docId = parseInt(params.docId, 10);

    await sql`
      DELETE FROM documents
      WHERE id = ${docId} AND project_id = ${projectId};
    `;

    return NextResponse.json({ status: "deleted", document_id: docId });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
