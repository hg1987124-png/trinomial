import { Router, Request, Response } from 'express';
import { db } from './db';
import { runOpenCityIngestion, getScrapingState } from './scraper';
import { runCpcbIngestion, getCpcbScrapingState } from './cpcb_ingestion';
import { executeRagQuery } from './rag';
import { generateActionPlanForIssue } from './analysis';
import { isGeminiConfigured, generateGeminiJson, generateGeminiText, generateGeminiWithSearch } from './gemini';
import { CollaborationRequest, CitizenReport, CivicEvent, EventRegistration, EventRecommendation, VolunteerOpportunity } from '../src/types/civic';
import { runVolunteerOpportunitiesRefresh, initVolunteerCronJob } from './volunteer';

// Initialize periodic cron refresher on startup
initVolunteerCronJob();

export const apiRouter = Router();

// Health & System Info
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gemini_configured: isGeminiConfigured(),
    total_issues: db.getIssues().length,
    indexed_chunks: db.getDocumentChunks().length,
    air_quality_stations: db.getAirQualityReadings().length,
    data_sources: 2,
  });
});

// Ingestion endpoints
apiRouter.get('/ingestion/status', (req: Request, res: Response) => {
  const runs = db.getIngestionRuns();
  const chunks = db.getDocumentChunks();
  const store = db.getStore();
  const { isScrapingInProgress } = getScrapingState();
  const { isCpcbScrapingInProgress } = getCpcbScrapingState();
  const aqReadings = db.getAirQualityReadings();
  const aqMeta = db.getAirQualityMetadata();

  const sourcesList = [
    {
      id: 'opencity-in',
      name: 'OpenCity India',
      base_url: 'https://data.opencity.in/',
      catalogue_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
      licence: 'Open Data Commons / Public Civic Commons',
      publisher: 'Praja Foundation',
      type: 'Civic Audit & Document Ledger',
      status: 'active',
    },
    {
      id: 'data-gov-in-cpcb',
      name: 'Government of India Open Government Data (OGD) Platform',
      base_url: 'https://data.gov.in',
      catalogue_url: 'https://www.data.gov.in/catalog/real-time-air-quality-index',
      licence: 'National Data Sharing and Accessibility Policy (NDSAP) - Open Government Data License India',
      publisher: 'Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change',
      type: 'Continuous Ambient Air Quality Monitoring (CAAQMS)',
      status: 'active',
    },
  ];

  res.json({
    source: store.source,
    sources: sourcesList,
    resources: store.resources,
    runs,
    total_indexed_chunks: chunks.length,
    is_scraping_in_progress: isScrapingInProgress || isCpcbScrapingInProgress,
    is_opencity_scraping: isScrapingInProgress,
    is_cpcb_scraping: isCpcbScrapingInProgress,
    last_successful_run: runs.find((r) => r.status === 'success'),
    air_quality: {
      total_stations: aqReadings.length,
      active_stations: aqReadings.filter((s) => s.aqi !== null).length,
      metadata: aqMeta,
      last_retrieved: aqReadings[0]?.retrieved_at || null,
      data_freshness: aqReadings[0]?.data_freshness || 'recent_observation',
      is_live: aqReadings.some((s) => s.is_live),
    },
  });
});

apiRouter.post('/ingestion/run', async (req: Request, res: Response) => {
  try {
    const result = await runOpenCityIngestion();
    res.json({
      success: true,
      message: 'Ingestion completed successfully from OpenCity India dataset',
      run: result.run,
      resource: result.resource,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Ingestion execution failed',
      last_run: db.getIngestionRuns()[0],
    });
  }
});

// Second Dataset: CPCB Ingestion endpoint
apiRouter.post('/air-quality/ingest', async (req: Request, res: Response) => {
  try {
    const result = await runCpcbIngestion();
    res.json({
      ...result,
      message: `Successfully ingested ${result.total_stations} CAAQMS monitoring stations from Central Pollution Control Board (CPCB) via OGD Platform`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'CPCB Air Quality ingestion failed',
    });
  }
});

