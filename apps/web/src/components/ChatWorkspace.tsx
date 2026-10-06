import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus
} from "lucide-react";
import {
  MessageItem,
  CitationItem,
  DocumentItem,
  ConversationItem
} from "../types";

interface ChatWorkspaceProps {
  conversation: ConversationItem | null;
  messages: MessageItem[];
  documents: DocumentItem[];
  selectedDocScope: string[];
  isStreaming: boolean;
  streamingStage: string;
  streamingContent: string;
  streamingCitations: CitationItem[];
  onSendMessage: (text: string) => void;
  onCancelGeneration: () => void;
  onOpenCitation: (citation: CitationItem) => void;
  onNewSession: () => void;
}

const SAMPLE_QUESTIONS = [
  "Summarize the key findings and architectural components.",
  "What is the measured latency and vector dimension in FAISS?",
  "How does APINEX free/glm-5.3-flash handle citation grounding?",
  "What are the security boundaries and deletion policies?"
];

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversation,
  messages,
  documents,
  selectedDocScope,
  isStreaming,
  streamingStage,
  streamingContent,
  streamingCitations,
  onSendMessage,
  onCancelGeneration,
  onOpenCitation,
  onNewSession,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const readyDocuments = documents.filter((d) => d.status === "ready");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingStage]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: "up" | "down") => {
    setFeedbackMap((prev) => ({ ...prev, [id]: type }));
  };

  const renderTextWithCitations = (
    text: string,
    citations: CitationItem[] = []
  ) => {
    // Replace [C1], [C2], etc., with clickable pills
    const parts = text.split(/(\[C\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[C(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        const citation = citations[citationNum - 1];
        return (
          <button
            key={index}
            onClick={() => citation && onOpenCitation(citation)}
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-[#56E6E0]/15 hover:bg-[#56E6E0]/30 text-[#56E6E0] border border-[#56E6E0]/40 font-mono text-[11px] font-bold transition-colors align-baseline"
            title={citation ? `View source excerpt from ${citation.document_name} (${citation.locator})` : "View citation"}
          >
            <span>{part}</span>
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B1020] overflow-hidden">
      {/* Scope Sub-Header */}
      <div className="h-12 px-6 bg-[#151D35]/50 border-b border-[#34425D]/60 flex items-center justify-between text-xs text-[#B5C1D4] flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-[#F4F7FC]">
            {conversation?.title || "New Research Session"}
          </span>
          <span className="text-[#34425D]">•</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#56E6E0]" />
            {selectedDocScope.length === 0
              ? `All Workspace Documents (${readyDocuments.length})`
              : `${selectedDocScope.length} Filtered Documents`}
          </span>
        </div>

        <button
          onClick={onNewSession}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#B5C1D4] hover:text-[#F4F7FC] border border-[#34425D] transition-colors"
        >
          <Plus className="w-3 h-3 text-[#56E6E0]" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Messages Flow */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#56E6E0]/20 to-[#A78BFA]/20 border border-[#56E6E0]/30 flex items-center justify-center shadow-xl shadow-[#56E6E0]/10">
              <Sparkles className="w-7 h-7 text-[#56E6E0]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#F4F7FC]">
                Ask anything across your research documents
              </h3>
              <p className="text-xs text-[#B5C1D4] leading-relaxed">
                DocMind AI retrieves grounded passages using FAISS CPU vector index and generates
                citations linked to verifiable source pages.
              </p>
            </div>

            {readyDocuments.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3 text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  No ready documents in this workspace yet. Upload a PDF, DOCX, or TXT document using the header button to start asking questions.
                </span>
              </div>
            ) : (
              <div className="w-full space-y-2 pt-2 text-left">
                <p className="text-[11px] font-semibold text-[#B5C1D4] uppercase tracking-wider">
                  Suggested Questions:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(q)}
                      className="p-3 rounded-xl bg-[#151D35] hover:bg-[#1C2742] border border-[#34425D] text-xs text-[#F4F7FC] text-left transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <Send className="w-3.5 h-3.5 text-[#56E6E0] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#56E6E0] to-[#A78BFA] flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-[#56E6E0]/20">
                    <Sparkles className="w-4 h-4 text-[#0B1020]" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed space-y-2.5 ${
                    msg.role === "user"
                      ? "bg-[#1C2742] text-[#F4F7FC] border border-[#56E6E0]/30 shadow-md"
                      : "glass-panel text-[#F4F7FC] border border-[#34425D] shadow-lg"
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.role === "assistant"
                      ? renderTextWithCitations(msg.content, msg.citations || [])
                      : msg.content}
                  </div>

                  {/* Assistant Citations & Actions Footer */}
                  {msg.role === "assistant" && (
                    <div className="pt-2 border-t border-[#34425D]/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#B5C1D4]">
                      {/* Citation pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {msg.citations && msg.citations.length > 0 && (
                          <>
                            <span className="text-[10px] text-[#B5C1D4]/70 font-semibold uppercase">
                              Sources:
                            </span>
                            {msg.citations.map((c, i) => (
                              <button
                                key={c.id || i}
                                onClick={() => onOpenCitation(c)}
                                className="px-2 py-0.5 rounded-md bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#56E6E0] border border-[#34425D] text-[10px] font-medium transition-colors flex items-center gap-1"
                                title={`Inspect excerpt from ${c.document_name}`}
                              >
                                <FileText className="w-3 h-3" />
                                <span>
                                  [C{i + 1}] {c.locator}
                                </span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>

                      {/* Utility buttons: Copy, Thumbs */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1.5 rounded-lg hover:bg-[#1C2742] text-[#B5C1D4] hover:text-[#F4F7FC] transition-colors"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "up")}
                          className={`p-1.5 rounded-lg hover:bg-[#1C2742] transition-colors ${
                            feedbackMap[msg.id] === "up" ? "text-emerald-400" : "text-[#B5C1D4]"
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "down")}
                          className={`p-1.5 rounded-lg hover:bg-[#1C2742] transition-colors ${
                            feedbackMap[msg.id] === "down" ? "text-red-400" : "text-[#B5C1D4]"
                          }`}
                          title="Unhelpful"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* In-Flight Streaming Assistant Bubble */}
            {isStreaming && (
              <div className="flex gap-3 max-w-3xl mr-auto justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#56E6E0] to-[#A78BFA] flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-[#56E6E0]/20 animate-pulse">
                  <Sparkles className="w-4 h-4 text-[#0B1020]" />
                </div>

                <div className="glass-panel rounded-2xl p-4 text-xs md:text-sm leading-relaxed space-y-3 border border-[#56E6E0]/40 shadow-xl">
                  {/* Streaming Stage Status Pill */}
                  <div className="flex items-center gap-2 text-xs text-[#56E6E0] font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{streamingStage || "Processing..."}</span>
                  </div>

                  {/* Token Delta Stream */}
                  {streamingContent ? (
                    <div className="whitespace-pre-wrap typing-cursor text-[#F4F7FC]">
                      {renderTextWithCitations(streamingContent, streamingCitations)}
                    </div>
                  ) : (
                    <div className="h-4 flex items-center gap-1.5 text-xs text-[#B5C1D4]/60 italic">
                      <span>Generating grounded synthesis...</span>
                    </div>
                  )}

                  {/* Provisional citations during stream */}
                  {streamingCitations.length > 0 && (
                    <div className="pt-2 border-t border-[#34425D]/60 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#B5C1D4]/70 uppercase">
                        Evidence Found:
                      </span>
                      {streamingCitations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => onOpenCitation(c)}
                          className="px-2 py-0.5 rounded-md bg-[#1C2742] text-[#56E6E0] border border-[#34425D] text-[10px] flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>
                            [C{i + 1}] {c.locator}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer Bottom Area */}
      <div className="p-4 bg-[#151D35]/80 backdrop-blur-md border-t border-[#34425D] flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
          <div className="relative rounded-2xl bg-[#0B1020] border border-[#34425D] focus-within:border-[#56E6E0] transition-colors p-2 shadow-inner">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                readyDocuments.length === 0
                  ? "Upload a document to begin asking questions..."
                  : "Ask a grounded question about your indexed documents... (Enter to send, Shift+Enter for new line)"
              }
              disabled={readyDocuments.length === 0}
              className="w-full bg-transparent text-xs md:text-sm text-[#F4F7FC] placeholder-[#B5C1D4]/50 focus:outline-none resize-none px-2 py-1 max-h-32"
            />

            <div className="flex items-center justify-between pt-1 px-1">
              <div className="text-[11px] text-[#B5C1D4]/60">
                APINEX: <span className="text-[#56E6E0] font-mono">free/glm-5.3-flash</span>
              </div>

              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onCancelGeneration}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-semibold transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputText.trim() || readyDocuments.length === 0}
                    className="btn-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <span>Ask</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
