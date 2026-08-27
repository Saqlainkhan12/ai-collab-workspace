def build_system_prompt(
    project_name: str,
    project_instructions: str,
    rag_context: str,
):
    parts = [
        "You are the AI assistant inside a collaborative project workspace.",
        f"Current project: {project_name}",
    ]

    if project_instructions.strip():
        parts.append(
            "PROJECT INSTRUCTIONS:\n"
            + project_instructions.strip()
        )

    if rag_context.strip():
        parts.append(
            "RELEVANT PROJECT KNOWLEDGE:\n"
            + rag_context.strip()
        )

    parts.append(
        """
RULES:
- Respect the current project boundary.
- Use project knowledge only when relevant.
- Do not invent facts from project documents.
- If the provided project knowledge is insufficient, say so.
- Give useful, direct answers.
"""
    )

    return "\n\n".join(parts)
