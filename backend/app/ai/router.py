from functools import lru_cache
import httpx

from app.core.config import settings


class OpenAIModel:

    def __init__(self, model_name: str, temperature: float = 0.2):
        self.model_name = model_name
        self.temperature = temperature

    async def ainvoke(self, messages):
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": role,
                    "content": content,
                }
                for role, content in messages
            ],
            "temperature": self.temperature,
        }

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            raise RuntimeError(
                f"OpenAI API error {response.status_code}: {response.text[:1000]}"
            )

        data = response.json()

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(
                f"Invalid OpenAI response: {data}"
            ) from exc

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
            settings.DEFAULT_MODEL or "gpt-4o-mini",
        )

        return OpenAIModel(
            model_name=model_name,
            temperature=0.2,
        )


@lru_cache(maxsize=1)
def get_model_router():
    return ModelRouter()