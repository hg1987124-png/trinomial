from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


CIVIC_DOMAINS = [
    "All Domains",
    "Garbage, Waste & Cleanliness",
    "Water Supply, Drainage & Sanitation",
    "Air Quality & Pollution",
    "Roads, Potholes & Infrastructure",
    "Public Toilets & Hygiene",
    "Community Volunteering & NGO Support",
]


class ScrapeUrlRequest(BaseModel):
    url: str = Field(..., min_length=5, description="URL of an approved civic data source or public report to scrape")
    source_id: Optional[str] = Field(default=None, description="Optional connector identifier")
    domain: Optional[str] = Field(default="All Domains")


class IngestRequest(BaseModel):
    source_ids: Optional[List[str]] = Field(
        default=None,
        description="List of source connector IDs to ingest; defaults to all 4 approved sources",
    )
    domain: Optional[str] = Field(default="All Domains")
    force_refresh: bool = Field(default=False)


class AiSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    domain: str = Field(default="All Domains")
    location: Optional[str] = Field(default="Mumbai")
    enable_live_scraping: bool = Field(default=True)
    enable_google_search_grounding: bool = Field(default=False)
    simulate_invalid_key: bool = Field(default=False)
    simulate_blocked_source: Optional[str] = Field(default=None)

    @field_validator("query")
    @classmethod
    def validate_query_not_blank(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Search query cannot be empty or whitespace only.")
        return cleaned


class RecommendedSolutionItem(BaseModel):
    action: str
    whyItHelps: str
    supportingEvidence: str
    responsibleStakeholder: str
    implementationSteps: List[str]
    constraintsAndRisks: List[str]
    expectedOutcome: str
    isAiRecommendation: bool = True


class StakeholderItem(BaseModel):
    name: str
    organizationType: str
    role: str
    verifiedInSource: bool
    sourceUrl: Optional[str] = None


class SourceCitationItem(BaseModel):
    chunkId: str
    sourceId: str
    sourceName: str
    title: str
    url: str
    pageNumber: Optional[int] = None
    section: Optional[str] = None
    excerpt: str
    publishedDate: Optional[str] = None
    retrievedAt: str
    relevanceScore: float
    retrievalType: str


class ProblemAnalysisSection(BaseModel):
    evidenceSupportedFactors: List[str]
    rootCauseHypotheses: List[str]
    uncertainties: List[str]


class PriorityAssessmentSection(BaseModel):
    level: str
    reason: str


class RetrievalStatusSection(BaseModel):
    queriedSources: List[str]
    successfulSources: List[str]
    failedSources: List[Dict[str, str]]
    scrapedPagesCount: int


class RagStatusSection(BaseModel):
    ingestionPerformed: bool
    embeddingModel: Optional[str] = None
    semanticEmbeddingsUsed: bool
    retrievalMethod: str
    totalChunksInStore: int
    relevantChunksRetrieved: int


class AiCivicSearchResponse(BaseModel):
    status: str  # "success" | "partial_success" | "insufficient_evidence" | "error"
    query: str
    domain: str
    location: Optional[str] = None
    summary: str
    keyFindings: List[str]
    problemAnalysis: ProblemAnalysisSection
    recommendedSolutions: List[RecommendedSolutionItem]
    priorityAssessment: PriorityAssessmentSection
    stakeholders: List[StakeholderItem]
    sources: List[SourceCitationItem]
    retrievalStatus: RetrievalStatusSection
    ragStatus: RagStatusSection
    limitations: List[str]
    modelUsed: str
    generatedByGemini: bool
    googleSearchGrounding: Optional[List[Dict[str, str]]] = None
    generatedAt: str


# ============================================================================
# AI-POWERED CIVIC ISSUE DISCOVERY & VOLUNTEER MOBILIZATION SCHEMAS
# ============================================================================

class DiscoverIssueRequest(BaseModel):
    scenario_id: Optional[str] = Field(
        default="water_pipeline_burst",
        description=(
            "Scenario or connector preset: 'water_pipeline_burst' (Example A), "
            "'water_contamination_typhoid' (Example B - News Report Suspected Cases), "
            "'confirmed_public_health_notice' (Example B - Officially Confirmed Public-Health Notice), "
            "'unverified_public_claim' (Example B - Unverified Public Claim), "
            "'old_unrelated_report' (Example B - Old or Unrelated Report), "
            "or 'custom_url'"
        ),
    )
    source_url: Optional[str] = Field(default=None, description="Optional public URL to fetch and parse with BeautifulSoup")
    custom_html: Optional[str] = Field(default=None, description="Optional raw HTML to parse with BeautifulSoup")
    location_override: Optional[str] = Field(default=None)


class VolunteerAssistanceItem(BaseModel):
    activity_title: str
    activity_category: str
    description: str
    volunteer_tasks: List[str]
    equipment_provided: List[str]
    safety_precautions: List[str]
    requires_professional_authority_instead: bool = False
    suitability: str  # "High" | "Medium" | "Authority Only"


class DiscoveredIssueResponse(BaseModel):
    status: str  # "success" | "needs_verification" | "rejected_old_or_unrelated" | "error"
    scenario_id: str
    source_connector: Dict[str, Any]
    extracted_html_metadata: Dict[str, Any]
    report_distinction: str  # "officially_confirmed_notice" | "news_report_suspected_cases" | "unverified_public_claim" | "old_or_unrelated_report"
    report_distinction_label: str
    official_confirmation_summary: str
    location_and_incident_supported: bool
    evidence_support_explanation: str
    should_publish_as_active_issue: bool
    discovered_issue: Dict[str, Any]
    rag_corroborating_evidence: List[SourceCitationItem]
    technical_repair_disclaimer: str
    volunteer_assistance_options: List[VolunteerAssistanceItem]
    recommended_authority: str
    model_used: str
    generated_by_gemini: bool
    discovered_at: str
