import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    // Fetch latest messages from all conversations in this project
    const recentMessages = await sql`
      SELECT m.role, m.content, m.created_at, u.name as sender_name
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE c.project_id = ${projectId}
      ORDER BY m.created_at DESC
      LIMIT 15;
    `;

    if (recentMessages.length === 0) {
      return NextResponse.json({
        tasks: [],
        message: "No chat messages found in this project to extract tasks from.",
      });
    }

    const conversationText = recentMessages
      .reverse()
      .map((m) => `${m.role === "user" ? (m.sender_name || "User") : "AI Assistant"}: ${m.content}`)
      .join("\n\n");

    let extractedTasks = [];
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
                content:
                  "You are an AI Project Manager. Analyze the team chat transcript and extract 2 to 5 actionable tasks. Return ONLY a valid JSON array of objects with keys: title (string, concise), description (string, brief explanation), priority ('high'|'medium'|'low'), assignee_name (string, e.g. person mentioned or 'Team'). Do not wrap in markdown code fences.",
              },
              {
                role: "user",
                content: `Chat Transcript:\n${conversationText}`,
              },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.choices?.[0]?.message?.content?.trim() || "[]";
          const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          try {
            extractedTasks = JSON.parse(cleanedText);
          } catch (pErr) {
            console.error("JSON parse error for extracted tasks:", pErr);
          }
        }
      } catch (err) {
        console.error("AI Task Extraction call error:", err);
      }
    }

    // Heuristic fallback if AI API was not used or returned empty
    if (!Array.isArray(extractedTasks) || extractedTasks.length === 0) {
      // Split messages into sentences and look for action keywords
      const lines = recentMessages.map((m) => m.content).join("\n").split(/[.\n!?]+/);
      const candidates = lines
        .map((l) => l.trim())
        .filter((l) => l.length > 10 && l.length < 120);

      const actionKeywords = ["todo", "task", "implement", "create", "build", "design", "add", "fix", "update", "check", "setup", "configure", "review", "karo", "banao", "dekh"];
      const matched = candidates.filter((c) =>
        actionKeywords.some((kw) => c.toLowerCase().includes(kw))
      );

      if (matched.length > 0) {
        extractedTasks = matched.slice(0, 3).map((item, idx) => ({
          title: item.replace(/^[-*•\d.]+\s*/, ""),
          description: "Extracted automatically from conversation discussion.",
          priority: idx === 0 ? "high" : "medium",
          assignee_name: "Team",
        }));
      } else {
        extractedTasks = [
          {
            title: `Review discussion in project chat`,
            description: "Follow up on recent conversation topics and questions.",
            priority: "medium",
            assignee_name: "Team",
          },
        ];
      }
    }

    // Insert extracted tasks into database
    const savedTasks = [];
    for (const item of extractedTasks) {
      if (!item.title) continue;
      const inserted = await sql`
        INSERT INTO tasks (project_id, title, description, status, priority, assignee_name, source)
        VALUES (
          ${projectId},
          ${item.title.substring(0, 500)},
          ${(item.description || "").substring(0, 1000)},
          'todo',
          ${['high', 'medium', 'low'].includes(item.priority?.toLowerCase()) ? item.priority.toLowerCase() : 'medium'},
          ${(item.assignee_name || "Team").substring(0, 150)},
          'ai_extracted'
        )
        RETURNING *;
      `;
      savedTasks.push(inserted[0]);
    }

    return NextResponse.json({
      tasks: savedTasks,
      count: savedTasks.length,
      message: `Successfully extracted ${savedTasks.length} task(s) from chat!`,
    });
  } catch (error) {
    console.error("Task extraction route error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