// Air Quality Readings endpoints
apiRouter.get('/air-quality', (req: Request, res: Response) => {
  let readings = db.getAirQualityReadings();
  const meta = db.getAirQualityMetadata();
  const { ward, search, category } = req.query;

  if (category && typeof category === 'string' && category !== 'All') {
    readings = readings.filter((r) => r.aqi_category.toLowerCase() === category.toLowerCase());
  }

  if (ward && typeof ward === 'string' && ward !== 'All') {
    readings = readings.filter((r) => (r.ward || '').toLowerCase().includes(ward.toLowerCase()));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    readings = readings.filter(
      (r) =>
        r.station_name.toLowerCase().includes(q) ||
        (r.ward && r.ward.toLowerCase().includes(q)) ||
        (r.prominent_pollutant && r.prominent_pollutant.toLowerCase().includes(q))
    );
  }

  const validAqi = readings.filter((r) => typeof r.aqi === 'number');
  const avgAqi = validAqi.length > 0
    ? Math.round(validAqi.reduce((acc, curr) => acc + (curr.aqi || 0), 0) / validAqi.length)
    : null;

  res.json({
    success: true,
    total_stations: readings.length,
    active_stations: validAqi.length,
    average_aqi: avgAqi,
    metadata: meta,
    last_retrieval_time: readings[0]?.retrieved_at || new Date().toISOString(),
    data_freshness: readings[0]?.data_freshness || 'recent_observation',
    is_live: readings.some((r) => r.is_live),
    stations: readings,
  });
});

apiRouter.get('/air-quality/stations/:id', (req: Request, res: Response) => {
  const station = db.getAirQualityReadingById(req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Monitoring station not found' });
  }
  res.json({ station });
});

apiRouter.get('/air-quality/for-issue/:issueId', (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.issueId);
  const allStations = db.getAirQualityReadings();

  if (!issue) {
    return res.json({ stations: allStations.slice(0, 3) });
  }

  // Correlate monitoring station with issue's location / ward
  const locText = `${issue.location_text} ${issue.ward || ''}`.toLowerCase();
  let matched = allStations.filter((s) => {
    const stName = s.station_name.toLowerCase();
    const stWard = (s.ward || '').toLowerCase();

    // Check specific known locality overlaps
    if (locText.includes('chembur') && stName.includes('chembur')) return true;
    if (locText.includes('deonar') && (stName.includes('deonar') || stName.includes('chembur'))) return true;
    if (locText.includes('kurla') && stName.includes('kurla')) return true;
    if (locText.includes('bandra') && stName.includes('bandra')) return true;
    if (locText.includes('sion') && stName.includes('sion')) return true;
    if (locText.includes('worli') && stName.includes('worli')) return true;
    if (locText.includes('malad') && (stName.includes('borivali') || stName.includes('vile parle'))) return true;
    if (locText.includes('govandi') && (stName.includes('deonar') || stName.includes('chembur'))) return true;
    if (locText.includes('m-east') && (stName.includes('deonar') || stName.includes('chembur'))) return true;
    if (locText.includes('l') && stName.includes('kurla')) return true;
    if (locText.includes('h-east') && stName.includes('bandra')) return true;
    if (locText.includes('f-north') && stName.includes('sion')) return true;

    return locText.includes(stName) || locText.includes(stWard);
  });

  // If no direct locality match, return primary Mumbai stations or closest stations
  if (matched.length === 0) {
    matched = allStations.slice(0, 3);
  }

  res.json({
    issue_id: issue.id,
    issue_title: issue.title,
    location_text: issue.location_text,
    matched_stations_count: matched.length,
    stations: matched,
    source_attribution: {
      source_name: 'Central Pollution Control Board (CPCB) via OGD Platform',
      dataset_name: 'Real Time Air Quality Index',
      source_url: 'https://www.data.gov.in/catalog/real-time-air-quality-index',
      retrieved_at: matched[0]?.retrieved_at || new Date().toISOString(),
      data_freshness: matched[0]?.data_freshness || 'recent_observation',
      integrity_disclaimer: 'Physical air quality measurements represent regional ambient atmosphere and dispersion conditions. They are preserved separately from citizen complaints and do not constitute automatic legal proof of a specific local violation.',
    },
  });
});

