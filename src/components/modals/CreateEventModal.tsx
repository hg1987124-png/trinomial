import React, { useState, useEffect } from 'react';
import { CivicIssue, CivicEvent, EventCategory, EventRecommendation, AuthAccount } from '../../types/civic';
import { api } from '../../services/api';
import { X, Calendar, MapPin, Users, CheckCircle2, AlertCircle, Plus, Sparkles, ExternalLink, Check } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledIssue?: CivicIssue | null;
  prefilledRecommendation?: EventRecommendation | null;
  availableIssues?: CivicIssue[];
  currentAccount?: AuthAccount | null;
  onEventCreated?: (event: CivicEvent) => void;
  onViewEvent?: (eventId: string) => void;
}

const EVENT_CATEGORIES: EventCategory[] = [
  'Cleanliness & Clean-up Drive',
  'Water Conservation & Testing',
  'Sewerage & Drain Audit',
  'Solid Waste Segregation Workshop',
  'Sanitation Facility Inspection',
  'Air Quality & Tree Plantation',
  'Road Safety & Pothole Survey',
  'Community Awareness & RTI Campaign',
  'Other Civic Action',
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  prefilledIssue,
  prefilledRecommendation,
  availableIssues = [],
  currentAccount = null,
  onEventCreated,
  onViewEvent,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Cleanliness & Clean-up Drive');
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [activityType, setActivityType] = useState('Ground Audit & Community Mobilization');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [durationHours, setDurationHours] = useState(3);
  const [locationName, setLocationName] = useState('Mumbai Municipal Ward Center');
  const [meetingPoint, setMeetingPoint] = useState('Central Ward Office Gate');
  const [ward, setWard] = useState('Ward M-East');
  const [city, setCity] = useState('Mumbai');
  const [instructions, setInstructions] = useState('Please wear comfortable clothes and walking shoes. Bring a reusable water bottle.');
  const [skills, setSkills] = useState('Field Observation, Mobile Geotagging, Resident Survey');
  const [equipmentProvided, setEquipmentProvided] = useState('Safety Vests, Survey Checklists, Hand Sanitizer');
  const [equipmentNeeded, setEquipmentNeeded] = useState('Smartphone with Camera');
  const [organizerName, setOrganizerName] = useState('Civic Action Coordinator');
  const [organizerOrg, setOrganizerOrg] = useState('Kartavya Civic Partner Network');
  const [organizerContact, setOrganizerContact] = useState('coordinator@civicaction.org');
  const [organizerType, setOrganizerType] = useState<'Verified NGO' | 'Community Group' | 'Municipal Partner' | 'Academic / Student Lab'>('Community Group');
  const [maxVolunteers, setMaxVolunteers] = useState(25);
  const [deadline, setDeadline] = useState('');

  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<CivicEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default dates
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const dayBefore = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
      setDate(nextWeek);
      setDeadline(dayBefore);

      if (currentAccount) {
        setOrganizerName(currentAccount.name);
        setOrganizerContact(currentAccount.email);
        if (currentAccount.role === 'ngo') {
          setOrganizerOrg(currentAccount.organization_name || 'Verified NGO Partner');
          setOrganizerType('Verified NGO');
        } else {
          setOrganizerOrg('Citizen Volunteer Collective');
          setOrganizerType('Community Group');
        }
      }

      if (prefilledIssue) {
        setSelectedIssueIds([prefilledIssue.id]);
        setLocationName(prefilledIssue.location_text);
        setMeetingPoint(`Main Entrance / Landmarks, ${prefilledIssue.location_text}`);
        setWard(prefilledIssue.ward || 'Ward M-East');
        setCity(prefilledIssue.city || 'Mumbai');

        // Pick category based on issue
        let defaultCat: EventCategory = 'Cleanliness & Clean-up Drive';
        if (prefilledIssue.category === 'Water Supply') defaultCat = 'Water Conservation & Testing';
        else if (prefilledIssue.category === 'Solid Waste Management') defaultCat = 'Solid Waste Segregation Workshop';
        else if (prefilledIssue.category === 'Sewerage & Drainage') defaultCat = 'Sewerage & Drain Audit';
        else if (prefilledIssue.category === 'Public Sanitation & Toilets') defaultCat = 'Sanitation Facility Inspection';
        else if (prefilledIssue.category === 'Air Quality & Pollution') defaultCat = 'Air Quality & Tree Plantation';
        setCategory(defaultCat);

        if (prefilledRecommendation) {
          setTitle(`Civic Action: ${prefilledRecommendation.recommended_activity}`);
          setDescription(`${prefilledRecommendation.rationale} Organized in response to documented civic audit in ${prefilledIssue.location_text}.`);
          setActivityType(prefilledRecommendation.recommended_activity);
          if (prefilledRecommendation.suggested_tasks?.length) {
            setSkills(prefilledRecommendation.suggested_tasks.join(', '));
          }
          if (prefilledRecommendation.equipment_needed?.length) {
            setEquipmentProvided(prefilledRecommendation.equipment_needed.join(', '));
          }
          if (prefilledRecommendation.safety_precautions?.length) {
            setInstructions(`Safety Precautions: ${prefilledRecommendation.safety_precautions.join('. ')}. Wear comfortable shoes.`);
          }
        } else {
          setTitle(`Ground Action Walk: ${prefilledIssue.title.slice(0, 50)}`);
          setDescription(`Volunteer collective action to address documented civic concern in ${prefilledIssue.location_text}. We will conduct ground inspections, collect evidence, and coordinate with local residents.`);
        }
      } else {
        setTitle('');
        setDescription('');
        setSelectedIssueIds([]);
      }
    }
  }, [isOpen, prefilledIssue, prefilledRecommendation, currentAccount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !locationName.trim() || !organizerName.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createEvent({
        title: title.trim(),
        description: description.trim(),
        category,
        related_issue_ids: selectedIssueIds,
        activity_type: activityType.trim(),
        date,
        start_time: startTime,
        duration_hours: Number(durationHours) || 3,
        location_name: locationName.trim(),
        meeting_point: meetingPoint.trim(),
        ward: ward.trim() || undefined,
        city: city.trim() || 'Mumbai',
        participation_instructions: instructions.trim(),
        required_skills_or_tasks: skills.split(',').map((s) => s.trim()).filter(Boolean),
        equipment_provided: equipmentProvided.split(',').map((s) => s.trim()).filter(Boolean),
        equipment_needed_from_volunteer: equipmentNeeded.split(',').map((s) => s.trim()).filter(Boolean),
        organizer_name: organizerName.trim(),
        organizer_organization: organizerOrg.trim(),
        organizer_contact: organizerContact.trim(),
        organizer_type: organizerType,
        max_volunteers: Number(maxVolunteers) || 25,
        registration_deadline: deadline,
        status: 'Open for Registration',
      });

      setCreatedEvent(res.event);
      if (onEventCreated) onEventCreated(res.event);
    } catch (err: any) {
      setError(err?.message || 'Failed to create civic event.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedEvent(null);
    setError(null);
    onClose();
  };

  const shareableUrl = createdEvent && typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#event=${createdEvent.id}`
    : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#047857]/20 rounded-xs w-full max-w-2xl shadow-xl overflow-hidden p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#047857]/15">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F97316]" />
            <div>
              <h3 className="text-sm font-bold text-[#047857] uppercase tracking-wider">
                Create & Publish Civic Action Event
              </h3>
              <span className="text-[10px] text-[#047857]/60 block">
                Authorized Organizer / NGO Volunteer Drive Portal
              </span>
            </div>
          </div>
          <button onClick={handleClose} className="text-[#047857]/60 hover:text-[#047857] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdEvent ? (
          <div className="py-6 text-center space-y-4 text-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="text-lg font-bold text-[#047857]">Civic Action Event Published!</h4>
            <p className="text-[#047857]/80 max-w-md mx-auto leading-relaxed">
              <strong>{createdEvent.title}</strong> is now live and accepting volunteer registrations.
              A shareable registration link has been generated.
            </p>

            <div className="p-3 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs max-w-md mx-auto text-left space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">
                Unique Shareable Registration Link:
              </span>
              <div className="font-mono text-[11px] text-[#047857] bg-white p-2 rounded-xs border border-[#047857]/10 break-all select-all">
                {shareableUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="text-[10px] font-bold text-[#F97316] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Link to Clipboard'}</span>
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {onViewEvent && (
                <button
                  onClick={() => {
                    handleClose();
                    onViewEvent(createdEvent.id);
                  }}
                  className="px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Event Page</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-[#047857] hover:bg-[#035f44] text-white font-bold rounded-xs cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xs">
                {error}
              </div>
            )}

            {prefilledIssue && (
              <div className="p-3 bg-[#f4f7f5] border border-[#047857]/20 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/70 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#F97316]" /> Primary Linked Civic Issue:
                </span>
                <div className="font-bold text-[#047857] text-[11px]">{prefilledIssue.title}</div>
                <div className="text-[10px] text-[#047857]/60">
                  Category: {prefilledIssue.category} • Location: {prefilledIssue.location_text}
                </div>
              </div>
            )}

            {/* Event Title */}
            <div className="space-y-1">
              <label className="font-semibold text-[#047857]">Event Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ward 150 Drain Desilting & Citizen Water Monitoring Walk"
                className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
              />
            </div>

            {/* Category & Activity Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Civic Action Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Activity Format *</label>
                <input
                  type="text"
                  required
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  placeholder="e.g. Tap Testing Walk, Composting Workshop, Debris Clean-up"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>
            </div>

            {/* Related Civic Issues Selector */}
            {availableIssues.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-semibold text-[#047857] flex items-center justify-between">
                  <span>Linked Civic Issues ({selectedIssueIds.length} selected)</span>
                  <span className="text-[10px] text-[#047857]/60 font-normal">
                    Can link to multiple related issues
                  </span>
                </label>
                <div className="max-h-28 overflow-y-auto border border-[#047857]/20 rounded-xs p-2 space-y-1 bg-[#fcfdfc]">
                  {availableIssues.map((iss) => {
                    const isSelected = selectedIssueIds.includes(iss.id);
                    return (
                      <label
                        key={iss.id}
                        className={`flex items-center gap-2 p-1.5 rounded-xs cursor-pointer text-[11px] ${
                          isSelected ? 'bg-[#047857]/10 font-semibold text-[#047857]' : 'text-[#047857]/80 hover:bg-[#047857]/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIssueIds([...selectedIssueIds, iss.id]);
                            } else {
                              setSelectedIssueIds(selectedIssueIds.filter((id) => id !== iss.id));
                            }
                          }}
                          className="rounded-xs text-[#047857]"
                        />
                        <span className="truncate">{iss.title}</span>
                        <span className="text-[9px] text-[#047857]/50 ml-auto shrink-0">({iss.category})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date, Time, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Event Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Start Time *</label>
                <input
                  type="text"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 08:30 AM"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Duration (Hours)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>
            </div>

            {/* Location & Meeting Point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Location / Area Name *</label>
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Kurla West Community Center, Mumbai"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Exact Meeting Point *</label>
                <input
                  type="text"
                  required
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="e.g. In front of Ward Post Office Gate #2"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-semibold text-[#047857]">Event Purpose & Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the civic goal, community impact, and what volunteers will achieve..."
                className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
              />
            </div>

            {/* Volunteer Tasks & Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Tasks / Skills (comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Tap Testing, Surveying, Photo Geotagging"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Equipment Provided by Organizer</label>
                <input
                  type="text"
                  value={equipmentProvided}
                  onChange={(e) => setEquipmentProvided(e.target.value)}
                  placeholder="e.g. Test Strips, Gloves, Safety Vests"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>
            </div>

            {/* Organizer Info & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Lead Organizer Name *</label>
                <input
                  type="text"
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Organization / Group *</label>
                <input
                  type="text"
                  required
                  value={organizerOrg}
                  onChange={(e) => setOrganizerOrg(e.target.value)}
                  placeholder="e.g. Praja Foundation Partner"
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Volunteer Capacity *</label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  required
                  value={maxVolunteers}
                  onChange={(e) => setMaxVolunteers(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#047857]/15">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-[#047857]/20 text-[#047857] font-semibold rounded-xs hover:bg-[#047857]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{loading ? 'Publishing Event...' : 'Publish Event & Generate Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateEventModal;
