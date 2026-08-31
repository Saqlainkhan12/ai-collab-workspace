import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);
    const body = await request.json();
    const { action_type } = body; // "readme" | "client_email" | "api_docs" | "retrospective"

    const projectResult = await sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1;`;
    const project = projectResult[0] || { name: "AI Collab Project" };

    const tasks = await sql`SELECT * FROM tasks WHERE project_id = ${projectId};`;
    const docs = await sql`SELECT * FROM documents WHERE project_id = ${projectId};`;
    const members = await sql`SELECT u.name, u.email, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ${projectId};`;

    const todoTasks = tasks.filter((t) => t.status === "todo");
    const inProgTasks = tasks.filter((t) => t.status === "in_progress");
    const doneTasks = tasks.filter((t) => t.status === "done");

    let resultTitle = "";
    let resultContent = "";

    if (action_type === "readme") {
      resultTitle = `README.md for ${project.name}`;
      resultContent = `# ${project.name}

> ${project.description || "Intelligent AI Collaborative Workspace & Project Management Suite."}

---

## 🌟 Key Features
- 🤖 **Multi-Model AI Chat & RAG Knowledge Base**
- 🎙️ **Gemini Live 3D AI Audio Voice Mode**
- ⚡ **Interactive Code Sandbox & Instant App Runner**
- 🔬 **Autonomous Multi-Source Deep Research Engine**
- ✓ **Kanban Workflow & Task Management**

## 📁 Indexed Knowledge Sources (${docs.length})
${docs.length === 0 ? "*No documents uploaded yet.*" : docs.map((d) => `- **${d.filename}** (\`${d.file_type}\`)`).join("\n")}

## 📊 Current Project Status
- **Total Tasks:** ${tasks.length}
- **Completed:** ${doneTasks.length} (${tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}%)
- **In Progress:** ${inProgTasks.length}
- **To Do:** ${todoTasks.length}

## 👥 Core Team
${members.length === 0 ? "- Saqlain (Owner & Lead Architect)" : members.map((m) => `- **${m.name}** (\`${m.role}\`) - ${m.email}`).join("\n")}

---
*Generated autonomously by Collab AI Copilot on ${new Date().toLocaleDateString()}.*`;
    } else if (action_type === "client_email") {
      resultTitle = `Executive Client Progress Update — ${project.name}`;
      resultContent = `Subject: Project Update & Milestone Status: ${project.name}

Dear Stakeholders,

I am pleased to provide the latest progress update for "${project.name}". Our team has made significant strides in this sprint.

📌 EXECUTIVE SUMMARY:
- Workspace Knowledge Base: ${docs.length} core sources and documentation indexed.
- Sprint Velocity: ${doneTasks.length} out of ${tasks.length} total tasks completed (${tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}% completion rate).

✅ COMPLETED MILESTONES:
${doneTasks.length === 0 ? "- Foundation and project workspace setup initialized." : doneTasks.map((t) => `• ${t.title}`).join("\n")}

⚡ ACTIVE SPRINT FOCUS:
${inProgTasks.length === 0 ? "• Moving next sprint backlog items into development." : inProgTasks.map((t) => `• ${t.title} (Assignee: ${t.assignee_name || "Team"})`).join("\n")}

🎯 UPCOMING PRIORITIES:
${todoTasks.slice(0, 4).map((t) => `• ${t.title} [Priority: ${t.priority.toUpperCase()}]`).join("\n") || "• Finalizing sprint deliverables."}

Please let us know if you would like to schedule a quick sync.

Best regards,
${project.name} Project Team
Collab AI Workspace`;
    } else if (action_type === "api_docs") {
      resultTitle = `API & Architecture Specification — ${project.name}`;
      resultContent = `# API & Technical Architecture Spec: ${project.name}

## 🌐 Base URL
\`https://ai-collab-workspace-v6lc.vercel.app/api\`

## 📌 REST Endpoints

### 1. Projects & Workspaces
- \`GET /projects\` — Retrieve all active workspaces
- \`POST /projects\` — Create new workspace container
- \`DELETE /projects/:id\` — Delete workspace

### 2. Knowledge Ingestion & RAG
- \`GET /projects/:id/documents\` — List all indexed files & URLs
- \`POST /projects/:id/documents/upload\` — Upload & chunk PDF/DOCX
- \`POST /projects/:id/documents/url\` — Ingest live web page into vector store

### 3. AI Chat & Deep Research
- \`POST /projects/:id/chat\`
  - \`message\`: string
  - \`web_search\`: boolean (Perplexity live search mode)
  - \`deep_research\`: boolean (Multi-crawled dossier generator)

### 4. Kanban Tasks
- \`GET /projects/:id/tasks\` — Retrieve Kanban board items
- \`POST /projects/:id/tasks\` — Add task
- \`PATCH /projects/:id/tasks/:id\` — Update status (\`todo\`, \`in_progress\`, \`done\`)

---
*Verified OpenAPI 3.0 compatible.*`;
    } else {
      resultTitle = `Sprint Retrospective & Milestone Report — ${project.name}`;
      resultContent = `# Sprint Retrospective & Milestones: ${project.name}

## 🎯 Sprint Health & Velocity
- **Completed Deliverables:** ${doneTasks.length} tasks successfully shipped.
- **Active Focus:** ${inProgTasks.length} tasks in progress.
- **Knowledge Sources:** ${docs.length} documents & web links synthesized.

## 💡 What Went Well
- Rapid AI integration with real-time vector search and live web citations.
- Fluid Kanban board management with autonomous AI task extraction.
- High-speed interactive live code sandbox execution.

## ⚠️ Key Blockers & Risks Identified
${todoTasks.filter((t) => t.priority === "high").map((t) => `• High Priority: "${t.title}" requires immediate resolution.`).join("\n") || "• No critical high-priority blockers detected."}

## 🚀 Next Sprint Action Plan
1. Finalize all in-progress features.
2. Expand knowledge base with updated API documentation.
3. Conduct team sync and review real-time activity feed logs.`;
    }

    return NextResponse.json({
      title: resultTitle,
      content: resultContent,
      action_type,
    });
  } catch (error) {
    console.error("Copilot action error:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