// Issues endpoints
apiRouter.get('/issues', (req: Request, res: Response) => {
  let issues = db.getIssues();
  const { category, priority, search, issue_type } = req.query;

  if (category && typeof category === 'string' && category !== 'All') {
    issues = issues.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }

  if (priority && typeof priority === 'string' && priority !== 'All') {
    issues = issues.filter((i) => i.priority.toLowerCase() === priority.toLowerCase());
  }

  if (issue_type && typeof issue_type === 'string' && issue_type !== 'All') {
    issues = issues.filter((i) => i.issue_type === issue_type);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    issues = issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location_text.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }

  res.json({ issues, total: issues.length });
});

apiRouter.get('/issues/:id', (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Civic issue not found' });
  }

  const actionPlan = db.getActionPlan(issue.id);
  res.json({ issue, actionPlan });
});

apiRouter.post('/issues/:id/action-plan', async (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Civic issue not found' });
  }

  try {
    const plan = await generateActionPlanForIssue(issue);
    res.json({ success: true, plan });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate action plan' });
  }
});

// RAG Q&A endpoint
apiRouter.post('/rag/query', async (req: Request, res: Response) => {
  const { query, issue_id } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query text is required' });
  }

  try {
    const ragResponse = await executeRagQuery(query.trim(), issue_id);
    res.json(ragResponse);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'RAG query execution failed' });
  }
});

// Stakeholders endpoint
apiRouter.get('/stakeholders', (req: Request, res: Response) => {
  res.json({
    stakeholders: db.getStakeholders(),
    total: db.getStakeholders().length,
  });
});

// Collaboration requests endpoints
apiRouter.get('/collaboration', (req: Request, res: Response) => {
  const requests = db.getCollaborationRequests();
  res.json({ requests, total: requests.length });
});

