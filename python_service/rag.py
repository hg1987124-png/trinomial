import re
import json
from typing import List, Dict, Any, Optional, Tuple
from python_service.storage import storage
from python_service.connectors import normalize_domain, DOMAIN_KEYWORDS
from python_service.embeddings import generate_embedding, cosine_similarity


OUT_OF_SCOPE_LOCATIONS = [
    "london", "tokyo", "new york", "paris", "berlin", "sydney", "toronto", "chicago",
]

UNSUPPORTED_PRIVATE_QUERIES = [
    "personal phone", "personal mobile", "home address", "bank account",
    "credit card", "aadhaar number", "pan card", "private number",
]


def tokenize(text: str) -> List[str]:
    cleaned = re.sub(r"[^a-z0-9\s\.]", " ", (text or "").lower())
    stop_words = {
        "the", "and", "for", "with", "that", "this", "from", "are", "was",
        "were", "have", "has", "had", "what", "which", "where", "when",
        "who", "how", "why", "into", "about", "there", "their", "does",
    }
    return [t for t in cleaned.split() if len(t) > 2 and t not in stop_words]


def check_query_out_of_scope(query: str) -> Tuple[bool, Optional[str]]:
    q_lower = query.lower()
    for priv in UNSUPPORTED_PRIVATE_QUERIES:
        if priv in q_lower:
            return (
                True,
                "The requested personal or private contact information (such as personal mobile numbers) is not contained in public civic datasets or municipal audit records.",
            )
    for city in OUT_OF_SCOPE_LOCATIONS:
        if re.search(rf"\b{re.escape(city)}\b", q_lower):
            return (
                True,
                f"The query asks about '{city.title()}', which is outside the geographic scope of Kartavya's indexed Indian & Mumbai civic datasets (OpenCity India, CPCB OGD, NGO Darpan, and MY Bharat).",
            )
    return False, None


def retrieve_relevant_chunks(
    query: str,
    domain: str = "All Domains",
    location: Optional[str] = "Mumbai",
    top_k: int = 6,
    override_api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Hybrid RAG retrieval combining:
    1. Semantic vector similarity using Google GenAI embeddings (when API key is valid)
    2. BM25-style lexical keyword + domain + ward/location scoring
    """
    is_out_of_scope, scope_reason = check_query_out_of_scope(query)
    total_chunks = storage.count_chunks()

    if is_out_of_scope:
        return {
            "out_of_scope": True,
            "out_of_scope_reason": scope_reason,
            "chunks": [],
            "embedding_model": None,
            "semantic_used": False,
            "retrieval_method": "scope_guardrail_filter",
            "total_chunks_in_store": total_chunks,
        }

    norm_domain = normalize_domain(domain)
    candidate_chunks = storage.get_all_chunks(domain=None)
    query_tokens = tokenize(query)
    domain_kws = DOMAIN_KEYWORDS.get(norm_domain, [])

    # Generate query embedding if Gemini API key is configured
    query_vec, emb_model = generate_embedding(query, override_api_key=override_api_key)
    semantic_used = query_vec is not None

    scored_results: List[Dict[str, Any]] = []
    embedding_Populate_budget = 6

    for ch in candidate_chunks:
        content_lower = (ch.get("content") or "").lower()
        heading_lower = (ch.get("section_heading") or "").lower()
        title_lower = (ch.get("document_title") or "").lower()
        loc_lower = (ch.get("location") or "").lower()

        # 1. Lexical BM25-style score
        lexical_hits = 0.0
        for tok in query_tokens:
            if tok in content_lower:
                lexical_hits += 2.2
            if tok in heading_lower or tok in title_lower:
                lexical_hits += 1.5
            if tok in loc_lower:
                lexical_hits += 1.2

        # Domain boost
        if norm_domain != "All Domains" and ch.get("domain") == norm_domain:
            lexical_hits += 2.0
        for dkw in domain_kws:
            if dkw in content_lower and dkw in query.lower():
                lexical_hits += 1.5

        # Location boost
        if location and location.lower() in content_lower:
            lexical_hits += 0.8

        lexical_norm = min(1.0, lexical_hits / max(6.0, len(query_tokens) * 2.0))

        # 2. Semantic similarity score (if query_vec available)
        sem_score = 0.0
        if query_vec is not None:
            chunk_vec: Optional[List[float]] = None
            if ch.get("embedding_json"):
                try:
                    chunk_vec = json.loads(ch["embedding_json"])
                except Exception:
                    chunk_vec = None
            elif lexical_hits > 1.5 and embedding_Populate_budget > 0:
                embedding_Populate_budget -= 1
                new_vec, new_model = generate_embedding(ch["content"], override_api_key=override_api_key)
                if new_vec and new_model:
                    chunk_vec = new_vec
                    storage.save_chunk_embedding(ch["content_hash"], new_vec, new_model)

            if chunk_vec:
                sem_score = max(0.0, cosine_similarity(query_vec, chunk_vec))

        if semantic_used and sem_score > 0:
            combined_score = round((0.55 * sem_score) + (0.45 * lexical_norm), 3)
            r_type = "hybrid_vector_bm25"
        else:
            combined_score = round(lexical_norm, 3)
            r_type = "lexical_bm25"

        if combined_score >= 0.12 or lexical_hits >= 1.5:
            scored_results.append(
                {
                    **ch,
                    "relevance_score": combined_score,
                    "retrieval_type": r_type,
                }
            )

    scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
    top_chunks = scored_results[:top_k]

    return {
        "out_of_scope": False,
        "out_of_scope_reason": None,
        "chunks": top_chunks,
        "embedding_model": emb_model if semantic_used else None,
        "semantic_used": semantic_used,
        "retrieval_method": "hybrid_vector_bm25" if semantic_used else "lexical_bm25_keyword",
        "total_chunks_in_store": total_chunks,
    }
