from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "message": "Sign Language Translator API is running"
    }

def test_translate_success():
    response = client.post("/translate", json={"text": "What is your name?"})
    assert response.status_code == 200
    data = response.json()
    assert data["original_text"] == "What is your name?"
    assert len(data["gloss_pipeline"]) == 3
    assert data["gloss_pipeline"][0]["word"] == "you"
    assert data["gloss_pipeline"][0]["type"] == "video"
    assert data["gloss_pipeline"][0]["url"] == "http://testserver/videos/you.mp4"
    assert len(data["video_urls"]) == 3
    assert data["video_urls"][0] == "http://testserver/videos/you.mp4"

def test_translate_fingerspelling_success():
    # 'dog' is not in dictionary. It should fall back to fingerspelling.
    # Letters 'd', 'o', 'g' do not exist in the /videos directory, so they should return url: null
    response = client.post("/translate", json={"text": "dog"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["gloss_pipeline"]) == 3
    assert data["gloss_pipeline"][0]["word"] == "d"
    assert data["gloss_pipeline"][0]["type"] == "fingerspelling"
    assert data["gloss_pipeline"][0]["url"] is None
    assert len(data["video_urls"]) == 0

def test_translate_empty_input():
    response = client.post("/translate", json={"text": ""})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

    response = client.post("/translate", json={"text": "   "})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_translate_no_translatable_content():
    # Only stopwords
    response = client.post("/translate", json={"text": "is are a the"})
    assert response.status_code == 400
    assert "no translatable words or letters" in response.json()["detail"]

    # Only non-alphabetic characters
    response = client.post("/translate", json={"text": "123 !@#$"})
    assert response.status_code == 400
    assert "no translatable words or letters" in response.json()["detail"]