apiRouter.post('/collaboration', (req: Request, res: Response) => {
  const {
    issue_id,
    issue_title,
    stakeholder_id,
    stakeholder_name,
    requester_name,
    requester_email,
    organization,
    assistance_type,
    message,
  } = req.body;

  if (!issue_id || !requester_name || !requester_email || !assistance_type || !message) {
    return res.status(400).json({
      error: 'Missing required fields: issue_id, requester_name, requester_email, assistance_type, and message are required.',
    });
  }

  // Email format check
  if (!requester_email.includes('@') || !requester_email.includes('.')) {
    return res.status(400).json({ error: 'Invalid email address provided.' });
  }

  const newRequest: CollaborationRequest = {
    id: `collab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    issue_id,
    issue_title: issue_title || 'Documented Civic Concern',
    stakeholder_id,
    stakeholder_name,
    requester_name: requester_name.trim(),
    requester_email: requester_email.trim(),
    organization: organization ? organization.trim() : undefined,
    assistance_type,
    message: message.trim(),
    status: 'received',
    created_at: new Date().toISOString(),
  };

  db.addCollaborationRequest(newRequest);

  res.status(201).json({
    success: true,
    message: 'Collaboration request submitted and persisted successfully.',
    request: newRequest,
  });
});

// Citizen Reports endpoints (secondary feature)
apiRouter.get('/citizen-reports', (req: Request, res: Response) => {
  const reports = db.getCitizenReports();
  res.json({ reports, total: reports.length });
});

apiRouter.post('/citizen-reports', (req: Request, res: Response) => {
  const { title, description, category, location_text, ward, city, latitude, longitude, photo_reference } =
    req.body;

  if (!title || !description || !category || !location_text) {
    return res.status(400).json({
      error: 'Missing required report fields: title, description, category, and location_text are required.',
    });
  }

  const newReport: CitizenReport = {
    id: `cit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: title.trim(),
    description: description.trim(),
    category,
    location_text: location_text.trim(),
    ward: ward ? ward.trim() : undefined,
    city: city || 'Mumbai',
    latitude: latitude ? parseFloat(latitude) : undefined,
    longitude: longitude ? parseFloat(longitude) : undefined,
    photo_reference,
    verification_status: 'pending_verification',
    created_at: new Date().toISOString(),
  };

  db.addCitizenReport(newReport);

  // Also create a civic issue item marked as 'citizen_report'
  const citizenIssue = {
    id: `KTV-CIT-${Date.now()}`,
    title: newReport.title,
    description: newReport.description,
    category: newReport.category,
    issue_type: 'citizen_report' as const,
    location_text: newReport.location_text,
    ward: newReport.ward,
    city: newReport.city,
    latitude: newReport.latitude,
    longitude: newReport.longitude,
    priority: 'Needs More Evidence' as const,
    priority_reason: 'Citizen-submitted report awaiting municipal or community ground verification.',
    verification_status: 'pending_verification' as const,
    publication_date: 'Submitted Today',
    retrieved_at: new Date().toISOString(),
    created_at: newReport.created_at,
    updated_at: newReport.created_at,
    source_platform: 'Kartavya Citizen Geo-Tag Feed',
    source_dataset_title: 'Citizen Incident Grievance Portal',
    source_dataset_url: '#',
    source_resource_url: '#',
    publisher: 'Citizen Reporter',
    assigned_authority: 'Ward Assistant Municipal Commissioner',
    status: 'Citizen Action Active' as const,
    evidence: [],
    uncertainties: ['Awaiting municipal inspection or peer verification.'],
  };

  db.addIssue(citizenIssue);

  res.status(201).json({
    success: true,
    message: 'Citizen civic issue report recorded successfully.',
    report: newReport,
    issue: citizenIssue,
  });
});

// Civic Events endpoints
apiRouter.get('/events', (req: Request, res: Response) => {
  const { category, status, issue_id, location, search } = req.query;
  const events = db.getEvents({
    category: category as string,
    status: status as string,
    issue_id: issue_id as string,
    location: location as string,
    search: search as string,
  });
  res.json({ events, total: events.length });
});

apiRouter.get('/events/:id', (req: Request, res: Response) => {
  const event = db.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Civic event not found' });
  }

  // Find related issues
  const relatedIssues = event.related_issue_ids
    .map((id) => db.getIssueById(id))
    .filter(Boolean);

  const registrations = db.getRegistrations(event.id);
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;

  res.json({
    event,
    relatedIssues,
    registrationsCount: confirmedCount,
    availableSlots: Math.max(0, event.max_volunteers - confirmedCount),
  });
});

