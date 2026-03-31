from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from openai import APIConnectionError, APITimeoutError, OpenAI, RateLimitError


class TarotAIError(Exception):
    """Base domain error for tarot AI service."""


class TarotAIConfigError(TarotAIError):
    """Raised when required configuration is missing."""


class TarotAIUnavailableError(TarotAIError):
    """Raised when model API is unavailable or timed out."""


class TarotAIEmptyResponseError(TarotAIError):
    """Raised when model response has no usable text."""


class TarotAIService:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise TarotAIConfigError("OPENAI_API_KEY is not set")

        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))
        retries = int(os.getenv("OPENAI_MAX_RETRIES", "2"))

        self.client = OpenAI(api_key=api_key, timeout=timeout_seconds, max_retries=retries)
        self.system_prompt = self._load_prompt("two_card_system.txt")
        self.user_prompt_template = self._load_prompt("two_card_user.txt")

    @staticmethod
    def _load_prompt(filename: str) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / "prompts" / filename
        return prompt_path.read_text(encoding="utf-8").strip()

    def generate_two_card_reading(
        self,
        first_card: str,
        second_card: str,
        topic: Optional[str] = None,
    ) -> str:
        topic_value = topic.strip() if topic else ""
        user_prompt = self.user_prompt_template.format(
            first_card=first_card,
            second_card=second_card,
            topic=topic_value or "не указана",
        )

        try:
            response = self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except (APITimeoutError, APIConnectionError, RateLimitError) as exc:
            raise TarotAIUnavailableError("OpenAI API is unavailable") from exc
        except Exception as exc:  # pragma: no cover
            raise TarotAIUnavailableError("OpenAI API call failed") from exc

        text = (response.output_text or "").strip()
        if not text:
            raise TarotAIEmptyResponseError("OpenAI returned empty response")

        return text
