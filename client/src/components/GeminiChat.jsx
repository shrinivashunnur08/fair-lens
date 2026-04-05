import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Typing cursor ─────────────────────────────────────── */
function Cursor() {
  return (
    <span
      className="inline-block w-0.5 h-3.5 bg-brand-400 ml-0.5 align-middle"
      style={{ animation: "blink 1s step-end infinite" }}
    />
  );
}

/* ─── Single message bubble ─────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
          <span className="text-white text-[9px] font-700">G</span>
        </div>
      )}
      <div className={`max-w-[88%] ${isUser ? "" : "flex-1"}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-xs font-body leading-relaxed ${
            isUser
              ? "bg-brand-500 text-white rounded-br-sm"
              : "bg-bg-card border border-bg-border text-subtle rounded-bl-sm"
          }`}
        >
          {msg.content}
          {msg.streaming && <Cursor />}
        </div>
        {msg.role === "assistant" && !msg.streaming && msg.content && (
          <p className="text-[10px] text-muted/50 mt-1 ml-1 font-body">
            FairLens AI · Gemini 2.5 flash
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Suggestion pill ───────────────────────────────────── */
function SuggestionPill({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="flex-shrink-0 text-left px-3 py-2 rounded-xl border border-bg-border bg-bg-card hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-[11px] text-muted hover:text-brand-400 font-body leading-snug"
    >
      {text}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN CHAT COMPONENT
══════════════════════════════════════════════════════════ */
export default function GeminiChat({ analysisId, isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null); // for aborting in-flight SSE

  /* Load suggested questions on open */
  useEffect(() => {
    if (!isOpen || !analysisId) return;
    fetch(`/api/chat/${analysisId}/suggestions`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, [isOpen, analysisId]);

  /* Auto scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  /* Focus input when opened */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  /* Send message — SSE streaming */
  const sendMessage = useCallback(
    async (text) => {
      const msg = text.trim() || input.trim();
      if (!msg || streaming) return;

      setInput("");
      setShowSuggestions(false);

      // Add user message
      setHistory((h) => [...h, { role: "user", content: msg }]);

      // Add empty assistant message that will be streamed into
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "", streaming: true },
      ]);
      setStreaming(true);

      try {
        const res = await fetch(`/api/chat/${analysisId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            history: history
              .slice(-8)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: (abortRef.current = new AbortController()).signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Chat request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "chunk") {
                setHistory((h) => {
                  const copy = [...h];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                  }
                  return copy;
                });
              } else if (event.type === "done") {
                setHistory((h) => {
                  const copy = [...h];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, streaming: false };
                  }
                  return copy;
                });
              } else if (event.type === "error") {
                setHistory((h) => {
                  const copy = [...h];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = {
                      ...last,
                      content: event.text,
                      streaming: false,
                    };
                  }
                  return copy;
                });
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setHistory((h) => {
          const copy = [...h];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content: "Sorry, something went wrong. Please try again.",
              streaming: false,
            };
          }
          return copy;
        });
      } finally {
        setStreaming(false);
      }
    },
    [analysisId, input, streaming, history],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setHistory([]);
    setStreaming(false);
    setShowSuggestions(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Chat panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="fixed bottom-6 right-6 z-50 w-[370px] max-h-[78vh] flex flex-col rounded-2xl border border-bg-border shadow-2xl shadow-black/60"
            style={{ background: "#0c0c1e" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-bg-border flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-700">G</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-700 text-white text-sm leading-none">
                  FairLens AI
                </p>
                <p className="text-muted text-[10px] font-body mt-0.5">
                  Ask about your bias results
                </p>
              </div>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="w-6 h-6 rounded-md hover:bg-white/8 flex items-center justify-center text-muted hover:text-white transition-colors"
                    title="Clear chat"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-md hover:bg-white/8 flex items-center justify-center text-muted hover:text-white transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
              {/* Empty / greeting state */}
              {history.length === 0 && (
                <div className="text-center pt-4 pb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-brand-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-white font-display font-700 text-sm mb-1">
                    Ask me anything
                  </p>
                  <p className="text-muted text-xs font-body leading-relaxed">
                    I have full context of your bias analysis. Ask about
                    specific findings, legal risks, or how to fix the bias.
                  </p>
                </div>
              )}

              {/* Messages */}
              {history.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {/* Suggestions — shown initially and after AI replies */}
              {showSuggestions &&
                suggestions.length > 0 &&
                history.length === 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] text-muted font-body uppercase tracking-widest mb-2">
                      Suggested questions
                    </p>
                    {suggestions.map((s, i) => (
                      <SuggestionPill key={i} text={s} onClick={sendMessage} />
                    ))}
                  </div>
                )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-bg-border px-3 py-2.5 flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your bias results…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 bg-bg-secondary border border-bg-border rounded-xl px-3 py-2 text-xs text-white font-body placeholder:text-muted/50 resize-none focus:outline-none focus:border-brand-500/50 transition-colors disabled:opacity-60"
                  style={{
                    minHeight: "36px",
                    maxHeight: "80px",
                    lineHeight: "1.5",
                    overflowY: "auto",
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 80) + "px";
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    input.trim() && !streaming
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "bg-bg-card border border-bg-border text-muted cursor-not-allowed"
                  }`}
                >
                  {streaming ? (
                    <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted/40 font-body mt-1.5 text-center">
                Enter to send · Shift+Enter for newline
              </p>
            </div>
          </motion.div>

          {/* Blink animation */}
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}
