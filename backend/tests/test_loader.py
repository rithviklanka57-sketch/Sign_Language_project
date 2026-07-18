import pytest
import os
import tempfile
import json
from app.loader import load_dictionary, validate_dictionary, get_video_for_word

def test_load_dictionary():
    # Test loading the default dictionary
    dictionary = load_dictionary()
    assert isinstance(dictionary, dict)
    assert len(dictionary) == 20
    assert dictionary["hello"] == "hello.mp4"

def test_get_video_for_word():
    dictionary = load_dictionary()
    
    # Standard exact match
    assert get_video_for_word("hello", dictionary) == "hello.mp4"
    
    # Case insensitivity
    assert get_video_for_word("Hello", dictionary) == "hello.mp4"
    assert get_video_for_word("HeLLo  ", dictionary) == "hello.mp4"
    
    # Phrase matching
    assert get_video_for_word("thank you", dictionary) == "thank_you.mp4"
    assert get_video_for_word("Thank You", dictionary) == "thank_you.mp4"
    
    # Missing words
    assert get_video_for_word("nonexistent", dictionary) is None

def test_validate_dictionary_success():
    # Create a temporary directory with files to simulate videos folder
    with tempfile.TemporaryDirectory() as temp_dir:
        test_dict = {
            "hello": "hello.mp4",
            "yes": "yes.mp4"
        }
        # Create the files
        for filename in test_dict.values():
            with open(os.path.join(temp_dir, filename), "w") as f:
                f.write("")
        
        # Validation should pass without raising exceptions
        validate_dictionary(test_dict, temp_dir)

def test_validate_dictionary_failure():
    with tempfile.TemporaryDirectory() as temp_dir:
        test_dict = {
            "hello": "hello.mp4",
            "missing": "missing.mp4"
        }
        # Create only one file
        with open(os.path.join(temp_dir, "hello.mp4"), "w") as f:
            f.write("")
        
        # Validation should raise FileNotFoundError due to missing.mp4
        with pytest.raises(FileNotFoundError) as exc_info:
            validate_dictionary(test_dict, temp_dir)
        
        assert "missing.mp4" in str(exc_info.value)
