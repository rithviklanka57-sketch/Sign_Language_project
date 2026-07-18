import re

def text_to_gloss(sentence: str) -> list[str]:
    """
    Translates an English sentence into a list of individual letters for fingerspelling.
    All words are spelled out letter by letter — no dictionary word lookup.
    """
    if not sentence or not sentence.strip():
        return []

    # Lowercase and keep only a-z characters and spaces
    cleaned = re.sub(r"[^a-z\s]", "", sentence.lower().strip())

    # Tokenize into words
    words = cleaned.split()

    # Expand every word into individual letters with a space marker between words
    letters = []
    for i, word in enumerate(words):
        for char in word:
            letters.append(char)
        # Add a gap marker between words (not after the last word)
        if i < len(words) - 1:
            letters.append(' ')

    return letters
