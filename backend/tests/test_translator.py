import pytest
from app.translator import text_to_gloss

def test_translator_empty_inputs():
    assert text_to_gloss("") == []
    assert text_to_gloss("   ") == []

def test_translator_single_word():
    assert text_to_gloss("hello") == ["h", "e", "l", "l", "o"]
    assert text_to_gloss("please") == ["p", "l", "e", "a", "s", "e"]

def test_translator_case_insensitivity():
    assert text_to_gloss("HELLO") == ["h", "e", "l", "l", "o"]
    assert text_to_gloss("PlEaSe") == ["p", "l", "e", "a", "s", "e"]

def test_translator_multiple_words():
    assert text_to_gloss("hello world") == ["h", "e", "l", "l", "o", " ", "w", "o", "r", "l", "d"]

def test_translator_punctuation_and_numbers():
    assert text_to_gloss("hello, world!!! 123") == ["h", "e", "l", "l", "o", " ", "w", "o", "r", "l", "d"]

def test_translator_whitespace_handling():
    assert text_to_gloss("   hello    please   ") == ["h", "e", "l", "l", "o", " ", "p", "l", "e", "a", "s", "e"]

