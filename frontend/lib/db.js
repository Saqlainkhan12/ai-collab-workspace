import { Pool, neon } from "@neondatabase/serverless";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_gkd5sjTZLO3M@ep-bitter-waterfall-axylk6j9-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require";

let sqlClient = null;

export function getSql() {
  if (!sqlClient) {
    sqlClient = neon(DATABASE_URL);
  }
  return sqlClient;
}

let isInitialized = false;

export async function ensureDbInitialized() {
  if (isInitialized) return;

  const sql = getSql();
  try {
    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Default user
    const existingUser = await sql`
      SELECT id, name, email FROM users ORDER BY id ASC LIMIT 1;
    `;

    let userId;
    if (existingUser.length === 0) {
      const inserted = await sql`
        INSERT INTO users (name, email)
        VALUES ('Saqlain', 'saqlain@workspace.ai')
        RETURNING id;
      `;
      userId = inserted[0].id;
    } else {
      userId = existingUser[0].id;
    }

    // 3. Projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        icon VARCHAR(100) DEFAULT '✦',
        theme VARCHAR(100) DEFAULT 'dark',
        instructions TEXT DEFAULT '',
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Project Members table
    await sql`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
      );
    `;

    // 5. Conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id),
        session_id VARCHAR(200) UNIQUE NOT NULL,
        title VARCHAR(300) DEFAULT 'New conversation',
        parent_conversation_id INTEGER REFERENCES conversations(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id),
        role VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        model_used VARCHAR(200),
        attachments JSONB,
        tool_calls JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 7. Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        filename VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        status VARCHAR(30) DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 8. Document chunks table
    await sql`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        chunk_index INTEGER,
        content TEXT NOT NULL,
        page_number INTEGER,
        section VARCHAR(300),
        chunk_metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}
