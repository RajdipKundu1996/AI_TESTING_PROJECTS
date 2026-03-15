import { useState, useEffect } from 'react';
import { Bot, Settings2, History, Plus, MessageSquare, Trash2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface HistoryItem {
  id: number;
  title: string;
  prompt: string;
  output: string;
  timestamp: number;
}

const HISTORY_KEY = 'testbuddy_history';

export const saveToHistory = (prompt: string, output: string) => {
  const existing: HistoryItem[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const title = prompt.length > 40 ? prompt.substring(0, 40) + '…' : prompt;
  const newItem: HistoryItem = { id: Date.now(), title, prompt, output, timestamp: Date.now() };
  const updated = [newItem, ...existing].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

// Dispatch a custom event to load a history item into the Workspace
// This is more reliable than React Router state for same-route navigation
export const loadHistoryItem = (item: HistoryItem) => {
  window.dispatchEvent(new CustomEvent('testbuddy_load_history', { detail: item }));
};

const Sidebar = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const refreshHistory = () => {
    const saved: HistoryItem[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    setHistory(saved);
  };

  useEffect(() => {
    refreshHistory();
    window.addEventListener('testbuddy_history_updated', refreshHistory);
    return () => window.removeEventListener('testbuddy_history_updated', refreshHistory);
  }, []);

  const handleHistoryClick = (item: HistoryItem) => {
    // Navigate to workspace first (in case we're on settings), then fire the event
    navigate('/workspace');
    // Small delay to ensure workspace is mounted before receiving the event
    setTimeout(() => {
      loadHistoryItem(item);
    }, 50);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <div className="sidebar" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.5rem' }}>
        <div style={{
          background: 'var(--accent-color)',
          padding: '0.5rem',
          borderRadius: '8px',
          boxShadow: '0 0 15px var(--accent-glow)'
        }}>
          <Bot size={24} color="white" />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }} className="text-gradient">
          Test Buddy
        </h1>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: '1.5rem', justifyContent: 'flex-start' }}
        onClick={() => {
          navigate('/workspace');
          // Clear workspace via event
          window.dispatchEvent(new CustomEvent('testbuddy_new_generation'));
        }}
      >
        <Plus size={18} />
        New Generation
      </button>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
              History
            </span>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              title="Clear all history"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.5rem', textAlign: 'center', opacity: 0.6 }}>
              No history yet. Generate test cases to see them here.
            </p>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                className="btn btn-secondary"
                onClick={() => handleHistoryClick(item)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.75rem 0.5rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <MessageSquare size={16} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: '1px solid transparent' }}
          onClick={() => navigate('/settings')}
        >
          <Settings2 size={18} />
          Settings
        </button>
        <button
          className="btn btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444'
          }}
          onClick={() => {
            // Fire the quit event so Workspace saves the session first
            window.dispatchEvent(new Event('testbuddy_quit'));
            // Then navigate to farewell page
            setTimeout(() => navigate('/farewell'), 150);
          }}
        >
          <LogOut size={18} />
          Quit
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
