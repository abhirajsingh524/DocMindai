import React, { useEffect, useState } from "react";
import { X, FileText, Download, Layers } from "lucide-react";
import { DocumentItem } from "../types";
import { fetchDocumentContent } from "../api";

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
}) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!document) return;
    setIsLoading(true);
    fetchDocumentContent(document.id)
      .then((data) => setContent(data.content))
      .catch(() => setContent("Failed to load document content or document is still processing."))
      .finally(() => setIsLoading(false));
  }, [document]);

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel max-w-3xl w-full h-[80vh] rounded-2xl border border-[#34425D] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#34425D] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1C2742] flex items-center justify-center text-[#56E6E0] text-xs font-bold uppercase">
              {document.file_type}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#F4F7FC] truncate">{document.filename}</h3>
              <p className="text-[11px] text-[#B5C1D4] flex items-center gap-2">
                <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>{document.chunk_count} Chunks</span>
                <span>•</span>
                <span className="capitalize text-emerald-400">{document.status}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B5C1D4] hover:text-[#F4F7FC] hover:bg-[#1C2742] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B1020]/50 font-serif text-xs md:text-sm leading-relaxed text-[#F4F7FC] whitespace-pre-wrap select-text">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#B5C1D4]">
              Loading extracted text passages...
            </div>
          ) : (
            content || "No text extracted from document."
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#34425D] bg-[#151D35] flex items-center justify-between text-xs text-[#B5C1D4]">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#56E6E0]" />
            Indexed in workspace FAISS CPU index
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#F4F7FC] border border-[#34425D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
