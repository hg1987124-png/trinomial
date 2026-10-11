export type IssueType = 'documented_civic_concern' | 'citizen_report';

export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low' | 'Needs More Evidence';

export type IssueCategory =
  | 'Water Supply'
  | 'Sewerage & Drainage'
  | 'Solid Waste Management'
  | 'Public Sanitation & Toilets'
  | 'Air Quality & Pollution'
  | 'Roads & Infrastructure'
  | 'Traffic & Public Safety'
  | 'Public Health & Sanitation'
  | 'Other Civic Issues';

export interface IssueEvidence {
  id: string;
  issue_id: string;
  resource_id: string;
  document_title: string;
  page_number: number;
  section_heading: string;
  evidence_excerpt: string;
  original_url: string;
  table_reference?: string;
  metric_value?: string;
}

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  issue_type: IssueType;
  location_text: string;
  ward?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  priority: IssuePriority;
  priority_reason: string;
  verification_status: 'documented_in_source' | 'verified_citizen_report' | 'pending_verification';
  publication_date: string; // e.g. "May 2025"
  retrieved_at: string;
  created_at: string;
  updated_at: string;
  source_platform: string; // e.g. "OpenCity India"
  source_dataset_title: string;
  source_dataset_url: string;
  source_resource_url: string;
  publisher: string; // e.g. "Praja Foundation"
  assigned_authority?: string;
  evidence: IssueEvidence[];
  uncertainties?: string[];
  status: 'Documented' | 'Citizen Action Active' | 'Under Authority Review' | 'Solution Proposed';
  petition_count?: number;
  volunteer_count?: number;
}

export interface DocumentChunk {
  id: string;
  resource_id: string;
  document_title: string;
  page_number: number;
  section_heading: string;
  content: string;
  content_hash: string;
  original_url: string;
  publication_date: string;
  tokens_count?: number;
}

export interface IngestionRun {
  id: string;
  source_id: string;
  source_name: string;
  dataset_title: string;
  dataset_url: string;
  resource_url: string;
  started_at: string;
  completed_at: string;
  status: 'success' | 'failed' | 'in_progress';
  resources_found: number;
  documents_processed: number;
  records_created: number;
  duplicates_skipped: number;
  documents_indexed: number;
  pages_extracted: number;
  error_summary?: string;
  duration_ms: number;
  log_entries: string[];
}

export interface SourceResource {
  id: string;
  source_id: string;
  dataset_title: string;
  resource_title: string;
  page_url: string;
  resource_url: string;
  publication_date: string;
  retrieved_at: string;
  content_hash: string;
  processing_status: 'processed' | 'pending' | 'failed';
  file_size_bytes: number;
  format: string;
  last_error?: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  stakeholder_type:
    | 'Municipal Authority'
    | 'Pollution Control Board'
    | 'Research & Civic Audit Organization'
    | 'Civic-Tech NGO'
    | 'Environmental Action Group'
    | 'Community Sanitation Initiative';
  expertise: string[];
  service_area: string;
  description: string;
  public_contact: string;
  source_url: string;
  verification_status: 'verified_official' | 'registered_civic_partner' | 'synthetic_demonstration';
  is_demo_data: boolean;
  match_relevance?: string;
}

export interface ActionPlan {
  id: string;
  issue_id: string;
  summary: string;
  potential_causes: {
    sourced_facts: string[];
    plausible_hypotheses: string[];
  };
  immediate_steps: string[];
  medium_term_interventions: string[];
  long_term_recommendations: string[];
  potential_stakeholders: string[];
  potential_collaborators: string[];
  resources_needed: string[];
  expected_outcome: string;
  evidence_and_limitations: {
    supporting_evidence: string[];
    unvalidated_assumptions: string[];
  };
  created_at: string;
}

export interface CollaborationRequest {
  id: string;
  issue_id: string;
  issue_title: string;
  stakeholder_id?: string;
  stakeholder_name?: string;
  requester_name: string;
  requester_email: string;
  organization?: string;
  assistance_type:
    | 'Volunteer support'
    | 'Technical expertise'
    | 'Research and evidence collection'
    | 'NGO collaboration'
    | 'Community awareness'
    | 'Resource or equipment support'
    | 'Funding or sponsorship enquiry'
    | 'Professional consultation';
  message: string;
  status: 'received' | 'in_review' | 'acknowledged';
  created_at: string;
}

export interface CitizenReport {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  location_text: string;
  ward?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  photo_reference?: string;
  verification_status: 'pending_verification' | 'community_flagged';
  created_at: string;
}

