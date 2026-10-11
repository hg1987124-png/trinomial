import datetime
from urllib.parse import urlparse
from typing import Dict, List, Any, Optional

APPROVED_HOSTS = {
    "127.0.0.1",
    "localhost",
    "data.opencity.in",
    "opencity.in",
    "www.opencity.in",
    "www.data.gov.in",
    "data.gov.in",
    "api.data.gov.in",
    "cpcb.nic.in",
    "www.cpcb.nic.in",
    "ngodarpan.gov.in",
    "www.ngodarpan.gov.in",
    "mybharat.gov.in",
    "www.mybharat.gov.in",
    "portal.mcgm.gov.in",
    "www.mcgm.gov.in",
}

DOMAIN_ALIASES: Dict[str, str] = {
    "all": "All Domains",
    "all domains": "All Domains",
    "garbage, waste & cleanliness": "Garbage, Waste & Cleanliness",
    "solid waste management": "Garbage, Waste & Cleanliness",
    "waste": "Garbage, Waste & Cleanliness",
    "water supply, drainage & sanitation": "Water Supply, Drainage & Sanitation",
    "water supply": "Water Supply, Drainage & Sanitation",
    "sewerage & drainage": "Water Supply, Drainage & Sanitation",
    "public health & sanitation": "Water Supply, Drainage & Sanitation",
    "air quality & pollution": "Air Quality & Pollution",
    "air quality": "Air Quality & Pollution",
    "roads, potholes & infrastructure": "Roads, Potholes & Infrastructure",
    "roads & infrastructure": "Roads, Potholes & Infrastructure",
    "public toilets & hygiene": "Public Toilets & Hygiene",
    "public sanitation & toilets": "Public Toilets & Hygiene",
    "community volunteering & ngo support": "Community Volunteering & NGO Support",
}

DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "Garbage, Waste & Cleanliness": [
        "garbage", "waste", "dumping", "cleanliness", "segregation", "debris",
        "composting", "landfill", "deonar", "solid waste", "litter", "swachh",
    ],
    "Water Supply, Drainage & Sanitation": [
        "water", "pipeline", "burst", "leak", "leakage", "contamination", "unfit", "coliform",
        "sewerage", "drainage", "drain", "nallah", "stormwater", "culvert",
        "typhoid", "gastroenteritis", "potable", "supply", "transmission loss", "hydraulic",
    ],
    "Air Quality & Pollution": [
        "air", "aqi", "pm2.5", "pm10", "no2", "so2", "ozone", "pollution",
        "cpcb", "caaqms", "emissions", "smog", "particulate", "naaqs", "chembur",
    ],
    "Roads, Potholes & Infrastructure": [
        "road", "pothole", "infrastructure", "pavement", "bridge", "footpath",
        "resurfacing", "arterial", "pedestrian", "street", "excavation", "trench",
    ],
    "Public Toilets & Hygiene": [
        "toilet", "sanitation", "hygiene", "latrine", "washroom", "seat ratio",
        "women", "slum", "informal settlement", "electricity", "septic",
    ],
    "Community Volunteering & NGO Support": [
        "volunteer", "ngo", "community", "mobilization", "darpan", "my bharat",
        "youth", "awareness", "audit", "campaign", "citizen action", "event",
    ],
}

