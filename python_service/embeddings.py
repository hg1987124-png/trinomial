import os
import math
from typing import List, Optional, Tuple
from google import genai

EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview")
FALLBACK_EMBEDDING_MODELS = ["gemini-embedding-2-preview", "text-embedding-004"]


def get_genai_client(override_api_key: Optional[str] = None) -> Optional[genai.Client]:
    api_key = override_api_key if override_api_key is not None else os.environ.get("GEMINI_API_KEY", "")
    if not api_key or not api_key.strip():
        return None
    try:
        return genai.Client(api_key=api_key.strip())
    except Exception:
        return None


def generate_embedding(text: str, override_api_key: Optional[str] = None) -> Tuple[Optional[List[float]], Optional[str]]:
    """
    Generate semantic vector embedding using official google-genai SDK.
    Returns (vector_floats, model_used) or (None, None) if unavailable.
    """
    client = get_genai_client(override_api_key)
    if not client or not text or not text.strip():
        return None, None

    models_to_try = [EMBEDDING_MODEL] + [m for m in FALLBACK_EMBEDDING_MODELS if m != EMBEDDING_MODEL]
    trimmed_text = text.strip()[:2000]

    for model_name in models_to_try:
        try:
            response = client.models.embed_content(
                model=model_name,
                contents=trimmed_text,
            )
            if hasattr(response, "embeddings") and response.embeddings:
                emb = response.embeddings[0]
                if hasattr(emb, "values") and emb.values:
                    return list(emb.values), model_name
        except Exception:
            continue

    return None, None


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)
