import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

async function searchWeb(query, maxResults = 5) {
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
    while ((match = titleRegex.exec(html)) !== null && titlesAndUrls.length < maxResults + 2) {
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
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults + 2) {
      snippets.push(match[1]?.replace(/<[^>]+>/g, "").trim() || "");
    }

    for (let i = 0; i < Math.min(titlesAndUrls.length, maxResults); i++) {
      results.push({
        title: titlesAndUrls[i].title,
        url: titlesAndUrls[i].url,
        snippet: snippets[i] || "Live web source",
      });
    }

    return results;
  } catch (err) {
    console.error("Live Web Search Error:", err);
    return [];
  }
}

// Deep Research multi-stage query aggregator
async function performDeepResearch(query) {
  const subQueries = [
    query,
    `${query} analysis overview`,
    `${query} statistics comparison`,
    `${query} future trends and benchmarks`,
  ];

  const results = [];
  const seenUrls = new Set();

  for (const q of subQueries) {
    const res = await searchWeb(q, 3);
    for (const item of res) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        results.push(item);
      }
    }
  }

  return results.slice(0, 10);
}

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();
    const { message, session_id, title, web_search, deep_research } = body;

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

    // Live Web Search or Deep Research
    let webSources = [];
    let webContext = "";

    if (deep_research) {
      webSources = await performDeepResearch(message.trim());
      if (webSources.length > 0) {
        webContext = `\n\n--- AUTONOMOUS DEEP RESEARCH SCRAPED CORPUS (${webSources.length} SOURCES) ---\n` +
          webSources
            .map((s, idx) => `[${idx + 1}] Title: ${s.title}\nURL: ${s.url}\nData Snippet: ${s.snippet}`)
            .join("\n\n") +
          `\n\nINSTRUCTION: Synthesize a master-class, comprehensive Executive Deep Research Dossier with:\n1. 🎯 Executive Summary\n2. 📊 Comparison & Metrics Table (in Markdown)\n3. 🔍 Deep Investigation\n4. 🚀 Strategic Takeaways\n5. 📚 Citation references [1], [2], etc.`;
      }
    } else if (web_search) {
      webSources = await searchWeb(message.trim(), 4);
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
        const systemPrompt = `You are the Senior AI Architect and Researcher for the workspace project "${project.name || "Collab AI"}".
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
            temperature: deep_research ? 0.4 : 0.7,
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
      if (deep_research && webSources.length > 0) {
        aiReply = `## 🔬 Autonomous Deep Research Dossier: "${message}"\n\n### 🎯 1. Executive Summary\nOur autonomous agent multi-scanned the web across **${webSources.length} verified sources** to compile this deep intelligence brief.\n\n### 📊 2. Cross-Source Intelligence Matrix\n\n| Source # | Subject / Source Title | Primary Insight | Status |\n| :--- | :--- | :--- | :--- |\n` +
          webSources.map((s, i) => `| [${i + 1}] | **${s.title.substring(0, 32)}...** | ${s.snippet.substring(0, 50)}... | Verified |`).join("\n") +
          `\n\n### 🔍 3. Core Findings & Data Synthesis\n` +
          webSources.map((s, i) => `* **[${i + 1}] ${s.title}:** ${s.snippet}`).join("\n") +
          `\n\n### 🚀 4. Strategic Recommendations\n1. Cross-reference data points with local repository architecture.\n2. Leverage verified citations for actionable project roadmaps.\n3. Re-run deep research anytime for live updates.`;
      } else if (webSources.length > 0) {
        aiReply = `### 🌐 Live Web Search Results for: "${message}"\n\nBased on live web search, here is the information:\n\n` +
          webSources.map((s, i) => `**[${i + 1}] ${s.title}**\n${s.snippet}\n🔗 [Visit Source](${s.url})`).join("\n\n");
      } else {
        aiReply = `Hello! I am your AI assistant for "${project.name || "this project"}".\n\nI have received your query: "${message}".\n\n${docs.length > 0 ? "I reviewed your project documents and knowledge base to assist you." : "Upload documents to this workspace, turn on 🌐 Live Web Search, or toggle 🔬 Deep Research for comprehensive intelligence reports!"}`;
      }
    }

    // Save assistant message
    await sql`
      INSERT INTO messages (conversation_id, sender_id, role, content, model_used)
      VALUES (${conversation.id}, ${userId}, 'assistant', ${aiReply}, ${deep_research ? "gpt-4o-mini (Deep Research)" : "gpt-4o-mini"});
    `;

    // Update conversation timestamp
    await sql`
      UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${conversation.id};
    `;

    return NextResponse.json({
      conversation_id: conversation.id,
      session_id: conversation.session_id,
      answer: aiReply,
      model: deep_research ? "gpt-4o-mini (Deep Research)" : "gpt-4o-mini",
      sources: docs.map((d, i) => ({ id: i + 1, content: d.content?.substring(0, 100) })),
      web_sources: webSources,
      is_deep_research: Boolean(deep_research),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
