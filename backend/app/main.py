from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.translator import text_to_gloss
from app.loader import load_dictionary

app = FastAPI(title="Sign Language Translator API")

# Configure CORS so the React frontend can make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development; can restrict later if needed
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
    
    # 1. Validation: Empty or whitespace input
    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Input text cannot be empty or only whitespace."
        )

    try:
        dictionary = load_dictionary()
        gloss_terms = text_to_gloss(text, dictionary)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal translation error: {str(e)}"
        )

    # 2. Validation: No translatable content
    if not gloss_terms:
        raise HTTPException(
            status_code=400,
            detail="The input sentence has no translatable words or letters."
        )

    gloss_pipeline = []

    for term in gloss_terms:
        if term in dictionary:
            gloss_pipeline.append({
                "word": term,
                "type": "gesture"
            })
        else:
            gloss_pipeline.append({
                "word": term,
                "type": "letter"
            })

    return {
        "original_text": text,
        "gloss_pipeline": gloss_pipeline
    }
