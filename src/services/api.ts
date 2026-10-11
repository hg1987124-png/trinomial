import {
  CivicIssue,
  IngestionRun,
  SourceResource,
  Stakeholder,
  ActionPlan,
  CollaborationRequest,
  CitizenReport,
  RagQueryResponse,
  CivicEvent,
  EventRegistration,
  EventRecommendation,
  AirQualityReading,
  AirQualityStatusResponse,
} from '../types/civic';

export interface IngestionStatusResponse {
  source: {
    id: string;
    name: string;
    base_url: string;
    catalogue_url: string;
    licence: string;
    publisher: string;
  };
  sources?: {
    id: string;
    name: string;
    base_url: string;
    catalogue_url: string;
    licence: string;
    publisher: string;
    type?: string;
    status?: string;
  }[];
  resources: SourceResource[];
  runs: IngestionRun[];
  total_indexed_chunks: number;
  is_scraping_in_progress: boolean;
  is_opencity_scraping?: boolean;
  is_cpcb_scraping?: boolean;
  last_successful_run?: IngestionRun;
  air_quality?: {
    total_stations: number;
    active_stations: number;
    metadata?: any;
    last_retrieved: string | null;
    data_freshness: string;
    is_live: boolean;
  };
}

export interface StatsResponse {
  total_issues: number;
  documented_issues: number;
  citizen_reports: number;
  total_collaboration_requests: number;
  total_events?: number;
  total_volunteer_registrations?: number;
  indexed_rag_chunks: number;
  ingestion_runs_count: number;
  last_ingestion_time: string | null;
  source_platform: string;
  primary_dataset: string;
  secondary_dataset?: string;
  total_air_quality_stations?: number;
  data_sources_count?: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}


