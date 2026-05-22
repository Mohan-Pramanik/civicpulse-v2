import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues, getIssues } from '../../api';
import { useAuth } from '../../context/AuthContext';

const INTENTS = [
  { patterns:['my report','my issue','my complaint','show my','track my'], intent:'MY_REPORTS' },
  { patterns:['report water','water issue','water problem','no water','pipe burst','sewage'], intent:'REPORT_WATER' },
  { patterns:['report road','pothole','road damage','broken road','road cave'], intent:'REPORT_ROAD' },
  { patterns:['report waste','garbage','trash','waste collection'], intent:'REPORT_WASTE' },
  { patterns:['street light','electricity','power cut','light not working'], intent:'REPORT_ELECTRICITY' },
  { patterns:['encroachment','illegal','blocking'], intent:'REPORT_ENCROACHMENT' },
  { patterns:['emergency','sos','urgent','flood','fire'], intent:'EMERGENCY' },
  { patterns:['report','submit','new issue','new complaint','file a'], intent:'REPORT_GENERAL' },
  { patterns:['status','check','update','civ-','ticket'], intent:'CHECK_STATUS' },
  { patterns:['department','who handles','which dept','contact'], intent:'DEPARTMENTS' },
  { patterns:['about','helpline','help number','contact number'], intent:'ABOUT' },
  { patterns:['help','how to','what can','guide'], intent:'HELP' },
  { patterns:['hello','hi ','hey','good morning','namaste','hii'], intent:'GREETING' },
  { patterns:['thank','thanks','ok','okay','great','bye','done'], intent:'THANKS' },
];

const DEPT_MAP = {
  road:'🛣️ Public Works Department (PWD)', water:'💧 KMC Water Supply Department',
  waste:'🗑️ Sanitation & Solid Waste Dept', electricity:'⚡ CESC / KMC Lighting Division',
  encroachment:'🏗️ KMC Enforcement Team', other:'📋 KMC General Grievance Cell',
};

function detect(text) {
  const lower = text.toLowerCase();
  for (const { patterns, intent } of INTENTS) {
    if (patterns.some(p => lower.includes(p))) return intent;
  }
  return 'UNKNOWN';
}

