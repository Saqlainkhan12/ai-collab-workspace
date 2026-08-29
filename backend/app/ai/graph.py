from langgraph.graph import (
    StateGraph,
    START,
    END,
)

from app.ai.state import WorkspaceState


def build_workspace_graph():

    # pyrefly: ignore [bad-specialization]
    graph = StateGraph(
        WorkspaceState
    )

    graph.add_node(
        "project_context",
        lambda state: state
    )

    graph.add_node(
        "knowledge",
        lambda state: state
    )

    graph.add_node(
        "memory",
        lambda state: state
    )

    graph.add_node(
        "history",
        lambda state: state
    )

    graph.add_node(
        "answer",
        lambda state: state
    )

    graph.add_edge(
        START,
        "project_context"
    )

    graph.add_edge(
        "project_context",
        "knowledge"
    )

    graph.add_edge(
        "knowledge",
        "memory"
    )

    graph.add_edge(
        "memory",
        "history"
    )

    graph.add_edge(
        "history",
        "answer"
    )

    graph.add_edge(
        "answer",
        END
    )

    return graph.compile()