APPROVED_SOURCES: List[Dict[str, Any]] = [
    {
        "id": "opencity-in",
        "name": "OpenCity India Urban Data Portal",
        "organization": "OpenCity India / Oorvani Foundation & Praja Foundation",
        "base_url": "https://data.opencity.in",
        "catalog_url": "https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025",
        "api_url": "https://data.opencity.in/api/3/action/package_show?id=report-on-the-status-of-civic-issues-in-mumbai-may-2025",
        "resource_pdf_url": "https://data.opencity.in/dataset/9638767d-2f61-4d7c-9b29-174f290766f8/resource/0c028379-f930-4274-9602-8d5e19539a21/download/report-on-the-status-of-civic-issues-in-mumbai-may-2025.pdf",
        "type": "Urban Civic Datasets, Municipal Reports & Audits",
        "domains": [
            "Water Supply, Drainage & Sanitation",
            "Garbage, Waste & Cleanliness",
            "Public Toilets & Hygiene",
            "Air Quality & Pollution",
            "Roads, Potholes & Infrastructure",
        ],
        "licence": "Open Data Commons / Public Civic Commons",
    },
    {
        "id": "data-gov-in-cpcb",
        "name": "Government of India OGD Platform — CPCB Air Quality",
        "organization": "Central Pollution Control Board (CPCB), MoEFCC",
        "base_url": "https://www.data.gov.in",
        "catalog_url": "https://www.data.gov.in/catalog/real-time-air-quality-index",
        "api_url": "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
        "type": "Continuous Ambient Air Quality Monitoring (CAAQMS) Telemetry",
        "domains": ["Air Quality & Pollution"],
        "licence": "National Data Sharing and Accessibility Policy (NDSAP)",
    },
    {
        "id": "ngo-darpan",
        "name": "NGO Darpan — NITI Aayog Voluntary Sector Portal",
        "organization": "NITI Aayog, Government of India",
        "base_url": "https://ngodarpan.gov.in",
        "catalog_url": "https://ngodarpan.gov.in/",
        "type": "Verified NGO Directory & Civic Sector Registry",
        "domains": [
            "Community Volunteering & NGO Support",
            "Water Supply, Drainage & Sanitation",
            "Garbage, Waste & Cleanliness",
            "Public Toilets & Hygiene",
        ],
        "licence": "Government of India Public Registry",
    },
    {
        "id": "my-bharat",
        "name": "MY Bharat — Ministry of Youth Affairs Civic Volunteering",
        "organization": "Ministry of Youth Affairs and Sports, Government of India",
        "base_url": "https://mybharat.gov.in",
        "catalog_url": "https://mybharat.gov.in/",
        "type": "Youth Volunteering Drives & Community Action Opportunities",
        "domains": [
            "Community Volunteering & NGO Support",
            "Garbage, Waste & Cleanliness",
            "Water Supply, Drainage & Sanitation",
            "Air Quality & Pollution",
        ],
        "licence": "Government of India Portal",
    },
    {
        "id": "mumbai-civic-bulletins",
        "name": "Mumbai Municipal & Public News Civic Bulletin Connector",
        "organization": "BMC Hydraulic Engineering / Public Health & Local Civic Press",
        "base_url": "http://127.0.0.1:8765/public-bulletins",
        "catalog_url": "http://127.0.0.1:8765/public-bulletins/index.html",
        "type": "Public Utility Bulletins, Epidemic Notices & Local Incident Reports",
        "domains": [
            "Water Supply, Drainage & Sanitation",
            "Public Toilets & Hygiene",
            "Garbage, Waste & Cleanliness",
            "Roads, Potholes & Infrastructure",
        ],
        "licence": "Public Civic Information & Municipal Advisories",
    },
]


def normalize_domain(domain: Optional[str]) -> str:
    if not domain:
        return "All Domains"
    cleaned = domain.strip().lower()
    return DOMAIN_ALIASES.get(cleaned, domain.strip())


def is_url_approved(url: str) -> bool:
    """
    Validate that the target URL uses HTTP/HTTPS and targets an approved public host
    or local civic bulletin connector endpoint.
    """
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            return False
        host = (parsed.hostname or "").lower()
        if not host:
            return False
        # Allow local public-bulletins connector served on 127.0.0.1:8765
        if host in ("127.0.0.1", "localhost"):
            if parsed.port == 8765 and parsed.path.startswith("/public-bulletins"):
                return True
            return False
        if host.startswith("10.") or host.startswith("192.168.") or host.startswith("169.254."):
            return False
        return host in APPROVED_HOSTS
    except Exception:
        return False


def get_source_by_id(source_id: str) -> Optional[Dict[str, Any]]:
    for src in APPROVED_SOURCES:
        if src["id"] == source_id:
            return src
    return None


def get_connectors_for_domain(domain: str) -> List[Dict[str, Any]]:
    norm = normalize_domain(domain)
    if norm == "All Domains":
        return APPROVED_SOURCES
    matched = [s for s in APPROVED_SOURCES if norm in s.get("domains", [])]
    return matched if matched else APPROVED_SOURCES
