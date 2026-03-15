import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function Farewell() {
  useEffect(() => {
    // Try to close the tab after a short delay
    const timer = setTimeout(() => {
      window.open('', '_self');
      window.close();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '1.5rem',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '50%',
        padding: '1.5rem',
        display: 'flex',
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.3)'
      }}>
        <CheckCircle size={64} color="#10b981" />
      </div>
      <div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }} className="text-gradient">
          Session Saved!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Your session has been saved to history.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.6 }}>
          You can now close this tab.
        </p>
      </div>
    </div>
  );
}
