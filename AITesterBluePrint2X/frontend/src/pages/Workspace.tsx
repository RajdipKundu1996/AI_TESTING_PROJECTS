import { useState, useEffect, useRef } from 'react';
import { Send, FileText, Download, Copy, Loader2, ArrowLeft, AlertTriangle, Plus, X, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { saveToHistory, type HistoryItem } from '../components/Sidebar';

// Detect casual greetings / non-requirement input
const isCasualGreeting = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length > 60) return false; // long text is likely a requirement
  const casualPhrases = /^(hi|hello|hey|yo|sup|test|okay|ok|sure|yes|no|thanks|bye|good morning|good evening|howdy|what's up|wassup|hiya)[\s!?.,:]*$/i;
  return casualPhrases.test(trimmed);
};

const WELCOME_MESSAGE = `👋 Welcome to Test Buddy!

It looks like you sent a greeting. I'm here to help you generate comprehensive Jira Test Cases from your requirements.

📋 How to get started:
1. Paste your Jira requirement or user story in the input box below.
2. Click the "Generate" button.
3. I'll create structured test cases with Summary, Preconditions, Steps, Expected Results, Priority, and Labels.

💡 Example requirement:
"As a user, I want to reset my password via email so that I can regain access to my account if I forget my credentials."

Please upload your Jira requirements to begin!`;

export default function Workspace() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs that always hold the current input/output for use in event handlers
  // (event listener closures capture stale state — refs solve this)
  const inputRef = useRef(input);
  const outputRef = useRef(output);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { outputRef.current = output; }, [output]);

  // Listen for history item load from the sidebar via CustomEvent
  useEffect(() => {
    const handleLoadHistory = (e: Event) => {
      const item = (e as CustomEvent<HistoryItem>).detail;
      setInput(item.prompt);
      setOutput(item.output);
      setValidationError('');
    };

    const handleNewGeneration = () => {
      // Read actual current values from refs — avoids stale closure bug
      const currentInput = inputRef.current.trim();
      const currentOutput = outputRef.current;
      if (currentInput && currentOutput && !currentOutput.startsWith('\u{1F44B}')) {
        saveToHistory(currentInput, currentOutput);
        window.dispatchEvent(new Event('testbuddy_history_updated'));
      }
      setInput('');
      setOutput('');
      setValidationError('');
    };

    const handleQuit = () => {
      // Read actual current values from refs — avoids stale closure bug
      const currentInput = inputRef.current.trim();
      const currentOutput = outputRef.current;
      if (currentInput && currentOutput && !currentOutput.startsWith('\u{1F44B}')) {
        saveToHistory(currentInput, currentOutput);
        window.dispatchEvent(new Event('testbuddy_history_updated'));
      }
    };

    window.addEventListener('testbuddy_load_history', handleLoadHistory);
    window.addEventListener('testbuddy_new_generation', handleNewGeneration);
    window.addEventListener('testbuddy_quit', handleQuit);
    return () => {
      window.removeEventListener('testbuddy_load_history', handleLoadHistory);
      window.removeEventListener('testbuddy_new_generation', handleNewGeneration);
      window.removeEventListener('testbuddy_quit', handleQuit);
    };
  }, []);

  const handleGenerate = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // If it's a casual greeting, show a welcome message instead
    if (isCasualGreeting(trimmed)) {
      setOutput(WELCOME_MESSAGE);
      setValidationError('');
      return;
    }

    setValidationError('');
    setIsGenerating(true);

    const activeProvider = localStorage.getItem('testbuddy_active_provider') || 'ollama';
    const configsStr = localStorage.getItem('testbuddy_configs');
    const configs = configsStr ? JSON.parse(configsStr) : {};
    const config = configs[activeProvider] || {};

    try {
      const formData = new FormData();
      formData.append('provider', activeProvider);
      formData.append('config', JSON.stringify(config));
      formData.append('prompt', trimmed);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await axios.post('http://127.0.0.1:5000/api/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = response.data.data || JSON.stringify(response.data, null, 2);
      setOutput(result);
      setInput(''); // ← Clear input after successful generation
      setSelectedFile(null); // Clear file after successful generation

      // Save to history and notify sidebar
      saveToHistory(trimmed, result);
      window.dispatchEvent(new Event('testbuddy_history_updated'));
    } catch (error: any) {
      console.error('Generation Error:', error);
      const backendError = error.response?.data?.message || error.response?.data?.details?.error;
      const errorMsg = backendError ? `\n\nBackend Error: ${backendError}` : '';
      setOutput('Error generating test cases. Please check your configuration and try again.\n\nDetails: ' + (error instanceof Error ? error.message : String(error)) + errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    if (!output) return;
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/export-xlsx', {
        testCases: output
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Jira_Test_Cases.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('Failed to export Excel file.');
    }
  };

  const handleBack = () => {
    setOutput('');
    setInput('');
    setValidationError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {output && (
            <button
              className="btn btn-secondary"
              onClick={handleBack}
              style={{ padding: '0.5rem 0.75rem' }}
              title="Start a new generation"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Test Generation Workspace</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Paste your Jira requirements to generate comprehensive test cases.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
            <Copy size={16} /> Copy All
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={!output} style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
            <FileSpreadsheet size={16} color="#34d399" /> Export Excel
          </button>
          <button className="btn btn-primary" disabled={!output} onClick={() => {
            const blob = new Blob([output], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test-cases.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download size={16} /> Export TXT
          </button>
        </div>
      </header>

      {validationError && (
        <div className="validation-toast" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {validationError}
        </div>
      )}

      {/* Generated Output Panel — Purple / Indigo tint */}
      <div style={{ 
        flex: 1, marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'rgba(99, 60, 180, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px 0 rgba(99, 60, 180, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <FileText size={18} color="#a78bfa" />
          <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#c4b5fd' }}>Generated Output</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', whiteSpace: 'pre-wrap', fontFamily: output ? 'monospace' : 'inherit', fontSize: '0.875rem', lineHeight: 1.7 }}>
          {isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-color)' }}>
              <Loader2 size={48} className="animate-spin" />
              <p style={{ marginTop: '1rem' }}>Generating Test Cases...</p>
            </div>
          ) : output ? (
            output
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Your generated Jira test cases will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area — Teal / Emerald tint */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {selectedFile && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', 
            background: 'rgba(45, 212, 191, 0.1)', borderRadius: '12px', border: '1px solid rgba(45, 212, 191, 0.2)',
            fontSize: '0.875rem', color: '#5eead4', width: 'fit-content'
          }}>
            <FileText size={16} />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
            <button 
              onClick={() => setSelectedFile(null)} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <div style={{ 
          padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center',
          background: 'rgba(13, 148, 136, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(13, 148, 136, 0.15)'
        }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".docx,.xlsx,.xls,.csv,.jpeg,.jpg,.png"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
          />
          <button 
            className="btn btn-secondary" 
            title="Upload requirement file (.docx, .xlsx, .csv, images)"
            onClick={() => fileInputRef.current?.click()}
            style={{ height: '60px', width: '60px', borderRadius: '14px', padding: 0 }}
          >
            <Plus size={24} />
          </button>

          <textarea
            className="input-base"
            placeholder="Paste requirement or upload a file (+)..."
            value={input}
            onChange={(e) => { setInput(e.target.value); if (validationError) setValidationError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            style={{ resize: 'none', height: '60px', flex: 1, paddingTop: '1.25rem' }}
          />
          <button
            className="btn btn-primary"
            style={{ height: '60px', padding: '0 1.5rem' }}
            onClick={handleGenerate}
            disabled={isGenerating || (!input.trim() && !selectedFile)}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
