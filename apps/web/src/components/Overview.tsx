import React from "react";
import {
  FileText,
  Database,
  Cpu,
  Zap,
  Upload,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Search
} from "lucide-react";
import { DocumentItem, ConversationItem, WorkspaceStats } from "../types";

interface OverviewProps {
  stats: WorkspaceStats | null;
  documents: DocumentItem[];
  conversations: ConversationItem[];
  onOpenUpload: () => void;
  onNavigateTab: (tab: "documents" | "chat") => void;
  onSelectConversation: (id: string) => void;
  onViewDocument: (doc: DocumentItem) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  stats,
  documents,
  conversations,
  onOpenUpload,
  onNavigateTab,
  onSelectConversation,
  onViewDocument,
}) => {
  const readyDocs = documents.filter((d) => d.status === "ready");
  const failedDocs = documents.filter((d) => d.status === "failed");

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border border-[#34425D] bg-gradient-to-r from-[#151D35] via-[#1C2742] to-[#151D35]">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#56E6E0]/15 text-[#56E6E0] border border-[#56E6E0]/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Grounded Semantic RAG Assistant</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#F4F7FC] tracking-tight">
            Research documents with verified citation provenance
          </h2>
          <p className="text-sm text-[#B5C1D4] leading-relaxed">
            Upload PDF, DOCX, or TXT research papers, technical manuals, and notes.
            DocMind AI partitions vector embeddings in FAISS CPU indices and streams factual answers powered by{" "}
            <span className="text-[#56E6E0] font-medium">APINEX free/glm-5.3-flash</span>.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onOpenUpload}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => onNavigateTab("chat")}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#F4F7FC] border border-[#34425D] flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
              <span>Open Research Chat</span>
            </button>
          </div>
        </div>

        {/* Ambient Gradient glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#56E6E0]/10 via-[#A78BFA]/5 to-transparent pointer-events-none" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documents */}
        <div className="glass-card p-5 rounded-2xl border border-[#34425D] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B5C1D4] uppercase tracking-wider">
              Documents
            </span>
            <div className="p-2 rounded-xl bg-[#56E6E0]/10 text-[#56E6E0]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#F4F7FC]">
              {documents.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#B5C1D4]">
              <span className="text-emerald-400 font-medium">{readyDocs.length} ready</span>
              {failedDocs.length > 0 && (
                <span className="text-red-400 font-medium">• {failedDocs.length} failed</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Chunks */}
        <div className="glass-card p-5 rounded-2xl border border-[#34425D] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B5C1D4] uppercase tracking-wider">
              Indexed Chunks
            </span>
            <div className="p-2 rounded-xl bg-[#A78BFA]/10 text-[#A78BFA]">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#F4F7FC]">
              {stats?.indexed_chunks || documents.reduce((sum, d) => sum + d.chunk_count, 0)}
            </div>
            <div className="text-xs text-[#B5C1D4] mt-1">
              384-d normalized vector index
            </div>
          </div>
        </div>

        {/* Card 3: Model */}
        <div className="glass-card p-5 rounded-2xl border border-[#34425D] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B5C1D4] uppercase tracking-wider">
              Synthesis Model
            </span>
            <div className="p-2 rounded-xl bg-[#FBBF24]/10 text-[#FBBF24]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-bold text-[#F4F7FC] truncate">
              {stats?.llm_model || "free/glm-5.3-flash"}
            </div>
            <div className="text-xs text-[#B5C1D4] mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  stats?.has_api_key ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>{stats?.has_api_key ? "APINEX Live SSE" : "APINEX Ready"}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Search Latency */}
        <div className="glass-card p-5 rounded-2xl border border-[#34425D] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B5C1D4] uppercase tracking-wider">
              FAISS Speed
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#F4F7FC]">
              ~45ms
            </div>
            <div className="text-xs text-[#B5C1D4] mt-1">
              Sub-50ms CPU vector search
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Recent Documents & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 columns) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-[#34425D] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#56E6E0]" />
              <h3 className="text-sm font-bold text-[#F4F7FC]">Recent Documents</h3>
            </div>
            <button
              onClick={() => onNavigateTab("documents")}
              className="text-xs text-[#56E6E0] hover:underline flex items-center gap-1 font-medium"
            >
              <span>View all ({documents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1C2742] flex items-center justify-center text-[#B5C1D4]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F4F7FC]">No documents uploaded yet</p>
                <p className="text-xs text-[#B5C1D4] max-w-sm mt-0.5">
                  Upload your first PDF, DOCX, or TXT file to begin semantic Q&A.
                </p>
              </div>
              <button
                onClick={onOpenUpload}
                className="btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#34425D]/60 overflow-hidden">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[#1C2742]/40 px-2 rounded-xl transition-colors cursor-pointer"
                  onClick={() => onViewDocument(doc)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1C2742] flex items-center justify-center text-xs font-bold text-[#56E6E0] uppercase flex-shrink-0">
                      {doc.file_type}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F4F7FC] truncate">{doc.filename}</p>
                      <p className="text-[11px] text-[#B5C1D4]">
                        {(doc.file_size / 1024).toFixed(1)} KB • {doc.chunk_count} chunks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                        doc.status === "ready"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : doc.status === "failed"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse"
                      }`}
                    >
                      {doc.status}
                    </span>
                    <button
                      className="p-1 text-[#B5C1D4] hover:text-[#56E6E0]"
                      title="Inspect Document"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Conversations (1 column) */}
        <div className="glass-panel rounded-2xl border border-[#34425D] p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#34425D]/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
                <h3 className="text-sm font-bold text-[#F4F7FC]">Recent Sessions</h3>
              </div>
              <button
                onClick={() => onNavigateTab("chat")}
                className="text-xs text-[#A78BFA] hover:underline flex items-center gap-1 font-medium"
              >
                <span>All chats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {conversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#B5C1D4]/60">
                  No previous research chats.
                </div>
              ) : (
                conversations.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectConversation(c.id);
                      onNavigateTab("chat");
                    }}
                    className="p-3 rounded-xl bg-[#1C2742]/50 hover:bg-[#1C2742] border border-[#34425D] transition-colors cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-semibold text-[#F4F7FC] truncate">{c.title}</p>
                    <p className="text-[10px] text-[#B5C1D4] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#56E6E0]" />
                      <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#34425D]/60">
            <button
              onClick={() => onNavigateTab("chat")}
              className="w-full py-2 rounded-xl text-xs font-semibold btn-ai flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Launch Research Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
