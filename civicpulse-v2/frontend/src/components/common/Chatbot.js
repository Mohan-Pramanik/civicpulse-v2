import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues, getIssues } from '../../api';
import { useAuth } from '../../context/AuthContext';

// ── Intent detection ─────────────────────────────────────────
const INTENTS = [
  { patterns: ['my report', 'my issue', 'my complaint', 'show my', 'track'], intent: 'MY_REPORTS' },
  { patterns: ['report water', 'water issue', 'water problem', 'no water', 'pipe burst'], intent: 'REPORT_WATER' },
  { patterns: ['report road', 'pothole', 'road damage', 'broken road'], intent: 'REPORT_ROAD' },
  { patterns: ['report waste', 'garbage', 'trash', 'waste'], intent: 'REPORT_WASTE' },
  { patterns: ['report electricity', 'street light', 'power', 'electric'], intent: 'REPORT_ELECTRICITY' },
  { patterns: ['report', 'submit', 'new issue', 'new complaint', 'file'], intent: 'REPORT_GENERAL' },
  { patterns: ['status', 'check', 'update', 'civ-', 'ticket'], intent: 'CHECK_STATUS' },
  { patterns: ['department', 'who handles', 'which dept', 'contact'], intent: 'DEPARTMENTS' },
  { patterns: ['help', 'how to', 'what can', 'guide', 'tutorial'], intent: 'HELP' },
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'namaste'], intent: 'GREETING' },
  { patterns: ['thank', 'thanks', 'ok', 'okay', 'great', 'bye'], intent: 'THANKS' },
  { patterns: ['stats', 'total', 'how many', 'count', 'resolved count'], intent: 'STATS' },
];

const DEPT_MAP = {
  road:         '🛣️ Public Works Department (PWD)',
  water:        '💧 KMC Water Supply Department',
  waste:        '🗑️ Sanitation & Solid Waste Dept',
  electricity:  '⚡ CESC / KMC Lighting Division',
  encroachment: '🏗️ KMC Enforcement Team',
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const { patterns, intent } of INTENTS) {
    if (patterns.some(p => lower.includes(p))) return intent;
  }
  return 'UNKNOWN';
}

