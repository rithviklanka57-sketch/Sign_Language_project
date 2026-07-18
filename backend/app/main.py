from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os

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

# Define directories
APP_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(os.path.dirname(APP_DIR))
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")

# Ensure videos folder exists
os.makedirs(VIDEOS_DIR, exist_ok=True)

class TranslationRequest(BaseModel):
    text: str

# Root/Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Sign Language Translator API is running"}

@app.post("/translate")
def translate(payload: TranslationRequest, request: Request):
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

    # Base URL for static videos
    base_url_str = str(request.base_url).rstrip("/")
    videos_base = f"{base_url_str}/videos"

    gloss_pipeline = []
    video_urls = []

    for term in gloss_terms:
        if term in dictionary:
            filename = dictionary[term]
            url = f"{videos_base}/{filename}"
            gloss_pipeline.append({
                "word": term,
                "type": "video",
                "url": url
            })
            video_urls.append(url)
        else:
            # Fingerspelling fallback
            filename = f"{term}.mp4"
            file_path = os.path.join(VIDEOS_DIR, filename)
            
            if os.path.exists(file_path):
                url = f"{videos_base}/{filename}"
                gloss_pipeline.append({
                    "word": term,
                    "type": "fingerspelling",
                    "url": url
                })
                video_urls.append(url)
            else:
                gloss_pipeline.append({
                    "word": term,
                    "type": "fingerspelling",
                    "url": None
                })

    return {
        "original_text": text,
        "gloss_pipeline": gloss_pipeline,
        "video_urls": video_urls
    }

# Serve the static /videos folder under the "/videos" route prefix
app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
