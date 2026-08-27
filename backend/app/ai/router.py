from functools import lru_cache
import httpx

from app.core.config import settings


class LocalOllamaModel:

    def __init__(
        self,
        model_name: str,
        base_url: str = "http://127.0.0.1:11434",
        temperature: float = 0.2,
    ):
        self.model_name = model_name
        self.model = model_name
        self.base_url = base_url.rstrip("/")
        self.temperature = temperature

    async def ainvoke(self, messages):
        ollama_messages = []

        for role, content in messages:
            ollama_messages.append(
                {
                    "role": role,
                    "content": content,
                }
            )

        payload = {
            "model": self.model_name,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "temperature": self.temperature,
            },
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )

        response.raise_for_status()

        data = response.json()

        message = data.get("message", {})
        content = message.get("content")

        if not content:
            raise RuntimeError(
                f"Ollama returned an invalid response: {data}"
            )

        return type(
            "AIResponse",
            (),
            {
                "content": content,
            },
        )()


class ModelRouter:

    def route(
        self,
        task_type: str = "text",
        project_config: dict | None = None,
    ):
        if task_type != "text":
            raise ValueError(
                f"Unsupported MVP task type: {task_type}"
            )

        model_name = (
            project_config or {}
        ).get(
            "model_name",
            settings.DEFAULT_MODEL or "llama3.2:3b",
        )

        return LocalOllamaModel(
            model_name=model_name,
            base_url="http://127.0.0.1:11434",
            temperature=0.2,
        )


@lru_cache(maxsize=1)
def get_model_router():
    return ModelRouter()
