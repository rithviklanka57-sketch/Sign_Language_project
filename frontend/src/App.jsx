import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [glossPipeline, setGlossPipeline] = useState([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef(null);

  // Playback control effect
  useEffect(() => {
    if (!isPlaying || currentPlayIndex >= glossPipeline.length) {
      if (currentPlayIndex >= glossPipeline.length && glossPipeline.length > 0) {
        setIsPlaying(false);
      }
      return;
    }

    const currentItem = glossPipeline[currentPlayIndex];
    if (currentItem.type === 'fingerspelling') {
      // Visual fingerspelling overlay: hold the letter on screen for 800ms, then advance
      const timer = setTimeout(() => {
        setCurrentPlayIndex(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentPlayIndex, glossPipeline]);

  // When active item is a video, trigger play if video element is loaded and source is set
  useEffect(() => {
    if (isPlaying && currentPlayIndex < glossPipeline.length) {
      const currentItem = glossPipeline[currentPlayIndex];
      if (currentItem.type === 'video' && videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(err => {
          console.log("Auto-play blocked or error: ", err);
        });
      }
    }
  }, [isPlaying, currentPlayIndex, glossPipeline]);

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setGlossPipeline([]);
    setCurrentPlayIndex(0);
    setIsPlaying(false);

    try {
      const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Translation failed.');
      }

      const data = await response.json();
      setGlossPipeline(data.gloss_pipeline);
      if (data.gloss_pipeline.length > 0) {
        setIsPlaying(true);
        setCurrentPlayIndex(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnded = () => {
    setCurrentPlayIndex(prev => prev + 1);
  };

  const togglePlay = () => {
    if (glossPipeline.length === 0) return;
    
    if (currentPlayIndex >= glossPipeline.length) {
      setCurrentPlayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
      if (!isPlaying && videoRef.current) {
        videoRef.current.play().catch(() => {});
      } else if (isPlaying && videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  const jumpToTimelineIndex = (index) => {
    setCurrentPlayIndex(index);
    setIsPlaying(true);
  };

  const activeItem = glossPipeline[currentPlayIndex];

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>Sign Language Translator</h1>
        <p className="subtitle">Translate English sentences into visual sign-language gloss and fingerspelling sequences.</p>
      </header>

      <main className="translator-grid">
        {/* Input Section */}
        <section className="input-section glass-panel">
          <form onSubmit={handleTranslate} className="input-group">
            <label htmlFor="translate-input" className="input-label">
              Enter English Sentence
            </label>
            <div className="text-input-wrapper">
              <input
                id="translate-input"
                type="text"
                placeholder="e.g. What is your name? OR Hello my friend dog"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-input"
                disabled={loading}
              />
              <button type="submit" className="translate-btn" disabled={loading || !inputText.trim()}>
                {loading ? <div className="spinner" /> : 'Translate'}
              </button>
            </div>
            {error && <div className="error-banner">{error}</div>}
          </form>
        </section>

        {/* Playback Section */}
        {glossPipeline.length > 0 && (
          <section className="playback-section glass-panel">
            <h2 className="input-label" style={{ marginBottom: '15px' }}>
              Sign Language Playback
            </h2>
            <div className="player-wrapper">
              {/* If fingerspelling is active, show the overlay */}
              {isPlaying && activeItem && activeItem.type === 'fingerspelling' && (
                <div className="fingerspelling-overlay">
                  <span className="fingerspelling-letter animate-letter-pop">
                    {activeItem.word}
                  </span>
                  <span className="fingerspelling-label">Fingerspelling</span>
                </div>
              )}

              {/* Video Player */}
              <video
                ref={videoRef}
                src={activeItem && activeItem.type === 'video' ? activeItem.url : undefined}
                className="video-element"
                onEnded={handleVideoEnded}
                onClick={togglePlay}
                controls={activeItem && activeItem.type === 'video'}
                style={{
                  display: activeItem && activeItem.type === 'video' ? 'block' : 'none'
                }}
              />

              {/* Paused/Inactive Play Overlay */}
              {!isPlaying && (
                <div className="play-control-overlay" onClick={togglePlay}>
                  <button className="play-icon-btn">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Visual Timeline Tracker */}
            <div className="timeline-container">
              <h3 className="timeline-title">Gloss Timeline Tracker</h3>
              <div className="timeline-track">
                {glossPipeline.map((item, idx) => (
                  <button
                    key={`${item.word}-${idx}`}
                    className={`timeline-tag ${item.type} ${
                      idx === currentPlayIndex && isPlaying ? 'active' : ''
                    }`}
                    onClick={() => jumpToTimelineIndex(idx)}
                  >
                    {item.word}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
