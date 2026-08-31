import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

async function searchWeb(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results = [];

    const titleRegex = /<h2 class="result__title">[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;

    const titlesAndUrls = [];
    let match;
    while ((match = titleRegex.exec(html)) !== null && titlesAndUrls.length < 5) {
      let rawUrl = match[1] || "";
      let title = match[2]?.replace(/<[^>]+>/g, "").trim() || "";
      if (rawUrl.includes("uddg=")) {
        rawUrl = decodeURIComponent(rawUrl.split("uddg=")[1]?.split("&")[0] || "");
      }
      if (title && rawUrl && rawUrl.startsWith("http")) {
        titlesAndUrls.push({ title, url: rawUrl });
      }
    }

    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      snippets.push(match[1]?.replace(/<[^>]+>/g, "").trim() || "");
    }

    for (let i = 0; i < Math.min(titlesAndUrls.length, 4); i++) {
      results.push({
        title: titlesAndUrls[i].title,
        url: titlesAndUrls[i].url,
        snippet: snippets[i] || "Live search result",
      });
    }

    return results;
  } catch (err) {
    console.error("Live Web Search Error:", err);
    return [];
  }
}

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();
    const { message, session_id, title, web_search } = body;

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

    // Optional Live Web Search (Perplexity Mode)
    let webSources = [];
    let webContext = "";
    if (web_search) {
      webSources = await searchWeb(message.trim());
      if (webSources.length > 0) {
        webContext = `\n\n--- REAL-TIME LIVE WEB SEARCH RESULTS ---\n` +
          webSources
            .map((s, idx) => `[${idx + 1}] Title: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`)
            .join("\n\n") +
          `\n\nPlease cite sources using [1], [2], etc., where applicable.`;
      }
    }

    // Call OpenAI or intelligent fallback
    let aiReply = "";
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = `You are the AI Assistant for the workspace project "${project.name || "Collab AI"}".
Project Description: ${project.description || "N/A"}
Project Knowledge / Context:
${contextText || "No workspace documents uploaded yet."}
${webContext}`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
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
      if (webSources.length > 0) {
        aiReply = `### 🌐 Live Web Search Results for: "${message}"\n\nBased on live web search, here is the information:\n\n` +
          webSources.map((s, i) => `**[${i + 1}] ${s.title}**\n${s.snippet}\n🔗 [Visit Source](${s.url})`).join("\n\n");
      } else {
        aiReply = `Hello! I am your AI assistant for "${project.name || "this project"}".\n\nI have received your query: "${message}".\n\n${docs.length > 0 ? "I reviewed your project documents and knowledge base to assist you." : "Upload documents to this workspace or turn on 🌐 Live Web Search for real-time answers!"}`;
      }
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
      web_sources: webSources,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
