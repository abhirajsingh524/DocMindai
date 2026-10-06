import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import faiss

from services.api.config import settings
from services.api.retrieval.embeddings import embedding_adapter

class ScoredChunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_name: str,
        document_version: int,
        locator: str,
        text: str,
        score: float
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_name = document_name
        self.document_version = document_version
        self.locator = locator
        self.text = text
        self.score = float(score)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "document_version": self.document_version,
            "locator": self.locator,
            "text": self.text,
            "score": self.score
        }

class WorkspaceVectorStore:
    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.index_dir = Path(settings.INDEX_DIR)
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.index_dir / f"ws_{workspace_id}.index"
        self.meta_file = self.index_dir / f"ws_{workspace_id}_meta.json"
        self._lock = asyncio.Lock()
        
    def _load_index_and_meta(self) -> tuple[Optional[faiss.IndexFlatIP], List[Dict[str, Any]]]:
        if not self.index_file.exists() or not self.meta_file.exists():
            return None, []
        try:
            index = faiss.read_index(str(self.index_file))
            with open(self.meta_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            return index, metadata
        except Exception:
            return None, []

    def _save_index_and_meta(self, index: faiss.IndexFlatIP, metadata: List[Dict[str, Any]]):
        temp_index = self.index_dir / f"ws_{self.workspace_id}.index.tmp"
        temp_meta = self.index_dir / f"ws_{self.workspace_id}_meta.json.tmp"
        
        faiss.write_index(index, str(temp_index))
        with open(temp_meta, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False)
            
        temp_index.replace(self.index_file)
        temp_meta.replace(self.meta_file)

    async def add_document_chunks(
        self,
        document_id: str,
        document_name: str,
        document_version: int,
        chunks: List[Any]  # models.Chunk or dicts
    ):
        async with self._lock:
            # First remove any prior chunks for this document (idempotency)
            index, metadata = self._load_index_and_meta()
            
            existing_chunks = []
            if metadata:
                existing_chunks = [m for m in metadata if m.get("document_id") != document_id]
                
            new_chunk_records = []
            texts_to_embed = []
            
            for ch in chunks:
                chunk_id = getattr(ch, "id", None) or ch.get("id")
                text = getattr(ch, "text", None) or ch.get("text")
                page_no = getattr(ch, "page_number", None) or ch.get("page_number")
                sec_title = getattr(ch, "section_title", None) or ch.get("section_title")
                
                locator = f"p. {page_no}" if page_no else (sec_title or "Section")
                record = {
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document_name": document_name,
                    "document_version": document_version,
                    "locator": locator,
                    "text": text
                }
                new_chunk_records.append(record)
                texts_to_embed.append(text)
                
            combined_records = existing_chunks + new_chunk_records
            if not combined_records:
                # Empty index
                if self.index_file.exists():
                    self.index_file.unlink(missing_ok=True)
                if self.meta_file.exists():
                    self.meta_file.unlink(missing_ok=True)
                return

            # Compute embeddings for all combined chunks
            all_texts = [r["text"] for r in combined_records]
            vectors = embedding_adapter.embed_texts(all_texts)
            
            # Create fresh normalized Inner Product index (equivalent to Cosine Similarity)
            new_index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
            new_index.add(vectors)
            
            self._save_index_and_meta(new_index, combined_records)

    async def delete_document(self, document_id: str):
        async with self._lock:
            index, metadata = self._load_index_and_meta()
            if not metadata:
                return
                
            remaining = [m for m in metadata if m.get("document_id") != document_id]
            if not remaining:
                if self.index_file.exists():
                    self.index_file.unlink(missing_ok=True)
                if self.meta_file.exists():
                    self.meta_file.unlink(missing_ok=True)
                return
                
            all_texts = [r["text"] for r in remaining]
            vectors = embedding_adapter.embed_texts(all_texts)
            new_index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
            new_index.add(vectors)
            self._save_index_and_meta(new_index, remaining)

    async def search(
        self,
        query: str,
        document_scope: Optional[List[str]] = None,
        top_k: int = 15,
        threshold: float = 0.05
    ) -> List[ScoredChunk]:
        index, metadata = self._load_index_and_meta()
        if index is None or not metadata or index.ntotal == 0:
            return []
            
        q_vec = embedding_adapter.embed_query(query).reshape(1, -1)
        k = min(top_k * 2, index.ntotal)
        
        scores, indices = index.search(q_vec, k)
        scores = scores[0]
        indices = indices[0]
        
        results: List[ScoredChunk] = []
        scope_set = set(document_scope) if document_scope else None
        
        for score, idx in zip(scores, indices):
            if idx < 0 or idx >= len(metadata):
                continue
            meta = metadata[idx]
            doc_id = meta["document_id"]
            
            # Document scope filtering
            if scope_set and doc_id not in scope_set:
                continue
                
            if score < threshold:
                continue
                
            results.append(
                ScoredChunk(
                    chunk_id=meta["chunk_id"],
                    document_id=doc_id,
                    document_name=meta["document_name"],
                    document_version=meta.get("document_version", 1),
                    locator=meta.get("locator", "Section"),
                    text=meta["text"],
                    score=float(score)
                )
            )
            
            if len(results) >= top_k:
                break
                
        return results

def get_vector_store(workspace_id: str) -> WorkspaceVectorStore:
    return WorkspaceVectorStore(workspace_id)
