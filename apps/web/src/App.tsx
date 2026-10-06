import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Overview } from "./components/Overview";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { ChatWorkspace } from "./components/ChatWorkspace";
import { SourcesDrawer } from "./components/SourcesDrawer";
import { UploadModal } from "./components/UploadModal";
import { DocumentViewerModal } from "./components/DocumentViewerModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  fetchAuthMe,
  fetchStats,
  fetchDocuments,
  fetchConversations,
  createConversation,
  deleteConversation,
  fetchMessages,
  sendMessageStream,
  retryDocument,
  renameDocument,
  deleteDocument,
  fetchCitationSource,
  cancelGeneration
} from "./api";
import {
  DocumentItem,
  ConversationItem,
  MessageItem,
  CitationItem,
  WorkspaceInfo,
  WorkspaceStats
} from "./types";

export function App() {
  const [currentTab, setCurrentTab] = useState<"overview" | "documents" | "chat">("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocScope, setSelectedDocScope] = useState<string[]>([]);
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);

  // Conversations & Chat
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Citations & Drawers
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<CitationItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const auth = await fetchAuthMe();
      setWorkspace(auth.workspace);
      setHasApiKey(auth.has_api_key);

      const docs = await fetchDocuments();
      setDocuments(docs);

      const convs = await fetchConversations();
      setConversations(convs);

      const currentStats = await fetchStats();
      setStats(currentStats);

      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
        loadMessages(convs[0].id);
      }
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    loadMessages(id);
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation("New Research Session", selectedDocScope);
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setCurrentTab("chat");
    } catch (e) {
      console.error("Failed to create conversation", e);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    let convId = activeConversationId;
    if (!convId) {
      const newConv = await createConversation(text.slice(0, 30), selectedDocScope);
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
      convId = newConv.id;
    }

    // Append user message immediately
    const userMsg: MessageItem = {
      id: "temp-" + Date.now(),
      role: "user",
      content: text,
      status: "complete",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Reset streaming state
    setIsStreaming(true);
    setStreamingStage("Initializing retrieval...");
    setStreamingContent("");
    setStreamingCitations([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await sendMessageStream(
        convId,
        text,
        selectedDocScope.length > 0 ? selectedDocScope : null,
        {
          onProgress: (stage, text) => {
            setStreamingStage(text || stage);
          },
          onCitations: (citations) => {
            setStreamingCitations(citations);
          },
          onDelta: (delta) => {
            setStreamingContent((prev) => prev + delta);
          },
          onDone: (messageId, citations) => {
            setIsStreaming(false);
            // Reload message history to synchronize with database
            if (convId) loadMessages(convId);
            fetchStats().then(setStats).catch(() => {});
          },
          onError: (err) => {
            setIsStreaming(false);
            setStreamingContent((prev) => prev + `\n[DocMind Error]: ${err.message}`);
          },
        },
        controller.signal
      );
    } catch (e: any) {
      setIsStreaming(false);
      setStreamingContent((prev) => prev + `\n[DocMind Connection Error]: ${e.message}`);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleOpenCitation = (cit: CitationItem) => {
    setActiveCitation(cit);
  };

  const handleViewDocumentFromDrawer = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) setViewerDoc(doc);
  };

  const handleRetryDoc = async (id: string) => {
    await retryDocument(id);
    const docs = await fetchDocuments();
    setDocuments(docs);
  };

  const handleRenameDoc = async (id: string, newName: string) => {
    await renameDocument(id, newName);
    const docs = await fetchDocuments();
    setDocuments(docs);
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    const docs = await fetchDocuments();
    setDocuments(docs);
    fetchStats().then(setStats).catch(() => {});
  };

  const handleUploadSuccess = async () => {
    const docs = await fetchDocuments();
    setDocuments(docs);
    fetchStats().then(setStats).catch(() => {});
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId) || null;
  const readyCount = documents.filter((d) => d.status === "ready").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1020] text-[#F4F7FC]">
      {/* 240px Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        workspace={workspace}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasApiKey={hasApiKey}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          workspace={workspace}
          documents={documents}
          selectedDocScope={selectedDocScope}
          setSelectedDocScope={setSelectedDocScope}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hasApiKey={hasApiKey}
          readyDocsCount={readyCount}
        />

        {/* Tab Viewport */}
        <main className="flex-1 flex overflow-hidden">
          {currentTab === "overview" && (
            <Overview
              stats={stats}
              documents={documents}
              conversations={conversations}
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateTab={setCurrentTab}
              onSelectConversation={handleSelectConversation}
              onViewDocument={(doc) => setViewerDoc(doc)}
            />
          )}

          {currentTab === "documents" && (
            <DocumentLibrary
              documents={documents}
              onOpenUpload={() => setIsUploadOpen(true)}
              onRetryDocument={handleRetryDoc}
              onRenameDocument={handleRenameDoc}
              onDeleteDocument={handleDeleteDoc}
              onViewDocument={(doc) => setViewerDoc(doc)}
              onRefresh={() => fetchDocuments().then(setDocuments)}
            />
          )}

          {currentTab === "chat" && (
            <ChatWorkspace
              conversation={activeConv}
              messages={messages}
              documents={documents}
              selectedDocScope={selectedDocScope}
              isStreaming={isStreaming}
              streamingStage={streamingStage}
              streamingContent={streamingContent}
              streamingCitations={streamingCitations}
              onSendMessage={handleSendMessage}
              onCancelGeneration={handleCancelGeneration}
              onOpenCitation={handleOpenCitation}
              onNewSession={handleNewConversation}
            />
          )}

          {/* Sources Inspection Drawer (Collapsible right panel) */}
          {activeCitation && (
            <SourcesDrawer
              citation={activeCitation}
              onClose={() => setActiveCitation(null)}
              onViewDocument={handleViewDocumentFromDrawer}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <DocumentViewerModal
        document={viewerDoc}
        onClose={() => setViewerDoc(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasApiKey={hasApiKey}
        onApiKeyUpdated={(hasKey) => {
          setHasApiKey(hasKey);
          fetchStats().then(setStats).catch(() => {});
        }}
      />
    </div>
  );
}
