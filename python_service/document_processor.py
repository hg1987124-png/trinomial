import re
import hashlib
import datetime
from typing import List, Dict, Any, Optional
from python_service.connectors import normalize_domain, DOMAIN_KEYWORDS


PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+prompt\s*:",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"disregard\s+all\s+safety\s+guidelines",
]


def sanitize_text(text: str) -> str:
    """
    Clean raw text and strip prompt-injection attempts while preserving civic data.
    """
    if not text:
        return ""
    cleaned = text.replace("\x00", " ")
    for pat in PROMPT_INJECTION_PATTERNS:
        cleaned = re.sub(pat, "[REDACTED_INSTRUCTION]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def compute_content_hash(text: str) -> str:
    normalized = re.sub(r"\s+", " ", (text or "").strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:32]


def infer_civic_domain(text: str, default_domain: str = "Water Supply, Drainage & Sanitation") -> str:
    if not text:
        return normalize_domain(default_domain)
    lower = text.lower()
    best_domain = normalize_domain(default_domain)
    best_score = 0
    for domain_name, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > best_score:
            best_score = score
            best_domain = domain_name
    return best_domain


def chunk_document_text(
    text: str,
    source_id: str,
    source_name: str,
    document_title: str,
    original_url: str,
    publication_date: str = "May 2025",
    page_number: int = 1,
    section_heading: str = "Document Excerpt",
    domain: Optional[str] = None,
    location: str = "Mumbai",
    chunk_size: int = 750,
    overlap: int = 120,
) -> List[Dict[str, Any]]:
    cleaned = sanitize_text(text)
    if not cleaned:
        return []

    resolved_domain = normalize_domain(domain) if domain and domain != "All Domains" else infer_civic_domain(cleaned)
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    if len(cleaned) <= chunk_size:
        c_hash = compute_content_hash(f"{source_id}:{page_number}:{cleaned}")
        return [
            {
                "id": f"chk-{source_id}-{c_hash[:10]}",
                "source_id": source_id,
                "source_name": source_name,
                "document_title": document_title,
                "original_url": original_url,
                "publication_date": publication_date,
                "retrieved_at": now_iso,
                "page_number": page_number,
                "section_heading": section_heading,
                "domain": resolved_domain,
                "location": location,
                "content": cleaned,
                "content_hash": c_hash,
            }
        ]

    chunks: List[Dict[str, Any]] = []
    start = 0
    idx = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        piece = cleaned[start:end].strip()
        if len(piece) >= 40:
            c_hash = compute_content_hash(f"{source_id}:{page_number}:{idx}:{piece}")
            chunks.append(
                {
                    "id": f"chk-{source_id}-{c_hash[:10]}",
                    "source_id": source_id,
                    "source_name": source_name,
                    "document_title": document_title,
                    "original_url": original_url,
                    "publication_date": publication_date,
                    "retrieved_at": now_iso,
                    "page_number": page_number,
                    "section_heading": f"{section_heading} (Part {idx + 1})",
                    "domain": resolved_domain,
                    "location": location,
                    "content": piece,
                    "content_hash": c_hash,
                }
            )
            idx += 1
        if end >= len(cleaned):
            break
        start = max(start + 1, end - overlap)

    return chunks