apiRouter.post('/events', (req: Request, res: Response) => {
  const {
    title,
    description,
    category,
    related_issue_ids,
    activity_type,
    date,
    start_time,
    duration_hours,
    location_name,
    meeting_point,
    ward,
    city,
    participation_instructions,
    required_skills_or_tasks,
    equipment_provided,
    equipment_needed_from_volunteer,
    organizer_name,
    organizer_organization,
    organizer_contact,
    organizer_type,
    max_volunteers,
    registration_deadline,
    status,
    image_url,
  } = req.body;

  if (
    !title ||
    !description ||
    !category ||
    !date ||
    !start_time ||
    !location_name ||
    !organizer_name ||
    !organizer_organization ||
    !max_volunteers
  ) {
    return res.status(400).json({
      error: 'Missing required event fields: title, description, category, date, start_time, location_name, organizer_name, organizer_organization, and max_volunteers are required.',
    });
  }

  const slugBase = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const slug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newEvent: CivicEvent = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: title.trim(),
    description: description.trim(),
    category,
    related_issue_ids: Array.isArray(related_issue_ids) ? related_issue_ids : [],
    activity_type: activity_type ? activity_type.trim() : 'Civic Action Drive',
    date,
    start_time,
    duration_hours: Number(duration_hours) || 3,
    location_name: location_name.trim(),
    meeting_point: meeting_point ? meeting_point.trim() : location_name.trim(),
    ward: ward ? ward.trim() : undefined,
    city: city ? city.trim() : 'Mumbai',
    participation_instructions: participation_instructions
      ? participation_instructions.trim()
      : 'Please arrive 10 minutes before the scheduled start time.',
    required_skills_or_tasks: Array.isArray(required_skills_or_tasks)
      ? required_skills_or_tasks
      : ['General Community Participation'],
    equipment_provided: Array.isArray(equipment_provided) ? equipment_provided : [],
    equipment_needed_from_volunteer: Array.isArray(equipment_needed_from_volunteer)
      ? equipment_needed_from_volunteer
      : [],
    organizer_name: organizer_name.trim(),
    organizer_organization: organizer_organization.trim(),
    organizer_contact: organizer_contact ? organizer_contact.trim() : '',
    organizer_type: organizer_type || 'Community Group',
    max_volunteers: Number(max_volunteers) || 25,
    registered_volunteers_count: 0,
    registration_deadline: registration_deadline || date,
    status: status || 'Open for Registration',
    shareable_slug: slug,
    image_url,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.createEvent(newEvent);

  res.status(201).json({
    success: true,
    message: 'Civic action event created and published successfully.',
    event: newEvent,
  });
});

apiRouter.patch('/events/:id', (req: Request, res: Response) => {
  const updated = db.updateEvent(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ success: true, event: updated });
});

apiRouter.post('/events/:id/register', (req: Request, res: Response) => {
  const event = db.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.status === 'Full') {
    return res.status(400).json({ error: 'This event has reached maximum volunteer capacity.' });
  }

  if (event.status === 'Cancelled' || event.status === 'Completed') {
    return res.status(400).json({ error: `Event is no longer accepting registrations (Status: ${event.status}).` });
  }

  // Check deadline
  if (event.registration_deadline) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > event.registration_deadline) {
      return res.status(400).json({ error: 'The registration deadline for this event has passed.' });
    }
  }

  const { volunteer_name, volunteer_email, phone, skills_or_interests, emergency_contact } = req.body;
  if (!volunteer_name || !volunteer_email) {
    return res.status(400).json({ error: 'Volunteer name and email are required.' });
  }

  // Prevent duplicate registration for the same event and email
  const existingRegs = db.getRegistrations(event.id);
  const duplicate = existingRegs.find(
    (r) => r.volunteer_email.toLowerCase() === volunteer_email.toLowerCase() && r.status === 'confirmed'
  );
  if (duplicate) {
    return res.status(400).json({
      error: 'You are already registered for this event with this email address.',
      registration: duplicate,
    });
  }

  // Check capacity again
  const confirmedCount = existingRegs.filter((r) => r.status === 'confirmed').length;
  if (confirmedCount >= event.max_volunteers) {
    event.status = 'Full';
    db.updateEvent(event.id, { status: 'Full' });
    return res.status(400).json({ error: 'Event has just reached full capacity.' });
  }

  const newReg: EventRegistration = {
    id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    event_id: event.id,
    volunteer_name: volunteer_name.trim(),
    volunteer_email: volunteer_email.trim(),
    phone: phone ? phone.trim() : undefined,
    skills_or_interests: skills_or_interests ? skills_or_interests.trim() : undefined,
    emergency_contact: emergency_contact ? emergency_contact.trim() : undefined,
    status: 'confirmed',
    registered_at: new Date().toISOString(),
  };

  db.createRegistration(newReg);

  res.status(201).json({
    success: true,
    message: 'Volunteer registration confirmed successfully.',
    registration: newReg,
    event: db.getEventById(event.id),
  });
});

