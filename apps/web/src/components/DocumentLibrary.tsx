import React, { useState } from "react";
import {
  Upload,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  FileCode,
  Layers
} from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentLibraryProps {
  documents: DocumentItem[];
  onOpenUpload: () => void;
  onRetryDocument: (id: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onViewDocument: (doc: DocumentItem) => void;
  onRefresh: () => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  onOpenUpload,
  onRetryDocument,
  onDeleteDocument,
  onViewDocument,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentItem | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "ready" && doc.status === "ready") ||
      (statusFilter === "processing" && ["queued", "extracting", "embedding", "indexing"].includes(doc.status)) ||
      (statusFilter === "failed" && doc.status === "failed");
    return matchesSearch && matchesStatus;
  });

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      await onRetryDocument(id);
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteDoc) return;
    try {
      setDeletingId(confirmDeleteDoc.id);
      await onDeleteDocument(confirmDeleteDoc.id);
      setConfirmDeleteDoc(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FC]">Document Library</h2>
          <p className="text-xs text-[#B5C1D4]">
            Manage, index, and inspect authorized research files in this workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#1C2742] text-[#B5C1D4] hover:text-[#F4F7FC] border border-[#34425D] transition-colors"
            title="Refresh documents list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenUpload}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B5C1D4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by filename..."
            className="w-full bg-[#151D35] border border-[#34425D] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F4F7FC] placeholder-[#B5C1D4]/60 focus:outline-none focus:border-[#56E6E0] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {["all", "ready", "processing", "failed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? "bg-[#1C2742] text-[#56E6E0] border border-[#56E6E0]/40"
                  : "bg-[#151D35] text-[#B5C1D4] hover:bg-[#1C2742] border border-[#34425D]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Document List Table */}
      <div className="glass-panel rounded-2xl border border-[#34425D] overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-8 h-8 text-[#B5C1D4] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[#F4F7FC]">No documents found</p>
            <p className="text-xs text-[#B5C1D4]">
              {searchQuery ? "Try refining your search terms." : "Upload your first document to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#34425D] bg-[#1C2742]/50 text-[11px] font-semibold text-[#B5C1D4] uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Indexed Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#34425D]/50 text-xs">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#1C2742]/30 transition-colors">
                    {/* Filename & Warnings */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1C2742] flex items-center justify-center font-bold text-[#56E6E0] text-[10px] uppercase">
                          {doc.file_type}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#F4F7FC] truncate max-w-xs md:max-w-md">
                            {doc.filename}
                          </p>
                          {doc.extraction_warnings && (
                            <p className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-xs">{doc.extraction_warnings}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-[#B5C1D4] uppercase font-mono text-[11px]">
                      {doc.file_type}
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-4 text-[#B5C1D4]">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>

                    {/* Chunks */}
                    <td className="py-3.5 px-4 text-[#B5C1D4]">
                      {doc.chunk_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#56E6E0]">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{doc.chunk_count}</span>
                        </span>
                      ) : (
                        <span className="text-[#B5C1D4]/60">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          doc.status === "ready"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : doc.status === "failed"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {doc.status === "ready" && <CheckCircle2 className="w-3 h-3" />}
                        {doc.status === "failed" && <AlertCircle className="w-3 h-3" />}
                        {["queued", "extracting", "embedding", "indexing"].includes(doc.status) && (
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                        )}
                        <span>{doc.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="p-1.5 rounded-lg text-[#B5C1D4] hover:text-[#56E6E0] hover:bg-[#1C2742] transition-colors"
                          title="View Extracted Content"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {doc.status === "failed" && (
                          <button
                            onClick={() => handleRetry(doc.id)}
                            disabled={retryingId === doc.id}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-[#1C2742] transition-colors"
                            title="Retry Ingestion"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${retryingId === doc.id ? "animate-spin" : ""}`}
                            />
                          </button>
                        )}

                        <button
                          onClick={() => setConfirmDeleteDoc(doc)}
                          className="p-1.5 rounded-lg text-[#B5C1D4] hover:text-red-400 hover:bg-[#1C2742] transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-red-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F4F7FC]">Revoke & Delete Document?</h3>
            </div>
            <p className="text-xs text-[#B5C1D4] leading-relaxed">
              Are you sure you want to delete <span className="text-[#F4F7FC] font-semibold">{confirmDeleteDoc.filename}</span>?
              This will immediately remove its chunks from the FAISS vector index and purge stored binaries.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#B5C1D4] hover:bg-[#1C2742] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                {deletingId ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
