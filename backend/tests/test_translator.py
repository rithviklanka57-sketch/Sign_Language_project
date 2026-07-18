import pytest
from app.translator import text_to_gloss

def test_translator_empty_inputs():
    assert text_to_gloss("") == []
    assert text_to_gloss("   ") == []

def test_translator_basic_mapping():
    assert text_to_gloss("hello") == ["hello"]
    assert text_to_gloss("please") == ["please"]

def test_translator_case_insensitivity():
    assert text_to_gloss("HELLO") == ["hello"]
    assert text_to_gloss("PlEaSe") == ["please"]

def test_translator_stopword_removal():
    # 'is', 'am', 'are', 'the', 'a', 'to' are stopwords and should be removed
    assert text_to_gloss("the hello is please a") == ["hello", "please"]

def test_translator_pronoun_mapping():
    # 'I' -> 'my', 'me' -> 'my', 'your' -> 'you'
    assert text_to_gloss("I hello") == ["my", "hello"]
    assert text_to_gloss("hello me") == ["hello", "my"]
    assert text_to_gloss("your please") == ["you", "please"]

def test_translator_multi_word_phrase():
    # 'thank you' is in the dictionary as a multi-word phrase
    assert text_to_gloss("thank you") == ["thank you"]
    assert text_to_gloss("thank you my friend") == ["thank you", "my", "friend"]

def test_translator_question_reordering_what():
    # 'What is your name?' -> 'is' stripped, 'your'->'you', 'what' moved to end -> ['you', 'name', 'what']
    assert text_to_gloss("What is your name?") == ["you", "name", "what"]

def test_translator_question_reordering_where():
    # 'Where is my friend?' -> 'is' stripped, 'where' moved to end -> ['my', 'friend', 'where']
    assert text_to_gloss("Where is my friend?") == ["my", "friend", "where"]

def test_translator_question_reordering_why():
    # 'Why are you sad?' -> 'are' stripped, 'why' moved to end -> ['you', 'sad', 'why']
    assert text_to_gloss("Why are you sad?") == ["you", "sad", "why"]

def test_translator_question_reordering_who():
    # 'Who is deaf?' -> 'is' stripped, 'who' moved to end -> ['deaf', 'who']
    assert text_to_gloss("Who is deaf?") == ["deaf", "who"]

def test_translator_question_reordering_how():
    # 'How is my family?' -> 'is' stripped, 'how' moved to end -> ['my', 'family', 'how']
    assert text_to_gloss("How is my family?") == ["my", "family", "how"]

def test_translator_fingerspelling_fallback():
    # 'dog' is not in the dictionary, should fingerspell to ['d', 'o', 'g']
    assert text_to_gloss("dog") == ["d", "o", "g"]

def test_translator_combined_mapping_and_fingerspelling():
    # 'hello' mapped, 'cat' fingerspelled -> ['hello', 'c', 'a', 't']
    assert text_to_gloss("hello cat") == ["hello", "c", "a", "t"]

def test_translator_complex_sentence():
    # 'Where is my cat?' -> 'is' stripped, 'where' at end, 'cat' fingerspelled -> ['my', 'c', 'a', 't', 'where']
    assert text_to_gloss("Where is my cat?") == ["my", "c", "a", "t", "where"]

def test_translator_punctuation_stripping():
    # punctuation should be ignored
    assert text_to_gloss("hello, goodbye!!!") == ["hello", "goodbye"]

def test_translator_whitespace_handling():
    assert text_to_gloss("   hello    please   ") == ["hello", "please"]
