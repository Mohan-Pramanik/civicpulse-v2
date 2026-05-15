import React, { useState, useRef, useEffect } from 'react';

const SYSTEM_PROMPT = `You are CivicPulse AI, a helpful assistant for the CivicPulse civic issue reporting platform in Kolkata, India. You help citizens:
- Report civic issues (roads, water, waste, electricity, encroachment)
- Check issue status and tracking
- Find the right department for their issue
- Understand how the platform works
- Navigate the app

Departments:
- Road/Pothole → Public Works Department (PWD)
- Water/Sewage → KMC Water Supply Department
- Garbage/Waste → Sanitation & Solid Waste Dept
- Street Lights → CESC / KMC Lighting Division
- Encroachment → KMC Enforcement Team
- Other → KMC General Grievance Cell

Be concise, friendly, and helpful. Use emojis occasionally. If asked about specific issues, suggest using the app's Report or Track pages.`;

const QUICK_PROMPTS = [
  '📍 How do I report an issue?',
  '🔍 Check my issue status',
  '🏛️ Which department handles potholes?',
  '⏱️ How long does resolution take?',
];

export default function AiChat() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState([
    { role: 'bot', text: '👋 Hi! I\'m your CivicPulse AI assistant. How can I help you today?' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = msgs
        .filter(m => m.role !== 'bot' || msgs.indexOf(m) > 0)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [...history, { role: 'user', content: userMsg }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not process that.';
      setMsgs(m => [...m, { role: 'bot', text: reply }]);
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: '⚠️ Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* Floating button */}
      <button className="ai-chat-btn" onClick={() => setOpen(o => !o)} title="AI Assistant">
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">🤖</div>
            <div>
              <div className="ai-chat-title">CivicPulse AI</div>
              <div className="ai-chat-sub">Powered by Claude</div>
            </div>
            <div className="ai-online" />
          </div>

          <div className="ai-chat-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg-bot ai-typing">
                <span /><span /><span />
              </div>
            )}

            {/* Quick prompts — show only at start */}
            {msgs.length === 1 && !loading && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                {QUICK_PROMPTS.map((q, i) => (
                  <button key={i}
                    style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'8px 12px', color:'var(--text-secondary)', fontSize:12.5, cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:'var(--f-body)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--glass)'}
                    onClick={() => send(q.replace(/^[^ ]+ /, '').replace(/^[🔍📍🏛️⏱️] /, ''))}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="ai-chat-input">
            <input
              placeholder="Ask me anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="ai-send-btn" onClick={() => send()} disabled={!input.trim() || loading}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