apiRouter.delete('/events/:id/register/:registrationId', (req: Request, res: Response) => {
  const cancelled = db.cancelRegistration(req.params.registrationId);
  if (!cancelled) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  res.json({
    success: true,
    message: 'Volunteer registration cancelled successfully.',
    event: db.getEventById(req.params.id),
  });
});

apiRouter.get('/events/:id/registrations', (req: Request, res: Response) => {
  const event = db.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  const registrations = db.getRegistrations(event.id);
  res.json({
    event_id: event.id,
    event_title: event.title,
    registrations,
    total: registrations.length,
    confirmed: registrations.filter((r) => r.status === 'confirmed').length,
  });
});

// All registrations endpoint (with email and event filter)
apiRouter.get('/registrations', (req: Request, res: Response) => {
  const { email, event_id } = req.query;
  let registrations = db.getRegistrations(event_id as string | undefined);
  if (email && typeof email === 'string') {
    registrations = registrations.filter(
      (r) => r.volunteer_email.toLowerCase() === email.toLowerCase().trim()
    );
  }
  // Enrich with event metadata for convenience
  const enriched = registrations.map((r) => {
    const event = db.getEventById(r.event_id);
    return {
      ...r,
      event_title: event?.title || 'Civic Event',
      event_category: event?.category,
      event_date: event?.date,
      event_time: event?.start_time,
      event_location: event?.location_name,
      event_status: event?.status,
      event_slug: event?.shareable_slug,
    };
  });
  res.json({ registrations: enriched, total: enriched.length });
});

apiRouter.delete('/registrations/:id', (req: Request, res: Response) => {
  const cancelled = db.cancelRegistration(req.params.id);
  if (!cancelled) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  res.json({
    success: true,
    message: 'Volunteer registration cancelled successfully.',
  });
});

// AI-Assisted Event Recommendation Endpoint
apiRouter.post('/events/ai-recommend', async (req: Request, res: Response) => {
  const { issue_id } = req.body;
  const issue = issue_id ? db.getIssueById(issue_id) : undefined;
  if (!issue) {
    return res.status(400).json({ error: 'Valid issue_id required for recommendation' });
  }

  if (isGeminiConfigured()) {
    try {
      const prompt = `Recommend a suitable civic action / volunteer event for this documented civic issue:
ISSUE: ${issue.title}
CATEGORY: ${issue.category}
LOCATION: ${issue.location_text} (Ward: ${issue.ward || 'General'})
DESCRIPTION: ${issue.description}
PRIORITY: ${issue.priority}

Return a valid JSON object matching:
{
  "recommended_activity": "Specific title and nature of the proposed community event",
  "rationale": "Clear reason why this civic activity is appropriate for this issue",
  "suggested_tasks": ["task 1 for volunteers", "task 2", "task 3"],
  "equipment_needed": ["tool or equipment 1", "tool 2"],
  "safety_precautions": ["precaution 1", "precaution 2"],
  "suitability_score": "High" | "Medium" | "Authority Escalation Recommended"
}`;

      const recommendation = await generateGeminiJson<EventRecommendation>(
        prompt,
        'You are an expert community organizer and municipal volunteer coordinator. Propose practical, safe, lawful volunteer civic activities.'
      );
      return res.json({ success: true, recommendation });
    } catch (e) {
      console.warn('[AI Event Recommend] Gemini call failed, returning grounded heuristic:', e);
    }
  }

  // Fallback heuristic recommendation
  const fallbackRec: EventRecommendation = {
    recommended_activity:
      issue.category === 'Water Supply'
        ? 'Community Tap Pressure & Potability Sampling Walk'
        : issue.category === 'Solid Waste Management'
        ? 'Neighborhood Door-to-Door Waste Segregation Audit & Composting Workshop'
        : issue.category === 'Public Sanitation & Toilets'
        ? 'Public Convenience Facility Amenities & Safety Inspection'
        : issue.category === 'Air Quality & Pollution'
        ? 'Citizen Low-Cost Particulate Sensor Deployment & Greening Drive'
        : 'Community Nallah Bank Cleanup & Waterway Inspection',
    rationale: `Direct community data gathering and awareness provides ground telemetry to hold the responsible body (${issue.assigned_authority || 'BMC'}) accountable.`,
    suggested_tasks: [
      'Document geotagged photo evidence using standardized checklist',
      'Conduct 10-minute resident survey on service regularity',
      'Distribute civic information flyers on municipal SLA standards',
    ],
    equipment_needed: ['Survey Clipboards', 'Mobile GPS Logger', 'Protective Gloves/Vests'],
    safety_precautions: [
      'Wear closed-toe footwear and high-visibility vest',
      'Do not enter deep storm culverts or hazardous electrical installations without municipal supervision',
    ],
    suitability_score: issue.priority === 'Critical' ? 'Medium' : 'High',
  };

  res.json({ success: true, recommendation: fallbackRec });
});