function extractTicket(text) {
  const m = text.match(/CIV-\d{4}-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

const QUICK = ['📍 Report an issue', '🔍 Track my reports', '🏛️ Department info', '🆘 Emergency SOS', '❓ Help'];

export default function Chatbot() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { from:'bot', text:'👋 Hi! I\'m your CivicPulse assistant.\n\nI can help you:\n• Report civic issues\n• Track your complaints\n• Find the right department\n• Check issue status\n• Emergency SOS' }
  ]);
  const [input,   setInput]   = useState('');
  const [typing,  setTyping]  = useState(false);
  const bottomRef = useRef(null);
  const { user }  = useAuth();
  const navigate  = useNavigate();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, typing]);

  const addBot = text => setMsgs(m => [...m, { from:'bot', text }]);

  const process = async (text, intent) => {
    setTyping(true);
    await new Promise(r => setTimeout(r, 500 + Math.random()*400));
    setTyping(false);

    switch (intent) {
      case 'GREETING':
        addBot(`Hello${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! 👋\n\nHow can I help you today?\n• Report a civic issue\n• Track your reports\n• Find the right department`);
        break;
      case 'MY_REPORTS':
        try {
          const r = await getMyIssues();
          const issues = r.data.issues || [];
          if (!issues.length) { addBot("You haven't submitted any reports yet. Want to report an issue?"); break; }
          const list = issues.slice(0,3).map(i => `• ${i.ticketId}: ${i.title} — **${i.status?.replace(/_/g,' ')}**`).join('\n');
          addBot(`📋 Your recent reports (${issues.length} total):\n\n${list}${issues.length>3?`\n...and ${issues.length-3} more.`:''}\n\nOpening My Reports...`);
          setTimeout(() => navigate('/track'), 1200);
        } catch { addBot("Couldn't fetch your reports right now. Please check the My Reports page."); }
        break;
      case 'CHECK_STATUS': {
        const ticket = extractTicket(text);
        if (ticket) {
          try {
            const r = await getIssues({ search:ticket });
            const issue = (r.data.data||[])[0];
            if (issue) { addBot(`🔎 Found **${ticket}**:\n\n📌 ${issue.title}\n📊 Status: **${issue.status?.replace(/_/g,' ')}**\n📍 ${issue.location?.address||''}\n📅 ${new Date(issue.createdAt).toLocaleDateString()}`); }
            else { addBot(`Couldn't find ticket **${ticket}**. Please check the ticket ID.`); }
          } catch { addBot("Couldn't check status right now."); }
        } else {
          addBot("Please share your ticket ID (e.g. CIV-2026-0001) and I'll check the status.\n\nOr go to → My Reports in the sidebar.");
        }
        break;
      }
      case 'REPORT_WATER':
        addBot(`💧 Water Issue\n\nRouted to: **KMC Water Supply Department**\n⏱ Expected: 2–4 working days\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'REPORT_ROAD':
        addBot(`🛣️ Road / Pothole Issue\n\nRouted to: **Public Works Department (PWD)**\n⏱ Expected: 3–5 working days\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'REPORT_WASTE':
        addBot(`🗑️ Garbage / Waste Issue\n\nRouted to: **Sanitation & Solid Waste Dept**\n⏱ Expected: 1–2 working days\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'REPORT_ELECTRICITY':
        addBot(`⚡ Electricity / Street Light\n\nRouted to: **CESC / KMC Lighting Division**\n⏱ Expected: 2–3 working days\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'REPORT_ENCROACHMENT':
        addBot(`🏗️ Encroachment Issue\n\nRouted to: **KMC Enforcement Team**\n⏱ Expected: 5–7 working days\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'EMERGENCY':
        addBot(`🆘 EMERGENCY DETECTED!\n\nImmediate helplines:\n📞 Police: **100**\n📞 Ambulance: **102**\n📞 Fire Brigade: **101**\n📞 Disaster: **1070**\n\nOpening Emergency SOS...`);
        setTimeout(() => navigate('/sos'), 1000); break;
      case 'REPORT_GENERAL':
        addBot(`To report an issue I need:\n\n1️⃣ Issue type (road/water/waste/electricity)\n2️⃣ Your location / address\n3️⃣ Photo evidence (optional)\n\nOpening report form...`);
        setTimeout(() => navigate('/report'), 1200); break;
      case 'DEPARTMENTS':
        addBot(`🏛️ Department Directory:\n\n${Object.values(DEPT_MAP).join('\n')}\n\nAll issues are **auto-routed** to the correct department when you submit a report.`);
        break;
      case 'ABOUT':
        addBot(`ℹ️ Key helplines:\n\n📞 Police: 100\n📞 Ambulance: 102\n📞 Fire: 101\n📞 KMC: 1800-103-5226\n📞 Disaster: 1070\n\nFor full info → About & Help page`);
        navigate('/about'); break;
      case 'HELP':
        addBot(`📖 How to use CivicPulse:\n\n1. **Report** — Submit a civic issue with photos & GPS\n2. **Track** — Follow your report status live\n3. **SOS** — Emergency reports with helplines\n4. **Map** — See all issues on a map\n\nType your question or use the quick buttons below!`);
        break;
      case 'THANKS':
        addBot(`You're welcome! 😊\n\nAnything else I can help with?`);
        break;
      default:
        addBot(`I'm not sure about that. Try:\n\n• **"Report pothole"** — Submit an issue\n• **"My reports"** — Track complaints\n• **"Check CIV-2026-0001"** — Status check\n• **"Emergency"** — SOS help\n• **"Department info"** — Find right dept`);
    }
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    setInput('');
    setMsgs(m => [...m, { from:'user', text:msg }]);
    await process(msg, detect(msg));
  };

  const fmt = text => text.split('\n').map((line,i,arr) => (
    <span key={i}>
      {line.split(/\*\*(.+?)\*\*/g).map((part,j) => j%2===1 ? <strong key={j} style={{ color:'#a5b4fc' }}>{part}</strong> : part)}
      {i<arr.length-1 && <br/>}
    </span>
  ));

  return (
    <>
      <button className="ai-chat-btn" onClick={() => setOpen(o=>!o)} title="CivicPulse Assistant" aria-label="Chat">
        <span style={{ fontSize:22, transition:'transform 0.3s', transform:open?'rotate(90deg)':'none', display:'block' }}>{open?'✕':'💬'}</span>
      </button>

      {open && (
        <div className="ai-chat-panel scale-in">
          <div className="ai-chat-header">
            <div className="ai-chat-avatar">🏙️</div>
            <div style={{ flex:1 }}>
              <div className="ai-chat-title">CivicPulse Assistant</div>
              <div className="ai-chat-sub">Kolkata Civic Services · 24/7</div>
            </div>
            <div className="ai-online" />
            <button className="btn btn-ghost btn-sm" style={{ padding:'4px 8px', fontSize:16 }} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ai-chat-messages">
            {msgs.map((m,i) => (
              <div key={i} className={`ai-msg ${m.from==='user'?'ai-msg-user':'ai-msg-bot'}`}>
                {fmt(m.text)}
              </div>
            ))}
            {typing && <div className="ai-msg ai-msg-bot ai-typing"><span/><span/><span/></div>}

            {msgs.length === 1 && !typing && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                {QUICK.map((q,i) => (
                  <button key={i} onClick={() => send(q)}
                    style={{ background:'var(--glass)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'8px 12px', color:'var(--text-secondary)', fontSize:12.5, cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:'var(--f-body)' }}
                    onMouseOver={e=>{e.currentTarget.style.background='var(--glass-hover)';e.currentTarget.style.borderColor='rgba(99,102,241,0.3)';}}
                    onMouseOut={e=>{e.currentTarget.style.background='var(--glass)';e.currentTarget.style.borderColor='var(--glass-border)';}}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="ai-chat-input">
            <input placeholder="Ask me anything…" value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }} disabled={typing} />
            <button className="ai-send-btn" onClick={()=>send()} disabled={!input.trim()||typing}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}