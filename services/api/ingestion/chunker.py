import re
from typing import List, Dict, Any
from services.api.ingestion.extractor import ExtractedSection

class ChunkData:
    def __init__(
        self,
        chunk_index: int,
        text: str,
        page_number: int | None,
        section_title: str | None,
        token_count: int
    ):
        self.chunk_index = chunk_index
        self.text = text
        self.page_number = page_number
        self.section_title = section_title
        self.token_count = token_count

def estimate_tokens(text: str) -> int:
    # A standard rule of thumb: ~4 characters or ~0.75 words per token
    words = len(text.split())
    chars = len(text)
    return max(words, int(chars / 4))

def chunk_sections(
    sections: List[ExtractedSection],
    target_token_size: int = 600,
    overlap_tokens: int = 100
) -> List[ChunkData]:
    chunks: List[ChunkData] = []
    chunk_idx = 0
    
    # Approx char equivalents
    target_chars = target_token_size * 4
    overlap_chars = overlap_tokens * 4
    step_chars = max(target_chars - overlap_chars, 200)
    
    for section in sections:
        text = section.text.strip()
        if not text:
            continue
            
        token_count = estimate_tokens(text)
        if token_count <= target_token_size:
            chunks.append(
                ChunkData(
                    chunk_index=chunk_idx,
                    text=text,
                    page_number=section.page_number,
                    section_title=section.section_title,
                    token_count=token_count
                )
            )
            chunk_idx += 1
        else:
            # Paragraph or sentence-aware splitting
            paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
            current_chunk = []
            current_len = 0
            
            for p in paragraphs:
                p_tokens = estimate_tokens(p)
                if current_len + p_tokens > target_token_size and current_chunk:
                    joined_text = "\n\n".join(current_chunk)
                    chunks.append(
                        ChunkData(
                            chunk_index=chunk_idx,
                            text=joined_text,
                            page_number=section.page_number,
                            section_title=section.section_title,
                            token_count=estimate_tokens(joined_text)
                        )
                    )
                    chunk_idx += 1
                    
                    # Carry over overlap if possible
                    if len(current_chunk) > 1:
                        current_chunk = [current_chunk[-1], p]
                        current_len = estimate_tokens(current_chunk[0]) + p_tokens
                    else:
                        current_chunk = [p]
                        current_len = p_tokens
                else:
                    current_chunk.append(p)
                    current_len += p_tokens
                    
            if current_chunk:
                joined_text = "\n\n".join(current_chunk)
                chunks.append(
                    ChunkData(
                        chunk_index=chunk_idx,
                        text=joined_text,
                        page_number=section.page_number,
                        section_title=section.section_title,
                        token_count=estimate_tokens(joined_text)
                    )
                )
                chunk_idx += 1
                
    return chunks
