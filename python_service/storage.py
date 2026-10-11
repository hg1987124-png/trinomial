import os
import json
import sqlite3
import datetime
from typing import List, Dict, Any, Optional
from python_service.document_processor import infer_civic_domain, compute_content_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
SQLITE_DB_PATH = os.path.join(DATA_DIR, "rag_store.sqlite")
NODE_STORE_JSON_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "server", "data", "store.json"))


class RagStorage:
    def __init__(self, db_path: str = SQLITE_DB_PATH):
        self.db_path = db_path
        self._init_db()
        self._bootstrap_from_existing_store()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_chunks (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    document_title TEXT NOT NULL,
                    original_url TEXT NOT NULL,
                    publication_date TEXT,
                    retrieved_at TEXT NOT NULL,
                    page_number INTEGER DEFAULT 1,
                    section_heading TEXT,
                    domain TEXT NOT NULL,
                    location TEXT DEFAULT 'Mumbai',
                    content TEXT NOT NULL,
                    content_hash TEXT UNIQUE NOT NULL,
                    embedding_json TEXT,
                    embedding_model TEXT
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rag_domain ON rag_chunks(domain)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rag_source ON rag_chunks(source_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rag_hash ON rag_chunks(content_hash)")
            conn.commit()

    def count_chunks(self) -> int:
        with self._get_conn() as conn:
            row = conn.execute("SELECT COUNT(*) AS cnt FROM rag_chunks").fetchone()
            return int(row["cnt"]) if row else 0

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, int]:
        inserted = 0
        skipped = 0
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        with self._get_conn() as conn:
            for ch in chunks:
                content = (ch.get("content") or "").strip()
                if not content:
                    continue
                c_hash = ch.get("content_hash") or compute_content_hash(content)
                existing = conn.execute(
                    "SELECT id FROM rag_chunks WHERE content_hash = ?", (c_hash,)
                ).fetchone()
                if existing:
                    skipped += 1
                    continue

                chunk_id = ch.get("id") or f"chk-{c_hash[:12]}"
                domain = ch.get("domain") or infer_civic_domain(content)
                conn.execute(
                    """
                    INSERT OR IGNORE INTO rag_chunks (
                        id, source_id, source_name, document_title, original_url,
                        publication_date, retrieved_at, page_number, section_heading,
                        domain, location, content, content_hash, embedding_json, embedding_model
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chunk_id,
                        ch.get("source_id", "opencity-in"),
                        ch.get("source_name", "OpenCity India"),
                        ch.get("document_title", "Report on the Status of Civic Issues in Mumbai - May 2025"),
                        ch.get(
                            "original_url",
                            "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                        ),
                        ch.get("publication_date", "May 2025"),
                        ch.get("retrieved_at", now_iso),
                        int(ch.get("page_number") or 1),
                        ch.get("section_heading", "Civic Evidence Section"),
                        domain,
                        ch.get("location", "Mumbai"),
                        content,
                        c_hash,
                        json.dumps(ch["embedding"]) if ch.get("embedding") else None,
                        ch.get("embedding_model"),
                    ),
                )
                inserted += 1
            conn.commit()
        return {"inserted": inserted, "skipped": skipped}

    def save_chunk_embedding(self, content_hash: str, vector: List[float], model_name: str) -> None:
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE rag_chunks SET embedding_json = ?, embedding_model = ? WHERE content_hash = ?",
                (json.dumps(vector), model_name, content_hash),
            )
            conn.commit()

    def get_all_chunks(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            if domain and domain != "All Domains":
                rows = conn.execute(
                    "SELECT * FROM rag_chunks WHERE domain = ? ORDER BY page_number ASC",
                    (domain,),
                ).fetchall()
                if not rows:
                    rows = conn.execute("SELECT * FROM rag_chunks ORDER BY page_number ASC").fetchall()
            else:
                rows = conn.execute("SELECT * FROM rag_chunks ORDER BY page_number ASC").fetchall()
            return [dict(r) for r in rows]

    def _bootstrap_from_existing_store(self) -> None:
        """
        Bootstrap the SQLite RAG store from server/data/store.json and baseline 6-domain records
        if the store is empty.
        """
        if self.count_chunks() > 10:
            return

        seed_chunks: List[Dict[str, Any]] = []
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        if os.path.exists(NODE_STORE_JSON_PATH):
            try:
                with open(NODE_STORE_JSON_PATH, "r", encoding="utf-8") as f:
                    store_data = json.load(f)

                # 1. Import documentChunks from store.json
                for dc in store_data.get("documentChunks", []):
                    content = dc.get("content", "")
                    if not content:
                        continue
                    source_id = "data-gov-in-cpcb" if "cpcb" in str(dc.get("id", "")).lower() else "opencity-in"
                    source_name = (
                        "Government of India OGD Platform — CPCB Air Quality"
                        if source_id == "data-gov-in-cpcb"
                        else "OpenCity India (Praja Foundation)"
                    )
                    seed_chunks.append(
                        {
                            "id": dc.get("id"),
                            "source_id": source_id,
                            "source_name": source_name,
                            "document_title": dc.get(
                                "document_title",
                                "Report on the Status of Civic Issues in Mumbai - May 2025",
                            ),
                            "original_url": dc.get(
                                "original_url",
                                "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                            ),
                            "publication_date": dc.get("publication_date", "May 2025"),
                            "retrieved_at": now_iso,
                            "page_number": dc.get("page_number", 1),
                            "section_heading": dc.get("section_heading", "Audit Section"),
                            "domain": infer_civic_domain(content),
                            "location": "Mumbai",
                            "content": content,
                            "content_hash": dc.get("content_hash") or compute_content_hash(content),
                        }
                    )

                # 2. Import documented issues and their evidence excerpts
                for iss in store_data.get("issues", []):
                    for ev in iss.get("evidence", []):
                        excerpt = ev.get("evidence_excerpt", "")
                        if not excerpt:
                            continue
                        full_text = f"[{iss.get('title')}] ({iss.get('location_text')}): {excerpt}"
                        if ev.get("metric_value"):
                            full_text += f" | Documented Metric: {ev.get('metric_value')}"
                        seed_chunks.append(
                            {
                                "id": f"chk-ev-{ev.get('id')}",
                                "source_id": "opencity-in",
                                "source_name": "OpenCity India (Praja Foundation)",
                                "document_title": ev.get(
                                    "document_title",
                                    "Report on the Status of Civic Issues in Mumbai - May 2025",
                                ),
                                "original_url": ev.get(
                                    "original_url",
                                    "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                                ),
                                "publication_date": iss.get("publication_date", "May 2025"),
                                "retrieved_at": now_iso,
                                "page_number": ev.get("page_number", 1),
                                "section_heading": ev.get("section_heading", iss.get("category", "Civic Audit")),
                                "domain": infer_civic_domain(full_text),
                                "location": iss.get("location_text", "Mumbai"),
                                "content": full_text,
                                "content_hash": compute_content_hash(full_text),
                            }
                        )
            except Exception as e:
                print(f"[RagStorage] Warning loading store.json: {e}")

        # 3. Ensure all 6 civic domains have authoritative baseline chunks from the 4 approved sources
        curated_domain_passages = [
            {
                "source_id": "opencity-in",
                "source_name": "OpenCity India (Praja Foundation)",
                "document_title": "Report on the Status of Civic Issues in Mumbai - May 2025",
                "original_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "publication_date": "May 2025",
                "page_number": 11,
                "section_heading": "Section 2.1: Water Supply & Distribution Losses",
                "domain": "Water Supply, Drainage & Sanitation",
                "location": "Mumbai (L-Ward Kurla, M-East Ward Govandi, H-East Ward)",
                "content": (
                    "Mumbai receives approximately 3,850 MLD of water against a projected demand of 4,400 MLD, "
                    "leaving an en-route water transmission and distribution loss of 28% (approx. 1,078 MLD) due to "
                    "aging trunk mains, pipeline leaks, burst feeder lines in L-Ward (Kurla West) and M-East Ward (Govandi), "
                    "and unauthorized tapping. Technical repair of burst trunk and feeder pipelines requires Brihanmumbai "
                    "Municipal Corporation (BMC) Hydraulic Engineering Department intervention."
                ),
            },
            {
                "source_id": "opencity-in",
                "source_name": "OpenCity India (Praja Foundation)",
                "document_title": "Report on the Status of Civic Issues in Mumbai - May 2025",
                "original_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "publication_date": "May 2025",
                "page_number": 16,
                "section_heading": "Section 2.3: Potable Water Contamination & Water-Borne Diseases",
                "domain": "Water Supply, Drainage & Sanitation",
                "location": "M-East Ward (Govandi), L-Ward (Kurla), F-North Ward (Sion)",
                "content": (
                    "Across municipal water quality testing dockets in Mumbai, 14.2% of drinking water samples tested "
                    "in high-density wards (M-East Govandi, L-Ward Kurla, and F-North Sion) were found unfit for potable "
                    "consumption due to coliform bacteria ingress where aging water supply service lines run parallel to "
                    "stormwater and sewerage drains. Municipal dispensaries recorded 1,140 cases of typhoid and 4,820 cases "
                    "of acute gastroenteritis linked to cross-contamination."
                ),
            },
            {
                "source_id": "opencity-in",
                "source_name": "OpenCity India (Praja Foundation)",
                "document_title": "Report on the Status of Civic Issues in Mumbai - May 2025",
                "original_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "publication_date": "May 2025",
                "page_number": 38,
                "section_heading": "Section 4.1: Solid Waste Management & Open Dumping",
                "domain": "Garbage, Waste & Cleanliness",
                "location": "Deonar, M-East Ward, Kurla L-Ward, Malad P-North Ward",
                "content": (
                    "Mumbai generates approximately 6,400 metric tonnes of solid waste daily. Over 34,200 CCRS citizen "
                    "grievances were logged in the audit cycle regarding uncollected garbage heaps, overflowing community bins, "
                    "and illegal debris dumping along nallah banks in M-East, L, and P-North wards, with decentralised source "
                    "segregation compliance remaining at 39%."
                ),
            },
            {
                "source_id": "opencity-in",
                "source_name": "OpenCity India (Praja Foundation)",
                "document_title": "Report on the Status of Civic Issues in Mumbai - May 2025",
                "original_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "publication_date": "May 2025",
                "page_number": 53,
                "section_heading": "Table 30: Public Sanitation & Community Toilet Ratios",
                "domain": "Public Toilets & Hygiene",
                "location": "Mumbai Informal Settlements (M-East, L, G-North Wards)",
                "content": (
                    "Table 30 establishes that in Mumbai's informal settlements, the community toilet seat ratio stands at "
                    "1 seat per 108 women and 1 seat per 84 men, critically exceeding the Swachh Bharat Mission norm of "
                    "1 seat per 25 women and 1 seat per 35 men. Furthermore, 41% of inspected community toilet blocks "
                    "lacked continuous piped water supply inside cubicles and 27% lacked functional night lighting."
                ),
            },
            {
                "source_id": "data-gov-in-cpcb",
                "source_name": "Government of India OGD Platform — CPCB Air Quality",
                "document_title": "CPCB Real Time Air Quality Index & Praja Audit Section 6",
                "original_url": "https://www.data.gov.in/catalog/real-time-air-quality-index",
                "publication_date": "2025-2026",
                "page_number": 60,
                "section_heading": "CAAQMS Air Quality Telemetry & NAAQS Exceedances",
                "domain": "Air Quality & Pollution",
                "location": "Chembur, Deonar, Kurla, Bandra Kurla Complex, Sion, Worli",
                "content": (
                    "Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by CPCB and MPCB across Mumbai "
                    "recorded PM2.5 and PM10 exceedances above the National Ambient Air Quality Standards (NAAQS: 60 ug/m3 "
                    "for 24-hr PM2.5 and 100 ug/m3 for 24-hr PM10) on 118 days during the winter monitoring period. "
                    "Industrial and eastern corridor stations including Deonar (AQI 264, Poor), Chembur (AQI 192, Moderate), "
                    "and Kurla (AQI 185, Moderate) show elevated particulate loads."
                ),
            },
            {
                "source_id": "opencity-in",
                "source_name": "OpenCity India (Praja Foundation)",
                "document_title": "Report on the Status of Civic Issues in Mumbai - May 2025",
                "original_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "publication_date": "May 2025",
                "page_number": 71,
                "section_heading": "Section 7.2: Roads, Potholes, Trenching & Pedestrian Safety",
                "domain": "Roads, Potholes & Infrastructure",
                "location": "Andheri (K-East/K-West), Sion (F-North), Kurla (L-Ward)",
                "content": (
                    "Municipal CCRS logs recorded 18,940 road and footpath complaints across Mumbai, driven by recurring "
                    "monsoon potholes, uncoordinated utility trenching on newly resurfaced arterial roads, and broken "
                    "stormwater chamber covers in K-East, L-Ward, and F-North wards."
                ),
            },
            {
                "source_id": "ngo-darpan",
                "source_name": "NGO Darpan & MY Bharat Civic Registry",
                "document_title": "Registered Civic NGOs & Youth Mobilization Directory — Mumbai",
                "original_url": "https://ngodarpan.gov.in/",
                "publication_date": "2025-2026",
                "page_number": 1,
                "section_heading": "Verified Civic NGOs & MY Bharat Volunteer Action Partners",
                "domain": "Community Volunteering & NGO Support",
                "location": "Mumbai Metropolitan Region",
                "content": (
                    "Verified civil society partners active in Mumbai civic governance include Praja Foundation (civic audits "
                    "& RTI training), Pani Haq Samiti (universal water rights, leak reporting & potability awareness in M-East "
                    "and L wards), Parisar Sanrakshan Sanwardhan Sanstha / Stree Mukti Sanghatana (decentralised solid waste "
                    "segregation & composting), and MY Bharat Youth Clubs conducting ward cleanliness and water-safety drives."
                ),
            },
        ]

        for item in curated_domain_passages:
            c_hash = compute_content_hash(item["content"])
            seed_chunks.append(
                {
                    **item,
                    "id": f"chk-seed-{c_hash[:10]}",
                    "retrieved_at": now_iso,
                    "content_hash": c_hash,
                }
            )

        self.upsert_chunks(seed_chunks)


storage = RagStorage()
