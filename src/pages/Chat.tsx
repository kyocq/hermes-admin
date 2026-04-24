import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Send, Bot, User, Loader2, Terminal, MessageSquare, Wrench, RefreshCw, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { API_BASE } from '../api/config';
import type { Session, SessionDetail, HermesMessage } from '../types';

export function Chat() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const msgAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Session search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSessions(); }, []);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchDebounce(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Fetch sessions with search query
  useEffect(() => {
    loadSessions(searchDebounce);
  }, [searchDebounce]);

  const loadSessions = async (search?: string) => {
    try {
      setLoadingSessions(true);
      const params = new URLSearchParams({ limit: '30' });
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/sessions?${params}`);
      setSessions(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingSessions(false); }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}`);
      const data = await res.json();
      setActiveSession(data);
      setCurrentSessionId(id);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 80);
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;
    if (!confirm(t('chat.confirmDelete'))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSession?.id === id) { setActiveSession(null); setCurrentSessionId(null); }
      }
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  // Batch delete
  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('chat.confirmBatchDelete', { count: selectedIds.size }))) return;
    setBatchDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Batch delete failed');
      // Remove deleted sessions from state
      setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
      if (activeSession && selectedIds.has(activeSession.id)) {
        setActiveSession(null);
        setCurrentSessionId(null);
      }
      setSelectedIds(new Set());
    } catch (e) { console.error(e); }
    finally { setBatchDeleting(false); }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map(s => s.id)));
    }
  };

  // Session rename handlers
  const startRename = useCallback((session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title || session.id);
    setTimeout(() => editInputRef.current?.select(), 50);
  }, []);

  const commitRename = useCallback(async (id: string) => {
    const newTitle = editingTitle.trim();
    if (!newTitle || newTitle === sessions.find(s => s.id === id)?.title) {
      setEditingSessionId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
        if (activeSession?.id === id) {
          setActiveSession(prev => prev ? { ...prev, title: newTitle } : prev);
        }
      }
    } catch (e) { console.error(e); }
    setEditingSessionId(null);
  }, [editingTitle, sessions, activeSession]);

  const cancelRename = useCallback(() => {
    setEditingSessionId(null);
    setEditingTitle('');
  }, []);

  // scroll tracking
  const checkScroll = () => {
    const el = msgAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distFromBottom < 150);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToTop = () => msgAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // auto scroll on new content if user was already at bottom
  useEffect(() => {
    if (isNearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingText, activeSession?.messages?.length]);

  // auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    // Immediately show user message in the chat
    const userMsg: HermesMessage = {
      id: Date.now(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setActiveSession(prev => prev
      ? { ...prev, messages: [...(prev.messages || []), userMsg] }
      : { id: currentSessionId || 'pending', title: '', source: '', started_at: new Date().toISOString(), message_count: 1, tool_call_count: 0, input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0, is_active: true, messages: [userMsg] } as any
    );
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: currentSessionId }),
      });
      if (!res.ok) throw new Error('Failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const dec = new TextDecoder();
      let buf = '';
      let newSessionId: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') break;
          try {
            const j = JSON.parse(d);
            if (j.type === 'text') setStreamingText(j.text);
            if (j.type === 'done' && j.session_id) newSessionId = j.session_id;
          } catch {}
        }
      }
      // Remember session ID for continuity
      if (newSessionId) setCurrentSessionId(newSessionId);
      await loadSessions(searchDebounce);
      // Reload active session to show new messages
      const sid = newSessionId || currentSessionId;
      if (sid) {
        const sr = await fetch(`${API_BASE}/api/sessions/${sid}`);
        if (sr.ok) {
          const sd = await sr.json();
          setActiveSession(sd);
          setTimeout(() => bottomRef.current?.scrollIntoView(), 80);
        }
      }
    } catch (e) { console.error('Chat error:', e); }
    finally { setIsLoading(false); setStreamingText(''); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setCurrentSessionId(null);
  };

  const fmtTime = (ts: string) => {
    const d = new Date(ts), diff = Date.now() - d.getTime();
    if (diff < 60000) return t('chat.justNow');
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const fmtTok = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0);

  const renderMsg = (msg: HermesMessage, idx: number) => {
    if (msg.role === 'system' || msg.content?.startsWith('[CONTEXT COMPACTION')) return null;
    if (!msg.content && !msg.tool_calls) return null;
    const isUser = msg.role === 'user';
    if (msg.role === 'tool') {
      return (
        <div key={idx} className="ml-10 my-1">
          <div className="inline-block max-w-[80%] p-2.5 rounded-lg bg-dark-800/60 border border-dark-700/40">
            <div className="flex items-center gap-1.5 text-[11px] text-dark-500 mb-1">
              <Wrench className="w-3 h-3" />
              <span className="text-primary-400 font-mono font-medium">{msg.tool_name || t('chat.toolCall')}</span>
            </div>
            <pre className="text-[11px] text-dark-400 whitespace-pre-wrap overflow-x-auto max-h-32 leading-relaxed">
              {(msg.content || '').slice(0, 400)}
            </pre>
          </div>
        </div>
      );
    }
    return (
      <div key={idx} className={`flex gap-2.5 my-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-primary-600' : 'bg-dark-700'}`}>
          {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-primary-400" />}
        </div>
        <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
          <div className={`inline-block p-3.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-primary-600 text-white rounded-tr-md' : 'bg-dark-800 text-dark-100 rounded-tl-md'}`}>
            <div className="whitespace-pre-wrap break-words text-left">
              {(msg.content || '').slice(0, 4000)}
              {msg.content && msg.content.length > 4000 && `\n\n… [${t('chat.truncated')}]`}
            </div>
            {msg.tool_calls?.length ? (
              <div className="mt-2.5 space-y-1.5">
                {msg.tool_calls.map((tc, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-primary-300 bg-dark-900/40 rounded px-2 py-1">
                    <Terminal className="w-3 h-3" />
                    <span className="font-mono">{tc.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className={`text-[10px] text-dark-600 mt-1 px-1 ${isUser ? 'text-right' : ''}`}>
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      </div>
    );
  };

  const showScrollUp = msgAreaRef.current && msgAreaRef.current.scrollTop > 300;

  // Quick suggestion items
  const quickSuggestions = [
    { label: t('chat.quickHello'), value: '你好' },
    { label: t('chat.quickHelp'), value: 'help' },
    { label: t('chat.quickStatus'), value: 'status' },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header row — fixed, never scrolls */}
      <div className="shrink-0 flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-dark-100">{t('chat.title')}</h1>
          <p className="text-dark-500 text-xs">{t('chat.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={batchDelete} isLoading={batchDeleting}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('chat.batchDelete')} ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => loadSessions(searchDebounce)}><RefreshCw className="w-3.5 h-3.5 mr-1" /> {t('chat.refresh')}</Button>
          <Button variant="outline" size="sm" onClick={startNewChat}><MessageSquare className="w-3.5 h-3.5 mr-1" /> {t('chat.newChat')}</Button>
        </div>
      </div>

      {/* Body: sidebar + chat */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── Sidebar ── */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 border border-dark-700/50 rounded-xl bg-dark-900/30">
          <div className="p-2.5 border-b border-dark-700/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-dark-300">💬 {t('chat.sessions')}</span>
              {sessions.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] text-dark-500 hover:text-primary-400 transition-colors"
                >
                  {selectedIds.size === sessions.length ? t('chat.deselectAll') : t('chat.selectAll')}
                </button>
              )}
            </div>
          </div>
          {/* Search input */}
          <div className="px-2.5 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('chat.searchSessions')}
                className="w-full pl-7 pr-2 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-[12px] text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loadingSessions ? (
              <div className="py-10 text-center"><Loader2 className="w-5 h-5 text-dark-600 mx-auto animate-spin" /></div>
            ) : sessions.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquare className="w-7 h-7 text-dark-700 mx-auto mb-1.5" />
                <p className="text-dark-600 text-[11px]">{searchQuery ? t('chat.noResults') : t('chat.noSessions')}</p>
              </div>
            ) : sessions.map(s => (
              <div key={s.id}
                onClick={() => { if (editingSessionId !== s.id) loadSession(s.id); }}
                className={`group relative p-2.5 rounded-lg cursor-pointer text-left transition-colors ${
                  activeSession?.id === s.id ? 'bg-primary-500/15 border border-primary-500/40' : 'hover:bg-dark-800/70 border border-transparent'
                } ${selectedIds.has(s.id) ? 'bg-primary-500/10 border-primary-500/30' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => {}}
                    onClick={e => toggleSelect(s.id, e)}
                    className="w-3.5 h-3.5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500 shrink-0 cursor-pointer"
                  />
                  {s.is_active && <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />}
                  {editingSessionId === s.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onBlur={() => commitRename(s.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(s.id); }
                        if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-[13px] font-medium text-dark-200 bg-dark-700 border border-primary-500 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
                    />
                  ) : (
                    <span
                      onDoubleClick={e => startRename(s, e)}
                      title={t('chat.renameHint')}
                      className="text-[13px] font-medium text-dark-200 truncate flex-1 pr-5"
                    >
                      {s.title || s.id}
                    </span>
                  )}
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-dark-500">{s.source === 'weixin' ? '📱' : '💻'} {s.message_count}{t('chat.messageCount')}</span>
                  <span className="text-[10px] text-dark-500">{fmtTime(s.started_at)}</span>
                </div>
                <button
                  onClick={e => deleteSession(s.id, e)}
                  disabled={deletingId === s.id}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-dark-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title={t('chat.delete')}>
                  {deletingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat column ── */}
        <div className="flex-1 flex flex-col min-w-0 border border-dark-700/50 rounded-xl bg-dark-900/30 relative">

          {/* Session bar */}
          {activeSession && (
            <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-dark-700/40 text-[11px] text-dark-500 bg-dark-800/40 rounded-t-xl">
              <code className="text-dark-400">{activeSession.id}</code>
              {activeSession.model && <span className="text-dark-400">{activeSession.model}</span>}
              <span>{activeSession.message_count} msg</span>
              <span>{fmtTok(activeSession.input_tokens + activeSession.output_tokens)} tok</span>
              <button onClick={e => deleteSession(activeSession.id, e as any)}
                className="ml-auto text-red-400/50 hover:text-red-400 flex items-center gap-1 transition-colors">
                <Trash2 className="w-3 h-3" /> {t('chat.delete')}
              </button>
            </div>
          )}

          {/* Messages scroll area — THIS is the only scrollable div */}
          <div
            ref={msgAreaRef}
            onScroll={checkScroll}
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ minHeight: 0 }}
          >
            {!activeSession && !streamingText ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-14 h-14 text-dark-600 mb-3" />
                <h3 className="text-lg font-semibold text-dark-200 mb-1.5">{t('chat.noMessages')}</h3>
                <p className="text-dark-500 text-sm mb-4 max-w-sm">{t('chat.noMessagesDesc')}</p>
                <div className="flex gap-2">
                  {quickSuggestions.map(q => (
                    <button key={q.value} onClick={() => { setInput(q.value); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-primary-400 hover:border-primary-500/40 text-xs transition-colors">
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {activeSession?.messages?.map((m, i) => renderMsg(m, i))}

                {streamingText && (
                  <div className="flex gap-2.5 my-2">
                    <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <div className="max-w-[75%]">
                      <div className="inline-block p-3.5 rounded-2xl rounded-tl-md bg-dark-800 text-dark-100 text-sm leading-relaxed">
                        <div className="whitespace-pre-wrap">{streamingText}</div>
                        <div className="flex gap-1 mt-1.5">
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse delay-100" />
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse delay-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && !streamingText && (
                  <div className="flex gap-2.5 my-2">
                    <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <div className="flex items-center gap-2 text-dark-400 text-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('chat.thinking')}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Scroll buttons — always render, show/hide via CSS */}
          {activeSession && (
            <div className="absolute right-3 flex flex-col gap-1.5 z-20" style={{ bottom: '76px' }}>
              {showScrollUp && (
                <button onClick={scrollToTop}
                  className="w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center shadow-md transition"
                  title={t('chat.scrollToTop')}>
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
              {!isNearBottom && (
                <button onClick={scrollToBottom}
                  className="w-8 h-8 rounded-full bg-dark-600 hover:bg-dark-500 text-white flex items-center justify-center shadow-md transition"
                  title={t('chat.scrollToBottom')}>
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Input bar */}
            <div className="shrink-0 border-t border-dark-700/40 p-3 rounded-b-xl">
            <div className="flex gap-2 items-end">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentSessionId ? t('chat.continueChat') : t('chat.newChatPlaceholder')}
                rows={1}
                className="flex-1 px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 text-sm placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm" className="h-[42px] px-3">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-dark-600 text-center">{t('chat.enterSend')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