function extractTicket(text) {
  const match = text.match(/CIV-\d{4}-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

const QUICK = [
  '📍 Report an issue',
  '🔍 Check my reports',
  '🏛️ Which department?',
  '❓ How to use CivicPulse',
];

export default function Chatbot() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { from: 'bot', text: `👋 Welcome to CivicPulse! I'm your civic assistant.\n\nI can help you:\n• Report a civic issue\n• Track your complaints\n• Find the right department\n• Check issue status` },
  ]);
  const [input,   setInput]   = useState('');
  const [typing,  setTyping]  = useState(false);
  const bottomRef = useRef(null);
  const { user }  = useAuth();
  const navigate  = useNavigate();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  const addBot = text => setMsgs(m => [...m, { from: 'bot', text }]);

  const processIntent = async (text, intent) => {
    setTyping(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    setTyping(false);

    switch (intent) {
      case 'GREETING':
        addBot(`Hello${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! 👋 How can I help you today?\n\nYou can:\n📍 Report a civic issue\n🔍 Track your reports\n🏛️ Find the right department`);
        break;

      case 'MY_REPORTS':
        try {
          const r = await getMyIssues();
          const issues = r.data.issues || [];
          if (issues.length === 0) {
            addBot("You haven't submitted any reports yet. Would you like to report an issue?");
          } else {
            const list = issues.slice(0, 3).map(i => `• ${i.ticketId}: ${i.title} — **${i.status?.replace(/_/g,' ')}**`).join('\n');
            addBot(`📋 Your recent reports (${issues.length} total):\n\n${list}\n\n${issues.length > 3 ? `...and ${issues.length - 3} more.` : ''}\nTap "My Reports" in the sidebar to see all.`);
          }
        } catch { addBot("I couldn't fetch your reports. Please check the My Reports page directly."); }
        navigate('/track');
        break;

      case 'CHECK_STATUS': {
        const ticket = extractTicket(text);
        if (ticket) {
          try {
            const r = await getIssues({ search: ticket });
            const issue = (r.data.data || [])[0];
            if (issue) {
              addBot(`🔎 Found ticket **${ticket}**:\n\n📌 ${issue.title}\n📊 Status: **${issue.status?.replace(/_/g,' ')}**\n📍 ${issue.location?.address}\n📅 ${new Date(issue.createdAt).toLocaleDateString()}\n\nClick "View Details" in My Reports for full timeline.`);
            } else {
              addBot(`I couldn't find ticket **${ticket}**. Please check the ticket ID and try again.`);
            }
          } catch { addBot("Couldn't look up that ticket right now. Please check the My Reports page."); }
        } else {
          addBot(`Please share your ticket ID (format: CIV-2026-XXXX) and I'll check the status for you.\n\nOr you can view all your reports in the sidebar → My Reports`);
        }
        break;
      }

      case 'REPORT_WATER':
        addBot(`💧 Water Issue Report\n\nThis will be routed to:\n**KMC Water Supply Department**\n⏱ Expected resolution: 2–4 working days\n\nI'll take you to the report form now!`);
        setTimeout(() => navigate('/report'), 1200);
        break;

      case 'REPORT_ROAD':
        addBot(`🛣️ Road/Pothole Report\n\nThis will be routed to:\n**Public Works Department (PWD)**\n⏱ Expected resolution: 3–5 working days\n\nI'll take you to the report form now!`);
        setTimeout(() => navigate('/report'), 1200);
        break;

      case 'REPORT_WASTE':
        addBot(`🗑️ Waste/Garbage Report\n\nThis will be routed to:\n**Sanitation & Solid Waste Dept**\n⏱ Expected resolution: 1–2 working days\n\nI'll take you to the report form now!`);
        setTimeout(() => navigate('/report'), 1200);
        break;

      case 'REPORT_ELECTRICITY':
        addBot(`⚡ Street Light / Electricity Issue\n\nThis will be routed to:\n**CESC / KMC Lighting Division**\n⏱ Expected resolution: 2–3 working days\n\nI'll take you to the report form now!`);
        setTimeout(() => navigate('/report'), 1200);
        break;

      case 'REPORT_GENERAL':
        addBot(`To report a civic issue, I'll need:\n\n1️⃣ Issue type (road, water, waste, electricity)\n2️⃣ Location / address\n3️⃣ Photo evidence (optional)\n\nTaking you to the report form...`);
        setTimeout(() => navigate('/report'), 1200);
        break;

      case 'DEPARTMENTS':
        addBot(`🏛️ Department Directory:\n\n${Object.entries(DEPT_MAP).map(([k,v]) => `${v}`).join('\n')}\n\nAll issues are auto-routed to the correct department when you submit a report.`);
        break;

      case 'HELP':
        addBot(`📖 How to use CivicPulse:\n\n1. **Report** — Click ➕ or use the sidebar to submit a new civic issue with photos and GPS location\n\n2. **Track** — View real-time status updates on all your reports\n\n3. **Feed** — Browse all public issues in your area\n\n4. **Map** — See issues plotted on a live map\n\nNeed more help? Type your question!`);
        break;

      case 'STATS':
        try {
          const r = await getIssues({ limit: 1 });
          addBot(`📊 CivicPulse Stats:\n\n📋 Total issues: ${r.data.total || 0}\n🌍 City: Kolkata, West Bengal\n🏛️ Departments active: 6\n\nYou can see detailed analytics in the Admin Dashboard.`);
        } catch { addBot("I couldn't fetch the current stats. Please check the dashboard."); }
        break;

      case 'THANKS':
        addBot(`You're welcome! 😊 Is there anything else I can help you with?\n\nRemember, you can always:\n• Report a new issue\n• Check your reports status\n• Find the right department`);
        break;

      default:
        addBot(`I'm not sure I understood that. Here's what I can help with:\n\n• **"Report water issue"** — Submit a new complaint\n• **"Check CIV-2026-1234"** — Track a specific ticket\n• **"My reports"** — See all your submissions\n• **"Which department?"** — Department info\n• **"Help"** — Full guide\n\nWhat would you like to do?`);
    }
  };

  const send = async text => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    setInput('');
    setMsgs(m => [...m, { from: 'user', text: msg }]);
    const intent = detectIntent(msg);
    await processIntent(msg, intent);
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // Format text with bold
  const formatText = text => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.+?)\*\*/g).map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#a5b4fc', fontWeight: 700 }}>{part}</strong> : part)}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating button */}
      <button className="ai-chat-btn" onClick={() => setOpen(o => !o)} title="Civic Assistant" aria-label="Open chat">
        <span style={{ fontSize: 22, transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'none' }}>
          {open ? '✕' : '💬'}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-chat-panel scale-in">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">🏙️</div>
            <div style={{ flex: 1 }}>
              <div className="ai-chat-title">CivicPulse Assistant</div>
              <div className="ai-chat-sub">Kolkata Civic Services</div>
            </div>
            <div className="ai-online" />
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 16 }} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.from === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}>
                {formatText(m.text)}
              </div>
            ))}
            {typing && (
              <div className="ai-msg ai-msg-bot ai-typing">
                <span /><span /><span />
              </div>
            )}

            {/* Quick prompts — show only at start */}
            {msgs.length === 1 && !typing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => send(q)}
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'var(--f-body)' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--glass)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input">
            <input placeholder="Ask me anything…" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} disabled={typing} />
            <button className="ai-send-btn" onClick={() => send()} disabled={!input.trim() || typing}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}