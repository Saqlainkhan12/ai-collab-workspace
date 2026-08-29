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

  // MOBILE MENU STATE
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // CHAT STATE
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);

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
      console.error(error);
      setMessage("Documents load nahi ho sake.");
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
      console.error(error);
      setMessage("Conversations load nahi ho sake.");
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
      console.error(error);
      setMessage("Team load nahi ho saki.");
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
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      loadDocuments();
      loadConversations();
      loadMembers();
      setChatMessages([]);
      setActiveConversation(null);
    }
  }, [activeProject?.id]);

  const project = activeProject;

  return (
    <main className="workspace">
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
            ◇ <span>Documents</span>
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
              {view === "documents" && "Documents"}
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

          {view !== "chat" && (
            <button
              className="create-btn"
              onClick={() => setShowCreate(true)}
            >
              + New Project
            </button>
          )}
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

                  <div className="stat">
                    <span>DOCUMENTS</span>
                    <strong>{documents.length}</strong>
                  </div>

                  <div className="stat">
                    <span>CONVERSATIONS</span>
                    <strong>{conversations.length}</strong>
                  </div>

                  <div className="stat">
                    <span>ACTIVE SESSIONS</span>
                    <strong>01</strong>
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
                        <div
                          className="project-glow"
                          style={{
                            background:
                              index % 3 === 0
                                ? "#7c5cff"
                                : index % 3 === 1
                                ? "#16d9a7"
                                : "#28a9ff",
                          }}
                        />

                        <div className="project-card-top">
                          <span className="project-icon">
                            ✦
                          </span>

                          <span>
                            PROJECT{" "}
                            {String(index + 1).padStart(2, "0")}
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
                          <span>WORKSPACE</span>
                          <span>AI</span>
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

                      <div
                        className="panel-icon"
                        style={{
                          background: "#7c5cff",
                        }}
                      >
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

            {/* DOCUMENTS */}

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
                  </div>

                  {project && (
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

                {!project ? (
                  <div className="empty-state">
                    Select a project first.
                  </div>
                ) : documents.length === 0 ? (
                  <div className="empty-state">
                    <h2>No documents</h2>

                    <p>
                      Upload a document to build your
                      project knowledge base.
                    </p>
                  </div>
                ) : (
                  <div className="list-grid">
                    {documents.map((doc) => (
                      <div
                        className="list-card"
                        key={doc.id}
                      >
                        <strong>
                          {doc.filename}
                        </strong>

                        <span>
                          {doc.status?.toUpperCase()}
                        </span>
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

            {/* CHAT */}

            {view === "chat" && (
              <div className="chat-page">
                <div className="chat-header">
                  <div>
                    <span className="eyebrow">
                      AI CONVERSATION
                    </span>

                    <h2>
                      {activeProject?.name ||
                        "AI Workspace"}
                    </h2>

                    <p>
                      Ask questions about your project,
                      documents and knowledge.
                    </p>
                  </div>

                  <div className="chat-header-actions">
                    <button
                      className="secondary"
                      onClick={() =>
                        setView("conversations")
                      }
                    >
                      ← CONVERSATIONS
                    </button>

                    <button
                      className="create-btn"
                      onClick={startNewConversation}
                    >
                      + NEW CHAT
                    </button>
                  </div>
                </div>

                <div className="chat-window">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">
                      <div className="chat-empty-icon">
                        ✦
                      </div>

                      <h2>
                        Start a conversation
                      </h2>

                      <p>
                        Ask anything about{" "}
                        <strong>
                          {activeProject?.name}
                        </strong>
                        .
                      </p>

                      <div className="suggestions">
                        <button
                          onClick={() =>
                            setChatInput(
                              "Give me a summary of this project."
                            )
                          }
                        >
                          Summarize this project
                        </button>

                        <button
                          onClick={() =>
                            setChatInput(
                              "What can you help me with?"
                            )
                          }
                        >
                          What can you help me with?
                        </button>

                        <button
                          onClick={() =>
                            setChatInput(
                              "Analyze the project knowledge."
                            )
                          }
                        >
                          Analyze project knowledge
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="messages">
                      {chatMessages.map((item) => (
                        <div
                          key={item.id}
                          className={`message-row ${
                            item.role === "user"
                              ? "user"
                              : "assistant"
                          }`}
                        >
                          <div className="message-avatar">
                            {item.role === "user"
                              ? "S"
                              : "✦"}
                          </div>

                          <div className="message-bubble">
                            <span className="message-role">
                              {item.role === "user"
                                ? "You"
                                : "COLLAB AI"}
                            </span>

                            <div className="message-content">
                              {item.content}
                            </div>
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="message-row assistant">
                          <div className="message-avatar">
                            ✦
                          </div>

                          <div className="message-bubble">
                            <span className="message-role">
                              COLLAB AI
                            </span>

                            <div className="typing">
                              AI is thinking...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form
                  className="chat-input-area"
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
                    placeholder="Message your AI workspace..."
                    rows={3}
                    disabled={chatLoading}
                  />

                  <button
                    type="submit"
                    className="create-btn send-btn"
                    disabled={
                      chatLoading ||
                      !chatInput.trim()
                    }
                  >
                    {chatLoading
                      ? "THINKING..."
                      : "SEND →"}
                  </button>
                </form>
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
    </main>
  );
}
