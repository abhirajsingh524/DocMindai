import {
  AuthMeResponse,
  DocumentItem,
  CitationItem,
  MessageItem,
  ConversationItem,
  WorkspaceStats
} from "./types";

const API_BASE = "";

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`);
  if (!res.ok) throw new Error("Failed to load user info");
  return res.json();
}

export async function fetchStats(): Promise<WorkspaceStats> {
  const res = await fetch(`${API_BASE}/api/v1/stats`);
  if (!res.ok) throw new Error("Failed to load workspace stats");
  return res.json();
}

export async function updateApiKey(apiKey: string): Promise<{ status: string; has_api_key: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/apikey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error("Failed to update API key");
  return res.json();
}

export async function fetchDocuments(query?: string, statusFilter?: string): Promise<DocumentItem[]> {
  const params = new URLSearchParams();
  if (query) params.append("query", query);
  if (statusFilter) params.append("status_filter", statusFilter);
  const res = await fetch(`${API_BASE}/api/v1/documents?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload document");
  }
  return res.json();
}

export async function renameDocument(id: string, newFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: newFilename }),
  });
  if (!res.ok) throw new Error("Failed to rename document");
}

export async function fetchOperationsBacklog(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/operations/backlog`);
  if (!res.ok) throw new Error("Failed to fetch operations backlog");
  return res.json();
}

export async function retryDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${id}/retry`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to retry document processing");
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function fetchDocumentContent(id: string): Promise<{ id: string; filename: string; file_type: string; content: string }> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${id}/content`);
  if (!res.ok) throw new Error("Failed to load document content");
  return res.json();
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function createConversation(title?: string, documentScope?: string[]): Promise<ConversationItem> {
  const res = await fetch(`${API_BASE}/api/v1/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, document_scope: documentScope || [] }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function updateConversation(id: string, data: { title?: string; document_scope?: string[] }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update conversation");
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function fetchMessages(conversationId: string): Promise<MessageItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export async function fetchCitationSource(citationId: string): Promise<CitationItem> {
  const res = await fetch(`${API_BASE}/api/v1/citations/${citationId}/source`);
  if (!res.ok) throw new Error("Failed to inspect source citation");
  return res.json();
}

export async function cancelGeneration(generationId: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/generations/${generationId}/cancel`, { method: "POST" });
}

export interface StreamCallbacks {
  onProgress?: (stage: string, text: string) => void;
  onCitations?: (citations: CitationItem[]) => void;
  onDelta?: (token: string) => void;
  onDone?: (messageId: string, citations: CitationItem[]) => void;
  onError?: (err: Error) => void;
}

export async function sendMessageStream(
  conversationId: string,
  content: string,
  documentScope: string[] | null,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        document_scope: documentScope,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${response.status})`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Streaming not supported by browser");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;
        const lines = eventBlock.split("\n");
        let eventType = "message";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            dataStr = line.substring(5).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === "progress" && callbacks.onProgress) {
            callbacks.onProgress(parsed.stage, parsed.text);
          } else if (eventType === "citations" && callbacks.onCitations) {
            callbacks.onCitations(parsed);
          } else if (eventType === "delta" && callbacks.onDelta) {
            callbacks.onDelta(parsed.delta);
          } else if (eventType === "done" && callbacks.onDone) {
            callbacks.onDone(parsed.message_id, parsed.citations || []);
          }
        } catch (e) {
          console.warn("Failed to parse SSE payload", dataStr, e);
        }
      }
    }
  } catch (error: any) {
    if (signal?.aborted) return;
    if (callbacks.onError) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
