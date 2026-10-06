import React from "react";
import {
  Upload,
  Layers,
  CheckCircle2,
  AlertCircle,
  Key,
  Activity,
  FileCheck
} from "lucide-react";
import { DocumentItem, WorkspaceInfo } from "../types";

interface HeaderProps {
  workspace: WorkspaceInfo | null;
  documents: DocumentItem[];
  selectedDocScope: string[];
  setSelectedDocScope: (scope: string[]) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
  readyDocsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  workspace,
  documents,
  selectedDocScope,
  setSelectedDocScope,
  onOpenUpload,
  onOpenSettings,
  hasApiKey,
  readyDocsCount,
}) => {
  const readyDocuments = documents.filter((d) => d.status === "ready");

  const toggleDocInScope = (docId: string) => {
    if (selectedDocScope.includes(docId)) {
      setSelectedDocScope(selectedDocScope.filter((id) => id !== docId));
    } else {
      setSelectedDocScope([...selectedDocScope, docId]);
    }
  };

  const selectAll = () => setSelectedDocScope([]);

  return (
    <header className="h-16 px-6 bg-[#151D35]/80 backdrop-blur-md border-b border-[#34425D] flex items-center justify-between z-20">
      {/* Left: Workspace info & Scope chips */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-semibold text-[#F4F7FC]">
            {workspace?.name || "DocMind Research Workspace"}
          </h1>
          <div className="flex items-center gap-1.5 text-[11px] text-[#B5C1D4]">
            <FileCheck className="w-3.5 h-3.5 text-[#56E6E0]" />
            <span>{readyDocsCount} Indexed Documents</span>
          </div>
        </div>

        {/* Document Scope Selector */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#34425D]">
          <span className="text-xs text-[#B5C1D4] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
            Scope:
          </span>
          <button
            onClick={selectAll}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              selectedDocScope.length === 0
                ? "bg-[#56E6E0]/20 text-[#56E6E0] border border-[#56E6E0]/40"
                : "bg-[#1C2742] text-[#B5C1D4] hover:text-[#F4F7FC] border border-[#34425D]"
            }`}
          >
            All Docs ({readyDocuments.length})
          </button>

          {readyDocuments.slice(0, 3).map((doc) => {
            const isSelected = selectedDocScope.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDocInScope(doc.id)}
                className={`max-w-[140px] truncate px-2.5 py-1 rounded-full text-xs transition-all ${
                  isSelected
                    ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/50 font-medium"
                    : "bg-[#1C2742] text-[#B5C1D4] hover:text-[#F4F7FC] border border-[#34425D]"
                }`}
                title={doc.filename}
              >
                {doc.filename}
              </button>
            );
          })}

          {readyDocuments.length > 3 && (
            <span className="text-[11px] text-[#B5C1D4]/70">
              +{readyDocuments.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions & Indicators */}
      <div className="flex items-center gap-3">
        {/* FAISS Vector Engine Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C2742]/50 border border-[#34425D] text-xs text-[#B5C1D4]">
          <Activity className="w-3.5 h-3.5 text-[#56E6E0]" />
          <span>FAISS CPU: &lt;50ms</span>
        </div>

        {/* API Key Status Button */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            hasApiKey
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
          }`}
          title="Click to manage APINEX API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? "APINEX Live" : "Set API Key"}</span>
        </button>

        {/* Upload Action */}
        <button
          onClick={onOpenUpload}
          className="btn-primary flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>
    </header>
  );
};
