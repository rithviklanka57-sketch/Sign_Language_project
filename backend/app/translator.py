import re
import os
from app.loader import load_dictionary

# Define stopwords to be removed
STOPWORDS = {"is", "am", "are", "was", "were", "a", "an", "the", "to", "do", "does", "did", "of", "for", "in", "on", "at"}

# Define question words that should be moved to the end
QUESTION_WORDS = {"what", "where", "when", "why", "how", "who"}

# Simplify pronouns
PRONOUN_MAP = {
    "i": "my",
    "me": "my",
    "your": "you"
}

def text_to_gloss(sentence: str, dictionary: dict = None) -> list[str]:
    """
    Translates an English sentence into a list of gloss terms.
    Applies stopword removal, pronoun mapping, question reordering,
    and fallback fingerspelling.
    """
    if not sentence or not sentence.strip():
        return []

    if dictionary is None:
        dictionary = load_dictionary()

    # 1. Cleaning: Lowercase and strip punctuation
    cleaned = sentence.lower().strip()
    cleaned = re.sub(r"[^\w\s-]", "", cleaned)

    # 2. Identify multi-word dictionary keys (e.g. "thank you")
    multi_word_keys = [k for k in dictionary.keys() if " " in k]
    multi_word_keys.sort(key=len, reverse=True)

    # Replace spaces in multi-word keys with placeholders
    processed_text = cleaned
    for key in multi_word_keys:
        pattern = r"\b" + re.escape(key) + r"\b"
        placeholder = key.replace(" ", "_")
        processed_text = re.sub(pattern, placeholder, processed_text)

    # 3. Tokenize by whitespace
    raw_tokens = processed_text.split()

    # 4. Filter, Map Pronouns, and Clean Tokens
    tokens = []
    for token in raw_tokens:
        norm_token = token.replace("_", " ")
        
        # Strip stopwords
        if "_" not in token and norm_token in STOPWORDS:
            continue

        # Map pronouns
        if "_" not in token and norm_token in PRONOUN_MAP:
            norm_token = PRONOUN_MAP[norm_token]
            token = norm_token.replace(" ", "_")

        tokens.append(token)

    # 5. Question Word Reordering
    question_tokens = []
    other_tokens = []
    
    for token in tokens:
        norm_token = token.replace("_", " ")
        if norm_token in QUESTION_WORDS:
            question_tokens.append(token)
        else:
            other_tokens.append(token)
            
    reordered_tokens = other_tokens + question_tokens

    # 6. Map to Dictionary / Fingerspelling Fallback
    gloss_list = []
    for token in reordered_tokens:
        norm_token = token.replace("_", " ")
        
        if norm_token in dictionary:
            gloss_list.append(norm_token)
        else:
            clean_word = re.sub(r"[^a-z]", "", norm_token)
            for char in clean_word:
                gloss_list.append(char)

    return gloss_list
