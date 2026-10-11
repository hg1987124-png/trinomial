import os
import io
import json
import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

from python_service.connectors import (
    is_url_approved,
    get_source_by_id,
    APPROVED_SOURCES,
)
from python_service.document_processor import (
    sanitize_text,
    chunk_document_text,
    infer_civic_domain,
)

USER_AGENT = (
    "KartavyaCivicBot/2.0 (+https://data.opencity.in; Python-Requests BeautifulSoup4 Civic-RAG-Pipeline)"
)


# ============================================================================
# BUILT-IN PUBLIC CIVIC BULLETINS & REPORTS (SERVED AS REAL HTML & PARSED BY BS4)
# ============================================================================

PUBLIC_BULLETIN_HTML_PAGES: Dict[str, str] = {
    "water_pipeline_burst": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Major 1200mm Water Pipeline Burst on LBS Marg Near Kurla West Disrupts L-Ward Supply</title>
  <meta name="description" content="A 1200mm trunk water feeder main ruptured on LBS Marg near Kurla West junction in L-Ward, Mumbai. BMC Hydraulic Engineering teams deployed for heavy valve isolation." />
  <meta property="article:published_time" content="2026-10-11T06:30:00Z" />
  <meta name="author" content="Mumbai Civic Utility Bulletin & Local Press Desk" />
</head>
<body>
  <article class="civic-report">
    <header>
      <span class="source-publisher">Mumbai Civic Utility Bulletin &amp; Local Press Desk (BMC Docket #HE-L-2026-109)</span>
      <span class="confirmation-status" data-classification="officially_confirmed_notice">Confirmed Municipal Utility Incident Bulletin</span>
      <time datetime="2026-10-11">October 11, 2026</time>
      <h1>Major 1,200mm Water Pipeline Burst on LBS Marg Near Kurla West Disrupts L-Ward Supply; BMC Hydraulic Crew Deployed</h1>
      <div class="location-metadata" data-ward="L-Ward" data-city="Mumbai" data-locality="LBS Marg, Halav Pool, Bail Bazaar &amp; Kurla West">
        Location: LBS Marg near Kurla West Railway Junction, Halav Pool &amp; Bail Bazaar, L-Ward, Mumbai
      </div>
    </header>
    <section class="incident-details">
      <h2>Incident Overview &amp; Field Observations</h2>
      <p>
        At approximately 04:45 IST on October 11, 2026, a major 1,200mm cast-iron potable water feeder main ruptured along Lal Bahadur Shastri (LBS) Marg near the Kurla West junction in Mumbai's L-Ward. Thousands of kilolitres of treated water gushed onto the arterial roadway, inundating low-lying pockets near Halav Pool, Bail Bazaar, and New Mill Road.
      </p>
      <p>
        Engineers from the Brihanmumbai Municipal Corporation (BMC) Hydraulic Engineering Department isolated the main sluice valves at 06:10 IST and deployed heavy excavation machinery, dewatering pumps, and specialized pipeline welding crews. Official estimates indicate an 18-to-24 hour emergency repair window, resulting in a 35% water pressure cut and delayed evening supply across Kurla West, Saki Naka, and adjoining L-Ward residential clusters.
      </p>
      <h2>Technical Repair Boundary &amp; Community Assistance Needed</h2>
      <p>
        <strong>Statutory Safety Notice:</strong> Pressurized trunk main welding, trench shoring, sluice valve operation, and post-repair line flushing are hazardous technical utility operations that must be performed exclusively by authorized BMC Hydraulic Engineering personnel and licensed contractors. Citizen volunteers must NOT enter excavation trenches or attempt infrastructure repairs.
      </p>
      <ul class="assistance-needed">
        <li>Distribute verified BMC water supply timing and 48-hour post-repair water boiling advisories to households in Halav Pool, Bail Bazaar, and Indira Nagar.</li>
        <li>Coordinate queue management and assist senior citizens and persons with disabilities at the 6 municipal water tanker distribution points in L-Ward.</li>
        <li>Conduct non-invasive citizen surface logging of residual waterlogging and silt accumulation along pedestrian footpaths once the main valve is shut, and relay coordinates to the L-Ward Control Room.</li>
        <li>Organize a permitted post-repair community footpath silt and plastic debris cleanup drive after BMC completes trench backfilling.</li>
      </ul>
    </section>
  </article>
</body>
</html>""",

    "water_contamination_typhoid": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Govandi &amp; Baiganwadi Residents Report Foul-Smelling Tap Water and Suspected Typhoid Cases</title>
  <meta name="description" content="Local news report describing suspected water contamination and 18 suspected enteric fever/typhoid cases in Baiganwadi, M-East Ward, Mumbai. Official BMC lab confirmation awaited." />
  <meta property="article:published_time" content="2026-10-10T14:15:00Z" />
  <meta name="author" content="Mumbai Eastern Suburbs Civic Watch / Local Press" />
</head>
<body>
  <article class="civic-report">
    <header>
      <span class="source-publisher">Mumbai Eastern Suburbs Civic Watch — Local News Report</span>
      <span class="confirmation-status" data-classification="news_report_suspected_cases">News Report Describing Suspected Cases (Official Lab Confirmation Pending)</span>
      <time datetime="2026-10-10">October 10, 2026</time>
      <h1>Residents in Govandi &amp; Baiganwadi (M-East Ward) Report Foul-Smelling Tap Water and Suspected Typhoid Clusters; Civic Lab Testing Awaited</h1>
      <div class="location-metadata" data-ward="M-East Ward" data-city="Mumbai" data-locality="Baiganwadi Plots 14-19 &amp; Shivaji Nagar, Govandi">
        Location: Baiganwadi (Plots 14–19) and Shivaji Nagar, Govandi, M-East Ward, Mumbai
      </div>
    </header>
    <section class="incident-details">
      <h2>Reported Contamination &amp; Suspected Enteric Fever Cases</h2>
      <p>
        Residents across Plots 14 to 19 in Baiganwadi and adjoining lanes of Shivaji Nagar in Govandi (M-East Ward, Mumbai) have reported yellowish, foul-smelling water emerging from household and community standpost taps during the first 20 minutes of morning supply over the past four days.
      </p>
      <p>
        Three local general practitioners and a community dispensary in Lotus Colony told reporters they have treated 18 suspected cases of enteric fever (typhoid) and 32 cases of acute gastroenteritis among children and young adults in the locality over the past 10 days. Community health workers suspect sewage ingress into corroded service pipes that pass through open stormwater nallahs.
      </p>
      <h2>Official Confirmation Status</h2>
      <p>
        <strong>Verification Status:</strong> This is a published local news report describing suspected cases and resident complaints. While M-East Ward Assistant Engineer (Water Works) acknowledged receiving 11 CCRS complaints and collected 6 water samples on October 10, the official bacteriological laboratory report (E. coli / Salmonella typhi culture) from the BMC Municipal Analyst and an official epidemic declaration from the BMC Public Health Department are still awaited.
      </p>
      <ul class="assistance-needed">
        <li>Distribute precautionary boiled-water and halogen tablet usage guides issued by community health NGOs (such as Pani Haq Samiti) while clearly stating that official BMC lab results are pending.</li>
        <li>Conduct a household symptom &amp; tap-water turbidity survey across Baiganwadi lanes to submit a consolidated evidence docket to the M-East Ward Medical Officer of Health.</li>
        <li>Support ORS (Oral Rehydration Salts) awareness camps with registered local clinics without attempting unauthorized plumbing or water line modifications.</li>
      </ul>
    </section>
  </article>
</body>
</html>""",

    "confirmed_public_health_notice": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>OFFICIAL PUBLIC HEALTH NOTICE: Boiled Water Advisory in F-North Ward (Sion Koliwada) After Confirmed Coliform Detection</title>
  <meta name="description" content="Official BMC Public Health Department Epidemic Cell notice confirming coliform bacteria in 4 water samples in Sion Koliwada, F-North Ward." />
  <meta property="article:published_time" content="2026-10-11T08:00:00Z" />
  <meta name="author" content="BMC Public Health Department — Epidemic Cell" />
</head>
<body>
  <article class="civic-report">
    <header>
      <span class="source-publisher">Brihanmumbai Municipal Corporation (BMC) Public Health Department — Circular #MOH/FN/2026/412</span>
      <span class="confirmation-status" data-classification="officially_confirmed_notice">Officially Confirmed Public-Health Notice</span>
      <time datetime="2026-10-11">October 11, 2026</time>
      <h1>OFFICIAL PUBLIC HEALTH NOTICE: Mandatory Boiled-Water Advisory &amp; Super-Chlorination in Sion Koliwada (F-North Ward) Following Confirmed Coliform Detection</h1>
      <div class="location-metadata" data-ward="F-North Ward" data-city="Mumbai" data-locality="Sion Koliwada &amp; Pratiksha Nagar">
        Location: Sion Koliwada &amp; Pratiksha Nagar Sector 3, F-North Ward, Mumbai
      </div>
    </header>
    <section class="incident-details">
      <h2>Official Laboratory Confirmation</h2>
      <p>
        The Medical Officer of Health (F-North Ward) and the Municipal Laboratory at Dadar officially confirm that 4 out of 9 routine water samples collected from distribution standposts in Sion Koliwada tested positive for coliform bacteria due to a cross-connection leak near an underground sewerage chamber. Furthermore, Sion Hospital surveillance confirmed 9 laboratory-verified Widal/blood-culture positive typhoid cases from the affected cluster.
      </p>
      <p>
        BMC Hydraulic Engineering has isolated the affected sub-branch line for pipe replacement and initiated emergency super-chlorination. All residents in Sion Koliwada and Pratiksha Nagar are officially advised to boil drinking water for 10 minutes for the next 72 hours.
      </p>
      <ul class="assistance-needed">
        <li>Amplify the official BMC Public Health Circular #MOH/FN/2026/412 door-to-door in Marathi, Hindi, and English across Sion Koliwada chawls.</li>
        <li>Assist F-North Ward health post staff in distributing free chlorine tablets and ORS packets at community welfare centers.</li>
      </ul>
    </section>
  </article>
</body>
</html>""",

    "unverified_public_claim": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Anonymous Social Media Forward: Rumor of Toxic Chemical Injected in All City Water Lakes</title>
  <meta name="description" content="Unverified viral message with no official source, no ward location, and no laboratory evidence." />
</head>
<body>
  <article class="civic-report">
    <header>
      <span class="source-publisher">Unattributed Social Media Forward / Anonymous Chain Message</span>
      <span class="confirmation-status" data-classification="unverified_public_claim">Unverified Public Claim</span>
      <time datetime="2026-10-11">Undated Viral Forward</time>
      <h1>URGENT FORWARD: Somebody Said All Mumbai Water Lakes Have Toxic Chemical Today — Stop Drinking Water Everywhere!</h1>
      <div class="location-metadata" data-ward="Unspecified" data-city="Unspecified">
        Location: Unspecified ("Everywhere in the city")
      </div>
    </header>
    <section class="incident-details">
      <p>
        Forwarded as received!! A friend's relative said that unknown people dumped chemicals into all lakes supplying water and thousands of people are falling sick in every ward. Share with 20 groups immediately! No hospital name, no ward number, no BMC circular, and no news reporter is cited.
      </p>
    </section>
  </article>
</body>
</html>""",

    "old_unrelated_report": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>2018 Monsoon Pipeline Repair Completed in Shivajinagar, Pune</title>
  <meta name="description" content="Historical archival report from July 2018 regarding a water pipe repair in Pune." />
  <meta property="article:published_time" content="2018-07-14T10:00:00Z" />
</head>
<body>
  <article class="civic-report">
    <header>
      <span class="source-publisher">Regional Civic Archive (July 2018)</span>
      <span class="confirmation-status" data-classification="old_or_unrelated_report">Historical / Unrelated City Report (July 2018)</span>
      <time datetime="2018-07-14">July 14, 2018</time>
      <h1>Pune Municipal Corporation Completes 2018 Monsoon Pipeline Valve Replacement in Shivajinagar</h1>
      <div class="location-metadata" data-ward="Shivajinagar" data-city="Pune">
        Location: Shivajinagar, Pune (July 2018)
      </div>
    </header>
    <section class="incident-details">
      <p>
        In July 2018, the Pune Municipal Corporation completed routine maintenance on a distribution valve in Shivajinagar, Pune. Water supply was restored normal the same evening in 2018.
      </p>
    </section>
  </article>
</body>
</html>""",
}


def extract_html_with_beautifulsoup(html_text: str, base_url: str = "") -> Dict[str, Any]:
    """
    Use BeautifulSoup (bs4) to parse HTML, remove script/style noise, and extract:
    - title, meta description, publication date, source publisher, location/ward metadata
    - official confirmation classification attributes if present
    - headings, paragraphs, bullet points (including volunteer assistance items), and links
    """
    soup = BeautifulSoup(html_text, "html.parser")

    # Remove noise elements
    for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(" ", strip=True)

    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find(
        "meta", attrs={"property": "og:description"}
    )
    if meta_tag and meta_tag.get("content"):
        meta_desc = str(meta_tag.get("content")).strip()

    # Extract publication date from <time> or <meta property="article:published_time">
    pub_date = ""
    time_tag = soup.find("time")
    if time_tag:
        pub_date = time_tag.get_text(" ", strip=True) or str(time_tag.get("datetime", "")).strip()
    if not pub_date:
        pub_meta = soup.find("meta", attrs={"property": "article:published_time"})
        if pub_meta and pub_meta.get("content"):
            pub_date = str(pub_meta.get("content")).strip()

    # Extract publisher / source attribution
    publisher = ""
    pub_span = soup.find(class_="source-publisher") or soup.find("meta", attrs={"name": "author"})
    if pub_span:
        if pub_span.name == "meta":
            publisher = str(pub_span.get("content", "")).strip()
        else:
            publisher = pub_span.get_text(" ", strip=True)

    # Extract location / ward metadata if present in HTML
    location_text = ""
    ward = ""
    city = "Mumbai"
    loc_div = soup.find(class_="location-metadata")
    if loc_div:
        location_text = loc_div.get_text(" ", strip=True).replace("Location:", "").strip()
        ward = str(loc_div.get("data-ward", "")).strip()
        city = str(loc_div.get("data-city", "Mumbai")).strip()

    # Extract confirmation status hint if present
    confirmation_hint = ""
    conf_span = soup.find(class_="confirmation-status")
    if conf_span:
        confirmation_hint = str(conf_span.get("data-classification", "")).strip()

    headings: List[str] = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        ht = h.get_text(" ", strip=True)
        if ht and len(ht) > 2:
            headings.append(ht)

    paragraphs: List[str] = []
    for p in soup.find_all(["p", "li", "td"]):
        pt = p.get_text(" ", strip=True)
        if pt and len(pt) >= 25:
            paragraphs.append(pt)

    assistance_items: List[str] = []
    assist_ul = soup.find("ul", class_="assistance-needed")
    if assist_ul:
        for li in assist_ul.find_all("li"):
            lt = li.get_text(" ", strip=True)
            if lt:
                assistance_items.append(lt)

    links: List[Dict[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        full_url = urljoin(base_url, href) if base_url else href
        label = a.get_text(" ", strip=True) or full_url
        links.append({"title": label[:120], "url": full_url})

    combined_text = "\n\n".join(
        filter(None, [title, meta_desc, "\n".join(headings[:10]), "\n".join(paragraphs[:45])])
    )
    cleaned_body = sanitize_text(combined_text)

    return {
        "title": title or "Scraped Civic Document",
        "meta_description": meta_desc,
        "publication_date": pub_date or "October 2026",
        "publisher": publisher,
        "location_text": location_text,
        "ward": ward,
        "city": city,
        "confirmation_hint": confirmation_hint,
        "headings": headings[:15],
        "paragraphs_count": len(paragraphs),
        "paragraphs": paragraphs[:20],
        "assistance_items": assistance_items,
        "links": links[:25],
        "cleaned_text": cleaned_body,
    }


def scrape_approved_url(url: str, source_id: Optional[str] = None, domain: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch and parse an approved public URL using Python requests + BeautifulSoup (or pypdf for PDFs).
    Rejects unapproved or private network hosts (except local /public-bulletins connector).
    """
    if not is_url_approved(url):
        raise ValueError(
            f"URL '{url}' is not on the approved civic source allowlist. "
            "Only OpenCity India, Data.gov.in / CPCB, NGO Darpan, MY Bharat, MCGM, and local civic bulletin connectors are permitted."
        )

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/json,application/pdf;q=0.9,*/*;q=0.8",
    }

    resp = requests.get(url, headers=headers, timeout=12)
    http_status = resp.status_code
    resp.raise_for_status()

    content_type = (resp.headers.get("Content-Type") or "").lower()
    src_meta = get_source_by_id(source_id or "") or {
        "id": source_id or "custom-approved",
        "name": "Approved Public Civic Source",
    }

    if "application/pdf" in content_type or url.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(resp.content))
        pages_text: List[str] = []
        for idx, page in enumerate(reader.pages[:15]):
            txt = page.extract_text() or ""
            if txt.strip():
                pages_text.append(f"[Page {idx + 1}] {txt.strip()}")
        combined = sanitize_text("\n\n".join(pages_text))
        chunks = chunk_document_text(
            text=combined,
            source_id=src_meta["id"],
            source_name=src_meta["name"],
            document_title=f"PDF Resource from {src_meta['name']}",
            original_url=url,
            publication_date="May 2025",
            page_number=1,
            section_heading="Extracted PDF Text",
            domain=domain,
        )
        return {
            "status": "success",
            "url": url,
            "http_status": http_status,
            "content_type": content_type,
            "parser_used": "pypdf",
            "title": f"PDF Document ({len(reader.pages)} pages)",
            "extracted_text_length": len(combined),
            "chunks": chunks,
            "retrieved_at": now_iso,
        }

    if "application/json" in content_type:
        data = resp.json()
        raw_summary = json.dumps(data, ensure_ascii=False)[:6000]
        chunks = chunk_document_text(
            text=raw_summary,
            source_id=src_meta["id"],
            source_name=src_meta["name"],
            document_title=f"JSON API Response from {src_meta['name']}",
            original_url=url,
            publication_date="2025-2026",
            page_number=1,
            section_heading="API Structured Payload",
            domain=domain,
        )
        return {
            "status": "success",
            "url": url,
            "http_status": http_status,
            "content_type": content_type,
            "parser_used": "requests_json",
            "title": f"JSON API ({src_meta['name']})",
            "extracted_text_length": len(raw_summary),
            "chunks": chunks,
            "retrieved_at": now_iso,
        }

    # Default: HTML parsing with BeautifulSoup
    parsed_html = extract_html_with_beautifulsoup(resp.text, base_url=url)
    chunks = chunk_document_text(
        text=parsed_html["cleaned_text"],
        source_id=src_meta["id"],
        source_name=parsed_html.get("publisher") or src_meta["name"],
        document_title=parsed_html["title"],
        original_url=url,
        publication_date=parsed_html.get("publication_date") or "2025-2026",
        page_number=1,
        section_heading=parsed_html["headings"][0] if parsed_html["headings"] else "Scraped Web Page",
        domain=domain,
        location=parsed_html.get("location_text") or "Mumbai",
    )

    return {
        "status": "success",
        "url": url,
        "http_status": http_status,
        "content_type": content_type,
        "parser_used": "BeautifulSoup4 (html.parser)",
        "title": parsed_html["title"],
        "meta_description": parsed_html["meta_description"],
        "publication_date": parsed_html.get("publication_date"),
        "publisher": parsed_html.get("publisher"),
        "location_text": parsed_html.get("location_text"),
        "ward": parsed_html.get("ward"),
        "city": parsed_html.get("city"),
        "confirmation_hint": parsed_html.get("confirmation_hint"),
        "headings": parsed_html["headings"],
        "paragraphs": parsed_html.get("paragraphs", []),
        "assistance_items": parsed_html.get("assistance_items", []),
        "links_found": len(parsed_html["links"]),
        "extracted_text_length": len(parsed_html["cleaned_text"]),
        "cleaned_text": parsed_html["cleaned_text"],
        "chunks": chunks,
        "retrieved_at": now_iso,
    }


def run_multi_source_scraping(
    domain: str = "All Domains",
    source_ids: Optional[List[str]] = None,
    simulate_blocked_source: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute real Python requests + BeautifulSoup scraping across approved civic sources.
    Handles partial source failures gracefully while preserving verifiable telemetry.
    """
    targets = [
        s for s in APPROVED_SOURCES if (not source_ids or s["id"] in source_ids)
    ]

    queried_sources: List[str] = []
    successful_sources: List[str] = []
    failed_sources: List[Dict[str, str]] = []
    all_new_chunks: List[Dict[str, Any]] = []
    scraped_pages_count = 0

    for src in targets:
        sid = src["id"]
        sname = src["name"]
        queried_sources.append(sname)

        if simulate_blocked_source and (
            simulate_blocked_source.lower() in sid.lower()
            or simulate_blocked_source.lower() in sname.lower()
        ):
            failed_sources.append(
                {
                    "source": sname,
                    "error": f"Simulated HTTP 403 / timeout on connector '{sid}' (Graceful degradation active).",
                }
            )
            continue

        try:
            res = scrape_approved_url(src["catalog_url"], source_id=sid, domain=domain)
            scraped_pages_count += 1
            successful_sources.append(sname)
            for ch in res.get("chunks", []):
                ch["domain"] = infer_civic_domain(ch.get("content", ""), default_domain=domain)
                all_new_chunks.append(ch)
        except Exception as e:
            failed_sources.append(
                {
                    "source": sname,
                    "error": f"Live HTTP scrape error ({type(e).__name__}): {str(e)[:160]}",
                }
            )

    return {
        "queried_sources": queried_sources,
        "successful_sources": successful_sources,
        "failed_sources": failed_sources,
        "scraped_pages_count": scraped_pages_count,
        "chunks": all_new_chunks,
    }
