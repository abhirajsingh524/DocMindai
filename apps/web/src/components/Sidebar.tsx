import React from "react";
import {
  LayoutDashboard,
  Files,
  MessageSquareQuote,
  Settings,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
  Trash2,
  Cpu
} from "lucide-react";
import { ConversationItem, WorkspaceInfo } from "../types";

interface SidebarProps {
  currentTab: "overview" | "documents" | "chat";
  setCurrentTab: (tab: "overview" | "documents" | "chat") => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  workspace: WorkspaceInfo | null;
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  workspace,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  hasApiKey,
}) => {
  return (
    <aside
      className={`h-screen bg-[#151D35] border-r border-[#34425D] flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#34425D]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#56E6E0] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#56E6E0]/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#0B1020]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#F4F7FC] via-[#56E6E0] to-[#A78BFA] bg-clip-text text-transparent">
                DocMind AI
              </span>
              <span className="text-[10px] text-[#B5C1D4] tracking-wider uppercase font-semibold">
                Semantic RAG
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[#1C2742] text-[#B5C1D4] hover:text-[#F4F7FC] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setCurrentTab("overview")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            currentTab === "overview"
              ? "bg-[#1C2742] text-[#56E6E0] border border-[#56E6E0]/30 shadow-sm"
              : "text-[#B5C1D4] hover:bg-[#1C2742]/50 hover:text-[#F4F7FC]"
          }`}
          title="Overview"
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Overview</span>}
        </button>

        <button
          onClick={() => setCurrentTab("documents")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            currentTab === "documents"
              ? "bg-[#1C2742] text-[#56E6E0] border border-[#56E6E0]/30 shadow-sm"
              : "text-[#B5C1D4] hover:bg-[#1C2742]/50 hover:text-[#F4F7FC]"
          }`}
          title="Documents"
        >
          <Files className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Document Library</span>}
        </button>

        <button
          onClick={() => setCurrentTab("chat")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            currentTab === "chat"
              ? "bg-[#1C2742] text-[#56E6E0] border border-[#56E6E0]/30 shadow-sm"
              : "text-[#B5C1D4] hover:bg-[#1C2742]/50 hover:text-[#F4F7FC]"
          }`}
          title="Research Chat"
        >
          <MessageSquareQuote className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Research Chat</span>}
        </button>
      </div>

      {/* Action: New Session */}
      <div className="px-3 pt-2">
        <button
          onClick={() => {
            onNewConversation();
            setCurrentTab("chat");
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold btn-primary transition-all ${
            collapsed ? "aspect-square p-0" : ""
          }`}
          title="New Research Session"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>New Research Chat</span>}
        </button>
      </div>

      {/* Recent Chats Section */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold text-[#B5C1D4]/70 uppercase tracking-wider">
            <span>Recent Sessions</span>
            <span className="text-[10px] bg-[#1C2742] px-1.5 py-0.5 rounded text-[#B5C1D4]">
              {conversations.length}
            </span>
          </div>
          {conversations.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[#B5C1D4]/60 text-center italic">
              No previous chats yet
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  activeConversationId === c.id && currentTab === "chat"
                    ? "bg-[#1C2742] text-[#56E6E0] font-medium"
                    : "text-[#B5C1D4] hover:bg-[#1C2742]/50 hover:text-[#F4F7FC]"
                }`}
                onClick={() => {
                  onSelectConversation(c.id);
                  setCurrentTab("chat");
                }}
              >
                <div className="truncate pr-2">{c.title || "Research Session"}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Model & System Badge */}
      <div className="p-3 border-t border-[#34425D] bg-[#0B1020]/40 space-y-2 mt-auto">
        {!collapsed && (
          <div className="p-2.5 rounded-xl bg-[#1C2742]/70 border border-[#34425D] text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#B5C1D4]">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
                GLM-5.3-Flash
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasApiKey ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400 animate-pulse"
                }`}
              />
            </div>
            <div className="text-[10px] text-[#B5C1D4]/70 truncate">
              {hasApiKey ? "APINEX Live SSE Stream" : "APINEX Key Required (Local Fallback)"}
            </div>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#B5C1D4] hover:bg-[#1C2742] hover:text-[#F4F7FC] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Workspace Settings</span>}
        </button>
      </div>
    </aside>
  );
};
