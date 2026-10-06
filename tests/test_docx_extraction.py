import pytest
from pathlib import Path
from services.api.ingestion.extractor import extract_from_file
from services.api.ingestion.chunker import chunk_sections

def test_extract_and_chunk_docx():
    docx_path = Path("sample_docs/sample_research_paper.docx")
    assert docx_path.exists()

    sections, warnings = extract_from_file(str(docx_path), "docx")
    assert len(sections) >= 3
    # Check section title from Heading
    assert any("Abstract" in s.section_title or "FAISS" in s.section_title for s in sections)

    # Verify table extracted
    table_section = [s for s in sections if "Table" in (s.section_title or "")]
    assert len(table_section) > 0
    assert "Component" in table_section[0].text

    # Verify chunking
    chunks = chunk_sections(sections)
    assert len(chunks) >= 3
    assert all(c.token_count > 0 for c in chunks)
