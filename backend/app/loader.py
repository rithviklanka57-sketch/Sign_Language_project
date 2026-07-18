import os
import json

# Define paths
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DICT_PATH = os.path.join(APP_DIR, "signs_dictionary.json")

# Root videos folder (project_root/videos)
BASE_DIR = os.path.dirname(os.path.dirname(APP_DIR))
DEFAULT_VIDEOS_DIR = os.path.join(BASE_DIR, "videos")

_dictionary_cache = None

def load_dictionary(dict_path: str = DICT_PATH) -> dict:
    """
    Loads and returns the signs dictionary JSON file.
    """
    global _dictionary_cache
    if _dictionary_cache is not None and dict_path == DICT_PATH:
        return _dictionary_cache

    if not os.path.exists(dict_path):
        raise FileNotFoundError(f"Signs dictionary file not found at: {dict_path}")

    with open(dict_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if dict_path == DICT_PATH:
        _dictionary_cache = data
    return data

def validate_dictionary(dictionary: dict, videos_dir: str = DEFAULT_VIDEOS_DIR) -> None:
    """
    Validates that every video filename specified as a value in the dictionary
    exists in the given videos_dir. Raises FileNotFoundError if any are missing.
    """
    if not os.path.exists(videos_dir):
        raise FileNotFoundError(f"Videos directory does not exist at: {videos_dir}")

    missing_files = []
    for word, filename in dictionary.items():
        file_path = os.path.join(videos_dir, filename)
        if not os.path.exists(file_path):
            missing_files.append((word, filename))

    if missing_files:
        details = ", ".join([f"'{word}': {filename}" for word, filename in missing_files])
        raise FileNotFoundError(
            f"Validation failed. The following video files are missing from '{videos_dir}': {details}"
        )

def get_video_for_word(word: str, dictionary: dict = None) -> str | None:
    """
    Lookup a word (case-insensitive) in the dictionary and return its video filename.
    Returns None if the word is not in the dictionary.
    """
    if dictionary is None:
        dictionary = load_dictionary()
    
    lookup_word = word.strip().lower()
    return dictionary.get(lookup_word)
