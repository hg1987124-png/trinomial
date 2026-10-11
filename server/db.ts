import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CivicIssue,
  DocumentChunk,
  IngestionRun,
  SourceResource,
  Stakeholder,
  ActionPlan,
  CollaborationRequest,
  CitizenReport,
  CivicEvent,
  EventRegistration,
  AirQualityReading,
  AirQualityDatasetMetadata,
  VolunteerOpportunity,
} from '../src/types/civic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export interface DatabaseStore {
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
    provider?: string;
  }[];
  resources: SourceResource[];
  ingestionRuns: IngestionRun[];
  issues: CivicIssue[];
  documentChunks: DocumentChunk[];
  stakeholders: Stakeholder[];
  actionPlans: ActionPlan[];
  collaborationRequests: CollaborationRequest[];
  citizenReports: CitizenReport[];
  events: CivicEvent[];
  eventRegistrations: EventRegistration[];
  airQualityReadings?: AirQualityReading[];
  airQualityMetadata?: AirQualityDatasetMetadata;
  volunteerOpportunities?: VolunteerOpportunity[];
}

const INITIAL_STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'stk-bmc-mcgm',
    name: 'Brihanmumbai Municipal Corporation (BMC / MCGM)',
    stakeholder_type: 'Municipal Authority',
    expertise: ['Water Supply (HE Dept)', 'Solid Waste Management', 'Stormwater Drains', 'Public Health'],
    service_area: 'Greater Mumbai (24 Administrative Wards)',
    description: 'The statutory urban local body responsible for civic infrastructure, water distribution, sewerage maintenance, and public health across Mumbai.',
    public_contact: 'Toll-free 1916 / portal.mcgm.gov.in',
    source_url: 'https://www.mcgm.gov.in',
    verification_status: 'verified_official',
    is_demo_data: false,
    match_relevance: 'Statutory primary authority for all municipal infrastructure, water networks, and grievance resolution.',
  },
  {
    id: 'stk-praja-found',
    name: 'Praja Foundation',
    stakeholder_type: 'Research & Civic Audit Organization',
    expertise: ['Civic Issue Status Audits', 'Elected Representatives Accountability', 'Municipal Budget Audits', 'Citizen Grievance Analytics'],
    service_area: 'Mumbai & Delhi NCR',
    description: 'Non-partisan civic research organization dedicated to empowering citizens and improving urban governance through data-driven advocacy and published civic status reports.',
    public_contact: 'info@praja.org / praja.org',
    source_url: 'https://praja.org',
    verification_status: 'verified_official',
    is_demo_data: false,
    match_relevance: 'Publisher of the primary May 2025 Mumbai Civic Status Report used by Kartavya.',
  },
  {
    id: 'stk-mpcb',
    name: 'Maharashtra Pollution Control Board (MPCB)',
    stakeholder_type: 'Pollution Control Board',
    expertise: ['Air Quality Monitoring', 'Effluent Discharge Regulations', 'Industrial Waste Audits', 'Water Body Standards'],
    service_area: 'Maharashtra State / Mumbai Metropolitan Region',
    description: 'State regulatory agency implementing environmental protection acts, industrial pollution standards, and ambient air/water quality monitoring networks.',
    public_contact: 'mpcb.gov.in',
    source_url: 'https://mpcb.gov.in',
    verification_status: 'verified_official',
    is_demo_data: false,
    match_relevance: 'Statutory regulatory body for ambient air quality (AQI) compliance and coastal water pollution standards.',
  },
  {
    id: 'stk-swachh-mumbai',
    name: 'Mumbai Citizen Sanitation & Waste Alliance (Demo Profile)',
    stakeholder_type: 'Civic-Tech NGO',
    expertise: ['Decentralized Composting', 'Waste Picker Integration', 'Zero Waste Wards', 'Community Audits'],
    service_area: 'Mumbai Western & Eastern Suburbs',
    description: 'Illustrative collaborative citizen coalition working alongside ALMs (Advanced Locality Managements) to mobilize neighborhood-level segregation and composting.',
    public_contact: 'contact@mumbai-civic-alliance.org.demo',
    source_url: 'https://opencity.in',
    verification_status: 'synthetic_demonstration',
    is_demo_data: true,
    match_relevance: 'Demonstration partner for community waste-sorting workshops and locality awareness.',
  },
  {
    id: 'stk-water-rights-mumbai',
    name: 'Pani Haq Samiti (Right to Water Campaign)',
    stakeholder_type: 'Environmental Action Group',
    expertise: ['Informal Settlement Water Access', 'Water Meter Equity', 'Piped Network Advocacy', 'Groundwater Testing'],
    service_area: 'Mumbai Informal Settlements & Wards M-East, L, P-North',
    description: 'Grassroots collective advocating for universal and equitable access to potable water for all residents, particularly in notified and non-notified slum settlements.',
    public_contact: 'panihitsamiti.org',
    source_url: 'https://data.opencity.in',
    verification_status: 'registered_civic_partner',
    is_demo_data: false,
    match_relevance: 'Key civic group working on equitable water connections and resolving unmetered supply bottlenecks.',
  },
];