export const api = {
  async getIssues(params?: {
    category?: string;
    priority?: string;
    search?: string;
    issue_type?: string;
  }): Promise<{ issues: CivicIssue[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.issue_type) searchParams.set('issue_type', params.issue_type);

    const res = await fetch(`/api/issues?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch issues: ${res.statusText}`);
    return res.json();
  },

  async getIssueById(id: string): Promise<{ issue: CivicIssue; actionPlan?: ActionPlan }> {
    const res = await fetch(`/api/issues/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch issue details: ${res.statusText}`);
    return res.json();
  },

  async getActionPlan(issueId: string): Promise<{ success: boolean; plan: ActionPlan }> {
    const res = await fetch(`/api/issues/${issueId}/action-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to generate action plan: ${res.statusText}`);
    return res.json();
  },

  async getIngestionStatus(): Promise<IngestionStatusResponse> {
    const res = await fetch('/api/ingestion/status');
    if (!res.ok) throw new Error(`Failed to fetch ingestion status: ${res.statusText}`);
    return res.json();
  },

  async runIngestion(): Promise<{
    success: boolean;
    message: string;
    run: IngestionRun;
    resource: SourceResource;
  }> {
    const res = await fetch('/api/ingestion/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Ingestion failed: ${res.statusText}`);
    }
    return res.json();
  },

  async queryRag(query: string, issueId?: string): Promise<RagQueryResponse> {
    const res = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, issue_id: issueId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `RAG query failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getStakeholders(): Promise<{ stakeholders: Stakeholder[]; total: number }> {
    const res = await fetch('/api/stakeholders');
    if (!res.ok) throw new Error(`Failed to fetch stakeholders: ${res.statusText}`);
    return res.json();
  },

  async getCollaborationRequests(): Promise<{ requests: CollaborationRequest[]; total: number }> {
    const res = await fetch('/api/collaboration');
    if (!res.ok) throw new Error(`Failed to fetch collaboration requests: ${res.statusText}`);
    return res.json();
  },

  async submitCollaborationRequest(data: {
    issue_id: string;
    issue_title: string;
    stakeholder_id?: string;
    stakeholder_name?: string;
    requester_name: string;
    requester_email: string;
    organization?: string;
    assistance_type: string;
    message: string;
  }): Promise<{ success: boolean; request: CollaborationRequest }> {
    const res = await fetch('/api/collaboration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to submit request: ${res.statusText}`);
    }
    return res.json();
  },

  async submitCitizenReport(data: {
    title: string;
    description: string;
    category: string;
    location_text: string;
    ward?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; report: CitizenReport; issue: CivicIssue }> {
    const res = await fetch('/api/citizen-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to submit report: ${res.statusText}`);
    }
    return res.json();
  },

  async getStats(): Promise<StatsResponse> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return res.json();
  },

  // Events & Volunteer Registration API
  async getEvents(params?: {
    category?: string;
    status?: string;
    issue_id?: string;
    location?: string;
    search?: string;
  }): Promise<{ events: CivicEvent[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.issue_id) searchParams.set('issue_id', params.issue_id);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.search) searchParams.set('search', params.search);

    const res = await fetch(`/api/events?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
    return res.json();
  },

  async getEventById(id: string): Promise<{
    event: CivicEvent;
    relatedIssues: CivicIssue[];
    registrationsCount: number;
    availableSlots: number;
  }> {
    const res = await fetch(`/api/events/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch event details: ${res.statusText}`);
    return res.json();
  },

  async createEvent(data: Partial<CivicEvent>): Promise<{ success: boolean; event: CivicEvent; message: string }> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create event: ${res.statusText}`);
    }
    return res.json();
  },

  async updateEvent(id: string, updates: Partial<CivicEvent>): Promise<{ success: boolean; event: CivicEvent }> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update event: ${res.statusText}`);
    }
    return res.json();
  },

  async registerForEvent(
    eventId: string,
    volunteerData: {
      volunteer_name: string;
      volunteer_email: string;
      phone?: string;
      skills_or_interests?: string;
      emergency_contact?: string;
    }
  ): Promise<{ success: boolean; registration: EventRegistration; event: CivicEvent }> {
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volunteerData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to register for event: ${res.statusText}`);
    }
    return res.json();
  },

  async cancelEventRegistration(
    eventId: string,
    registrationId: string
  ): Promise<{ success: boolean; message: string; event: CivicEvent }> {
    const res = await fetch(`/api/events/${eventId}/register/${registrationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to cancel registration: ${res.statusText}`);
    }
    return res.json();
  },

  async getEventRegistrations(
    eventId: string
  ): Promise<{ event_id: string; event_title: string; registrations: EventRegistration[]; total: number; confirmed: number }> {
    const res = await fetch(`/api/events/${eventId}/registrations`);
    if (!res.ok) throw new Error(`Failed to fetch registrations: ${res.statusText}`);
    return res.json();
  },

  async getRegistrations(params?: {
    email?: string;
    event_id?: string;
  }): Promise<{ registrations: (EventRegistration & { event_title?: string; event_category?: string; event_date?: string; event_time?: string; event_location?: string; event_status?: string; event_slug?: string })[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.email) searchParams.set('email', params.email);
    if (params?.event_id) searchParams.set('event_id', params.event_id);
    const res = await fetch(`/api/registrations?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch registrations: ${res.statusText}`);
    return res.json();
  },

  async cancelRegistrationById(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/registrations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to cancel registration: ${res.statusText}`);
    }
    return res.json();
  },

  async getAiEventRecommendation(
    issueId: string
  ): Promise<{ success: boolean; recommendation: EventRecommendation }> {
    const res = await fetch('/api/events/ai-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to get AI event recommendation: ${res.statusText}`);
    }
    return res.json();
  },

  // Second Data Source: CPCB Real Time Air Quality Index APIs
  async getAirQuality(params?: {
    ward?: string;
    category?: string;
    search?: string;
  }): Promise<AirQualityStatusResponse> {
    const searchParams = new URLSearchParams();
    if (params?.ward) searchParams.set('ward', params.ward);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);

    const res = await fetch(`/api/air-quality?${searchParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch air quality readings: ${res.statusText}`);
    return res.json();
  },

  async getAirQualityForIssue(
    issueId: string
  ): Promise<{
    issue_id: string;
    issue_title: string;
    location_text: string;
    matched_stations_count: number;
    stations: AirQualityReading[];
    source_attribution: {
      source_name: string;
      dataset_name: string;
      source_url: string;
      retrieved_at: string;
      data_freshness: string;
      integrity_disclaimer: string;
    };
  }> {
    const res = await fetch(`/api/air-quality/for-issue/${issueId}`);
    if (!res.ok) throw new Error(`Failed to fetch air quality readings for issue: ${res.statusText}`);
    return res.json();
  },

  async runAirQualityIngestion(): Promise<AirQualityStatusResponse & { message: string }> {
    const res = await fetch('/api/air-quality/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Air quality ingestion failed: ${res.statusText}`);
    }
    return res.json();
  },

  async liveDomainSearch(domain: string, query: string): Promise<{
    success: boolean;
    domain: string;
    query: string;
    summary: string;
    records_analyzed: number;
    source_attribution: {
      source_name: string;
      dataset_title: string;
      retrieved_at: string;
      freshness: string;
    };
  }> {
    const res = await fetch('/api/live-domain-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Live domain search failed: ${res.statusText}`);
    }
    return res.json();
  },
};

