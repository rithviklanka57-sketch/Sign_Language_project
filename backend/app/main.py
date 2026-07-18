from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.translator import text_to_gloss

app = FastAPI(title="Sign Language Translator API")

# Configure CORS so the React frontend can make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    text: str

# Root/Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Sign Language Translator API is running"}

@app.post("/translate")
def translate(payload: TranslationRequest):
    text = payload.text

    # Validation: Empty or whitespace input
    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Input text cannot be empty or only whitespace."
        )

    try:
        letters = text_to_gloss(text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal translation error: {str(e)}"
        )

    # Validation: No translatable content
    if not letters:
        raise HTTPException(
            status_code=400,
            detail="The input sentence has no translatable characters."
        )

    # Every item is a single letter (space = word gap, skipped in frontend)
    gloss_pipeline = [
        {"word": ch, "type": "letter"}
        for ch in letters
        if ch != ' '   # Skip word-gap markers; timeline shows them visually
    ]

    return {
        "original_text": text,
        "gloss_pipeline": gloss_pipeline
    }