export interface RagCitation {
  chunk_id: string;
  page_number: number;
  section: string;
  excerpt: string;
  score: number;
  url: string;
}

export interface RagQueryResponse {
  query: string;
  issue_id?: string;
  answer: string;
  citations: RagCitation[];
  evidence_sufficient: boolean;
  evidence_summary: string;
  limitations: string;
  model_used: string;
}

export type EventStatus = 'Draft' | 'Open for Registration' | 'Full' | 'Cancelled' | 'Completed';

export type EventCategory =
  | 'Cleanliness & Clean-up Drive'
  | 'Water Conservation & Testing'
  | 'Sewerage & Drain Audit'
  | 'Solid Waste Segregation Workshop'
  | 'Sanitation Facility Inspection'
  | 'Air Quality & Tree Plantation'
  | 'Road Safety & Pothole Survey'
  | 'Community Awareness & RTI Campaign'
  | 'Other Civic Action';

export interface CivicEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  related_issue_ids: string[];
  activity_type: string;
  date: string;
  start_time: string;
  duration_hours: number;
  location_name: string;
  meeting_point: string;
  ward?: string;
  city: string;
  participation_instructions: string;
  required_skills_or_tasks: string[];
  equipment_provided?: string[];
  equipment_needed_from_volunteer?: string[];
  organizer_name: string;
  organizer_organization: string;
  organizer_contact: string;
  organizer_type: 'Verified NGO' | 'Community Group' | 'Municipal Partner' | 'Academic / Student Lab';
  max_volunteers: number;
  registered_volunteers_count: number;
  registration_deadline: string;
  status: EventStatus;
  shareable_slug: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  volunteer_name: string;
  volunteer_email: string;
  phone?: string;
  skills_or_interests?: string;
  emergency_contact?: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  registered_at: string;
}

export interface EventRecommendation {
  recommended_activity: string;
  rationale: string;
  suggested_tasks: string[];
  equipment_needed: string[];
  safety_precautions: string[];
  suitability_score: 'High' | 'Medium' | 'Authority Escalation Recommended';
}

export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Unknown';

export interface PollutantMeasurement {
  value: number | null;
  min?: number;
  max?: number;
  unit: string;
}

export interface AirQualityReading {
  id: string;
  station_id: string;
  station_name: string;
  city: string;
  state: string;
  ward?: string;
  latitude: number;
  longitude: number;
  aqi: number | null;
  aqi_category: AqiCategory;
  prominent_pollutant?: string;
  pollutants: {
    pm25?: PollutantMeasurement;
    pm10?: PollutantMeasurement;
    no2?: PollutantMeasurement;
    so2?: PollutantMeasurement;
    co?: PollutantMeasurement;
    ozone?: PollutantMeasurement;
    nh3?: PollutantMeasurement;
  };
  observation_timestamp: string;
  retrieved_at: string;
  source_platform: string;
  source_dataset_name: string;
  data_provider: string;
  source_url: string;
  data_freshness: 'recent_observation' | 'historical_or_stale' | 'unavailable';
  is_live: boolean;
  status: 'available' | 'offline' | 'maintenance';
}

export interface AirQualityDatasetMetadata {
  title: string;
  description: string;
  provider: string;
  portal: string;
  portal_url: string;
  dataset_url: string;
  resource_links: { title: string; url: string; format?: string }[];
  licence?: string;
  retrieval_status?: string;
  http_status?: number | null;
  scraped_at?: string;
  notes?: string[];
}

export interface AirQualityStatusResponse {
  success: boolean;
  source_id: string;
  dataset_name: string;
  provider: string;
  portal: string;
  catalog_url: string;
  api_endpoint: string;
  metadata: AirQualityDatasetMetadata;
  is_live: boolean;
  retrieval_method: string;
  total_stations: number;
  active_stations: number;
  data_freshness: 'recent_observation' | 'historical_or_stale' | 'unavailable';
  retrieved_at: string;
  stations: AirQualityReading[];
  ingestion_run?: IngestionRun;
}

export type VolunteerOpportunityType = 'published_event' | 'organization_opportunity' | 'ai_suggested_activity';
export type VerificationStatus = 'verified_in_source' | 'ai_suggested_activity' | 'pending_verification';

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description: string;
  domain: string;
  opportunityType: VolunteerOpportunityType;
  location: string;
  organizer: string;
  startDate: string;
  endDate?: string;
  registrationUrl?: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt?: string;
  retrievedAt: string;
  verificationStatus: VerificationStatus;
  registrationStatus: 'open' | 'closed' | 'full';
  relevanceReason: string;
  aiSummary: string;
  lastVerifiedAt: string;
  expiresAt: string;
}


