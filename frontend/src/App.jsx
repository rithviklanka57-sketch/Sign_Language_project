import React, { useState, useEffect } from 'react';
import './App.css';
import Hand3D from './Hand3D';

function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [glossPipeline, setGlossPipeline] = useState([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback control sequencer
  useEffect(() => {
    if (isPlaying && currentPlayIndex >= glossPipeline.length) {
      setIsPlaying(false);
      setCurrentPlayIndex(0);
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

  const handleItemComplete = () => {
    setCurrentPlayIndex(prev => prev + 1);
  };

  const togglePlay = () => {
    if (glossPipeline.length === 0) return;
    
    if (currentPlayIndex >= glossPipeline.length) {
      setCurrentPlayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
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
        <h1>Sign Language 3D Translator</h1>
        <p className="subtitle">Translate English sentences into visual sign-language gestures and letter-by-letter fingerspelling using an interactive 3D hand avatar.</p>
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
                placeholder="e.g. Hello please thank you OR Where is my family?"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 className="input-label" style={{ margin: 0 }}>
                3D Sign Language Display
              </h2>
              <span className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
                🖱️ Left click + Drag to rotate | 📜 Scroll to zoom
              </span>
            </div>

            <div className="player-wrapper" style={{ cursor: 'grab' }}>
              {/* 3D WebGL Canvas */}
              <Hand3D
                currentLetter={activeItem ? activeItem.word : null}
                isPlaying={isPlaying}
                onItemComplete={handleItemComplete}
              />

              {/* Fingerspelling Letter Overlay */}
              {isPlaying && activeItem && (
                <div className="fingerspelling-overlay" style={{ background: 'transparent', pointerEvents: 'none' }}>
                  <span className="fingerspelling-letter animate-letter-pop" style={{ fontSize: '7rem', color: '#38bdf8' }}>
                    {activeItem.word.toUpperCase()}
                  </span>
                  <span className="fingerspelling-label" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Fingerspelling</span>
                </div>
              )}

              {/* Play / Paused Overlay */}
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
              <h3 className="timeline-title">Gloss Sequence</h3>
              <div className="timeline-track">
                {glossPipeline.map((item, idx) => (
                  <button
                    key={`${item.word}-${idx}`}
                    className={`timeline-tag ${item.type === 'letter' ? 'fingerspelling' : ''} ${
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
