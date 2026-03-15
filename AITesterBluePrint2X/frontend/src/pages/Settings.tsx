import { useState, useEffect } from 'react';
import { Save, Plug, Server, Key, BrainCircuit, Settings2 } from 'lucide-react';

const providers = [
  { id: 'ollama', name: 'Ollama', type: 'local' },
  { id: 'lmstudio', name: 'LM Studio', type: 'local' },
  { id: 'openai', name: 'OpenAI', type: 'cloud' },
  { id: 'claude', name: 'Claude', type: 'cloud' },
  { id: 'gemini', name: 'Gemini', type: 'cloud' },
  { id: 'grok', name: 'Grok', type: 'cloud' }
];

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export default function Settings() {
  const [activeProvider, setActiveProvider] = useState('ollama');
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [currentConfig, setCurrentConfig] = useState<ProviderConfig>({ baseUrl: '', apiKey: '', defaultModel: '' });

  // Load configs on mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem('testbuddy_configs');
    if (savedConfigs) {
      const parsed = JSON.parse(savedConfigs);
      setConfigs(parsed);
      if (parsed['ollama']) {
        setCurrentConfig(parsed['ollama']);
      }
    }
  }, []);

  // Handle provider switch
  const handleProviderSwitch = (id: string) => {
    setActiveProvider(id);
    if (configs[id]) {
      setCurrentConfig(configs[id]);
    } else {
      setCurrentConfig({
        baseUrl: id === 'ollama' ? 'http://127.0.0.1:11434/api' : '',
        apiKey: '',
        defaultModel: ''
      });
    }
  };

  const handleSave = () => {
    const updatedConfigs = { ...configs, [activeProvider]: currentConfig };
    setConfigs(updatedConfigs);
    localStorage.setItem('testbuddy_configs', JSON.stringify(updatedConfigs));
    localStorage.setItem('testbuddy_active_provider', activeProvider);
    alert('Configuration saved successfully!');
  };

  const currentProviderDetails = providers.find(p => p.id === activeProvider);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', overflowY: 'auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>LLM Configurator</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your local and cloud AI models.</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
        {/* Providers panel — Amber/Orange tint */}
        <div style={{ 
          width: '280px', padding: '1rem', alignSelf: 'flex-start',
          background: 'rgba(180, 83, 9, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(180, 83, 9, 0.15)'
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Providers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {providers.map(p => (
              <button 
                key={p.id}
                className={`btn ${activeProvider === p.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', border: activeProvider === p.id ? 'none' : '' }}
                onClick={() => handleProviderSwitch(p.id)}
              >
                {p.type === 'local' ? <Server size={16} /> : <BrainCircuit size={16} />}
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Config form — Amber/Orange tint */}
        <div style={{ 
          flex: 1, padding: '2rem',
          background: 'rgba(120, 53, 15, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(120, 53, 15, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <Settings2 size={24} color="var(--accent-color)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentProviderDetails?.name} Configuration</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>API Base URL</label>
              <div style={{ position: 'relative' }}>
                <Server size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder={currentProviderDetails?.type === 'local' ? 'http://127.0.0.1:11434/api' : 'https://api...'} 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={currentConfig.baseUrl}
                  onChange={(e) => setCurrentConfig({...currentConfig, baseUrl: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>API Key</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem' }} />
                <input 
                  type="password" 
                  className="input-base" 
                  placeholder="Enter API Key (Optional for Local)" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={currentConfig.apiKey}
                  onChange={(e) => setCurrentConfig({...currentConfig, apiKey: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Default Model</label>
              <input 
                type="text" 
                className="input-base" 
                placeholder="e.g. gpt-4o, llama3" 
                value={currentConfig.defaultModel}
                onChange={(e) => setCurrentConfig({...currentConfig, defaultModel: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary">
              <Plug size={16} />
              Test Connection
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
