import os
from pathlib import Path
import docx

def create_sample_docx(target_path: str):
    doc = docx.Document()
    doc.add_heading("DocMind AI: Multi-Tenant Architecture & Vector Retrieval", level=0)
    
    doc.add_heading("1. Abstract & Scope", level=1)
    doc.add_paragraph(
        "DocMind AI provides semantic document question answering using dense vector retrieval. "
        "Each document is parsed, partitioned into token-bounded chunks, and mapped to immutable "
        "workspace indices using FAISS CPU."
    )
    
    doc.add_heading("2. FAISS Index Performance", level=1)
    doc.add_paragraph(
        "The FAISS CPU engine uses normalized inner product computation (IndexFlatIP), achieving "
        "cosine similarity matching in approximately 45 milliseconds across thousands of passages."
    )
    
    doc.add_heading("3. Benchmarking Matrix", level=1)
    table = doc.add_table(rows=3, cols=3)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "Component"
    hdr_cells[1].text = "Target SLA"
    hdr_cells[2].text = "Achieved (Sub-50ms)"
    
    r1 = table.rows[1].cells
    r1[0].text = "FAISS CPU Retrieval"
    r1[1].text = "< 100ms"
    r1[2].text = "45ms"
    
    r2 = table.rows[2].cells
    r2[0].text = "APINEX TTFT"
    r2[1].text = "< 2000ms"
    r2[2].text = "1200ms"
    
    Path(target_path).parent.mkdir(parents=True, exist_ok=True)
    doc.save(target_path)
    print(f"Created sample DOCX at {target_path}")

def create_sample_pdf(target_path: str):
    from pypdf import PdfWriter
    # Generate a lightweight synthetically valid PDF
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    with open(target_path, "wb") as f:
        writer.write(f)
    print(f"Created sample PDF at {target_path}")

if __name__ == "__main__":
    create_sample_docx("sample_docs/sample_research_paper.docx")
    create_sample_pdf("sample_docs/sample_rag_manual.pdf")
