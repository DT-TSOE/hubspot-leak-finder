import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import '../animations.css';

const SUGGESTIONS = ["What's my biggest problem?","Which leads need attention today?","What should I fix first?","Why am I losing deals?"];

const COACH_NAME = 'PipeCoach';

const FunnelSVG = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 100 98" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,2 94,2 82,20 18,20" fill="#1B72C7"/>
    <polygon points="18,23 82,23 72,39 28,39" fill="#0091AE"/>
    <polygon points="28,42 72,42 63,57 37,57" fill="#2EBF9A"/>
    <polygon points="37,60 63,60 56,74 44,74" fill="#2EBF9A" opacity="0.7"/>
    <circle cx="50" cy="87" r="7" fill="#E8562A"/>
  </svg>
);

function ChatMessages({ messages, loading, error, bottomRef }) {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
      {messages.map((msg, i) => (
        <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-end', flexDirection:msg.role==='user'?'row-reverse':'row' }}>
          <div style={{ width:26, height:26, borderRadius:7, overflow:'hidden', border:'1.5px solid #E2E5EA', background:msg.role==='user'?'#F3F4F6':'#F0F6FF', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {msg.role==='user' ? <span style={{ fontSize:10, fontWeight:700, color:'#555' }}>U</span> : <FunnelSVG size={16} />}
          </div>
          <div style={{ maxWidth:'78%' }}>
            {msg.role==='assistant' && <div style={{ fontSize:9, fontWeight:700, color:'#0091AE', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>{COACH_NAME}</div>}
            <div style={{ padding:'8px 11px', borderRadius:10, fontSize:13, lineHeight:1.6, borderBottomLeftRadius:msg.role==='assistant'?3:10, borderBottomRightRadius:msg.role==='user'?3:10, background:msg.role==='user'?'#111':'#F7F8FA', color:msg.role==='user'?'#fff':'#333', border:msg.role==='user'?'none':'1px solid #E2E5EA', whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        </div>
      ))}
      {loading && (
        <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'#F0F6FF', border:'1.5px solid #E2E5EA', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><FunnelSVG size={16} /></div>
          <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, borderBottomLeftRadius:3, padding:'10px 14px' }}>
            <span className="pc-three-dots">
              <svg viewBox="0 0 100 98" className="pc-funnel pc-td-funnel sz-xs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <polygon className="l1" points="6,2 94,2 82,20 18,20" />
                <polygon className="l2" points="18,23 82,23 72,39 28,39" />
                <polygon className="l3" points="28,42 72,42 63,57 37,57" />
                <polygon className="l4" points="37,60 63,60 56,74 44,74" />
              </svg>
              <span className="pc-td" />
              <span className="pc-td" />
              <span className="pc-td" />
            </span>
          </div>
        </div>
      )}
      {error && <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:8, padding:'7px 10px', fontSize:11, color:'#555' }}>{error}</div>}
      <div ref={bottomRef}/>
    </div>
  );
}

function ChatInput({ input, setInput, onSend, loading, messages }) {
  return (
    <>
      {messages.length <= 2 && (
        <div style={{ padding:'0 14px 8px', display:'flex', gap:5, flexWrap:'wrap' }}>
          {SUGGESTIONS.map(s=><button key={s} onClick={()=>onSend(s)} disabled={loading} style={{ fontSize:10, background:'#fff', border:'1px solid #E2E5EA', borderRadius:12, padding:'4px 10px', cursor:'pointer', color:'#555' }}>{s}</button>)}
        </div>
      )}
      <div style={{ padding:'10px 14px', background:'#fff', borderTop:'1px solid #E2E5EA', display:'flex', gap:6 }}>
        <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSend()} placeholder="Ask about your pipeline…" disabled={loading}
          style={{ flex:1, padding:'7px 11px', borderRadius:7, border:'1px solid #E2E5EA', fontSize:12, outline:'none', background:'#F7F8FA', color:'#333' }}/>
        <button onClick={()=>onSend()} disabled={loading||!input.trim()} style={{ width:32, height:32, borderRadius:7, background:loading?'#ccc':'#111', border:'none', color:'#fff', fontSize:14, cursor:loading?'not-allowed':'pointer', flexShrink:0 }}>↑</button>
      </div>
      <div style={{ padding:'4px 14px 6px', fontSize:9, color:'#ccc', textAlign:'center' }}>Anonymised pipeline summaries · processed by AI</div>
    </>
  );
}

export default function LaJefaChat({ inline = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role:'assistant', content:`Hey, I'm ${COACH_NAME}. I've already reviewed your pipeline - what do you want to know?` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Listen for context-triggered opens from insight cards etc.
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      if (e.detail?.message) setPendingMessage(e.detail.message);
    };
    window.addEventListener('pipecoach:open', handler);
    return () => window.removeEventListener('pipecoach:open', handler);
  }, []);

  useEffect(() => {
    if (open && pendingMessage) {
      const t = setTimeout(() => { send(pendingMessage); setPendingMessage(null); }, 150);
      return () => clearTimeout(t);
    }
  }, [open, pendingMessage]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput(''); setError(null);
    const newMsgs = [...messages, { role:'user', content:msg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const data = await api.sendChat(msg, messages.slice(1));
      setMessages([...newMsgs, { role:'assistant', content:data.reply }]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Inline full-page mode for "Ask Coach" section
  if (inline) {
    return (
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', height:560 }}>
        <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #E2E5EA', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, border:'2px solid #E2E5EA', background:'#F0F6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FunnelSVG size={24} /></div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>{COACH_NAME}</div>
            <div style={{ fontSize:11, color:'#888' }}>Your AI pipeline advisor · already knows what's wrong</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#2EBF9A', marginLeft:'auto' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#2EBF9A' }}/>Online
          </div>
        </div>
        <ChatMessages messages={messages} loading={loading} error={error} bottomRef={bottomRef} />
        <ChatInput input={input} setInput={setInput} onSend={send} loading={loading} messages={messages} />
      </div>
    );
  }

  // Floating widget mode
  return (
    <>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
      {!open && (
        <button onClick={()=>setOpen(true)} title={`Ask ${COACH_NAME}`} style={{ position:'fixed', bottom:24, right:24, width:54, height:54, borderRadius:'50%', background:'#243A52', border:'3px solid #0091AE', cursor:'pointer', padding:0, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <FunnelSVG size={28} />
        </button>
      )}
      {open && (
        <div style={{ position:'fixed', bottom:24, right:24, width:360, height:480, background:'#fff', borderRadius:16, border:'1px solid #E2E5EA', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden', animation:'slideUp .2s ease' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #E2E5EA', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, border:'2px solid #E2E5EA', background:'#F0F6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FunnelSVG size={22} /></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>{COACH_NAME}</div>
              <div style={{ fontSize:11, color:'#888' }}>Already knows what's wrong</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#2EBF9A', marginRight:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#2EBF9A' }}/>Online
            </div>
            <button onClick={()=>setOpen(false)} style={{ background:'transparent', border:'none', fontSize:18, color:'#aaa', cursor:'pointer', lineHeight:1, padding:'2px 4px' }}>✕</button>
          </div>
          <ChatMessages messages={messages} loading={loading} error={error} bottomRef={bottomRef} />
          <ChatInput input={input} setInput={setInput} onSend={send} loading={loading} messages={messages} />
        </div>
      )}
    </>
  );
}
