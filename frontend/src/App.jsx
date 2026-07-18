import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Hand3D from './Hand3D';

function App() {
  const [inputText, setInputText]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [glossPipeline, setGlossPipeline] = useState([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);

  // Clamp index when pipeline finishes — stop playing but keep display open
  useEffect(() => {
    if (isPlaying && currentPlayIndex >= glossPipeline.length && glossPipeline.length > 0) {
      setIsPlaying(false);
      // Keep currentPlayIndex at last item so the 3D hand holds final pose
      setCurrentPlayIndex(glossPipeline.length - 1);
    }
  }, [isPlaying, currentPlayIndex, glossPipeline]);

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Translation failed.');
      }

      const data = await response.json();
      setGlossPipeline(data.gloss_pipeline);
      setCurrentPlayIndex(0);
      setIsPlaying(true);
      setHasTranslated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemComplete = () => {
    setCurrentPlayIndex(prev => prev + 1);
  };

  const handleReplay = () => {
    if (glossPipeline.length === 0) return;
    setCurrentPlayIndex(0);
    setIsPlaying(true);
  };

  const jumpToTimelineIndex = (index) => {
    setCurrentPlayIndex(index);
    setIsPlaying(true);
  };

  // activeItem is clamped so it never goes out of bounds
  const safeIndex  = Math.min(currentPlayIndex, glossPipeline.length - 1);
  const activeItem = glossPipeline[safeIndex] ?? null;
  const isDone     = !isPlaying && hasTranslated && glossPipeline.length > 0;

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>Sign Language 3D Translator</h1>
        <p className="subtitle">
          Type any text and watch the 3D hand fingerspell it letter-by-letter in ASL.
        </p>
      </header>

      <main className="translator-grid">
        {/* Input Section */}
        <section className="input-section glass-panel">
          <form onSubmit={handleTranslate} className="input-group">
            <label htmlFor="translate-input" className="input-label">
              Enter Text to Fingerspell
            </label>
            <div className="text-input-wrapper">
              <input
                id="translate-input"
                type="text"
                placeholder="e.g. Hello or ABC"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="translate-btn"
                disabled={loading || !inputText.trim()}
              >
                {loading ? <div className="spinner" /> : 'Translate'}
              </button>
            </div>
            {error && <div className="error-banner">{error}</div>}
          </form>
        </section>

        {/* 3D Viewer — always mounted once translated so canvas never tears down */}
        {hasTranslated && (
          <section className="playback-section glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 className="input-label" style={{ margin: 0 }}>
                3D Sign Language Display
              </h2>
              <span className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
                🖱️ Drag to rotate · 📜 Scroll to zoom
              </span>
            </div>

            <div className="player-wrapper">
              {/* Three.js canvas — always rendered */}
              <Hand3D
                currentLetter={activeItem ? activeItem.word : null}
                isPlaying={isPlaying}
                onItemComplete={handleItemComplete}
              />

              {/* "Done — click to replay" overlay shown only when sequence finished */}
              {isDone && (
                <div className="play-control-overlay" onClick={handleReplay}>
                  <button className="play-icon-btn" title="Replay">
                    <svg viewBox="0 0 24 24">
                      {/* Replay icon */}
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Current letter badge (bottom-right corner, subtle) */}
              {activeItem && (
                <div style={{
                  position: 'absolute', bottom: '14px', right: '16px',
                  background: 'rgba(15,23,42,0.75)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c084fc', letterSpacing: '0.08em' }}>
                    {activeItem.word.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Timeline */}
            {glossPipeline.length > 0 && (
              <div className="timeline-container">
                <h3 className="timeline-title">Letter Sequence</h3>
                <div className="timeline-track">
                  {glossPipeline.map((item, idx) => (
                    <button
                      key={`${item.word}-${idx}`}
                      className={`timeline-tag fingerspelling ${idx === safeIndex ? 'active' : ''}`}
                      onClick={() => jumpToTimelineIndex(idx)}
                    >
                      {item.word.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