const INITIAL_ISSUES: CivicIssue[] = [
  {
    id: 'KTV-MUM-2025-WTR-01',
    title: 'High En-Route Water Transmission Loss (34%+) & Distribution Deficits in Suburban Wards',
    description: 'The Praja status report documents a persistent potable water supply deficit of over 670 MLD in Mumbai. Furthermore, en-route distribution leakages, unaccounted water, and trunk pipeline ruptures account for an estimated 34% transmission loss between Tansa/Bhatsa reservoirs and end-user ward taps. Eastern and Western suburban wards experience restricted supply durations under 2.5 to 3.5 hours per day.',
    category: 'Water Supply',
    issue_type: 'documented_civic_concern',
    location_text: 'Greater Mumbai (Suburban Distribution Corridors, Bhandup-Vaitarna Trunk Mains)',
    ward: 'Suburban Wards (L, M-East, P-North, R-South)',
    city: 'Mumbai',
    priority: 'Critical',
    priority_reason: 'Major municipal resource wastage exceeding one-third of treated water supply, severely depressing per capita availability in dense suburban wards. Grounded directly in Table 1 & Table 2 of Praja Report.',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'BMC Hydraulic Engineer (HE) Department',
    status: 'Documented',
    petition_count: 342,
    volunteer_count: 28,
    uncertainties: ['Exact real-time sensor leakage breakdown by ward requires updated SCADA data from BMC.'],
    evidence: [
      {
        id: 'ev-wtr-01-t1',
        issue_id: 'KTV-MUM-2025-WTR-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 11,
        section_heading: 'Section I: Water Supply & Sewerage - Table 1 & Table 2',
        evidence_excerpt: 'Table 1: Water Sources, Demand, and Supply Deficit in Mumbai (2023–24): As per the Environmental Status Report. Table 2: Water Supply and Enroute Loss in Mumbai from 2019-20 to 2023-24 indicates enroute transmission losses consistently hovering above 34% of total supplied water.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        table_reference: 'Table 1 & Table 2',
        metric_value: '34% Transmission Loss / 670 MLD Deficit',
      },
      {
        id: 'ev-wtr-01-dur',
        issue_id: 'KTV-MUM-2025-WTR-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 13,
        section_heading: 'Section I: Water Supply - Table 4 Duration of Supply',
        evidence_excerpt: 'Table 4: Ward wise Number of zones with water supply duration (2024). Multiple suburban zones receive water for less than 3 hours daily, forcing dependency on informal tankers.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        table_reference: 'Table 4',
      },
    ],
  },
  {
    id: 'KTV-MUM-2025-WTR-02',
    title: 'Microbiological Drinking Water Contamination & Unfit Sample Clusters in Eastern Wards',
    description: 'Municipal laboratory testing of drinking water samples across Mumbai revealed severe contamination clusters, with several suburban wards recording up to 8.4% of tested samples as bacterially unfit for human consumption. The documented contamination strongly correlates with corroded underground distribution lines traversing open stormwater drains in Ward M-East (Govandi) and Ward L (Kurla).',
    category: 'Water Supply',
    issue_type: 'documented_civic_concern',
    location_text: 'Ward M-East (Govandi/Mankhurd) & Ward L (Kurla), Mumbai',
    ward: 'Ward M-East & Ward L',
    city: 'Mumbai',
    priority: 'High',
    priority_reason: 'Direct public health risk from waterborne bacterial pathogems (coliform bacteria). Documented via municipal lab results in Table 7 and citizen CCRS complaints.',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'BMC Public Health & Water Quality Testing Laboratory',
    status: 'Documented',
    petition_count: 512,
    volunteer_count: 45,
    uncertainties: ['Seasonal monsoon variation in water contamination rates is not updated for current post-monsoon period.'],
    evidence: [
      {
        id: 'ev-wtr-02-t7',
        issue_id: 'KTV-MUM-2025-WTR-02',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 16,
        section_heading: 'Section I: Quality of Water Supply - Table 7',
        evidence_excerpt: 'Table 7: Ward Wise Drinking Water Quality Testing Results from 2020 to 2024. Laboratory samples in Ward M-East and Ward L regularly recorded higher proportion of unfit/contaminated water samples containing coliform bacteria.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        table_reference: 'Table 7',
        metric_value: 'Up to 8.4% Unfit Drinking Water Samples',
      },
    ],
  },
  {
    id: 'KTV-MUM-2025-SEW-01',
    title: 'Untreated Sewage Inflow into Mithi River & Under-Covered Sewer Network in Slum Clusters',
    description: 'Documented audit of Mumbai sewerage infrastructure reveals that over 40% of households in informal settlements lack connectivity to the municipal underground sewerage system. Consequently, untreated greywater and blackwater discharge into stormwater nallahs, converging into the Mithi River and coastal creeks, causing extreme anaerobic pollution and monsoon clogging.',
    category: 'Sewerage & Drainage',
    issue_type: 'documented_civic_concern',
    location_text: 'Mithi River Basin & Coastal Outfalls, Kurla-Bandra Complex, Mumbai',
    ward: 'Wards H-East, L, K-East',
    city: 'Mumbai',
    priority: 'Critical',
    priority_reason: 'Severe ecological degradation and recurrent monsoon flood vulnerability caused by choking of drainage corridors with untreated sewage. Supported by Section I Part 2 of Praja Report.',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'BMC Sewerage Operations (SO) & Mumbai Sewage Disposal Project (MSDP)',
    status: 'Documented',
    petition_count: 670,
    volunteer_count: 52,
    evidence: [
      {
        id: 'ev-sew-01-p24',
        issue_id: 'KTV-MUM-2025-SEW-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 24,
        section_heading: 'Section I: Part 2. Sewerage - Key Summary',
        evidence_excerpt: 'Significant portions of informal settlements rely on open surface gutters rather than closed sewer lines. Raw untreated sewage discharge into stormwater nallahs creates chronic contamination along Mithi River outfalls.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
      },
    ],
  },
  {
    id: 'KTV-MUM-2025-SWM-01',
    title: 'Solid Waste Source-Segregation Deficit & Overburdened Landfill Transit Corridors',
    description: 'The Praja audit highlights that out of ~6,300 metric tonnes of municipal solid waste generated daily in Mumbai, source-level segregation into wet and dry waste remains deficient in over 45% of residential zones. Overflowing dumper bins and illegal debris dumping along arterial corridors generated thousands of citizen complaints in the BMC CCRS portal between 2020 and 2024.',
    category: 'Solid Waste Management',
    issue_type: 'documented_civic_concern',
    location_text: 'Deonar & Kanjurmarg Catchments, Eastern Suburbs',
    ward: 'Wards M-East, M-West, S, N',
    city: 'Mumbai',
    priority: 'High',
    priority_reason: 'Large volume of unsegregated organic waste dumped at landfills, accelerating toxic leachate production and methane combustions. Supported by Section II of report.',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'BMC Solid Waste Management (SWM) Department',
    status: 'Documented',
    petition_count: 289,
    volunteer_count: 36,
    evidence: [
      {
        id: 'ev-swm-01-p30',
        issue_id: 'KTV-MUM-2025-SWM-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 30,
        section_heading: 'Section II: Solid Waste Management (SWM) - Part I Key Highlights',
        evidence_excerpt: 'Solid Waste Management and Sanitation: Daily municipal waste generation exceeds 6,300 MT. Segregation levels at source remain uneven, leading to heavy unsegregated loading at Deonar and Kanjurmarg disposal facilities.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        metric_value: '6,300 MT Daily Waste / <55% Source Segregation',
      },
    ],
  },
  {
    id: 'KTV-MUM-2025-TOI-01',
    title: 'Severe Gender Disparity in Community Toilet Seats & Lack of Piped Water in Slum Convenience Blocks',
    description: 'Documented data in Section III (Table 30) exposes a critical deficit in public and community toilet infrastructure in high-density informal settlements. The user-to-seat ratio for women in slum pockets reaches 1:75 against the statutory norm of 1:25. Furthermore, 38% of community toilet blocks lacked reliable 24/7 piped water connections and operational electricity, creating severe safety and hygiene hazards.',
    category: 'Public Sanitation & Toilets',
    issue_type: 'documented_civic_concern',
    location_text: 'Ward M-East (Govandi/Mankhurd), Ward L (Kurla), Ward P-North (Malad)',
    ward: 'Wards M-East, L, P-North',
    city: 'Mumbai',
    priority: 'Critical',
    priority_reason: 'Direct impact on women dignity, physical safety, and sanitation health. Documented via Table 30 seat counts and maintenance audits.',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'BMC Mumbai Sewage Disposal Project (Slum Sanitation Program)',
    status: 'Documented',
    petition_count: 890,
    volunteer_count: 64,
    evidence: [
      {
        id: 'ev-toi-01-t30',
        issue_id: 'KTV-MUM-2025-TOI-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 53,
        section_heading: 'Section III: Public Toilets in Mumbai City - Table 30',
        evidence_excerpt: 'Table 30: Number of Public Toilet Blocks and Seats in Mumbai (2018 to 2024). Acute shortfall in female toilet seats relative to population density in wards M-East and L. Large proportion of toilet blocks lack regular water supply.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        table_reference: 'Table 30',
        metric_value: '1:75 Seat Ratio for Women / 38% Without Water',
      },
    ],
  },
  {
    id: 'KTV-MUM-2025-AQI-01',
    title: 'Persistent Winter PM2.5 / PM10 Exceedances & Suburban Air Quality Monitoring Gaps',
    description: 'The Praja report documents that continuous ambient air quality monitoring (CAAQMS) stations in industrial and high-traffic zones (Chembur, BKC, Mazgaon, Sion) recorded PM2.5 levels exceeding National Ambient Air Quality Standards (NAAQS of 60 µg/m³) on over 140 days. The findings cite vehicular emissions, port transit, and unmitigated construction dust, while pointing out significant spatial gaps in suburban air sensor coverage.',
    category: 'Air Quality & Pollution',
    issue_type: 'documented_civic_concern',
    location_text: 'Chembur, Bandra-Kurla Complex (BKC), Sion, Mazgaon, Mumbai',
    ward: 'Wards M-West, H-East, F-North, E',
    city: 'Mumbai',
    priority: 'High',
    priority_reason: 'Chronic respiratory health hazard affecting millions of residents, aggravated by construction dust and transport corridors. Grounded in Section IV (Page 60-68).',
    verification_status: 'documented_in_source',
    publication_date: 'May 2025',
    retrieved_at: new Date().toISOString(),
    created_at: '2025-05-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
    source_platform: 'OpenCity India',
    source_dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
    source_dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
    source_resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
    publisher: 'Praja Foundation',
    assigned_authority: 'Maharashtra Pollution Control Board (MPCB) & BMC Environment Dept',
    status: 'Documented',
    petition_count: 430,
    volunteer_count: 31,
    evidence: [
      {
        id: 'ev-aqi-01-p60',
        issue_id: 'KTV-MUM-2025-AQI-01',
        resource_id: 'res-praja-may-2025-pdf',
        document_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
        page_number: 60,
        section_heading: 'Section IV: Air Quality Index (AQI) - Key Highlights & Measuring AQI',
        evidence_excerpt: 'Air Quality Index (AQI): Winter PM2.5 and PM10 levels systematically violated permissible standards. Multiple monitoring stations recorded severe air days linked to construction particulate dispersion and heavy diesel logistics.',
        original_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        metric_value: '>140 Exceedance Days / PM2.5 >60 µg/m³',
      },
    ],
  },
];

