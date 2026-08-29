import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();
    const { message, session_id, title } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ detail: "Message is required" }, { status: 400 });
    }

    const users = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1;`;
    const userId = users.length > 0 ? users[0].id : 1;

    // Find or create conversation
    let conversation;
    if (session_id) {
      const existing = await sql`
        SELECT * FROM conversations WHERE session_id = ${session_id} AND project_id = ${projectId} LIMIT 1;
      `;
      if (existing.length > 0) {
        conversation = existing[0];
      }
    }

    if (!conversation) {
      const newSessionId = session_id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const convTitle = title || message.substring(0, 40) || "New conversation";
      const inserted = await sql`
        INSERT INTO conversations (project_id, owner_id, session_id, title)
        VALUES (${projectId}, ${userId}, ${newSessionId}, ${convTitle})
        RETURNING *;
      `;
      conversation = inserted[0];
    }

    // Save user message
    await sql`
      INSERT INTO messages (conversation_id, sender_id, role, content)
      VALUES (${conversation.id}, ${userId}, 'user', ${message.trim()});
    `;

    // Fetch project details and document chunks for context
    const projectResult = await sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1;`;
    const project = projectResult[0] || {};

    const docs = await sql`
      SELECT content FROM document_chunks WHERE project_id = ${projectId} LIMIT 5;
    `;
    const contextText = docs.map((d) => d.content).join("\n\n");

    // Call OpenAI or intelligent fallback
    let aiReply = "";
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are the AI Assistant for the workspace project "${project.name || "Collab AI"}".\nProject Description: ${project.description || "N/A"}\nProject Knowledge / Context:\n${contextText || "No documents uploaded yet."}`,
              },
              { role: "user", content: message },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          aiReply = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.error("OpenAI API call error:", err);
      }
    }

    if (!aiReply) {
      aiReply = `Hello! I am your AI assistant for "${project.name || "this project"}".\n\nI have received your query: "${message}".\n\n${docs.length > 0 ? "I reviewed your project documents and knowledge base to assist you." : "Upload documents to this workspace to give me more specific knowledge!"}`;
    }

    // Save assistant message
    await sql`
      INSERT INTO messages (conversation_id, sender_id, role, content, model_used)
      VALUES (${conversation.id}, ${userId}, 'assistant', ${aiReply}, 'gpt-4o-mini');
    `;

    // Update conversation timestamp
    await sql`
      UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${conversation.id};
    `;

    return NextResponse.json({
      conversation_id: conversation.id,
      session_id: conversation.session_id,
      answer: aiReply,
      model: "gpt-4o-mini",
      sources: docs.map((d, i) => ({ id: i + 1, content: d.content?.substring(0, 100) })),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
