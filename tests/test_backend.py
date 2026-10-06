import pytest
import os
from pathlib import Path
from services.api.config import settings
from services.api.ingestion.extractor import ExtractedSection
from services.api.ingestion.chunker import chunk_sections
from services.api.retrieval.embeddings import embedding_adapter
from services.api.retrieval.vector_store import get_vector_store
from services.api.llm.apinex import format_context_prompt, ScoredChunk

def test_config_loads():
    assert settings.LLM_PROVIDER == "apinex"
    assert settings.APINEX_MODEL == "free/glm-5.3-flash"
    assert settings.EMBEDDING_DIM == 384

def test_chunker():
    sections = [
        ExtractedSection(text="This is a test introduction paragraph for DocMind AI.", page_number=1, section_title="Intro"),
        ExtractedSection(text="This is a second section explaining dense vector retrieval.", page_number=2, section_title="Methods")
    ]
    chunks = chunk_sections(sections, target_token_size=100, overlap_tokens=20)
    assert len(chunks) == 2
    assert chunks[0].section_title == "Intro"
    assert chunks[1].page_number == 2

def test_embeddings():
    texts = ["DocMind AI semantic retrieval", "Deep learning document analysis"]
    vectors = embedding_adapter.embed_texts(texts)
    assert vectors.shape == (2, 384)
    # Norm check (normalized for cosine similarity)
    norm0 = float((vectors[0] ** 2).sum() ** 0.5)
    assert abs(norm0 - 1.0) < 1e-3

def test_format_prompt():
    chunks = [
        ScoredChunk(
            chunk_id="c1",
            document_id="d1",
            document_name="ResearchPaper.pdf",
            document_version=1,
            locator="p. 3",
            text="FAISS allows sub-millisecond similarity search across millions of vectors.",
            score=0.88
        )
    ]
    messages = format_context_prompt("How fast is FAISS?", chunks)
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "[C1]" in messages[1]["content"]
    assert "FAISS allows sub-millisecond" in messages[1]["content"]
