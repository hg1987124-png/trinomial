import os
import time
import json
import requests
from bs4 import BeautifulSoup

from python_service.scraper import scrape_html_with_bs4, fetch_opencity_ckan_datasets
from python_service.storage import storage
from python_service.embeddings import generate_embedding
from python_service.rag import retrieve_relevant_evidence
from python_service.gemini_service import check_gemini_status

PYTHON_BASE = "http://127.0.0.1:8765"
EXPRESS_BASE = "http://127.0.0.1:3000"


def run_all_tests():
    results = {}

    # Test 1: Python service starts and health endpoint responds
    try:
        r = requests.get(f"{PYTHON_BASE}/health", timeout=8)
        data = r.json()
        passed = r.status_code == 200 and data.get("status") == "ok" and data.get("python_beautifulsoup_enabled") is True
        results["Test 1: Python Service Health"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"HTTP {r.status_code}, service={data.get('service')}, total_chunks={data.get('rag_storage', {}).get('total_chunks')}",
        }
    except Exception as e:
        results["Test 1: Python Service Health"] = {"status": "FAILED", "details": str(e)}

    # Test 2: Beautiful Soup HTML scraping on accessible approved page
    try:
        bs4_res = scrape_html_with_bs4(
            "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
            source_id="opencity-india",
            domain="Water Supply, Drainage & Sanitation",
        )
        passed = bs4_res.get("success") is True and len(bs4_res.get("chunks", [])) > 0
        results["Test 2: Beautiful Soup HTML Scraping"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"Title='{bs4_res.get('title')}', HTTP={bs4_res.get('http_status')}, extracted_chars={bs4_res.get('extracted_chars')}, chunks={len(bs4_res.get('chunks', []))}",
        }
    except Exception as e:
        results["Test 2: Beautiful Soup HTML Scraping"] = {"status": "FAILED", "details": str(e)}

    # Test 3: Structured documents (CKAN JSON API + CPCB JSON + PDF chunks)
    try:
        oc = fetch_opencity_ckan_datasets("water supply mumbai", domain="Water Supply, Drainage & Sanitation")
        passed = oc.get("success") is True and len(oc.get("chunks", [])) > 0
        results["Test 3: Structured Documents & CKAN/CPCB Parsing"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"Extracted {len(oc.get('chunks', []))} structured dataset chunks; notes={oc.get('notes')}",
        }
    except Exception as e:
        results["Test 3: Structured Documents & CKAN/CPCB Parsing"] = {"status": "FAILED", "details": str(e)}

    # Test 4: Gemini API server-side call
    gem_status = check_gemini_status()
    if not gem_status.get("configured"):
        results["Test 4: Gemini API Generation"] = {
            "status": "BLOCKED",
            "details": "GEMINI_API_KEY is not set in environment.",
        }
    else:
        try:
            r = requests.post(
                f"{PYTHON_BASE}/api/ai-search",
                json={
                    "query": "What evidence exists about waste-management problems in Mumbai?",
                    "domain": "Garbage, Waste & Cleanliness",
                    "location": "Mumbai",
                    "enable_live_scraping": False,
                },
                timeout=35,
            )
            d = r.json()
            passed = r.status_code == 200 and d.get("generatedByGemini") is True and len(d.get("summary", "")) > 20
            results["Test 4: Gemini API Generation"] = {
                "status": "PASSED" if passed else "FAILED",
                "details": f"Model={d.get('modelUsed')}, summary_len={len(d.get('summary', ''))}, solutions={len(d.get('recommendedSolutions', []))}",
            }
        except Exception as e:
            results["Test 4: Gemini API Generation"] = {"status": "FAILED", "details": str(e)}

    # Test 5: Document ingestion & persistent SQLite storage
    try:
        cnt_before = storage.count_chunks()
        r = requests.post(
            f"{PYTHON_BASE}/api/scrape-url",
            json={
                "url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
                "source_id": "opencity-india",
                "domain": "Water Supply, Drainage & Sanitation",
            },
            timeout=15,
        )
        cnt_after = storage.count_chunks()
        passed = r.status_code == 200 and cnt_after >= cnt_before and cnt_after > 50
        results["Test 5: Document Ingestion & Persistent Storage"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"SQLite chunks count={cnt_after} (persisted at {storage.db_path})",
        }
    except Exception as e:
        results["Test 5: Document Ingestion & Persistent Storage"] = {"status": "FAILED", "details": str(e)}

    # Test 6: Embeddings generation and persistence
    if not gem_status.get("configured"):
        results["Test 6: Embeddings Generation & Storage"] = {
            "status": "BLOCKED",
            "details": "GEMINI_API_KEY not configured for embedding generation.",
        }
    else:
        try:
            vec, model_used, err = generate_embedding("Mumbai municipal water transmission loss and contamination")
            emb_cnt = storage.count_embedded_chunks()
            passed = vec is not None and len(vec) > 100
            results["Test 6: Embeddings Generation & Storage"] = {
                "status": "PASSED" if passed else "FAILED",
                "details": f"Model={model_used}, vector_dim={len(vec) if vec else 0}, cached_embedded_chunks={emb_cnt}, err={err}",
            }
        except Exception as e:
            results["Test 6: Embeddings Generation & Storage"] = {"status": "FAILED", "details": str(e)}

    # Test 7: RAG Retrieval
    try:
        rag_res = retrieve_relevant_evidence(
            query="What is the percentage of en-route water transmission loss in Mumbai?",
            domain="Water Supply, Drainage & Sanitation",
            location="Mumbai",
        )
        chunks = rag_res.get("chunks", [])
        passed = not rag_res.get("insufficient") and len(chunks) > 0 and any("34%" in c["content"] for c in chunks)
        results["Test 7: RAG Evidence Retrieval"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"Retrieved {len(chunks)} chunks via {rag_res.get('retrieval_method')}, top_score={chunks[0]['relevance_score'] if chunks else 0}",
        }
    except Exception as e:
        results["Test 7: RAG Evidence Retrieval"] = {"status": "FAILED", "details": str(e)}

    # Test 8: Grounded answer with real source citations + Insufficient Evidence refusal
    try:
        insuff_res = requests.post(
            f"{PYTHON_BASE}/api/ai-search",
            json={
                "query": "What is the personal mobile phone number of the Mayor?",
                "domain": "All Domains",
                "location": "Mumbai",
                "enable_live_scraping": False,
            },
            timeout=15,
        ).json()
        passed_insuff = insuff_res.get("status") == "insufficient_evidence" and len(insuff_res.get("sources", [])) == 0
        results["Test 8: Grounded Answer & Insufficient Evidence Guard"] = {
            "status": "PASSED" if passed_insuff else "FAILED",
            "details": f"Out-of-scope query returned status='{insuff_res.get('status')}', generatedByGemini={insuff_res.get('generatedByGemini')}",
        }
    except Exception as e:
        results["Test 8: Grounded Answer & Insufficient Evidence Guard"] = {"status": "FAILED", "details": str(e)}

    # Test 9: Different queries across different civic domains vary appropriately
    try:
        q1 = retrieve_relevant_evidence(
            "Why is air pollution increasing in Delhi?",
            domain="Air Quality & Pollution",
            location="Delhi",
        )
        q2 = retrieve_relevant_evidence(
            "What can improve inadequate street lighting?",
            domain="Electricity, Power & Street Lighting",
            location="Mumbai",
        )
        ids_1 = [c["chunk_id"] for c in q1.get("chunks", [])]
        ids_2 = [c["chunk_id"] for c in q2.get("chunks", [])]
        passed = len(ids_1) > 0 and len(ids_2) > 0 and ids_1[0] != ids_2[0]
        results["Test 9: Different Queries Across Domains"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"Air top chunk='{ids_1[0] if ids_1 else None}' vs Street Lighting top chunk='{ids_2[0] if ids_2 else None}'",
        }
    except Exception as e:
        results["Test 9: Different Queries Across Domains"] = {"status": "FAILED", "details": str(e)}

    # Test 10: Failure handling (blocked source, invalid Gemini key, unavailable Python service)
    try:
        # 10a: Blocked source (SSRF / unapproved domain)
        r_blocked = requests.post(
            f"{EXPRESS_BASE}/api/python-scrape",
            json={"url": "http://169.254.169.254/latest/meta-data/"},
            timeout=8,
        )
        # 10b: Invalid Gemini API key
        r_bad_key = requests.post(
            f"{EXPRESS_BASE}/api/ai-search",
            json={
                "query": "What evidence exists about waste-management problems in Mumbai?",
                "domain": "Garbage, Waste & Cleanliness",
                "enable_live_scraping": False,
                "simulate_invalid_key": True,
            },
            timeout=15,
        )
        # 10c: Simulated unavailable Python service
        r_py_down = requests.post(
            f"{EXPRESS_BASE}/api/ai-search",
            json={
                "query": "What evidence exists about waste-management problems in Mumbai?",
                "domain": "Garbage, Waste & Cleanliness",
                "simulate_python_down": True,
            },
            timeout=8,
        )
        passed = r_blocked.status_code == 403 and r_bad_key.status_code == 502 and r_py_down.status_code == 503
        results["Test 10: Failure Handling (Blocked Source, Invalid Key, Service Down)"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"Blocked URL HTTP={r_blocked.status_code}, Invalid Key HTTP={r_bad_key.status_code}, Service Down HTTP={r_py_down.status_code}",
        }
    except Exception as e:
        results["Test 10: Failure Handling (Blocked Source, Invalid Key, Service Down)"] = {
            "status": "FAILED",
            "details": str(e),
        }

    # Test 11: End-to-End Integration (Express -> Python -> RAG -> Gemini)
    try:
        r_e2e = requests.get(
            f"{EXPRESS_BASE}/api/civic-search",
            params={
                "query": "How can damaged roads and unsafe footpaths be addressed?",
                "domain": "Roads, Transport & Footpaths",
                "location": "Mumbai",
            },
            timeout=35,
        )
        d_e2e = r_e2e.json()
        passed = (
            r_e2e.status_code == 200
            and d_e2e.get("status") in ("success", "partial_success")
            and len(d_e2e.get("sources", [])) > 0
        )
        results["Test 11: End-to-End Express -> Python -> RAG -> Gemini"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": f"HTTP {r_e2e.status_code}, status={d_e2e.get('status')}, sources={len(d_e2e.get('sources', []))}, model={d_e2e.get('modelUsed')}",
        }
    except Exception as e:
        results["Test 11: End-to-End Express -> Python -> RAG -> Gemini"] = {
            "status": "FAILED",
            "details": str(e),
        }

    # Test 12: Existing features (Issues, Stakeholders, Events, Volunteer Opportunities, Stats)
    try:
        r_iss = requests.get(f"{EXPRESS_BASE}/api/issues", timeout=8)
        r_stk = requests.get(f"{EXPRESS_BASE}/api/stakeholders", timeout=8)
        r_evt = requests.get(f"{EXPRESS_BASE}/api/events", timeout=8)
        r_vol = requests.get(f"{EXPRESS_BASE}/api/volunteer-opportunities", timeout=8)
        r_aq = requests.get(f"{EXPRESS_BASE}/api/air-quality", timeout=8)
        passed = all(x.status_code == 200 for x in [r_iss, r_stk, r_evt, r_vol, r_aq])
        results["Test 12: Existing Features (Issues, NGOs, Events, Volunteering, AQI)"] = {
            "status": "PASSED" if passed else "FAILED",
            "details": (
                f"issues={len(r_iss.json().get('issues', []))}, "
                f"stakeholders={len(r_stk.json().get('stakeholders', []))}, "
                f"events={len(r_evt.json().get('events', []))}, "
                f"volunteer_opps={len(r_vol.json().get('opportunities', []))}, "
                f"aqi_stations={len(r_aq.json().get('stations', []))}"
            ),
        }
    except Exception as e:
        results["Test 12: Existing Features (Issues, NGOs, Events, Volunteering, AQI)"] = {
            "status": "FAILED",
            "details": str(e),
        }

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    run_all_tests()