// Live Domain Web Scraping & Gemini Summarizer endpoint
apiRouter.post('/live-domain-search', async (req: Request, res: Response) => {
  const { domain, query } = req.body;
  if (!domain || !query) {
    return res.status(400).json({ error: 'Domain and query are required' });
  }

  try {
    const issues = db.getIssues().filter((i) => domain === 'All Domains' || domain === 'All' || i.category.toLowerCase().includes(domain.toLowerCase()));
    const airQuality = db.getAirQualityReadings();

    let scrapedDataContext = `Domain: ${domain}\nUser Query: ${query}\n`;
    if (domain.toLowerCase().includes('air') || domain.toLowerCase().includes('pollution')) {
      scrapedDataContext += `CPCB CAAQMS Telemetry Stations (${airQuality.length} stations available):\n` +
        airQuality.slice(0, 6).map((s) => `- ${s.station_name} (${s.ward}): AQI ${s.aqi} (${s.aqi_category}), PM2.5=${s.pollutants.pm25?.value} µg/m³, PM10=${s.pollutants.pm10?.value} µg/m³`).join('\n');
    } else {
      scrapedDataContext += `Related Discovered Issues (${issues.length} records found in municipal audit):\n` +
        issues.slice(0, 6).map((i) => `- [${i.id}] ${i.title} (${i.location_text}, Priority: ${i.priority}): ${i.description}`).join('\n');
    }

    const prompt = `You are Kartavya's live civic intelligence data summarizer. A user searched for "${query}" within the official civic domain "${domain}".
Based on the scraped government and municipal data below, provide:
1. Executive Summary & Problem Analysis
2. Key Findings & Statistics from official records
3. Responsible Municipal Authority
4. Actionable Community Recommendations

Data Center Source: OpenCity India (Praja May 2025 Audit) & CPCB via OGD Platform.
Raw Data Retrieved:
${scrapedDataContext}

Format your response cleanly in markdown.`;

    const searchResult = await generateGeminiWithSearch(
      prompt,
      'You are an objective civic intelligence analyst for Kartavya. Use googleSearch to ground your analysis in up-to-date official public data.',
      `Live Data Center Summary for "${query}" in Domain "${domain}":\n\nOfficial records from municipal audit and CPCB telemetry indicate active monitoring in this sector. Key issues involve statutory compliance shortfalls and monitoring gaps. Recommended actions include coordinating with local stakeholders and filing formal inquiry dockets.`
    );

    res.json({
      success: true,
      domain,
      query,
      summary: searchResult.text,
      search_grounding: searchResult.searchMetadata || null,
      records_analyzed: issues.length + airQuality.length,
      source_attribution: {
        source_name: domain.toLowerCase().includes('air') ? 'Central Pollution Control Board (CPCB) via OGD Platform' : 'OpenCity India (Praja Foundation)',
        dataset_title: domain.toLowerCase().includes('air') ? 'Real Time Air Quality Index' : 'Report on the Status of Civic Issues in Mumbai - May 2025',
        retrieved_at: new Date().toISOString(),
        freshness: 'live_scraped_observation',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Live domain search failed' });
  }
});

// Dashboard stats endpoint (strictly derived from stored data)
apiRouter.get('/stats', (req: Request, res: Response) => {
  const issues = db.getIssues();
  const runs = db.getIngestionRuns();
  const chunks = db.getDocumentChunks();
  const collabs = db.getCollaborationRequests();
  const citizenReports = db.getCitizenReports();

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const iss of issues) {
    byCategory[iss.category] = (byCategory[iss.category] || 0) + 1;
    byPriority[iss.priority] = (byPriority[iss.priority] || 0) + 1;
  }

  const lastSuccessful = runs.find((r) => r.status === 'success');

  res.json({
    total_issues: issues.length,
    documented_issues: issues.filter((i) => i.issue_type === 'documented_civic_concern').length,
    citizen_reports: citizenReports.length,
    total_collaboration_requests: collabs.length,
    total_events: db.getEvents().length,
    total_volunteer_registrations: db.getRegistrations().filter((r) => r.status === 'confirmed').length,
    indexed_rag_chunks: chunks.length,
    ingestion_runs_count: runs.length,
    last_ingestion_time: lastSuccessful ? lastSuccessful.completed_at : null,
    source_platform: 'OpenCity India',
    primary_dataset: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    secondary_dataset: 'Real Time Air Quality Index (CPCB via OGD India)',
    total_air_quality_stations: db.getAirQualityReadings().length,
    data_sources_count: 2,
    by_category: byCategory,
    by_priority: byPriority,
  });
});

// Volunteer Opportunities Discovery Endpoint (GET Mode A & Mode B Refresh)
apiRouter.get('/volunteer-opportunities', async (req: Request, res: Response) => {
  const { refresh, domain, location, limit } = req.query;

  // Mode B: Refresh opportunities pipeline
  if (refresh === 'true' || refresh === '1') {
    try {
      const result = await runVolunteerOpportunitiesRefresh();
      return res.json({
        mode: 'refresh',
        message: 'Successfully executed 4-source connector retrieval, web scraping, and Gemini AI analysis pipeline.',
        ...result,
        success: true,
        opportunities: db.getVolunteerOpportunities({
          domain: domain as string,
          location: location as string,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        }),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        mode: 'refresh',
        error: err?.message || 'Volunteer opportunities refresh failed',
        opportunities: db.getVolunteerOpportunities(),
      });
    }
  }

  // Mode A: Fetch existing opportunities
  try {
    let opportunities = db.getVolunteerOpportunities({
      domain: domain as string,
      location: location as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    // Exclude expired or cancelled items by default
    const today = new Date().toISOString().slice(0, 10);
    opportunities = opportunities.filter((o) => {
      if (o.registrationStatus === 'closed') return false;
      if (o.expiresAt && o.expiresAt < today) return false;
      return true;
    });

    res.json({
      success: true,
      mode: 'fetch',
      total: opportunities.length,
      opportunities,
      source_connectors: [
        { name: 'OpenCity India', url: 'https://data.opencity.in/', status: 'active' },
        { name: 'Government of India OGD / CPCB', url: 'https://www.data.gov.in/catalog/real-time-air-quality-index', status: 'active' },
        { name: 'NGO Darpan', url: 'https://ngodarpan.gov.in/', status: 'active' },
        { name: 'MY Bharat', url: 'https://mybharat.gov.in/', status: 'active' },
      ],
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to retrieve volunteer opportunities',
    });
  }
});

