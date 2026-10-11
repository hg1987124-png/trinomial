import React, { useState, useEffect } from 'react';
import Header, { ActiveTab } from './components/Header';
import Footer from './components/Footer';
import DiscoveryFeedView from './views/DiscoveryFeedView';
import IssueDetailView from './views/IssueDetailView';
import RagExplorerView from './views/RagExplorerView';
import IngestionAdminView from './views/IngestionAdminView';
import StakeholdersView from './views/StakeholdersView';
import CollaborationView from './views/CollaborationView';
import DashboardMetricsView from './views/DashboardMetricsView';
import VolunteerView from './views/VolunteerView';
import EventDetailView from './views/EventDetailView';

import ReportIssueModal from './components/modals/ReportIssueModal';
import CollaborationModal from './components/modals/CollaborationModal';
import CreateEventModal from './components/modals/CreateEventModal';
import AuthModal from './components/modals/AuthModal';

import {
  CivicIssue,
  Stakeholder,
  CivicEvent,
  EventRecommendation,
  AccountRole,
  AuthAccount,
} from './types/civic';
import { api } from './services/api';

const AUTH_TOKEN_KEY = 'kartavya_auth_token';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string>('KTV-MUM-2025-WTR-01');
  const [scrapingInProgress, setScrapingInProgress] = useState(false);

  // Separate Citizen / NGO Authentication State
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<AccountRole>('user');

  // Event & Volunteer state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [eventPrefilledIssue, setEventPrefilledIssue] = useState<CivicIssue | null>(null);
  const [eventPrefilledRecommendation, setEventPrefilledRecommendation] =
    useState<EventRecommendation | null>(null);

  // Modal visibility states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [issueForCollab, setIssueForCollab] = useState<CivicIssue | null>(null);
  const [stakeholderForCollab, setStakeholderForCollab] = useState<Stakeholder | null>(null);

  const fetchIssues = async () => {
    try {
      const data = await api.getIssues();
      setIssues(data.issues);
      if (data.issues.length > 0 && !selectedIssueId) {
        setSelectedIssueId(data.issues[0].id);
      }
    } catch (e) {
      console.error('Failed to load issues:', e);
    } finally {
      setLoadingIssues(false);
    }
  };

  const restoreAuthSession = async () => {
    if (typeof window === 'undefined') return;
    const savedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!savedToken) return;
    try {
      const res = await api.getCurrentAccount(savedToken);
      if (res.authenticated && res.account) {
        setCurrentAccount(res.account);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch {
      // Ignore network error during startup
    }
  };

  // URL Hash & Query routing check (Supports deep-linking to shareable event URLs)
  const parseUrlRoute = () => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.startsWith('#event=')) {
      const evtId = hash.slice(7).trim();
      if (evtId) {
        setSelectedEventId(evtId);
        setActiveTab('event-detail');
        return;
      }
    }

    if (hash === '#events' || hash === '#volunteer') {
      setActiveTab('events');
      return;
    }

    if (search.includes('event=')) {
      const params = new URLSearchParams(search);
      const evtId = params.get('event');
      if (evtId) {
        setSelectedEventId(evtId);
        setActiveTab('event-detail');
        return;
      }
    }
  };

  useEffect(() => {
    fetchIssues();
    restoreAuthSession();
    parseUrlRoute();

    const handleHashChange = () => {
      parseUrlRoute();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenAuthModal = (role: AccountRole) => {
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (account: AuthAccount, token: string) => {
    setCurrentAccount(account);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      const savedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (savedToken) {
        await api.logoutAccount(savedToken);
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setCurrentAccount(null);
  };

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'events') {
      window.location.hash = '#events';
    } else if (tab === 'feed') {
      if (window.location.hash.startsWith('#event=')) {
        window.location.hash = '';
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectIssue = (issueId: string) => {
    setSelectedIssueId(issueId);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveTab('event-detail');
    window.location.hash = `#event=${eventId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCreateEventModal = (
    issue?: CivicIssue,
    recommendation?: EventRecommendation
  ) => {
    setEventPrefilledIssue(issue || null);
    setEventPrefilledRecommendation(recommendation || null);
    setIsCreateEventModalOpen(true);
  };

  const handleOpenCollabModal = (issue: CivicIssue, stakeholder?: Stakeholder) => {
    setIssueForCollab(issue);
    setStakeholderForCollab(stakeholder || null);
    setIsCollabModalOpen(true);
  };

  const currentIssue =
    issues.find((i) => i.id === selectedIssueId) || issues[0];

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#047857] flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        scrapingInProgress={scrapingInProgress}
        currentAccount={currentAccount}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {activeTab === 'feed' && (
          <DiscoveryFeedView
            issues={issues}
            loading={loadingIssues}
            onSelectIssue={handleSelectIssue}
            onSelectEvent={handleSelectEvent}
            onIssuesUpdated={fetchIssues}
            onOpenRagWithIssue={(id) => {
              setSelectedIssueId(id);
              setActiveTab('rag');
            }}
            onOpenCollaborationModal={(iss) => handleOpenCollabModal(iss)}
            onOpenIngestionTab={() => handleNavigate('ingestion')}
          />
        )}

        {activeTab === 'detail' && currentIssue && (
          <IssueDetailView
            issue={currentIssue}
            onBack={() => handleNavigate('feed')}
            onIssueUpdated={fetchIssues}
            onOpenCollaborationModal={(iss, stk) => handleOpenCollabModal(iss, stk)}
            onSelectEvent={handleSelectEvent}
            onOpenCreateEventModal={(iss, rec) => handleOpenCreateEventModal(iss, rec)}
          />
        )}

        {(activeTab === 'events' || activeTab === 'volunteer') && (
          <VolunteerView
            onSelectEvent={handleSelectEvent}
            onOpenCreateEventModal={() => handleOpenCreateEventModal()}
            onSelectIssue={handleSelectIssue}
          />
        )}

        {activeTab === 'event-detail' && selectedEventId && (
          <EventDetailView
            eventId={selectedEventId}
            onBack={() => handleNavigate('events')}
            onSelectIssue={handleSelectIssue}
            onNavigateToMyRegistrations={() => {
              handleNavigate('events');
            }}
          />
        )}

        {activeTab === 'rag' && <RagExplorerView />}

        {activeTab === 'ingestion' && (
          <IngestionAdminView
            onIngestionCompleted={() => {
              fetchIssues();
            }}
          />
        )}

        {activeTab === 'stakeholders' && (
          <StakeholdersView
            onOpenCollabForStakeholder={(stk) => {
              handleOpenCollabModal(currentIssue || issues[0], stk);
            }}
          />
        )}

        {activeTab === 'collabs' && (
          <CollaborationView
            onSelectIssue={(id) => handleSelectIssue(id)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardMetricsView
            onNavigateToIngestion={() => handleNavigate('ingestion')}
            onNavigateToFeed={() => handleNavigate('feed')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRole={authModalRole}
        onAuthSuccess={handleAuthSuccess}
      />

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportCreated={() => {
          fetchIssues();
        }}
      />

      <CollaborationModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        issue={issueForCollab}
        stakeholder={stakeholderForCollab}
        onSuccess={() => {
          // Keep synced
        }}
      />

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => {
          setIsCreateEventModalOpen(false);
          setEventPrefilledIssue(null);
          setEventPrefilledRecommendation(null);
        }}
        prefilledIssue={eventPrefilledIssue}
        prefilledRecommendation={eventPrefilledRecommendation}
        availableIssues={issues}
        currentAccount={currentAccount}
        onEventCreated={(evt) => {
          // Handled inside modal with shareable link and view event button
        }}
        onViewEvent={(evtId) => {
          handleSelectEvent(evtId);
        }}
      />
    </div>
  );
}
