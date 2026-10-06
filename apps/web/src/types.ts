export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
}

export interface AuthMeResponse {
  user: UserProfile;
  workspace: WorkspaceInfo;
  llm_provider: string;
  llm_model: string;
  has_api_key: boolean;
}

export interface DocumentItem {
  id: string;
  workspace_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "uploaded" | "queued" | "extracting" | "embedding" | "indexing" | "ready" | "failed";
  version: number;
  chunk_count: number;
  extraction_warnings?: string | null;
  created_at: string;
}

export interface CitationItem {
  id: string;
  chunk_id: string;
  document_id: string;
  document_name: string;
  document_version?: number;
  locator: string;
  snippet: string;
  similarity_score: number;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "generating" | "complete" | "stopped" | "failed";
  model?: string;
  created_at: string;
  citations?: CitationItem[];
}

export interface ConversationItem {
  id: string;
  title: string;
  document_scope: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceStats {
  workspace_id: string;
  workspace_name: string;
  total_documents: number;
  ready_documents: number;
  indexed_chunks: number;
  total_conversations: number;
  llm_provider: string;
  llm_model: string;
  has_api_key: boolean;
  avg_retrieval_ms: number;
  avg_ttft_ms: number;
}