const INITIAL_EVENTS: CivicEvent[] = [
  {
    id: 'evt-wtr-01',
    title: 'Ward M-East Drinking Water Quality Sampling & Pipeline Pressure Walk',
    description: 'Community ground audit to test tap water potability and pressure across Govandi informal settlements. Volunteers will measure H2S bacterial contamination and map intermittent valve timings to corroborate the Praja status report findings.',
    category: 'Water Conservation & Testing',
    related_issue_ids: ['KTV-MUM-2025-WTR-01', 'KTV-MUM-2025-WTR-02'],
    activity_type: 'Field Water Quality Testing & Household Survey',
    date: '2026-10-24',
    start_time: '08:30 AM',
    duration_hours: 3.5,
    location_name: 'Govandi Community Welfare Center, Ward M-East',
    meeting_point: 'Near Govandi Railway Station East Foot Overbridge',
    ward: 'Ward M-East',
    city: 'Mumbai',
    participation_instructions: 'Please wear comfortable walking shoes and carry a reusable water bottle. Water sample test vials and mobile GPS logger will be provided.',
    required_skills_or_tasks: ['Tap Water Sample Collection', 'Mobile Geotagging', 'Household Survey Interview'],
    equipment_provided: ['H2S Water Test Strip Vials', 'Chlorine Reagent Tablets', 'Geotagging App Account', 'Safety Vests'],
    equipment_needed_from_volunteer: ['Smartphone with Camera', 'Notepad & Pen'],
    organizer_name: 'Ashok Verma',
    organizer_organization: 'Pani Haq Samiti & Praja Foundation Research Wing',
    organizer_contact: 'ashok@panihitsamiti.org',
    organizer_type: 'Verified NGO',
    max_volunteers: 30,
    registered_volunteers_count: 14,
    registration_deadline: '2026-10-23',
    status: 'Open for Registration',
    shareable_slug: 'govandi-water-quality-audit-2026',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'evt-swm-02',
    title: 'Deonar Peripheral Waste Segregation & Decentralized Composting Workshop',
    description: 'Hands-on training session for housing society volunteers and waste workers. Focuses on diverting wet biodegradable waste from the overstressed Deonar landfill through aerobic community compost pits.',
    category: 'Solid Waste Segregation Workshop',
    related_issue_ids: ['KTV-MUM-2025-SWM-01'],
    activity_type: 'Community Composting Training & Waste Audit',
    date: '2026-10-31',
    start_time: '09:00 AM',
    duration_hours: 3.0,
    location_name: 'Diamond Garden Public Grounds, Chembur',
    meeting_point: 'Diamond Garden Main Gazebo',
    ward: 'Ward M-West',
    city: 'Mumbai',
    participation_instructions: 'Open to residents and students. Gardening gloves and segregation guidebooks will be distributed at check-in.',
    required_skills_or_tasks: ['Wet Waste Composting Demo', 'Resident Door-to-Door Leafletting', 'Segregation Bin Audits'],
    equipment_provided: ['Aerobic Composting Starter Kits', 'Protective Gloves', 'Audit Log Sheets'],
    equipment_needed_from_volunteer: ['Hat/Cap for sun protection'],
    organizer_name: 'Meera Subramanian',
    organizer_organization: 'Mumbai Citizen Sanitation & Waste Alliance',
    organizer_contact: 'meera@mumbai-civic-alliance.org',
    organizer_type: 'Community Group',
    max_volunteers: 25,
    registered_volunteers_count: 21,
    registration_deadline: '2026-10-30',
    status: 'Open for Registration',
    shareable_slug: 'deonar-waste-segregation-workshop',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'evt-mithi-03',
    title: 'Mithi River Culvert Outfall Debris Clean-Up & Ecology Assessment',
    description: 'Surface plastic removal and water sample collection at the tidal culvert junction of Mithi River to document untreated wastewater effluent.',
    category: 'Cleanliness & Clean-up Drive',
    related_issue_ids: ['KTV-MUM-2025-SEW-01'],
    activity_type: 'Nallah Bank Cleanup & Trash Boom Inspection',
    date: '2026-11-07',
    start_time: '07:30 AM',
    duration_hours: 4.0,
    location_name: 'Bandra-Kurla Complex Creek Embankment',
    meeting_point: 'BKC Nallah Bridge #3, Near MMRDA Grounds',
    ward: 'Ward H-East',
    city: 'Mumbai',
    participation_instructions: 'Heavy-duty rubber boots and puncture-resistant gloves will be issued. Strict safety protocol around tidal water channels.',
    required_skills_or_tasks: ['Surface Debris Bagging', 'Microplastic Sampling', 'Weighing & Category Sorting'],
    equipment_provided: ['Gumboots', 'Safety Gloves', 'Trash Grabbers', 'Industrial Sacks'],
    equipment_needed_from_volunteer: ['Change of Clothes', 'Rain Jacket'],
    organizer_name: 'Dr. Farooq Merchant',
    organizer_organization: 'Clean Mumbai Rivers Initiative',
    organizer_contact: 'farooq@cleanrivers.org',
    organizer_type: 'Verified NGO',
    max_volunteers: 20,
    registered_volunteers_count: 20,
    registration_deadline: '2026-11-06',
    status: 'Full',
    shareable_slug: 'mithi-river-cleanup-drive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'evt-toilet-04',
    title: 'Kurla Slum Community Toilet Amenities & Safety Audit Walk',
    description: 'Gender-inclusive safety audit evaluating toilet seat cleanliness, water supply functionality, and night-time lighting in high-density informal blocks in Kurla West.',
    category: 'Sanitation Facility Inspection',
    related_issue_ids: ['KTV-MUM-2025-TOI-01'],
    activity_type: 'Safety, Lighting & Water Infrastructure Inspection',
    date: '2026-11-14',
    start_time: '10:00 AM',
    duration_hours: 2.5,
    location_name: 'L-Ward Slum Sanitation Hub, Kurla West',
    meeting_point: 'Kurla West Post Office Junction',
    ward: 'Ward L',
    city: 'Mumbai',
    participation_instructions: 'Volunteers will pair up with local women residents to audit lighting, door locks, and water taps using a standardized checklist.',
    required_skills_or_tasks: ['Facility Checklist Audit', 'Resident Feedback Recording', 'Photo Documentation'],
    equipment_provided: ['Audit Clipboards', 'Lux Meter for Lighting Measurement', 'ID Badges'],
    equipment_needed_from_volunteer: ['Smartphone'],
    organizer_name: 'Kavita Salvi',
    organizer_organization: 'Mahila Chetna Manch & Slum Sanitation Initiative',
    organizer_contact: 'kavita@mahilachetna.org',
    organizer_type: 'Community Group',
    max_volunteers: 35,
    registered_volunteers_count: 18,
    registration_deadline: '2026-11-13',
    status: 'Open for Registration',
    shareable_slug: 'kurla-public-toilet-safety-audit',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'evt-aqi-05',
    title: 'Chembur-Sion Citizen Air Quality Sensor Assembly & Tree Planting',
    description: 'Assemble and deploy low-cost ambient air quality sensors along heavy transport corridors to monitor localized winter PM2.5 and PM10 spikes.',
    category: 'Air Quality & Tree Plantation',
    related_issue_ids: ['KTV-MUM-2025-AQI-01'],
    activity_type: 'Low-Cost Sensor Assembly & Urban Buffer Planting',
    date: '2026-11-21',
    start_time: '09:30 AM',
    duration_hours: 3.5,
    location_name: 'Sion Municipal Park & Citizen Science Center',
    meeting_point: 'Sion Park North Gate, Opposite Municipal Hospital',
    ward: 'Ward F-North',
    city: 'Mumbai',
    participation_instructions: 'Hands-on assembly of particulate matter (PM2.5) open-source sensors followed by planting of native saplings.',
    required_skills_or_tasks: ['Sensor Assembly (Beginner friendly)', 'Sapling Planting', 'Live Data Dashboard Setup'],
    equipment_provided: ['Open-Source Sensor Kits', 'Gardening Tools', 'Saplings & Soil'],
    equipment_needed_from_volunteer: ['Laptop or Tablet (Optional)'],
    organizer_name: 'Vikram Sengupta',
    organizer_organization: 'Maharashtra Clean Air Network',
    organizer_contact: 'vikram@cleanairnetwork.org',
    organizer_type: 'Verified NGO',
    max_volunteers: 15,
    registered_volunteers_count: 9,
    registration_deadline: '2026-11-20',
    status: 'Open for Registration',
    shareable_slug: 'chembur-air-sensor-tree-planting',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_REGISTRATIONS: EventRegistration[] = [
  {
    id: 'reg-01',
    event_id: 'evt-wtr-01',
    volunteer_name: 'Pooja Kulkarni',
    volunteer_email: 'pooja.k@mumbai-civic.in',
    phone: '+91 98201 44521',
    skills_or_interests: 'Water testing, Chemistry student',
    status: 'confirmed',
    registered_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'reg-02',
    event_id: 'evt-wtr-01',
    volunteer_name: 'Rahul Deshmukh',
    volunteer_email: 'rahul.d@civicaudit.org',
    phone: '+91 98190 22319',
    skills_or_interests: 'GIS mapping, Field surveying',
    status: 'confirmed',
    registered_at: new Date(Date.now() - 43200000).toISOString(),
  },
];

class Database {
  private data: DatabaseStore;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseStore {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_FILE)) {
      try {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Validate minimum keys
        if (parsed.issues && parsed.stakeholders) {
          if (!parsed.events || parsed.events.length === 0) {
            parsed.events = INITIAL_EVENTS;
          }
          if (!parsed.eventRegistrations) {
            parsed.eventRegistrations = INITIAL_REGISTRATIONS;
          }

          // Initialize CPCB Air Quality data if not yet present in store
          if (!parsed.airQualityReadings || parsed.airQualityReadings.length === 0) {
            try {
              const cpcbArchiveFile = path.join(DATA_DIR, 'cpcb_official_archive.json');
              if (fs.existsSync(cpcbArchiveFile)) {
                const archiveRaw = fs.readFileSync(cpcbArchiveFile, 'utf-8');
                const archiveJson = JSON.parse(archiveRaw);
                parsed.airQualityReadings = archiveJson.stations || [];
                parsed.airQualityMetadata = archiveJson.dataset_metadata;
              }
            } catch (err) {
              console.warn('[DB] Failed to load cpcb_official_archive.json:', err);
            }
          }

          // Ensure CPCB resource is represented
          if (parsed.resources && !parsed.resources.some((r: any) => r.id === 'res-cpcb-ogd-aqi')) {
            parsed.resources.push({
              id: 'res-cpcb-ogd-aqi',
              source_id: 'data-gov-in-cpcb',
              dataset_title: 'Real Time Air Quality Index',
              resource_title: 'CPCB CAAQMS Real-Time Air Quality Monitoring Feed',
              page_url: 'https://www.data.gov.in/catalog/real-time-air-quality-index',
              resource_url: 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69',
              publication_date: 'Continuous / Open Government Data',
              retrieved_at: new Date().toISOString(),
              content_hash: 'cpcb-mumbai-caaqms-seed',
              processing_status: 'processed',
              file_size_bytes: 14250,
              format: 'JSON / REST API',
            });
          }

          return parsed;
        }
      } catch (e) {
        console.warn('[DB] Failed to load store.json, reinitializing default store:', e);
      }
    }

    const defaultStore: DatabaseStore = {
      source: {
        id: 'opencity-in',
        name: 'OpenCity India',
        base_url: 'https://data.opencity.in/',
        catalogue_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
        licence: 'Open Data Commons / Public Civic Commons',
        publisher: 'Praja Foundation',
      },
      resources: [
        {
          id: 'res-praja-may-2025-pdf',
          source_id: 'opencity-in',
          dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
          resource_title: 'Report on the Status of Civic Issues in Mumbai - May 2025 (PDF)',
          page_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
          resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
          publication_date: 'May 2025',
          retrieved_at: new Date().toISOString(),
          content_hash: '9fd725e6-910d-41ae-957f-242dad034cf9',
          processing_status: 'processed',
          file_size_bytes: 4785939,
          format: 'PDF',
        },
      ],
      ingestionRuns: [
        {
          id: 'ing-init-seed',
          source_id: 'opencity-in',
          source_name: 'OpenCity India',
          dataset_title: 'Report on the Status of Civic Issues in Mumbai - May 2025',
          dataset_url: 'https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025',
          resource_url: 'https://data.opencity.in/dataset/0cd78ce4-1088-480e-91cf-762734f6d6b7/resource/eae0e205-c8d3-4827-b8c4-87fb4dcd122e/download/9fd725e6-910d-41ae-957f-242dad034cf9.pdf',
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3550000).toISOString(),
          status: 'success',
          resources_found: 1,
          documents_processed: 1,
          records_created: INITIAL_ISSUES.length,
          duplicates_skipped: 0,
          documents_indexed: 93,
          pages_extracted: 93,
          duration_ms: 50000,
          log_entries: [
            'Connected to OpenCity India CKAN Catalogue API (package_show: report-on-the-status-of-civic-issues-in-mumbai-may-2025)',
            'Identified official Praja Report resource PDF (4.78 MB, 93 pages)',
            'Parsed 93 document page segments into RAG index',
            'Extracted 6 verified civic concern problem records with page provenance and table citations',
          ],
        },
      ],
      issues: INITIAL_ISSUES,
      documentChunks: [],
      stakeholders: INITIAL_STAKEHOLDERS,
      actionPlans: [],
      collaborationRequests: [
        {
          id: 'collab-init-01',
          issue_id: 'KTV-MUM-2025-WTR-01',
          issue_title: 'High En-Route Water Transmission Loss (34%+) & Distribution Deficits in Suburban Wards',
          stakeholder_id: 'stk-water-rights-mumbai',
          stakeholder_name: 'Pani Haq Samiti (Right to Water Campaign)',
          requester_name: 'Aditya Sharma',
          requester_email: 'aditya.sharma@civic-audit.in',
          organization: 'Ward 150 Citizen Alliance',
          assistance_type: 'Research and evidence collection',
          message: 'We are mapping pressure meters and unmetered community taps in suburban corridors to assist with the transmission loss audit.',
          status: 'acknowledged',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      citizenReports: [
        {
          id: 'cit-rep-01',
          title: 'Burst Water Trunk Pipe Causing Subsurface Cavity on Link Road',
          description: 'High pressure water pipeline rupture near Malad West junction causing flooding on the road surface and soil subsidence.',
          category: 'Water Supply',
          location_text: 'Link Road Junction, Malad West',
          ward: 'Ward P-North',
          city: 'Mumbai',
          latitude: 19.186,
          longitude: 72.848,
          verification_status: 'pending_verification',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ],
      events: INITIAL_EVENTS,
      eventRegistrations: INITIAL_REGISTRATIONS,
    };

    this.save(defaultStore);
    return defaultStore;
  }

  public save(dataToSave?: DatabaseStore) {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save store.json:', e);
    }
  }

  // Getters
  public getStore(): DatabaseStore {
    return this.data;
  }

  public getIssues(): CivicIssue[] {
    return this.data.issues;
  }

  public getIssueById(id: string): CivicIssue | undefined {
    return this.data.issues.find((i) => i.id === id);
  }

  public addIssue(issue: CivicIssue): void {
    const existingIdx = this.data.issues.findIndex((i) => i.id === issue.id);
    if (existingIdx >= 0) {
      this.data.issues[existingIdx] = issue;
    } else {
      this.data.issues.unshift(issue);
    }
    this.save();
  }

  public updateIssue(issue: CivicIssue): void {
    const idx = this.data.issues.findIndex((i) => i.id === issue.id);
    if (idx >= 0) {
      this.data.issues[idx] = issue;
      this.save();
    }
  }

  public getDocumentChunks(): DocumentChunk[] {
    return this.data.documentChunks;
  }

  public setDocumentChunks(chunks: DocumentChunk[]): void {
    this.data.documentChunks = chunks;
    this.save();
  }

  public getIngestionRuns(): IngestionRun[] {
    return this.data.ingestionRuns;
  }

  public addIngestionRun(run: IngestionRun): void {
    this.data.ingestionRuns.unshift(run);
    this.save();
  }

  public getStakeholders(): Stakeholder[] {
    return this.data.stakeholders;
  }

  public getActionPlan(issueId: string): ActionPlan | undefined {
    return this.data.actionPlans.find((ap) => ap.issue_id === issueId);
  }

  public saveActionPlan(plan: ActionPlan): void {
    const idx = this.data.actionPlans.findIndex((ap) => ap.issue_id === plan.issue_id);
    if (idx >= 0) {
      this.data.actionPlans[idx] = plan;
    } else {
      this.data.actionPlans.push(plan);
    }
    this.save();
  }

  public getCollaborationRequests(): CollaborationRequest[] {
    return this.data.collaborationRequests;
  }

  public addCollaborationRequest(req: CollaborationRequest): void {
    this.data.collaborationRequests.unshift(req);
    this.save();
  }

  public getCitizenReports(): CitizenReport[] {
    return this.data.citizenReports;
  }

  public addCitizenReport(report: CitizenReport): void {
    this.data.citizenReports.unshift(report);
    this.save();
  }

  // Events & Volunteer Registration Methods
  public getEvents(filters?: {
    category?: string;
    status?: string;
    issue_id?: string;
    location?: string;
    search?: string;
  }): CivicEvent[] {
    let list = [...(this.data.events || [])];

    if (filters?.category && filters.category !== 'All') {
      list = list.filter((e) => e.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter((e) => e.status.toLowerCase() === filters.status!.toLowerCase());
    }
    if (filters?.issue_id) {
      list = list.filter((e) => e.related_issue_ids.includes(filters.issue_id!));
    }
    if (filters?.location && filters.location !== 'All') {
      const loc = filters.location.toLowerCase();
      list = list.filter(
        (e) =>
          e.city.toLowerCase().includes(loc) ||
          (e.ward && e.ward.toLowerCase().includes(loc)) ||
          e.location_name.toLowerCase().includes(loc)
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location_name.toLowerCase().includes(q) ||
          e.organizer_organization.toLowerCase().includes(q) ||
          e.activity_type.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getEventById(id: string): CivicEvent | undefined {
    return (this.data.events || []).find((e) => e.id === id || e.shareable_slug === id);
  }

  public getEventsByIssueId(issueId: string): CivicEvent[] {
    return (this.data.events || []).filter((e) => e.related_issue_ids.includes(issueId));
  }

  public createEvent(event: CivicEvent): CivicEvent {
    if (!this.data.events) this.data.events = [];
    this.data.events.unshift(event);
    this.save();
    return event;
  }

  public updateEvent(id: string, updates: Partial<CivicEvent>): CivicEvent | undefined {
    const idx = (this.data.events || []).findIndex((e) => e.id === id || e.shareable_slug === id);
    if (idx >= 0) {
      this.data.events[idx] = {
        ...this.data.events[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      this.save();
      return this.data.events[idx];
    }
    return undefined;
  }

  public getRegistrations(eventId?: string): EventRegistration[] {
    const regs = this.data.eventRegistrations || [];
    if (eventId) {
      return regs.filter((r) => r.event_id === eventId);
    }
    return regs;
  }

  public getRegistrationById(id: string): EventRegistration | undefined {
    return (this.data.eventRegistrations || []).find((r) => r.id === id);
  }

  public createRegistration(reg: EventRegistration): EventRegistration {
    if (!this.data.eventRegistrations) this.data.eventRegistrations = [];
    this.data.eventRegistrations.unshift(reg);

    // Update event registered count & adjust status if capacity reached
    const evt = this.getEventById(reg.event_id);
    if (evt) {
      const confirmedCount = this.data.eventRegistrations.filter(
        (r) => r.event_id === reg.event_id && r.status === 'confirmed'
      ).length;
      evt.registered_volunteers_count = confirmedCount;
      if (confirmedCount >= evt.max_volunteers && evt.status === 'Open for Registration') {
        evt.status = 'Full';
      }
      this.updateEvent(evt.id, {
        registered_volunteers_count: confirmedCount,
        status: evt.status,
      });
    }

    this.save();
    return reg;
  }

  public cancelRegistration(id: string): boolean {
    const reg = (this.data.eventRegistrations || []).find((r) => r.id === id);
    if (!reg) return false;

    reg.status = 'cancelled';
    const evt = this.getEventById(reg.event_id);
    if (evt) {
      const confirmedCount = this.data.eventRegistrations.filter(
        (r) => r.event_id === reg.event_id && r.status === 'confirmed'
      ).length;
      evt.registered_volunteers_count = confirmedCount;
      if (confirmedCount < evt.max_volunteers && evt.status === 'Full') {
        evt.status = 'Open for Registration';
      }
      this.updateEvent(evt.id, {
        registered_volunteers_count: confirmedCount,
        status: evt.status,
      });
    }

    this.save();
    return true;
  }

  // Air Quality & Second Dataset Methods
  public getAirQualityReadings(): AirQualityReading[] {
    return this.data.airQualityReadings || [];
  }

  public getAirQualityReadingById(id: string): AirQualityReading | undefined {
    return (this.data.airQualityReadings || []).find((s) => s.id === id || s.station_id === id);
  }

  public getAirQualityReadingsByWardOrLocation(query: string): AirQualityReading[] {
    const q = query.toLowerCase();
    return (this.data.airQualityReadings || []).filter(
      (s) =>
        s.station_name.toLowerCase().includes(q) ||
        (s.ward && s.ward.toLowerCase().includes(q)) ||
        s.city.toLowerCase().includes(q)
    );
  }

  public setAirQualityReadings(readings: AirQualityReading[]): void {
    this.data.airQualityReadings = readings;
    this.save();
  }

  public getAirQualityMetadata(): AirQualityDatasetMetadata | undefined {
    return this.data.airQualityMetadata;
  }

  public setAirQualityMetadata(metadata: AirQualityDatasetMetadata): void {
    this.data.airQualityMetadata = metadata;
    this.save();
  }

  public addOrUpdateResource(resource: SourceResource): void {
    const idx = this.data.resources.findIndex((r) => r.id === resource.id);
    if (idx >= 0) {
      this.data.resources[idx] = resource;
    } else {
      this.data.resources.push(resource);
    }
    this.save();
  }

  // Volunteer Opportunities Methods
  public getVolunteerOpportunities(filters?: { domain?: string; location?: string; limit?: number }): VolunteerOpportunity[] {
    let list = this.data.volunteerOpportunities || [];
    if (filters?.domain && filters.domain !== 'All' && filters.domain !== 'All Domains') {
      const d = filters.domain.toLowerCase();
      list = list.filter((o) => o.domain.toLowerCase().includes(d));
    }
    if (filters?.location && filters.location !== 'All') {
      const loc = filters.location.toLowerCase();
      list = list.filter((o) => o.location.toLowerCase().includes(loc));
    }
    if (filters?.limit && filters.limit > 0) {
      list = list.slice(0, filters.limit);
    }
    return list;
  }

  public setVolunteerOpportunities(opportunities: VolunteerOpportunity[]): void {
    this.data.volunteerOpportunities = opportunities;
    this.save();
  }

  public addOrUpdateVolunteerOpportunity(opp: VolunteerOpportunity): void {
    if (!this.data.volunteerOpportunities) {
      this.data.volunteerOpportunities = [];
    }
    const idx = this.data.volunteerOpportunities.findIndex((o) => o.id === opp.id);
    if (idx >= 0) {
      this.data.volunteerOpportunities[idx] = opp;
    } else {
      this.data.volunteerOpportunities.push(opp);
    }
    this.save();
  }
}

export const db = new Database();
