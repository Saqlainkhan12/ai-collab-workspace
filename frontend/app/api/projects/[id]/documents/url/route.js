import { NextResponse } from "next/server";
import { getSql, ensureDbInitialized } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    await ensureDbInitialized();
    const sql = getSql();
    const projectId = parseInt(params.id, 10);

    const body = await request.json();
    const { url } = body;

    if (!url || !url.trim()) {
      return NextResponse.json({ detail: "URL is required" }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ detail: "Invalid URL format" }, { status: 400 });
    }

    // Fetch the webpage content
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: `Failed to fetch URL: HTTP ${response.status} (${response.statusText})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let pageTitle = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;
    pageTitle = pageTitle.replace(/[\r\n\t]+/g, " ").substring(0, 150);

    // Clean HTML into readable text content
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText || cleanText.length < 20) {
      cleanText = `Web page content from ${targetUrl} (Title: ${pageTitle})`;
    }

    const users = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1;`;
    const userId = users.length > 0 ? users[0].id : 1;

    const docFilename = `🌐 ${pageTitle}`;

    const insertedDocs = await sql`
      INSERT INTO documents (project_id, filename, file_type, file_path, uploaded_by, status)
      VALUES (${projectId}, ${docFilename}, 'url', ${targetUrl}, ${userId}, 'completed')
      RETURNING id, filename, file_type, file_path, status, created_at;
    `;

    const docId = insertedDocs[0].id;

    // Chunk text into 500-char paragraphs
    const chunks = cleanText.match(/[\s\S]{1,500}/g) || [cleanText];

    for (let i = 0; i < Math.min(chunks.length, 50); i++) {
      await sql`
        INSERT INTO document_chunks (document_id, project_id, chunk_index, content)
        VALUES (${docId}, ${projectId}, ${i}, ${chunks[i]});
      `;
    }

    return NextResponse.json({
      status: "uploaded",
      document_id: docId,
      filename: docFilename,
      url: targetUrl,
      chunks: Math.min(chunks.length, 50),
    });
  } catch (error) {
    console.error("URL Ingestion Error:", error);
    return NextResponse.json(
      { detail: error.message || "Could not fetch or parse URL" },
      { status: 500 }
    );
  }
}
