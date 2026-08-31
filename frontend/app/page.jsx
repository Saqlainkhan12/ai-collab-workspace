"use client";

import { useEffect, useState } from "react";

const API = (
  typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL
    ? "/api"
    : ((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")) + "/api"
);

const headers = {
  "Content-Type": "application/json",
  "X-User-ID": "1",
};

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [view, setView] = useState("dashboard");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);

  const [uploading, setUploading] = useState(false);

  // TASKS (KANBAN) & URL INGESTION STATE
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [extractingTasks, setExtractingTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskColumn, setTaskColumn] = useState("todo");

  // URL INGESTION STATE
  const [docTab, setDocTab] = useState("upload"); // "upload" | "url"
  const [urlInput, setUrlInput] = useState("");
  const [urlIngesting, setUrlIngesting] = useState(false);

  // MOBILE MENU STATE
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // CHAT STATE
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);

  // ARTIFACTS / LIVE CANVAS STATE (Feature 4)
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [artifactTab, setArtifactTab] = useState("preview"); // "preview" | "code"
  const [artifactDevice, setArtifactDevice] = useState("desktop"); // "desktop" | "mobile"

  // THEME COLOR SWITCHER STATE (Direct 1-Click Color Bar)
  const [theme, setTheme] = useState("green");

  const themes = [
    { id: "green", name: "ChatGPT Mint", color: "#10a37f", desc: "OpenAI Emerald" },
    { id: "blue", name: "Linear Blue", color: "#3b82f6", desc: "Cyber Electric" },
    { id: "purple", name: "Obsidian Violet", color: "#8b5cf6", desc: "Deep Luxe" },
    { id: "titanium", name: "Titanium Slate", color: "#e2e8f0", desc: "Clean Minimalist" },
  ];

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("collab_theme");
      if (savedTheme && ["green", "blue", "purple", "titanium"].includes(savedTheme)) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        setTheme("green");
        document.documentElement.setAttribute("data-theme", "green");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 3500);
      return () => clearTimeout(t);
    }
  }, [message]);

  function changeTheme(newTheme) {
    setTheme(newTheme);
    try {
      localStorage.setItem("collab_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch (e) {
      console.error(e);
    }
    const tObj = themes.find((t) => t.id === newTheme);
    setMessage(`Theme changed: ${tObj?.name || newTheme}`);
  }

  // COMMAND PALETTE STATE (Ctrl+K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        setCommandSearch("");
        setSelectedPaletteIndex(0);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setThemeMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);

      const response = await fetch(`${API}/projects`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      setProjects(data);

      if (data.length > 0) {
        setActiveProject((current) => {
          return current
            ? data.find((p) => p.id === current.id) || data[0]
            : data[0];
        });
      } else {
        setActiveProject(null);
      }
    } catch (error) {
      console.error(error);
      setMessage("Projects load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }

  async function createProject(event) {
    event.preventDefault();

    if (!projectName.trim()) return;

    try {
      setMessage("Project create ho raha hai...");

      const response = await fetch(`${API}/projects`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
          icon: "✦",
          theme: "dark",
          instructions: "",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const project = await response.json();

      setProjects((current) => [project, ...current.filter((p) => p.id !== project.id)]);
      setActiveProject(project);

      setProjectName("");
      setProjectDescription("");
      setShowCreate(false);
      setView("dashboard");

      setMessage("Project successfully create ho gaya.");
      await loadProjects();
    } catch (error) {
      console.error("Create project error:", error);
      setMessage(`Project create nahi ho saka: ${error.message || "Error"}`);
    }
  }

  async function deleteProject() {
    if (!activeProject) return;

    const confirmed = window.confirm(
      `Delete "${activeProject.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/projects/${activeProject.id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setMessage("Project delete ho gaya.");
      setActiveProject(null);
      setChatMessages([]);
      setActiveConversation(null);

      await loadProjects();
    } catch (error) {
      console.error(error);
      setMessage("Project delete nahi ho saka.");
    }
  }

  async function loadDocuments() {
    if (!activeProject) return;

    try {
      const response = await fetch(
        `${API}/projects/${activeProject.id}/documents`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setDocuments(await response.json());
    } catch (error) {
      console.error("Documents fetch:", error);
    }
  }

  async function loadConversations() {
    if (!activeProject) return;

    try {
      const response = await fetch(
        `${API}/projects/${activeProject.id}/conversations`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Conversations fetch:", error);
    }
  }

  async function loadMembers() {
    if (!activeProject) return;

    try {
      const response = await fetch(
        `${API}/projects/${activeProject.id}/members`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setMembers(await response.json());
    } catch (error) {
      console.error("Members fetch:", error);
    }
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];

    if (!file || !activeProject) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setMessage("Document upload aur indexing ho rahi hai...");

      const response = await fetch(
        `${API}/projects/${activeProject.id}/documents/upload`,
        {
          method: "POST",
          headers: {
            "X-User-ID": "1",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();

      setMessage(
        `Document indexed successfully — ${result.chunks || 0} chunks.`
      );

      await loadDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Document upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function ingestUrl(event) {
    event?.preventDefault();
    if (!urlInput.trim() || !activeProject) return;

    try {
      setUrlIngesting(true);
      setMessage("Website content fetch aur index ho raha hai...");

      const response = await fetch(
        `${API}/projects/${activeProject.id}/documents/url`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ url: urlInput.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "URL ingestion failed");
      }

      const data = await response.json();
      setMessage(`Website indexed: "${data.filename}" (${data.chunks} chunks).`);
      setUrlInput("");
      await loadDocuments();
    } catch (error) {
      console.error("URL Ingestion Error:", error);
      setMessage(`URL import failed: ${error.message}`);
    } finally {
      setUrlIngesting(false);
    }
  }

  async function deleteDocument(docId) {
    if (!activeProject) return;
    const confirmed = window.confirm("Is document / URL ko delete karna chahte hain?");
    if (!confirmed) return;

    try {
      setDocuments((current) => current.filter((d) => d.id !== docId));

      const response = await fetch(
        `${API}/projects/${activeProject.id}/documents/${docId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setMessage("Document delete ho gaya.");
    } catch (error) {
      console.error(error);
      setMessage("Document delete nahi ho saka.");
      await loadDocuments();
    }
  }

  // =========================
  // TASK FUNCTIONS (KANBAN)
  // =========================

  async function loadTasks() {
    if (!activeProject) return;

    try {
      setTasksLoading(true);
      const response = await fetch(
        `${API}/projects/${activeProject.id}/tasks`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setTasks(await response.json());
    } catch (error) {
      console.error("Load tasks error:", error);
    } finally {
      setTasksLoading(false);
    }
  }

  async function createTask(event) {
    event?.preventDefault();
    if (!taskTitle.trim() || !activeProject) return;

    try {
      setMessage("Task create ho raha hai...");

      const response = await fetch(
        `${API}/projects/${activeProject.id}/tasks`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: taskTitle.trim(),
            description: taskDesc.trim(),
            priority: taskPriority,
            assignee_name: taskAssignee.trim() || "Team",
            status: taskColumn,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newTask = await response.json();
      setTasks((current) => [newTask, ...current]);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssignee("");
      setShowCreateTask(false);
      setMessage("Task create ho gaya!");
    } catch (error) {
      console.error(error);
      setMessage("Task create nahi ho saka.");
    }
  }

  async function updateTaskStatus(taskId, newStatus) {
    if (!activeProject) return;

    try {
      setTasks((current) =>
        current.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      );

      await fetch(
        `${API}/projects/${activeProject.id}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch (error) {
      console.error(error);
      await loadTasks();
    }
  }

  async function deleteTask(taskId) {
    if (!activeProject) return;

    try {
      setTasks((current) => current.filter((t) => t.id !== taskId));

      await fetch(
        `${API}/projects/${activeProject.id}/tasks/${taskId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      setMessage("Task delete ho gaya.");
    } catch (error) {
      console.error(error);
      await loadTasks();
    }
  }

  async function extractTasksWithAI() {
    if (!activeProject) return;

    try {
      setExtractingTasks(true);
      setMessage("AI conversation se tasks analyze aur extract kar raha hai...");

      const response = await fetch(
        `${API}/projects/${activeProject.id}/tasks/extract`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      if (data.tasks && data.tasks.length > 0) {
        setMessage(`AI ne ${data.tasks.length} task(s) extract kar liye!`);
        await loadTasks();
      } else {
        setMessage(data.message || "Koi naye tasks extract nahi huay.");
      }
    } catch (error) {
      console.error(error);
      setMessage("AI task extraction failed.");
    } finally {
      setExtractingTasks(false);
    }
  }

  // =========================
  // CHAT FUNCTIONS
  // =========================

  function startNewConversation() {
    setActiveConversation(null);
    setChatMessages([]);
    setChatInput("");
    setMessage("");
    setView("chat");
    setMobileMenuOpen(false);
  }

  async function openConversation(conversation) {
    if (!activeProject) return;

    try {
      setMessage("Conversation load ho rahi hai...");

      const response = await fetch(
        `${API}/projects/${activeProject.id}/conversations/${conversation.id}/messages`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      setActiveConversation(data.conversation);
      setChatMessages(data.messages || []);
      setView("chat");
      setMessage("");
      setMobileMenuOpen(false);
    } catch (error) {
      console.error(error);
      setMessage("Conversation load nahi ho saki.");
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();

    if (!activeProject) {
      setMessage("Pehle project select karo.");
      return;
    }

    const text = chatInput.trim();

    if (!text || chatLoading) return;

    const temporaryMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
    };

    setChatMessages((current) => [
      ...current,
      temporaryMessage,
    ]);

    setChatInput("");
    setChatLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/projects/${activeProject.id}/chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: text,
            session_id: activeConversation?.session_id || null,
            title: activeConversation?.title || null,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();

      setActiveConversation({
        id: data.conversation_id,
        session_id: data.session_id,
      });

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          model_used: data.model,
        },
      ]);

      await loadConversations();
    } catch (error) {
      console.error(error);

      setChatMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "AI response nahi aa saki. Backend aur AI model configuration check karo.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function selectView(nextView) {
    setView(nextView);
    setMobileMenuOpen(false);

    if (nextView === "documents") {
      loadDocuments();
    }

    if (nextView === "conversations") {
      loadConversations();
    }

    if (nextView === "team") {
      loadMembers();
    }

    if (nextView === "tasks") {
      loadTasks();
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      loadDocuments();
      loadConversations();
      loadMembers();
      loadTasks();
      setChatMessages([]);
      setActiveConversation(null);
    }
  }, [activeProject?.id]);

  const project = activeProject;

  // =========================
  // COMPUTED COMMAND PALETTE ITEMS
  // =========================
  const query = commandSearch.toLowerCase().trim();

  const quickActions = [
    {
      id: "action-chat",
      category: "ACTIONS",
      icon: "✨",
      title: "Start New AI Chat",
      subtitle: activeProject ? `In "${activeProject.name}"` : "Open chat workspace",
      perform: () => {
        startNewConversation();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-tasks",
      category: "ACTIONS",
      icon: "✓",
      title: "Open Task Board (Kanban)",
      subtitle: `${tasks.length} tasks in project`,
      perform: () => {
        selectView("tasks");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-extract-tasks",
      category: "ACTIONS",
      icon: "✨",
      title: "Extract Tasks from Chat with AI",
      subtitle: "Auto-generate actionable to-do list",
      perform: () => {
        selectView("tasks");
        extractTasksWithAI();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-create",
      category: "ACTIONS",
      icon: "+",
      title: "Create New Project",
      subtitle: "Set up a new workspace",
      perform: () => {
        setShowCreate(true);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-create-task",
      category: "ACTIONS",
      icon: "+",
      title: "Add New Task / To-Do",
      subtitle: "Create a task in Kanban board",
      perform: () => {
        selectView("tasks");
        setShowCreateTask(true);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-dashboard",
      category: "ACTIONS",
      icon: "⌂",
      title: "Go to Dashboard",
      subtitle: "View overview & stats",
      perform: () => {
        selectView("dashboard");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-projects",
      category: "ACTIONS",
      icon: "◈",
      title: "Browse All Projects",
      subtitle: `${projects.length} workspaces available`,
      perform: () => {
        selectView("projects");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-conversations",
      category: "ACTIONS",
      icon: "▣",
      title: "View All Conversations",
      subtitle: `${conversations.length} chat sessions`,
      perform: () => {
        selectView("conversations");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-docs",
      category: "ACTIONS",
      icon: "◇",
      title: "Knowledge Base & Web URLs",
      subtitle: `${documents.length} files and URLs indexed`,
      perform: () => {
        selectView("documents");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "action-team",
      category: "ACTIONS",
      icon: "◎",
      title: "Team & Collaborators",
      subtitle: `${members.length} team members`,
      perform: () => {
        selectView("team");
        setCommandPaletteOpen(false);
      },
    },
  ].filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query)
  );

  const projectItems = projects
    .filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    )
    .map((p) => ({
      id: `project-${p.id}`,
      category: "PROJECTS",
      icon: p.icon || "✦",
      title: p.name,
      subtitle: p.id === activeProject?.id ? "Active Workspace" : p.description || "Project Workspace",
      isActive: p.id === activeProject?.id,
      perform: () => {
        setActiveProject(p);
        selectView("dashboard");
        setCommandPaletteOpen(false);
      },
    }));

  const conversationItems = conversations
    .filter(
      (c) =>
        !query ||
        (c.title && c.title.toLowerCase().includes(query)) ||
        (c.session_id && c.session_id.toLowerCase().includes(query))
    )
    .map((c) => ({
      id: `convo-${c.id}`,
      category: "CONVERSATIONS",
      icon: "▣",
      title: c.title || "Conversation",
      subtitle: new Date(c.created_at || Date.now()).toLocaleDateString(),
      perform: () => {
        openConversation(c);
        setCommandPaletteOpen(false);
      },
    }));

  const documentItems = documents
    .filter(
      (d) =>
        !query ||
        (d.filename && d.filename.toLowerCase().includes(query))
    )
    .map((d) => ({
      id: `doc-${d.id}`,
      category: "DOCUMENTS",
      icon: d.file_type === "url" ? "🌐" : "◇",
      title: d.filename,
      subtitle: d.file_type === "url" ? "Webpage" : "Uploaded File",
      perform: () => {
        selectView("documents");
        setCommandPaletteOpen(false);
      },
    }));

  const taskItems = tasks
    .filter(
      (t) =>
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(query))
    )
    .map((t) => ({
      id: `task-${t.id}`,
      category: "TASKS",
      icon: t.status === "done" ? "✅" : t.status === "in_progress" ? "⚡" : "📌",
      title: t.title,
      subtitle: `${t.status.toUpperCase()} · ${t.priority.toUpperCase()} · ${t.assignee_name || "Team"}`,
      perform: () => {
        selectView("tasks");
        setCommandPaletteOpen(false);
      },
    }));

  const memberItems = members
    .filter(
      (m) =>
        !query ||
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.email && m.email.toLowerCase().includes(query))
    )
    .map((m) => ({
      id: `member-${m.id}`,
      category: "TEAM",
      icon: "◎",
      title: m.name,
      subtitle: `${m.email} · ${m.role}`,
      perform: () => {
        selectView("team");
        setCommandPaletteOpen(false);
      },
    }));

  const allPaletteItems = [
    ...quickActions,
    ...projectItems,
    ...conversationItems,
    ...taskItems,
    ...documentItems,
    ...memberItems,
  ];

  // =========================
  // ARTIFACTS & CHAT HELPERS
  // =========================

  function openArtifact(code, language = "html", title = "Interactive Artifact") {
    let cleanCode = code;
    if (language.toLowerCase() === "html" || !code.includes("<!DOCTYPE html>")) {
      cleanCode = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0d1217;
      color: #f0f4f8;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }
    setActiveArtifact({
      title,
      language,
      code: cleanCode,
      rawCode: code,
    });
    setShowCanvas(true);
    setArtifactTab("preview");
  }

  function exportChatMarkdown() {
    if (chatMessages.length === 0) return;
    const title = activeConversation?.title || `${activeProject?.name || "Workspace"} Chat`;
    let md = `# ${title}\n**Project:** ${activeProject?.name || "N/A"}\n**Export Date:** ${new Date().toLocaleString()}\n\n---\n\n`;
    chatMessages.forEach((m) => {
      const speaker = m.role === "user" ? "### 👤 You" : "### ✦ COLLAB AI";
      md += `${speaker}\n${m.content}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Chat transcript download ho gaya!");
  }

  function renderFormattedContent(text) {
    if (!text) return null;
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: "code",
        language: match[1] || "code",
        code: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    if (parts.length === 0) {
      return <div>{text}</div>;
    }

    return (
      <div className="formatted-message-body">
        {parts.map((p, idx) => {
          if (p.type === "text") {
            return (
              <div key={idx} className="msg-text-segment">
                {p.content.split("\n").map((line, lIdx) => (
                  <p key={lIdx}>{line}</p>
                ))}
              </div>
            );
          } else {
            const isRunnable = ["html", "svg", "jsx", "javascript", "js", "css"].includes(
              p.language.toLowerCase()
            );
            return (
              <div key={idx} className="code-artifact-block">
                <div className="code-block-header">
                  <span className="code-lang-tag">
                    {p.language.toUpperCase() || "CODE"}
                  </span>
                  <div className="code-block-actions">
                    {isRunnable && (
                      <button
                        type="button"
                        className="canvas-run-btn"
                        onClick={() =>
                          openArtifact(
                            p.code,
                            p.language,
                            `${p.language.toUpperCase()} Artifact`
                          )
                        }
                      >
                        ▶ Run in Live Canvas
                      </button>
                    )}
                    <button
                      type="button"
                      className="copy-code-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(p.code);
                        setMessage("Code copied to clipboard!");
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                <pre className="code-pre">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }
        })}
      </div>
    );
  }

  function renderTaskCard(task) {
    return (
      <div className="kanban-task-card" key={task.id}>
        <div className="task-card-header">
          <span className={`task-priority-badge ${task.priority}`}>
            {task.priority?.toUpperCase()}
          </span>
          {task.source === "ai_extracted" && (
            <span className="task-ai-badge">✨ AI EXTRACTED</span>
          )}
          <button
            type="button"
            className="task-delete-btn"
            onClick={() => deleteTask(task.id)}
            title="Delete task"
          >
            ✕
          </button>
        </div>

        <h4 className="task-title">{task.title}</h4>
        {task.description && (
          <p className="task-desc">{task.description}</p>
        )}

        <div className="task-card-footer">
          <span className="task-assignee">👤 {task.assignee_name || "Team"}</span>
          <div className="task-status-actions">
            {task.status !== "todo" && (
              <button
                type="button"
                className="task-move-btn"
                onClick={() => updateTaskStatus(task.id, "todo")}
                title="Move to To Do"
              >
                ← Todo
              </button>
            )}
            {task.status !== "in_progress" && (
              <button
                type="button"
                className="task-move-btn in-prog"
                onClick={() => updateTaskStatus(task.id, "in_progress")}
                title="Move to In Progress"
              >
                ⚡ In Progress
              </button>
            )}
            {task.status !== "done" && (
              <button
                type="button"
                className="task-move-btn done"
                onClick={() => updateTaskStatus(task.id, "done")}
                title="Mark as Done"
              >
                ✓ Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="workspace" data-theme={theme}>
      {/* MOBILE TOP BAR */}
      <header className="mobile-header">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <div
          className="mobile-brand"
          onClick={() => selectView("dashboard")}
        >
          <div className="brand-mark">✦</div>
          <div className="mobile-brand-title">
            <strong>COLLAB AI</strong>
            <span>{view.toUpperCase()}</span>
          </div>
        </div>

        <div className="mobile-header-actions">
          {/* MOBILE QUICK THEME SELECTOR */}
          <div className="mobile-theme-dots">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`mobile-theme-dot ${theme === t.id ? "active" : ""}`}
                onClick={() => changeTheme(t.id)}
                title={t.name}
                aria-label={t.name}
              >
                <span style={{ background: t.color }} />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mobile-search-btn"
            onClick={() => {
              setCommandPaletteOpen(true);
              setCommandSearch("");
              setSelectedPaletteIndex(0);
            }}
            aria-label="Quick Search"
            title="Quick Search (Ctrl+K)"
          >
            🔍
          </button>

          {view !== "chat" ? (
            <button
              type="button"
              className="mobile-action-btn"
              onClick={() => setShowCreate(true)}
            >
              + New
            </button>
          ) : (
            <button
              type="button"
              className="mobile-action-btn"
              onClick={() => selectView("conversations")}
            >
              Chats
            </button>
          )}
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      <div
        className={`sidebar-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">✦</div>

          <div className="brand-text">
            <strong>COLLAB AI</strong>
            <span>PROJECT WORKSPACE</span>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <nav>
          <button
            className={`nav-item ${
              view === "dashboard" ? "active" : ""
            }`}
            onClick={() => selectView("dashboard")}
          >
            ⌂ <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              view === "projects" ? "active" : ""
            }`}
            onClick={() => selectView("projects")}
          >
            ◈ <span>Projects</span>
          </button>

          <button
            className={`nav-item ${
              view === "conversations" || view === "chat"
                ? "active"
                : ""
            }`}
            onClick={() => selectView("conversations")}
          >
            ▣ <span>Conversations</span>
          </button>

          <button
            className={`nav-item ${
              view === "documents" ? "active" : ""
            }`}
            onClick={() => selectView("documents")}
          >
            ◇ <span>Documents & URLs</span>
            {documents.length > 0 && (
              <span className="nav-badge">{documents.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${
              view === "tasks" ? "active" : ""
            }`}
            onClick={() => selectView("tasks")}
          >
            ✓ <span>Tasks / Board</span>
            {tasks.filter((t) => t.status !== "done").length > 0 && (
              <span className="nav-badge alert">{tasks.filter((t) => t.status !== "done").length}</span>
            )}
          </button>

          <button
            className={`nav-item ${
              view === "team" ? "active" : ""
            }`}
            onClick={() => selectView("team")}
          >
            ◎ <span>Team</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">S</div>

            <div>
              <strong>Saqlain</strong>
              <span>Workspace Owner</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              AI COLLABORATIVE WORKSPACE
            </span>

            <h1>
              {view === "dashboard" && "Your Projects"}
              {view === "projects" && "Projects"}
              {view === "documents" && "Knowledge Base & URLs"}
              {view === "tasks" && "Project Tasks & Kanban"}
              {view === "conversations" && "Conversations"}
              {view === "chat" &&
                (activeProject?.name || "AI Chat")}
              {view === "team" && "Team"}
            </h1>

            <p>
              One intelligent workspace for your team's knowledge,
              conversations and AI.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="quick-search-trigger"
              onClick={() => {
                setCommandPaletteOpen(true);
                setCommandSearch("");
                setSelectedPaletteIndex(0);
              }}
              title="Quick Search & Actions (Ctrl+K)"
            >
              <span className="search-icon">🔍</span>
              <span className="search-text">Search anything...</span>
              <span className="search-kbd">Ctrl K</span>
            </button>

            {/* DIRECT VISIBLE 4-COLOR THEME SWITCHER BAR */}
            <div className="theme-pill-bar" title="Select workspace accent theme">
              <span className="theme-pill-label">🎨 THEME</span>
              <div className="theme-dots-wrap">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-circle-btn ${theme === t.id ? "active" : ""}`}
                    onClick={() => changeTheme(t.id)}
                    title={`${t.name} — ${t.desc}`}
                    aria-label={t.name}
                  >
                    <span className="theme-swatch" style={{ background: t.color }} />
                  </button>
                ))}
              </div>
            </div>

            {view === "tasks" && project && (
              <>
                <button
                  type="button"
                  className="ai-extract-btn"
                  onClick={extractTasksWithAI}
                  disabled={extractingTasks}
                >
                  {extractingTasks ? "EXTRACTING..." : "✨ AI Extract Tasks"}
                </button>
                <button
                  type="button"
                  className="create-btn"
                  onClick={() => {
                    setTaskColumn("todo");
                    setShowCreateTask(true);
                  }}
                >
                  + New Task
                </button>
              </>
            )}

            {view !== "chat" && view !== "tasks" && (
              <button
                className="create-btn"
                onClick={() => setShowCreate(true)}
              >
                + New Project
              </button>
            )}

            {view === "chat" && (
              <button
                className="create-btn"
                onClick={startNewConversation}
              >
                + New Chat
              </button>
            )}
          </div>
        </header>

        {message && (
          <div className="notice">
            {message}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <h2>Loading workspace...</h2>
            <p>Backend se projects load ho rahe hain.</p>
          </div>
        ) : (
          <>
            {/* DASHBOARD */}

            {view === "dashboard" && (
              <>
                <div className="stats">
                  <div className="stat">
                    <span>PROJECTS</span>
                    <strong>{projects.length}</strong>
                  </div>

                  <div className="stat" onClick={() => selectView("documents")} style={{ cursor: "pointer" }}>
                    <span>DOCUMENTS & URLS</span>
                    <strong>{documents.length}</strong>
                  </div>

                  <div className="stat" onClick={() => selectView("conversations")} style={{ cursor: "pointer" }}>
                    <span>CONVERSATIONS</span>
                    <strong>{conversations.length}</strong>
                  </div>

                  <div className="stat" onClick={() => selectView("tasks")} style={{ cursor: "pointer" }}>
                    <span>PENDING TASKS</span>
                    <strong>{tasks.filter((t) => t.status !== "done").length}</strong>
                  </div>
                </div>

                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      WORKSPACES
                    </span>

                    <h2>Recent Projects</h2>
                  </div>

                  <span className="project-count">
                    {projects.length} projects
                  </span>
                </div>

                <div className="project-layout">
                  <div className="project-grid">
                    {projects.map((item, index) => (
                      <button
                        key={item.id}
                        className={`project-card ${
                          project?.id === item.id
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => {
                          setActiveProject(item);
                          setView("dashboard");
                        }}
                      >
                        <div className="project-card-top">
                          <span className="project-icon">
                            ✦
                          </span>

                          <span className="project-num-tag">
                            WORKSPACE {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className="project-card-body">
                          <h3>{item.name}</h3>

                          <p>
                            {item.description ||
                              "AI collaborative project workspace."}
                          </p>
                        </div>

                        <div className="project-meta">
                          <span>KNOWLEDGE</span>
                          <span>AI CHAT</span>
                          <span>ACTIVE</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {project && (
                    <aside className="project-panel">
                      <span className="eyebrow">
                        ACTIVE PROJECT
                      </span>

                      <div className="panel-icon">
                        ✦
                      </div>

                      <h2>{project.name}</h2>

                      <p>
                        {project.description ||
                          "Collaborative AI workspace."}
                      </p>

                      <div className="panel-actions">
                        <button
                          onClick={() => {
                            setActiveConversation(null);
                            setChatMessages([]);
                            setView("chat");
                          }}
                        >
                          OPEN AI CHAT →
                        </button>

                        <button
                          onClick={() =>
                            selectView("conversations")
                          }
                        >
                          CONVERSATIONS
                        </button>

                        <button
                          className="secondary"
                          onClick={deleteProject}
                        >
                          DELETE PROJECT
                        </button>
                      </div>

                      <div className="panel-info">
                        <div>
                          <span>PROJECT ID</span>
                          <strong>#{project.id}</strong>
                        </div>

                        <div>
                          <span>DOCUMENTS</span>
                          <strong>
                            {documents.length}
                          </strong>
                        </div>

                        <div>
                          <span>CONVERSATIONS</span>
                          <strong>
                            {conversations.length}
                          </strong>
                        </div>
                      </div>
                    </aside>
                  )}
                </div>
              </>
            )}

            {/* PROJECTS */}

            {view === "projects" && (
              <div className="data-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      WORKSPACE MANAGEMENT
                    </span>

                    <h2>All Projects</h2>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <div className="empty-state">
                    <h2>No projects yet</h2>

                    <p>
                      Create your first project.
                    </p>

                    <button
                      className="create-btn"
                      onClick={() =>
                        setShowCreate(true)
                      }
                    >
                      + Create Project
                    </button>
                  </div>
                ) : (
                  <div className="list-grid">
                    {projects.map((item) => (
                      <button
                        className="list-card"
                        key={item.id}
                        onClick={() => {
                          setActiveProject(item);
                          setView("dashboard");
                        }}
                      >
                        <strong>{item.name}</strong>

                        <span>
                          {item.description ||
                            "AI workspace"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS & URL INGESTION */}

            {view === "documents" && (
              <div className="data-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      KNOWLEDGE BASE
                    </span>

                    <h2>
                      {project
                        ? project.name
                        : "Select a project"}
                    </h2>
                    <p>Build your workspace AI memory with uploaded documents and live web pages.</p>
                  </div>

                  {project && docTab === "upload" && (
                    <label className="create-btn upload-label">
                      {uploading
                        ? "INDEXING..."
                        : "+ Upload Document"}

                      <input
                        type="file"
                        hidden
                        onChange={uploadDocument}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {project && (
                  <div className="doc-tabs-wrapper">
                    <div className="doc-tabs">
                      <button
                        type="button"
                        className={`doc-tab-btn ${docTab === "upload" ? "active" : ""}`}
                        onClick={() => setDocTab("upload")}
                      >
                        📁 File Upload
                      </button>
                      <button
                        type="button"
                        className={`doc-tab-btn ${docTab === "url" ? "active" : ""}`}
                        onClick={() => setDocTab("url")}
                      >
                        🌐 Webpage URL Ingestion
                      </button>
                    </div>

                    {docTab === "url" && (
                      <form className="url-ingest-form" onSubmit={ingestUrl}>
                        <input
                          type="url"
                          placeholder="https://example.com/documentation or blog link..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          disabled={urlIngesting}
                          required
                        />
                        <button
                          type="submit"
                          className="create-btn"
                          disabled={urlIngesting || !urlInput.trim()}
                        >
                          {urlIngesting ? "FETCHING & INDEXING..." : "🌐 Fetch & Index Webpage"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {!project ? (
                  <div className="empty-state">
                    Select a project first.
                  </div>
                ) : documents.length === 0 ? (
                  <div className="empty-state">
                    <h2>No documents or URLs</h2>

                    <p>
                      Upload a file or enter a web page URL to build your
                      project knowledge base.
                    </p>
                  </div>
                ) : (
                  <div className="doc-list-grid">
                    {documents.map((doc) => (
                      <div
                        className="doc-card-item"
                        key={doc.id}
                      >
                        <div className="doc-card-info">
                          <span className="doc-type-badge">
                            {doc.file_type === "url" ? "🌐 WEB" : "📄 FILE"}
                          </span>
                          <div className="doc-card-titles">
                            <strong>{doc.filename}</strong>
                            <span>
                              {doc.file_type === "url" ? "Web Ingestion" : "File"} · {doc.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="doc-card-actions">
                          <button
                            type="button"
                            className="doc-delete-btn"
                            onClick={() => deleteDocument(doc.id)}
                            title="Delete item"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONVERSATIONS */}

            {view === "conversations" && (
              <div className="data-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      AI SESSIONS
                    </span>

                    <h2>Conversations</h2>
                  </div>

                  {project && (
                    <button
                      className="create-btn"
                      onClick={startNewConversation}
                    >
                      + NEW CHAT
                    </button>
                  )}
                </div>

                {!project ? (
                  <div className="empty-state">
                    Select a project first.
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="empty-state">
                    <h2>No conversations yet</h2>

                    <p>
                      Start your first AI conversation.
                    </p>

                    <button
                      className="create-btn"
                      onClick={startNewConversation}
                    >
                      + START NEW CHAT
                    </button>
                  </div>
                ) : (
                  <div className="list-grid">
                    {conversations.map(
                      (conversation) => (
                        <button
                          className="list-card"
                          key={conversation.id}
                          onClick={() =>
                            openConversation(
                              conversation
                            )
                          }
                        >
                          <strong>
                            {conversation.title ||
                              "Untitled Conversation"}
                          </strong>

                          <span>
                            Open conversation →
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CHAT - HUMANIZED CHATGPT EXPERIENCE */}

            {view === "chat" && (
              <div className="chat-page humanized-chat-view">
                {/* CHAT TOPBAR / CONTEXT HEADER */}
                <div className="chat-header-human">
                  <div className="chat-context-info">
                    <button
                      type="button"
                      className="chat-back-link"
                      onClick={() => setView("conversations")}
                      title="Back to Conversations"
                    >
                      ← Back
                    </button>
                    <div className="chat-header-model-pill">
                      <span className="live-status-dot" />
                      <strong className="chat-project-title">
                        {activeProject?.name || "AI Workspace"}
                      </strong>
                      <span className="chat-model-badge">GPT-4o Mini</span>
                    </div>
                  </div>

                  <div className="chat-header-actions-human">
                    <button
                      type="button"
                      className="chat-tool-btn"
                      onClick={exportChatMarkdown}
                      disabled={chatMessages.length === 0}
                      title="Export chat transcript as Markdown (.md)"
                    >
                      📥 Export
                    </button>

                    <button
                      type="button"
                      className="chat-tool-btn canvas-btn"
                      onClick={() => {
                        if (!activeArtifact) {
                          openArtifact(
                            `<h1>✦ Interactive Artifact Canvas</h1>\n<p>Ask AI to generate HTML, CSS, SVG or React components to interact with them live!</p>\n<button style="padding:10px 18px;background:var(--primary);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;" onclick="alert('Artifact Sandbox Working!')">Click Interactive Demo</button>`,
                            "html",
                            "Interactive Sandbox"
                          );
                        } else {
                          setShowCanvas(true);
                        }
                      }}
                      title="Open Live Sandbox Canvas"
                    >
                      ⚡ Canvas Sandbox
                    </button>

                    <button
                      type="button"
                      className="create-btn new-chat-btn"
                      onClick={startNewConversation}
                      title="Start fresh conversation"
                    >
                      + New Chat
                    </button>
                  </div>
                </div>

                {/* MESSAGES CONTAINER */}
                <div className="chat-window-human">
                  <div className="chat-stream-center">
                    {chatMessages.length === 0 ? (
                      <div className="chat-empty-human">
                        <div className="chat-welcome-avatar">✦</div>

                        <h2>What would you like to build or explore?</h2>

                        <p className="chat-welcome-sub">
                          Ask anything about <strong>{activeProject?.name}</strong>, query uploaded documents & URLs, or generate interactive UI components.
                        </p>

                        <div className="human-prompts-grid">
                          <button
                            type="button"
                            className="human-prompt-card"
                            onClick={() =>
                              setChatInput("Give me a comprehensive overview and executive summary of this project.")
                            }
                          >
                            <span className="prompt-card-icon">📄</span>
                            <div className="prompt-card-texts">
                              <strong>Summarize Project</strong>
                              <span>Get key goals & current status</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="human-prompt-card"
                            onClick={() =>
                              setChatInput("Generate an interactive HTML dashboard widget with glowing statistics.")
                            }
                          >
                            <span className="prompt-card-icon">⚡</span>
                            <div className="prompt-card-texts">
                              <strong>Generate UI Component</strong>
                              <span>Run in live interactive canvas</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="human-prompt-card"
                            onClick={() =>
                              setChatInput("What are the key action items and next steps we should take on this project?")
                            }
                          >
                            <span className="prompt-card-icon">📋</span>
                            <div className="prompt-card-texts">
                              <strong>Action Items & Tasks</strong>
                              <span>Extract next steps from chat</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="human-prompt-card"
                            onClick={() =>
                              setChatInput("Analyze the uploaded documents and explain key takeaways.")
                            }
                          >
                            <span className="prompt-card-icon">🔍</span>
                            <div className="prompt-card-texts">
                              <strong>Analyze Knowledge</strong>
                              <span>Query project files & web URLs</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="human-messages-stack">
                        {chatMessages.map((item) => (
                          <div
                            key={item.id}
                            className={`human-msg-wrapper ${
                              item.role === "user" ? "user-side" : "assistant-side"
                            }`}
                          >
                            {item.role === "user" ? (
                              <div className="human-user-bubble">
                                <div className="human-user-text">
                                  {item.content}
                                </div>
                              </div>
                            ) : (
                              <div className="human-assistant-card">
                                <div className="human-assistant-header">
                                  <div className="human-assistant-avatar">✦</div>
                                  <span className="human-assistant-name">COLLAB AI</span>
                                  <span className="human-verified-tag">Assistant</span>
                                </div>

                                <div className="human-assistant-body">
                                  {renderFormattedContent(item.content)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {chatLoading && (
                          <div className="human-msg-wrapper assistant-side">
                            <div className="human-assistant-card">
                              <div className="human-assistant-header">
                                <div className="human-assistant-avatar pulsing">✦</div>
                                <span className="human-assistant-name">COLLAB AI</span>
                                <span className="human-thinking-tag">Thinking...</span>
                              </div>

                              <div className="human-typing-wave">
                                <span className="wave-dot" />
                                <span className="wave-dot" />
                                <span className="wave-dot" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* FLOATING CHATGPT-STYLE INPUT DOCK */}
                <div className="chat-input-dock-human">
                  <div className="chat-dock-center">
                    <form
                      className="chat-human-form"
                      onSubmit={sendMessage}
                    >
                      <textarea
                        value={chatInput}
                        onChange={(event) =>
                          setChatInput(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            sendMessage(event);
                          }
                        }}
                        placeholder={`Message ${activeProject?.name || "Collab AI"}...`}
                        rows={2}
                        disabled={chatLoading}
                        className="chat-human-input"
                      />

                      <div className="chat-form-action-row">
                        <div className="chat-form-badges">
                          <span className="knowledge-indicator-pill" title="Project Knowledge Base">
                            📁 {documents.length} sources indexed
                          </span>
                        </div>

                        <button
                          type="submit"
                          className="chat-human-send-circle"
                          disabled={
                            chatLoading ||
                            !chatInput.trim()
                          }
                          title="Send message (Enter)"
                        >
                          {chatLoading ? (
                            <span className="send-spinner-icon" />
                          ) : (
                            <span className="send-arrow-symbol">↑</span>
                          )}
                        </button>
                      </div>
                    </form>

                    <div className="chat-footer-note">
                      <span>Collab AI can make mistakes. Verify important project details.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TEAM */}

            {view === "team" && (
              <div className="data-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      COLLABORATION
                    </span>

                    <h2>Project Team</h2>
                  </div>
                </div>

                {!project ? (
                  <div className="empty-state">
                    Select a project first.
                  </div>
                ) : members.length === 0 ? (
                  <div className="empty-state">
                    No members found.
                  </div>
                ) : (
                  <div className="list-grid">
                    {members.map((member) => (
                      <div
                        className="list-card"
                        key={member.id}
                      >
                        <strong>
                          {member.name}
                        </strong>

                        <span>
                          {member.email} ·{" "}
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TASKS & KANBAN BOARD */}

            {view === "tasks" && (
              <div className="data-section tasks-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      WORKFLOW & KANBAN
                    </span>

                    <h2>
                      {project ? `${project.name} Tasks` : "Project Tasks"}
                    </h2>
                    <p>Track team to-dos and auto-extract actionable tasks from chat conversations.</p>
                  </div>

                  <div className="tasks-head-actions">
                    <button
                      type="button"
                      className="ai-extract-btn"
                      onClick={extractTasksWithAI}
                      disabled={extractingTasks || !project}
                      title="AI will analyze recent chat discussions and create tasks"
                    >
                      {extractingTasks ? "EXTRACTING..." : "✨ AI Extract from Chat"}
                    </button>

                    <button
                      type="button"
                      className="create-btn"
                      onClick={() => {
                        setTaskColumn("todo");
                        setShowCreateTask(true);
                      }}
                      disabled={!project}
                    >
                      + New Task
                    </button>
                  </div>
                </div>

                {!project ? (
                  <div className="empty-state">
                    Select a project first.
                  </div>
                ) : (
                  <div className="kanban-board">
                    {/* COLUMN 1: TO DO */}
                    <div className="kanban-column">
                      <div className="kanban-column-head">
                        <div className="col-title-group">
                          <span className="col-dot todo" />
                          <strong>To Do</strong>
                        </div>
                        <span className="col-count-badge">
                          {tasks.filter((t) => t.status === "todo").length}
                        </span>
                      </div>

                      <div className="kanban-card-list">
                        {tasks.filter((t) => t.status === "todo").length === 0 ? (
                          <div className="kanban-empty-col">
                            No tasks to do
                          </div>
                        ) : (
                          tasks
                            .filter((t) => t.status === "todo")
                            .map((task) => renderTaskCard(task))
                        )}
                      </div>

                      <button
                        type="button"
                        className="add-col-task-btn"
                        onClick={() => {
                          setTaskColumn("todo");
                          setShowCreateTask(true);
                        }}
                      >
                        + Add task
                      </button>
                    </div>

                    {/* COLUMN 2: IN PROGRESS */}
                    <div className="kanban-column">
                      <div className="kanban-column-head">
                        <div className="col-title-group">
                          <span className="col-dot in_progress" />
                          <strong>In Progress</strong>
                        </div>
                        <span className="col-count-badge in-prog">
                          {tasks.filter((t) => t.status === "in_progress").length}
                        </span>
                      </div>

                      <div className="kanban-card-list">
                        {tasks.filter((t) => t.status === "in_progress").length === 0 ? (
                          <div className="kanban-empty-col">
                            No tasks in progress
                          </div>
                        ) : (
                          tasks
                            .filter((t) => t.status === "in_progress")
                            .map((task) => renderTaskCard(task))
                        )}
                      </div>

                      <button
                        type="button"
                        className="add-col-task-btn"
                        onClick={() => {
                          setTaskColumn("in_progress");
                          setShowCreateTask(true);
                        }}
                      >
                        + Add task
                      </button>
                    </div>

                    {/* COLUMN 3: DONE */}
                    <div className="kanban-column">
                      <div className="kanban-column-head">
                        <div className="col-title-group">
                          <span className="col-dot done" />
                          <strong>Completed</strong>
                        </div>
                        <span className="col-count-badge done">
                          {tasks.filter((t) => t.status === "done").length}
                        </span>
                      </div>

                      <div className="kanban-card-list">
                        {tasks.filter((t) => t.status === "done").length === 0 ? (
                          <div className="kanban-empty-col">
                            No completed tasks
                          </div>
                        ) : (
                          tasks
                            .filter((t) => t.status === "done")
                            .map((task) => renderTaskCard(task))
                        )}
                      </div>

                      <button
                        type="button"
                        className="add-col-task-btn"
                        onClick={() => {
                          setTaskColumn("done");
                          setShowCreateTask(true);
                        }}
                      >
                        + Add task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* CREATE PROJECT MODAL */}

      {showCreate && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreate(false)}
        >
          <form
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            onSubmit={createProject}
          >
            <span className="eyebrow">
              NEW WORKSPACE
            </span>

            <h2>Create Project</h2>

            <input
              value={projectName}
              onChange={(event) =>
                setProjectName(event.target.value)
              }
              placeholder="Project name"
              autoFocus
            />

            <textarea
              value={projectDescription}
              onChange={(event) =>
                setProjectDescription(
                  event.target.value
                )
              }
              placeholder="Project description"
              rows={4}
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                CANCEL
              </button>

              <button type="submit">
                CREATE PROJECT
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE TASK MODAL */}

      {showCreateTask && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreateTask(false)}
        >
          <form
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            onSubmit={createTask}
          >
            <span className="eyebrow">
              KANBAN BOARD
            </span>

            <h2>Create New Task</h2>

            <input
              value={taskTitle}
              onChange={(event) =>
                setTaskTitle(event.target.value)
              }
              placeholder="Task title (e.g. Build API endpoint)"
              autoFocus
              required
            />

            <textarea
              value={taskDesc}
              onChange={(event) =>
                setTaskDesc(event.target.value)
              }
              placeholder="Task description (optional)"
              rows={3}
            />

            <div className="modal-form-row">
              <div className="form-field">
                <label>Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-field">
                <label>Column</label>
                <select
                  value={taskColumn}
                  onChange={(e) => setTaskColumn(e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <input
              value={taskAssignee}
              onChange={(event) =>
                setTaskAssignee(event.target.value)
              }
              placeholder="Assignee (e.g. Ali, Ahmed, Team)"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setShowCreateTask(false)
                }
              >
                CANCEL
              </button>

              <button type="submit">
                CREATE TASK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ARTIFACTS / LIVE CANVAS SANDBOX (Feature 4) */}
      {showCanvas && (
        <div
          className="canvas-backdrop"
          onClick={() => setShowCanvas(false)}
        >
          <div
            className="canvas-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="canvas-drawer-header">
              <div className="canvas-title-group">
                <span className="canvas-pulse-icon">⚡</span>
                <div>
                  <h3>{activeArtifact?.title || "Interactive Sandbox Canvas"}</h3>
                  <span className="canvas-lang-badge">
                    {activeArtifact?.language?.toUpperCase() || "HTML"} RUNTIME
                  </span>
                </div>
              </div>

              <div className="canvas-header-controls">
                <div className="canvas-view-tabs">
                  <button
                    type="button"
                    className={`canvas-tab ${artifactTab === "preview" ? "active" : ""}`}
                    onClick={() => setArtifactTab("preview")}
                  >
                    ▶ Live Preview
                  </button>
                  <button
                    type="button"
                    className={`canvas-tab ${artifactTab === "code" ? "active" : ""}`}
                    onClick={() => setArtifactTab("code")}
                  >
                    &lt;&gt; Code Inspector
                  </button>
                </div>

                {artifactTab === "preview" && (
                  <div className="canvas-device-toggle">
                    <button
                      type="button"
                      className={`device-btn ${artifactDevice === "desktop" ? "active" : ""}`}
                      onClick={() => setArtifactDevice("desktop")}
                      title="Desktop View"
                    >
                      🖥 Desktop
                    </button>
                    <button
                      type="button"
                      className={`device-btn ${artifactDevice === "mobile" ? "active" : ""}`}
                      onClick={() => setArtifactDevice("mobile")}
                      title="Mobile View (375px)"
                    >
                      📱 Mobile
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="canvas-download-btn"
                  onClick={() => {
                    const blob = new Blob([activeArtifact?.rawCode || activeArtifact?.code || ""], {
                      type: "text/plain",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `artifact-${Date.now()}.${activeArtifact?.language === "jsx" ? "jsx" : activeArtifact?.language === "svg" ? "svg" : "html"}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setMessage("Artifact file downloaded!");
                  }}
                  title="Download File"
                >
                  📥 Export
                </button>

                <button
                  type="button"
                  className="canvas-close-btn"
                  onClick={() => setShowCanvas(false)}
                  title="Close Canvas"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="canvas-body">
              {artifactTab === "preview" ? (
                <div className={`canvas-preview-frame-wrap ${artifactDevice}`}>
                  <iframe
                    title="Live Artifact Sandbox"
                    srcDoc={activeArtifact?.code || "<h2 style='color:#fff;font-family:sans-serif'>No code to preview. Run a code block from chat.</h2>"}
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                    className="canvas-iframe"
                  />
                </div>
              ) : (
                <div className="canvas-code-inspector">
                  <pre className="canvas-pre">
                    <code>{activeArtifact?.rawCode || activeArtifact?.code}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE (CTRL+K) MODAL */}
      {commandPaletteOpen && (
        <div
          className="command-palette-backdrop"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="command-palette-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-palette-header">
              <span className="command-palette-icon">🔍</span>
              <input
                type="text"
                className="command-palette-input"
                placeholder="Type a command, project, chat or file..."
                value={commandSearch}
                onChange={(e) => {
                  setCommandSearch(e.target.value);
                  setSelectedPaletteIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedPaletteIndex((prev) =>
                      allPaletteItems.length > 0
                        ? (prev + 1) % allPaletteItems.length
                        : 0
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedPaletteIndex((prev) =>
                      allPaletteItems.length > 0
                        ? (prev - 1 + allPaletteItems.length) % allPaletteItems.length
                        : 0
                    );
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (allPaletteItems[selectedPaletteIndex]) {
                      allPaletteItems[selectedPaletteIndex].perform();
                    }
                  }
                }}
                autoFocus
              />
              {commandSearch && (
                <button
                  type="button"
                  className="command-palette-clear"
                  onClick={() => {
                    setCommandSearch("");
                    setSelectedPaletteIndex(0);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <span className="command-palette-badge">ESC</span>
            </div>

            <div className="command-palette-list">
              {allPaletteItems.length === 0 ? (
                <div className="command-palette-empty">
                  <span>No results found for "{commandSearch}"</span>
                </div>
              ) : (
                allPaletteItems.map((item, index) => {
                  const isSelected = index === selectedPaletteIndex;
                  return (
                    <div
                      key={item.id}
                      className={`command-palette-row ${isSelected ? "selected" : ""}`}
                      onMouseEnter={() => setSelectedPaletteIndex(index)}
                      onClick={() => item.perform()}
                    >
                      <div className="command-palette-row-left">
                        <span className="command-row-icon">{item.icon}</span>
                        <div className="command-row-texts">
                          <span className="command-row-title">
                            {item.title}
                            {item.isActive && (
                              <span className="command-row-active-tag">Active</span>
                            )}
                          </span>
                          <span className="command-row-sub">{item.subtitle}</span>
                        </div>
                      </div>
                      <div className="command-palette-row-right">
                        <span className="command-row-category">{item.category}</span>
                        {isSelected && (
                          <span className="command-row-enter">↵</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="command-palette-footer">
              <div className="command-footer-hints">
                <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Select</span>
                <span><kbd>esc</kbd> Close</span>
              </div>
              <div className="command-footer-brand">
                <span>COLLAB AI COMMAND</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
