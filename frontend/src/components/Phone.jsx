// GTA-style in-game phone, bottom-right corner of the scene. Tap the phone
// button to flip it open; whatever you type is posted to the backend's
// /api/announce, which the Discord bot relays to the office channel as an
// @everyone ping. Enter sends, Shift+Enter makes a newline, Esc closes.

import { useEffect, useRef, useState } from 'react';

// VITE_API_URL already includes the /api prefix (see .env).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const MAX_LEN = 500;

export default function Phone() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // "Sent"/"Failed" flashes briefly, then the phone is ready again.
  useEffect(() => {
    if (status !== 'sent' && status !== 'error') return;
    const id = setTimeout(() => setStatus('idle'), 2500);
    return () => clearTimeout(id);
  }, [status]);

  const send = async () => {
    const message = text.trim();
    if (!message || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch(`${API_URL}/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setText('');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="phone-wrap">
      {open && (
        <div className="phone">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-statusbar">
              <span>TeslaTel</span>
              <span>5G ▮▮▮</span>
            </div>
            <div className="phone-app-header">
              <span className="phone-app-icon">📢</span>
              <div>
                <div className="phone-app-title">Office Broadcast</div>
                <div className="phone-app-sub">tags @everyone on Discord</div>
              </div>
            </div>
            <textarea
              ref={inputRef}
              className="phone-input"
              placeholder="Type your announcement…"
              maxLength={MAX_LEN}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="phone-meta">
              <span className={`phone-status ${status}`}>
                {status === 'sending' && 'Sending…'}
                {status === 'sent' && 'Sent ✓'}
                {status === 'error' && 'Failed — is the backend up?'}
              </span>
              <span className="phone-count">
                {text.length}/{MAX_LEN}
              </span>
            </div>
            <button
              className="phone-send"
              onClick={send}
              disabled={!text.trim() || status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send @everyone'}
            </button>
          </div>
          <div className="phone-homebar" />
        </div>
      )}
      <button
        className={`phone-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close phone' : 'Open phone'}
        aria-expanded={open}
      >
        📱
      </button>
    </div>
  );
}
