from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.tarot_ai import (
    TarotAIConfigError,
    TarotAIEmptyResponseError,
    TarotAIService,
    TarotAIUnavailableError,
)


class TwoCardReadingRequest(BaseModel):
    first_card: str = Field(..., min_length=1)
    second_card: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    topic: Optional[str] = None


class TwoCardReadingResponse(BaseModel):
    reading: str
    model: str


app = FastAPI(title="Tarot AI API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_duplicate_forbidden() -> bool:
    return os.getenv("FORBID_DUPLICATE_CARDS", "true").lower() in {"1", "true", "yes"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/readings/two-cards", response_model=TwoCardReadingResponse)
def create_two_card_reading(payload: TwoCardReadingRequest) -> TwoCardReadingResponse:
    return _build_two_card_reading(
        first_card=payload.first_card,
        second_card=payload.second_card,
        topic=payload.topic,
    )


@app.get("/api/readings/two-cards", response_model=TwoCardReadingResponse)
def create_two_card_reading_get(
    first_card: str = Query(..., min_length=1),
    second_card: str = Query(..., min_length=1),
    topic: Optional[str] = None,
) -> TwoCardReadingResponse:
    return _build_two_card_reading(
        first_card=first_card,
        second_card=second_card,
        topic=topic,
    )


def _build_two_card_reading(
    first_card: str,
    second_card: str,
    topic: Optional[str] = None,
) -> TwoCardReadingResponse:
    first_card = first_card.strip()
    second_card = second_card.strip()

    if _is_duplicate_forbidden() and first_card == second_card:
        raise HTTPException(status_code=400, detail="Duplicate cards are not allowed")

    if not first_card or not second_card:
        raise HTTPException(status_code=400, detail="Both cards are required")

    try:
        service = TarotAIService()
        reading = service.generate_two_card_reading(
            first_card=first_card,
            second_card=second_card,
            topic=topic,
        )
        return TwoCardReadingResponse(reading=reading, model=service.model)
    except TarotAIConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except TarotAIEmptyResponseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except TarotAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
