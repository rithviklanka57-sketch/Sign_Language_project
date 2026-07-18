import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Hand3D from './Hand3D';

// Must match the constants in Hand3D.jsx
const BASE_LERP_MS = 380;
const BASE_HOLD_MS = 800;

function letterDuration(spd) {
  return Math.max(60, Math.round(BASE_LERP_MS / spd))
       + Math.max(80, Math.round(BASE_HOLD_MS  / spd));
}

function App() {
  const [inputText, setInputText]               = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState(null);
  const [glossPipeline, setGlossPipeline]       = useState([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [hasTranslated, setHasTranslated]       = useState(false);
  const [speed, setSpeed]                       = useState(1);

  // Single source of truth for the advance timer — lives in App, not in Hand3D
  const advanceTimerRef = useRef(null);

  // ── SEQUENCE TIMER ──────────────────────────────────────────────────────────
  // Fires whenever isPlaying / currentPlayIndex / speed / pipeline changes.
  // If playing, schedules the next advance after the letter's duration.
  // Clearing the timer is the ONLY way to pause.
  useEffect(() => {
    clearTimeout(advanceTimerRef.current);

    if (!isPlaying || !glossPipeline.length || currentPlayIndex >= glossPipeline.length) {
      return;
    }

    advanceTimerRef.current = setTimeout(() => {
      setCurrentPlayIndex(prev => {
        const next = prev + 1;
        if (next >= glossPipeline.length) {
          setIsPlaying(false);   // sequence done — pause on last letter
          return glossPipeline.length - 1;
        }
        return next;
      });
    }, letterDuration(speed));

    return () => clearTimeout(advanceTimerRef.current);
  }, [isPlaying, currentPlayIndex, glossPipeline, speed]);

  // ── TRANSLATE ───────────────────────────────────────────────────────────────
  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    clearTimeout(advanceTimerRef.current);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: inputText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Translation failed.');
      }
      const data = await res.json();
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

  // ── CONTROLS ────────────────────────────────────────────────────────────────
  const safeIndex  = Math.min(currentPlayIndex, Math.max(0, glossPipeline.length - 1));
  const activeItem = glossPipeline[safeIndex] ?? null;
  const isDone     = !isPlaying && hasTranslated && glossPipeline.length > 0 && safeIndex >= glossPipeline.length - 1;

  const handlePauseResume = () => {
    if (!hasTranslated || !glossPipeline.length) return;
    if (isDone) {
      // Replay from start
      setCurrentPlayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  };

  const handleBack = () => {
    if (!glossPipeline.length) return;
    clearTimeout(advanceTimerRef.current);
    const newIdx = Math.max(0, safeIndex - 1);
    setCurrentPlayIndex(newIdx);
  };

  const handleNext = () => {
    if (!glossPipeline.length) return;
    clearTimeout(advanceTimerRef.current);
    const newIdx = Math.min(glossPipeline.length - 1, safeIndex + 1);
    setCurrentPlayIndex(newIdx);
  };

  const jumpToTimelineIndex = (index) => {
    clearTimeout(advanceTimerRef.current);
    setCurrentPlayIndex(index);
  };

  // Speed display
  const speedLabel = speed <= 0.5 ? 'Slow' : speed <= 1 ? 'Normal' : speed <= 2 ? 'Fast' : 'Max';
  const speedPct   = ((speed - 0.5) / (3 - 0.5)) * 100;

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>Sign Language 3D Translator</h1>
        <p className="subtitle">
          Type any text and watch the 3D hand fingerspell it letter-by-letter in ASL.
        </p>
      </header>

      <main className="translator-grid">
        {/* Input */}
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
                onChange={e => setInputText(e.target.value)}
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

        {/* 3D Viewer */}
        {hasTranslated && (
          <section className="playback-section glass-panel">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h2 className="input-label" style={{ margin: 0 }}>3D Sign Language Display</h2>
              <span className="subtitle" style={{ fontSize:'0.8rem', margin:0 }}>
                🖱️ Drag to rotate · 📜 Scroll to zoom
              </span>
            </div>

            {/* Canvas */}
            <div className="player-wrapper">
              <Hand3D
                currentLetter={activeItem ? activeItem.word : null}
                speed={speed}
              />
              {activeItem && (
                <div className="letter-badge">{activeItem.word.toUpperCase()}</div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="controls-bar">

              {/* ◀ Pause/Play ▶ */}
              <div className="playback-btns">
                <button
                  className="ctrl-btn"
                  onClick={handleBack}
                  disabled={!glossPipeline.length || safeIndex === 0}
                  title="Previous letter"
                >
                  <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>

                <button
                  className="ctrl-btn ctrl-btn--primary"
                  onClick={handlePauseResume}
                  disabled={!glossPipeline.length}
                  title={isPlaying ? 'Pause' : isDone ? 'Replay' : 'Play'}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : isDone ? (
                    <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                <button
                  className="ctrl-btn"
                  onClick={handleNext}
                  disabled={!glossPipeline.length || safeIndex >= glossPipeline.length - 1}
                  title="Next letter"
                >
                  <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
                </button>
              </div>

              {/* Speedometer Slider */}
              <div className="speed-control">
                <div className="speed-label-row">
                  <span className="speed-icon">🐢</span>
                  <span className="speed-tag">
                    {speed.toFixed(2).replace(/\.?0+$/, '')}× — {speedLabel}
                  </span>
                  <span className="speed-icon">🐇</span>
                </div>
                <div className="speed-slider-wrapper">
                  <input
                    type="range"
                    id="speed-slider"
                    className="speed-slider"
                    min="0.5"
                    max="3"
                    step="0.25"
                    value={speed}
                    onChange={e => setSpeed(Number(e.target.value))}
                    style={{ '--fill-pct': `${speedPct}%` }}
                  />
                  <div className="speed-ticks">
                    {['0.5×', '1×', '1.5×', '2×', '3×'].map(t => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {glossPipeline.length > 0 && (
              <div className="timeline-container">
                <h3 className="timeline-title">
                  Letter Sequence
                  <span style={{ fontWeight:400, marginLeft:8, color:'#64748b' }}>
                    {safeIndex + 1} / {glossPipeline.length}
                  </span>
                </h3>
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
