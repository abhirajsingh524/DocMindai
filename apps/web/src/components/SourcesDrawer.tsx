import React from "react";
import {
  X,
  FileText,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { CitationItem, DocumentItem } from "../types";

interface SourcesDrawerProps {
  citation: CitationItem | null;
  onClose: () => void;
  onViewDocument: (docId: string) => void;
}

export const SourcesDrawer: React.FC<SourcesDrawerProps> = ({
  citation,
  onClose,
  onViewDocument,
}) => {
  if (!citation) return null;

  return (
    <aside className="w-80 md:w-96 h-screen bg-[#151D35] border-l border-[#34425D] flex flex-col z-30 shadow-2xl transition-all">
      {/* Header */}
      <div className="h-16 px-5 border-b border-[#34425D] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-[#F4F7FC]">
          <ShieldCheck className="w-4 h-4 text-[#56E6E0]" />
          <span>Source Provenance</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#B5C1D4] hover:text-[#F4F7FC] hover:bg-[#1C2742] transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Document metadata card */}
        <div className="p-4 rounded-xl bg-[#1C2742] border border-[#34425D] space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0B1020] flex items-center justify-center text-[#56E6E0]">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F4F7FC] truncate">
                {citation.document_name}
              </p>
              <p className="text-[10px] text-[#B5C1D4]">
                Version {citation.document_version || 1}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#34425D]/60 text-[11px]">
            <div>
              <span className="text-[#B5C1D4]/70">Locator: </span>
              <span className="font-semibold text-[#56E6E0]">{citation.locator}</span>
            </div>
            <div>
              <span className="text-[#B5C1D4]/70">Match Score: </span>
              <span className="font-mono text-[#A78BFA] font-bold">
                {citation.similarity_score.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Highlighted Passage Excerpt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#B5C1D4]">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#56E6E0]" />
              Exact Retrieved Passage
            </span>
            <span className="text-[10px] bg-[#1C2742] px-2 py-0.5 rounded text-emerald-400 font-medium">
              Verified Chunks
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1020] border border-[#34425D] text-xs leading-relaxed text-[#F4F7FC] font-serif whitespace-pre-wrap select-text">
            “{citation.snippet}”
          </div>
        </div>

        {/* Information box */}
        <div className="p-3 rounded-xl bg-[#1C2742]/40 border border-[#34425D]/60 text-[11px] text-[#B5C1D4] leading-relaxed space-y-1">
          <p className="font-semibold text-[#F4F7FC]">Citation Provenance Policy</p>
          <p>
            DocMind AI maps this chunk directly to the authorized document storage key.
            FAISS Cosine Similarity confirms this excerpt grounded the synthesis output.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#34425D] bg-[#0B1020]/40">
        <button
          onClick={() => onViewDocument(citation.document_id)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#56E6E0] border border-[#56E6E0]/40 flex items-center justify-center gap-2 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Inspect Full Document Content</span>
        </button>
      </div>
    </aside>
  );
};
