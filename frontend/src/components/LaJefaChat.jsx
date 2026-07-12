import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';

const SUGGESTIONS = ["What's my biggest problem?","Which leads need attention today?","What should I fix first?","Why am I losing deals?"];

const COACH_NAME = 'PipeCoach';

function ChatMessages({ messages, loading, error, bottomRef }) {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
      {messages.map((msg, i) => (
        <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-end', flexDirection:msg.role==='user'?'row-reverse':'row' }}>
          <div style={{ width:26, height:26, borderRadius:7, overflow:'hidden', border:`1.5px solid ${msg.role==='user'?'#E2E5EA':'#4CAF50'}`, background:msg.role==='user'?'#F3F4F6':'#0F1A0F', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#555' }}>
            <span style={{ color: msg.role==='user' ? '#555' : '#8BC34A' }}>{msg.role==='user' ? 'U' : 'PC'}</span>
          </div>
          <div style={{ maxWidth:'78%' }}>
            {msg.role==='assistant' && <div style={{ fontSize:9, fontWeight:700, color:'#059669', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>{COACH_NAME}</div>}
            <div style={{ padding:'8px 11px', borderRadius:10, fontSize:13, lineHeight:1.6, borderBottomLeftRadius:msg.role==='assistant'?3:10, borderBottomRightRadius:msg.role==='user'?3:10, background:msg.role==='user'?'#111':'#F7F8FA', color:msg.role==='user'?'#fff':'#333', border:msg.role==='user'?'none':'1px solid #E2E5EA', whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        </div>
      ))}
      {loading && (
        <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'#0F1A0F', border:'1.5px solid #4CAF50', flexShrink:0 }}/>
          <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, borderBottomLeftRadius:3, padding:'10px 14px', display:'flex', gap:4 }}>
            {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#ccc', animation:'bounce 1.2s infinite', animationDelay:`${i*0.2}s` }}/>)}
          </div>
        </div>
      )}
      {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'7px 10px', fontSize:11, color:'#DC2626' }}>{error}</div>}
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
          <div style={{ width:40, height:40, borderRadius:10, border:'2px solid #4CAF50', background:'#0F1A0F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#8BC34A', flexShrink:0 }}>PC</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>{COACH_NAME}</div>
            <div style={{ fontSize:11, color:'#888' }}>Your AI pipeline advisor · already knows what's wrong</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#059669', marginLeft:'auto' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#059669' }}/>Online
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
        <button onClick={()=>setOpen(true)} title={`Ask ${COACH_NAME}`} style={{ position:'fixed', bottom:24, right:24, width:54, height:54, borderRadius:'50%', background:'#111', border:'3px solid #4CAF50', cursor:'pointer', padding:0, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', color:'#8BC34A', fontSize:16, fontWeight:800 }}>
          PC
        </button>
      )}
      {open && (
        <div style={{ position:'fixed', bottom:24, right:24, width:360, height:480, background:'#fff', borderRadius:16, border:'1px solid #E2E5EA', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden', animation:'slideUp .2s ease' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #E2E5EA', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, border:'2px solid #4CAF50', background:'#0F1A0F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#8BC34A', flexShrink:0 }}>PC</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>{COACH_NAME}</div>
              <div style={{ fontSize:11, color:'#888' }}>Already knows what's wrong</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#059669', marginRight:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#059669' }}/>Online
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
