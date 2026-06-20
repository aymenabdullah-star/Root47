import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Wind, 
  Flame, 
  ShieldAlert, 
  Users, 
  CheckCircle, 
  Smartphone, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  X, 
  AlertTriangle, 
  Send, 
  Inbox, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Award,
  ChevronRight,
  ShieldCheck,
  Building,
  Activity,
  User,
  ExternalLink,
  Map,
  Filter,
  Check
} from 'lucide-react';
import { Campus, DisasterPreset, UserProfile, SafetyAlert, IncidentReport, MockNotification } from './types';
import { MOCK_USER_PROFILES, DISASTER_PRESETS, MOCK_NOTIFICATIONS_INITIAL } from './data/campuses';

// Helper for weather icons
function getWeatherIcon(campus: Campus) {
  if (campus.hazardEffectId) {
    if (campus.hazardEffectId === 'Smog') return <Activity className="w-5 h-5 text-amber-600 animate-pulse" />;
    if (campus.hazardEffectId === 'Flash Flood') return <CloudRain className="w-5 h-5 text-blue-600 animate-bounce" />;
    if (campus.hazardEffectId === 'Heatwave') return <Flame className="w-5 h-5 text-red-600 animate-pulse" />;
  }

  const w = campus.weather;
  if (w.aqi > 200) return <Activity className="w-5 h-5 text-amber-500" />;
  if (w.chanceOfRain > 60) return <CloudRain className="w-5 h-5 text-blue-500" />;
  if (w.temp > 40) return <Sun className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '20s' }} />;
  return <Sun className="w-5 h-5 text-indigo-500" />;
}

// Helper for status badge colors
function getStatusBadge(status: string) {
  switch (status) {
    case 'Severe Disruption':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Severe Disruption</span>;
    case 'Caution':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Caution</span>;
    case 'Operational':
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Operational</span>;
  }
}

export default function App() {
  // Design / Branding options state
  const [designPreset, setDesignPreset] = useState<'corporate' | 'midnight-tactical' | 'minimalist-royal'>('corporate');

  // System states
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [disasterPresetsActive, setDisasterPresetsActive] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Active Selected Profile & states
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(MOCK_USER_PROFILES[0]);
  const [userStateAdditions, setUserStateAdditions] = useState<Record<string, { points: number; badges: string[]; clicksCount: number }>>({});

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'telemetry' | 'gamification' | 'dispatches'>('telemetry');
  
  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Centre' | 'South' | 'North'>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Operational' | 'Caution' | 'Severe Disruption'>('All');
  
  // Selected Campus details modal / side panel
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  
  // Overrides form state
  const [overrideTemp, setOverrideTemp] = useState<number>(35);
  const [overrideHumidity, setOverrideHumidity] = useState<number>(60);
  const [overrideAqi, setOverrideAqi] = useState<number>(150);
  const [overrideChanceOfRain, setOverrideChanceOfRain] = useState<number>(30);
  const [overrideWindSpeed, setOverrideWindSpeed] = useState<number>(15);
  const [overrideUvIndex, setOverrideUvIndex] = useState<number>(6);
  const [overrideReason, setOverrideReason] = useState<string>('Precautionary meteorological setting adjusted by regional safety cell.');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Crowd-source Input Report Form state
  const [crowdCampusId, setCrowdCampusId] = useState<string>('');
  const [crowdReporterName, setCrowdAporterName] = useState<string>('');
  const [crowdReporterEmail, setCrowdReporterEmail] = useState<string>('');
  const [crowdHazardType, setCrowdHazardType] = useState<string>('Smog');
  const [crowdDescription, setCrowdDescription] = useState<string>('');
  const [crowdTemp, setCrowdTemp] = useState<number>(35);
  const [crowdHumidity, setCrowdHumidity] = useState<number>(60);
  const [crowdAqi, setCrowdAqi] = useState<number>(200);
  const [crowdChanceOfRain, setCrowdChanceOfRain] = useState<number>(10);
  const [submittingCrowd, setSubmittingCrowd] = useState(false);
  const [crowdFeedback, setCrowdFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Gemini alert draft states
  const [draftResult, setDraftResult] = useState<{
    subject: string;
    emailBody: string;
    smsVolume: string;
    fallback?: boolean;
  } | null>(null);
  const [draftingAi, setDraftingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Send communication alert modal State
  const [broadcastTargetCampusId, setBroadcastTargetCampusId] = useState<string | null>(null);
  const [smsDeliveryActive, setSmsDeliveryActive] = useState(true);
  const [whatsappDeliveryActive, setWhatsappDeliveryActive] = useState(true);
  const [emailDeliveryActive, setEmailDeliveryActive] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Simulated Mobile Phone States
  const [mockSmartphoneNotifications, setMockSmartphoneNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS_INITIAL);
  const [activeHandsetTab, setActiveHandsetTab] = useState<'sms' | 'whatsapp' | 'gsuite'>('sms');
  const [isHandsetOpen, setIsHandsetOpen] = useState(true);

  // Notification Banner
  const [globalBannerText, setGlobalBannerText] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  // Fetch initial telemetry data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/campuses');
      if (!res.ok) throw new Error('Data endpoint response issue');
      const data = await res.json();
      setCampuses(data.campuses);
      setDisasterPresetsActive(data.disasterPresetsActive);
      setSafetyAlerts(data.safetyAlerts);
      setIncidentReports(data.incidentReports);
      
      // Auto pre-populate crowd form campus
      if (data.campuses.length > 0 && !crowdCampusId) {
        setCrowdCampusId(data.campuses[0].branchId);
      }
      
      // Load user points/badges additions
      const userRes = await fetch('/api/users/state');
      if (userRes.ok) {
        const uData = await userRes.json();
        setUserStateAdditions(uData.userStateAdditions);
      }
      setErrorText(null);
    } catch (err: any) {
      console.error(err);
      setErrorText('Could not connect to the Beaconhouse Meteorological backend server. Retrying...');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto sync every 30 mins to purge manually injected triggers
    const timer = setInterval(() => {
      syncLiveWeatherWithBackend();
    }, 1800000); // 30 mins

    return () => clearInterval(timer);
  }, []);

  // Update user state helper
  const syncUserState = async () => {
    try {
      const userRes = await fetch('/api/users/state');
      if (userRes.ok) {
        const uData = await userRes.json();
        setUserStateAdditions(uData.userStateAdditions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Switch role and update profile data or trigger specific view modes
  const handleRoleChange = (profileId: string) => {
    const prof = MOCK_USER_PROFILES.find(p => p.id === profileId);
    if (prof) {
      setCurrentProfile(prof);
      setGlobalBannerText({
        text: `Switched perspective to ${prof.name} (${prof.role.toUpperCase() === 'READ_ONLY' ? 'Staff Member' : prof.role.replace('_', ' ').toUpperCase()})`,
        type: 'info'
      });
      // Clear forms
      setDraftResult(null);
      setAiError(null);
    }
  };

  // Synchronize Live Weather Database (Triggers server fetch live weather)
  const syncLiveWeatherWithBackend = async () => {
    setGlobalBannerText({ text: 'Starting meteorological telemetry refresh across Pakistan...', type: 'info' });
    try {
      const res = await fetch('/api/weather/fetch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCampuses(data.campuses);
        setSafetyAlerts(data.safetyAlerts);
        setGlobalBannerText({ text: data.message, type: 'success' });
        // Clear override details on select
        setSelectedCampusId(null);
        await syncUserState();
      } else {
        throw new Error(data.error || 'Trigger failed');
      }
    } catch (e: any) {
      setGlobalBannerText({ text: `Sync issue: ${e.message}`, type: 'warn' });
    }
  };

  // Toggle disaster geofence
  const handleDisasterToggle = async (presetId: string, currentVal: boolean) => {
    try {
      const nextVal = !currentVal;
      const res = await fetch('/api/disaster/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: presetId, active: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setDisasterPresetsActive(data.disasterPresetsActive);
        setCampuses(data.campuses);
        setSafetyAlerts(data.safetyAlerts);
        const nameOfPreset = DISASTER_PRESETS.find(d => d.id === presetId)?.name;
        
        // Count affected campuses
        const affectedCount = data.campuses.filter((c: Campus) => c.hazardEffectId).length;

        setGlobalBannerText({ 
          text: nextVal 
            ? `⚠️ ${nameOfPreset} triggered. Geofencing active: Flagged campuses within 12 KM radius as Severe Disruption.`
            : `✅ ${nameOfPreset} resolved. Recalculated normal meteorological conditions.`,
          type: nextVal ? 'warn' : 'success'
        });

        // Add SMS alerts
        if (nextVal) {
          const newSms: MockNotification = {
            id: `sys-notif-${Date.now()}`,
            type: 'sms',
            sender: 'BMW Dispatch Center',
            title: '⚠️ EMERGENCY GEOFENCE TRIGGERED',
            message: `${nameOfPreset} is currently active and affecting campuses within a 12 KM radius. Precautionary protocols initiated.`,
            timestamp: 'Just Now',
            read: false
          };
          setMockSmartphoneNotifications(prev => [newSms, ...prev]);
        }
      }
    } catch (err) {
      console.error(err);
      setGlobalBannerText({ text: 'Could not toggle disaster geofence state.', type: 'warn' });
    }
  };

  // Submit manual override
  const handleManualOverrideSubmit = async (branchId: string) => {
    setSubmittingOverride(true);
    try {
      const res = await fetch('/api/campuses/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          weatherUpdate: {
            temp: overrideTemp,
            humidity: overrideHumidity,
            aqi: overrideAqi,
            chanceOfRain: overrideChanceOfRain,
            windSpeed: overrideWindSpeed,
            uvIndex: overrideUvIndex
          },
          overrideReason,
          userRegion: currentProfile.region,
          userRole: currentProfile.role
        })
      });

      const data = await res.json();
      if (res.status === 403) {
        setGlobalBannerText({ text: data.message, type: 'warn' });
        return;
      }

      if (data.success) {
        setCampuses(data.campuses);
        setSafetyAlerts(data.safetyAlerts);
        setGlobalBannerText({ text: `Successfully generated manual administrator override for ${data.campus.name}.`, type: 'success' });
        
        // Update selected campus details in view
        const target = data.campuses.find((c: Campus) => c.branchId === branchId);
        if (target) {
          setSelectedCampusId(null);
          setTimeout(() => setSelectedCampusId(branchId), 50);
        }
      }
    } catch (err: any) {
      setGlobalBannerText({ text: `Could not finish override request: ${err.message}`, type: 'warn' });
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Submit crowdsourced report
  const handleCrowdReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crowdReporterEmail.endsWith('@bh.edu.pk')) {
      setCrowdFeedback({ success: false, message: 'Submission holds. You must provide a valid @bh.edu.pk email context corresponding to BSS Organization.' });
      return;
    }

    setSubmittingCrowd(true);
    setCrowdFeedback(null);

    try {
      const res = await fetch('/api/incidents/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusId: crowdCampusId,
          reporterName: crowdReporterName,
          reporterEmail: crowdReporterEmail,
          hazardType: crowdHazardType,
          description: crowdDescription,
          weatherData: {
            temp: crowdTemp,
            humidity: crowdHumidity,
            aqi: crowdAqi,
            chanceOfRain: crowdChanceOfRain,
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIncidentReports(data.incidentReports);
        setCrowdFeedback({ success: true, message: 'Telemetry incident report lodged successfully. Forwarded to regional HSEQ moderation queue!' });
        
        // Clear fields partially
        setCrowdDescription('');
        setGlobalBannerText({ text: 'New observation report submitted for moderation.', type: 'info' });
      } else {
        setCrowdFeedback({ success: false, message: data.message || 'Lodge request failed' });
      }
    } catch (err: any) {
      setCrowdFeedback({ success: false, message: `System discrepancy: ${err.message}` });
    } finally {
      setSubmittingCrowd(false);
    }
  };

  // Moderate incident report (Approve / Dismiss)
  const handleModerateIncident = async (reportId: string, status: 'Approved' | 'Dismissed') => {
    try {
      const res = await fetch('/api/incidents/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          status,
          userRole: currentProfile.role,
          userRegion: currentProfile.region
        })
      });

      const data = await res.json();
      if (res.status === 403) {
        setGlobalBannerText({ text: data.message, type: 'warn' });
        return;
      }

      if (data.success) {
        setIncidentReports(data.incidentReports);
        setCampuses(data.campuses);
        setSafetyAlerts(data.safetyAlerts);
        
        const rName = data.report.reporterName;
        const rewardMsg = status === 'Approved' 
          ? `Report approved. ${rName} awarded +100 points & "Weather Hero" Badge! Target campus weather modified.`
          : `Observation ticket rejected and dismissed.`;

        setGlobalBannerText({ text: rewardMsg, type: status === 'Approved' ? 'success' : 'info' });
        
        await syncUserState();
      }
    } catch (err: any) {
      setGlobalBannerText({ text: `Moderation issue: ${err.message}`, type: 'warn' });
    }
  };

  // Moderate pending safety brief alerts
  const handleModerateAlert = async (alertId: string, status: 'Broadcasted' | 'Dismissed') => {
    try {
      const res = await fetch('/api/alerts/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          status,
          userRole: currentProfile.role,
          userRegion: currentProfile.region
        })
      });

      const data = await res.json();
      if (res.status === 403) {
        setGlobalBannerText({ text: data.message, type: 'warn' });
        return;
      }

      if (data.success) {
        setSafetyAlerts(data.safetyAlerts);
        setGlobalBannerText({ 
          text: status === 'Broadcasted' 
            ? 'Safety alert successfully approved and broadcasted and queued for dispatch notifications!' 
            : 'Alert successfully dismissed from active review lines.', 
          type: 'success' 
        });

        // Trigger notifications to smartphone
        if (status === 'Broadcasted') {
          const approvedAlert = data.safetyAlerts.find((a: SafetyAlert) => a.id === alertId);
          if (approvedAlert) {
            triggerSmartphoneDirectNotifications(approvedAlert);
          }
        }
      }
    } catch (e: any) {
      setGlobalBannerText({ text: `Alert decision halted: ${e.message}`, type: 'warn' });
    }
  };

  // Draft communications using Gemini API
  const handleDraftAlertWithGemini = async (campus: Campus) => {
    setDraftingAi(true);
    setAiError(null);
    setDraftResult(null);

    // Hazard lookup
    let hazardType = 'Heavy Rainfall & Humidity';
    let hazardDesc = 'Elevated moisture levels and surface pooling.';
    if (campus.hazardEffectId) {
      hazardType = campus.hazardEffectId;
      hazardDesc = `Affected by active regional preset: ${campus.hazardEffectId} Emergency situation.`;
    } else if (campus.weather.temp > 40) {
      hazardType = 'Extreme Solar Heatwave';
      hazardDesc = 'Elevated heat index, clear sky, extreme ultraviolet levels.';
    } else if (campus.weather.aqi > 200) {
      hazardType = 'Dense Seasonal Winter Smog';
      hazardDesc = 'High PM2.5 levels, restricted visibility, severe airborne respiratory warnings.';
    }

    try {
      const res = await fetch('/api/gemini/draft-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusName: campus.name,
          hazardType,
          temp: campus.weather.temp,
          aqi: campus.weather.aqi,
          description: hazardDesc
        })
      });

      const data = await res.json();
      if (data.success) {
        setDraftResult({
          subject: data.subject,
          emailBody: data.emailBody,
          smsVolume: data.smsVolume,
          fallback: data.fallback
        });
      } else {
        throw new Error(data.message || 'Gemini drafting failed');
      }
    } catch (e: any) {
      setAiError(e.message || 'Generative connection suspended.');
    } finally {
      setDraftingAi(false);
    }
  };

  // Send communication triggers & feeds Mock Smartphone
  const triggerSmartphoneDirectNotifications = (alert: SafetyAlert) => {
    const textCopy = alert.generatedAnnouncement?.smsVolume || alert.message.substring(0, 137) + '...';
    const emailHeader = alert.generatedAnnouncement?.subject || alert.title;
    const emailBody = alert.generatedAnnouncement?.emailBody || alert.message;

    const newMsgs: MockNotification[] = [
      {
        id: `phone-notif-sms-${Date.now()}`,
        type: 'sms',
        sender: 'BSS-SAFE-BMW',
        title: '⚠️ EMERGENCY STATUS DISPATCH',
        message: textCopy,
        timestamp: 'Just Now',
        read: false
      },
      {
        id: `phone-notif-wa-${Date.now()}`,
        type: 'whatsapp',
        sender: 'BSS Regional Core',
        title: '⚠️ ALERT DISPATCH',
        message: textCopy,
        timestamp: 'Just Now',
        read: false
      },
      {
        id: `phone-notif-gs-${Date.now()}`,
        type: 'gsuite',
        sender: 'Core Comm <hseq@bh.edu.pk>',
        title: emailHeader,
        message: emailBody,
        timestamp: 'Just Now',
        read: false
      }
    ];

    setMockSmartphoneNotifications(prev => [...newMsgs, ...prev]);
  };

  const handleBroadcastCommit = async () => {
    if (!broadcastTargetCampusId) return;
    const campus = campuses.find(c => c.branchId === broadcastTargetCampusId);
    if (!campus) return;

    setSendingBroadcast(true);

    try {
      // Create a mock active alert with drafted details to state
      const newAlert: SafetyAlert = {
        id: `alert-manual-${Date.now()}`,
        campusId: campus.branchId,
        campusName: campus.name,
        region: campus.region,
        status: 'Broadcasted',
        severity: campus.operationalStatus === 'Severe Disruption' ? 'A' : 'B',
        title: draftResult?.subject || `⚠️ SAFETY BROADCAST: ${campus.name}`,
        message: draftResult?.emailBody || `Weather notification active for ${campus.name}.`,
        channels: {
          sms: smsDeliveryActive,
          whatsapp: whatsappDeliveryActive,
          email: emailDeliveryActive
        },
        generatedAnnouncement: draftResult ? {
          subject: draftResult.subject,
          emailBody: draftResult.emailBody,
          smsVolume: draftResult.smsVolume
        } : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSafetyAlerts(prev => [newAlert, ...prev]);
      triggerSmartphoneDirectNotifications(newAlert);

      setGlobalBannerText({ 
        text: `Successfully broadcasted security dispatch to ${campus.name}. Simulated emergency notifications pushed to active school heads.`, 
        type: 'success' 
      });

      // Clear layout
      setBroadcastTargetCampusId(null);
      setDraftResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Acknowledge safety alerts (+20 points)
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/gamification/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentProfile.id })
      });
      const data = await res.json();
      if (data.success) {
        setGlobalBannerText({ 
          text: `Read & Acknowledged safety brief for active dispatch! Awarded +20 Points.${data.unlockedBadge ? ` 🎉 Unlocked badge: "${data.unlockedBadge}"!` : ''}`, 
          type: 'success' 
        });
        await syncUserState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Interactive filtering of campuses
  const filteredCampuses = useMemo(() => {
    return campuses.filter(campus => {
      const matchesSearch = 
        campus.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        campus.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campus.branchId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion = selectedRegion === 'All' || campus.region === selectedRegion;
      const matchesStatus = selectedStatus === 'All' || campus.operationalStatus === selectedStatus;

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [campuses, searchQuery, selectedRegion, selectedStatus]);

  // Compute active counters
  const stats = useMemo(() => {
    const total = campuses.length;
    const severe = campuses.filter(c => c.operationalStatus === 'Severe Disruption').length;
    const caution = campuses.filter(c => c.operationalStatus === 'Caution').length;
    const operational = campuses.filter(c => c.operationalStatus === 'Operational').length;
    const geofenced = campuses.filter(c => c.hazardEffectId).length;
    return { total, severe, caution, operational, geofenced };
  }, [campuses]);

  // Find currently selected campus context
  const selectedCampus = useMemo(() => {
    return campuses.find(c => c.branchId === selectedCampusId) || null;
  }, [campuses, selectedCampusId]);

  // Load selected details into overrides inputs
  useEffect(() => {
    if (selectedCampus) {
      setOverrideTemp(selectedCampus.weather.temp);
      setOverrideHumidity(selectedCampus.weather.humidity);
      setOverrideAqi(selectedCampus.weather.aqi);
      setOverrideChanceOfRain(selectedCampus.weather.chanceOfRain);
      setOverrideWindSpeed(selectedCampus.weather.windSpeed);
      setOverrideUvIndex(selectedCampus.weather.uvIndex);
    }
  }, [selectedCampusId]);

  // User Profile calculations with transient additions
  const activeUserPoints = useMemo(() => {
    const baseline = currentProfile.points;
    const addition = userStateAdditions[currentProfile.id]?.points || 0;
    return baseline + addition;
  }, [currentProfile, userStateAdditions]);

  const activeUserBadges = useMemo(() => {
    const baseline = currentProfile.badges;
    const customBadges = userStateAdditions[currentProfile.id]?.badges || [];
    const combined = [...baseline];
    customBadges.forEach(b => {
      if (!combined.includes(b)) combined.push(b);
    });
    return combined;
  }, [currentProfile, userStateAdditions]);

  // Dynamic layout design variables based on BSS Navy (#054593) & Secondary Gold (#f2a900)
  const isMidnight = designPreset === 'midnight-tactical';
  const isMinimalist = designPreset === 'minimalist-royal';

  const clBackground = isMidnight 
    ? 'bg-bss-navy-deep text-slate-100' 
    : isMinimalist 
      ? 'bg-bss-gold-glow text-slate-900' 
      : 'bg-slate-50 text-slate-900';

  const clHeader = isMidnight 
    ? 'bg-slate-950 border-b-2 border-bss-gold shadow-[0_4px_25px_rgba(242,169,0,0.12)]' 
    : isMinimalist 
      ? 'bg-white border-b-2 border-bss-gold-light' 
      : 'bg-bss-navy text-white border-b-2 border-bss-gold shadow-md';

  const clHeaderTitle = isMidnight || !isMinimalist ? 'text-white' : 'text-bss-navy';
  const clHeaderText = isMidnight || !isMinimalist ? 'text-slate-200' : 'text-slate-800';
  const clHeaderMuted = isMidnight || !isMinimalist ? 'text-bss-gold-light' : 'text-slate-500';
  const clHeaderBadge = isMidnight 
    ? 'bg-slate-900 text-bss-gold border-bss-gold/50' 
    : isMinimalist 
      ? 'bg-bss-gold-light text-bss-navy-dark border-bss-gold' 
      : 'bg-bss-navy-dark text-bss-gold border-bss-gold';

  const clCard = isMidnight 
    ? 'bg-bss-navy-dark border border-bss-gold/30 shadow-[0_4px_20px_rgba(3,45,96,0.25)] rounded-2xl p-5' 
    : isMinimalist 
      ? 'bg-white border-2 border-bss-gold-light/40 rounded-2xl p-5 shadow-sm' 
      : 'bg-white border border-slate-200 rounded-xl p-4 shadow-xs';

  const clInput = isMidnight 
    ? 'bg-bss-navy-deep border border-bss-gold/20 text-white focus:border-bss-gold rounded-lg px-3 py-2 text-xs outline-none' 
    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-bss-navy rounded-lg px-3 py-2 text-xs outline-none';

  return (
    <div className={`min-h-screen ${clBackground} font-sans antialiased transition-colors duration-300`}>
      {/* GLOBAL BANNER NOTIFICATION */}
      {globalBannerText && (
        <div className={`sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b transition-all duration-300 ${
          globalBannerText.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          globalBannerText.type === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-indigo-50 text-indigo-800 border-indigo-200'
        }`}>
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            {globalBannerText.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" /> :
             globalBannerText.type === 'warn' ? <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" /> :
             <Sparkles className="w-5 h-5 flex-shrink-0 text-indigo-600" />}
            <span className="text-sm font-medium leading-tight">{globalBannerText.text}</span>
          </div>
          <button onClick={() => setGlobalBannerText(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
      )}

      {/* HEADER SECTION WITH BSS SIGNATURE NAVY AND GOLD DESIGN OPTIONS */}
      <header className={`${clHeader} sticky top-0 z-40 transition-all duration-300`}>
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2.5 rounded-lg flex items-center justify-center shadow-md ${
              isMidnight ? 'bg-bss-gold text-slate-950' : 'bg-bss-navy-dark text-bss-gold'
            }`}>
              <Cloud className={`w-6 h-6 ${isMidnight ? 'animate-bounce text-slate-900' : 'animate-pulse text-bss-gold'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                  isMidnight ? 'text-bss-gold' : isMinimalist ? 'text-bss-navy' : 'text-bss-gold'
                }`}>Beaconhouse School System</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border uppercase ${clHeaderBadge}`}>PAKISTAN</span>
              </div>
              <h1 className={`text-lg lg:text-xl font-bold tracking-tight font-display ${clHeaderTitle}`}>
                Meteorological Watchtower <span className={`text-xs font-mono font-bold ml-1 ${
                  isMidnight || !isMinimalist ? 'text-bss-gold-light' : 'text-bss-gold-dark'
                }`}>v2.5 (BMW)</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* BRAND DESIGN OPTIONS SWITCHER */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${
              isMidnight ? 'bg-slate-900 border-bss-gold/30' : isMinimalist ? 'bg-slate-100 border-slate-200' : 'bg-bss-navy-dark border-bss-gold/40'
            }`}>
              <button
                onClick={() => setDesignPreset('corporate')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  designPreset === 'corporate'
                    ? 'bg-bss-navy text-bss-gold shadow-sm ring-1 ring-bss-gold/50'
                    : isMidnight || !isMinimalist ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="BSS Corporate Canvas with Navy display & Gold details"
              >
                💼 Classic
              </button>
              <button
                onClick={() => setDesignPreset('midnight-tactical')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  designPreset === 'midnight-tactical'
                    ? 'bg-bss-gold text-slate-950 shadow-sm'
                    : isMidnight || !isMinimalist ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tactical low-light emergency operations watch deck"
              >
                ⏰ Tactical dark
              </button>
              <button
                onClick={() => setDesignPreset('minimalist-royal')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  designPreset === 'minimalist-royal'
                    ? 'bg-bss-navy text-bss-gold shadow-sm'
                    : isMidnight || !isMinimalist ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Academic Minimalist Cream Canvas style"
              >
                🏆 Minimal Gold
              </button>
            </div>

            {/* Live Synchronizer Button */}
            <button 
              onClick={syncLiveWeatherWithBackend}
              className={`px-3 py-2 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg transition-all ${
                isMidnight 
                  ? 'bg-slate-900 hover:bg-slate-800 text-bss-gold border border-bss-gold/30' 
                  : isMinimalist 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    : 'bg-bss-navy-dark hover:bg-bss-navy-deep text-white border border-bss-gold/30'
              }`}
              title="Resets altered overrides and syncs live Pakistan meteorological grids."
              id="btn-live-sync"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Live Telemetry
            </button>

            {/* Simulated Handset toggle button */}
            <button
              onClick={() => setIsHandsetOpen(!isHandsetOpen)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${
                isHandsetOpen 
                  ? isMidnight ? 'bg-bss-gold text-slate-950 border-bss-gold' : 'bg-bss-gold-light border-bss-gold text-bss-navy-dark font-black'
                  : isMidnight ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              id="btn-toggle-handset"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>BSS Handset</span>
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isHandsetOpen ? 'bg-bss-navy text-white' : 'bg-bss-gold text-slate-950'
              } ml-1`}>
                {mockSmartphoneNotifications.filter(n => !n.read).length}
              </span>
            </button>

            {/* Profile Selector */}
            <div className={`flex items-center gap-2 pl-3 border-l ${
              isMidnight ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="relative">
                <select 
                  onChange={(e) => handleRoleChange(e.target.value)}
                  value={currentProfile.id}
                  className={`border text-xs py-2 pl-2.5 pr-7 rounded-lg outline-none font-bold transition-colors ${
                    isMidnight 
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-bss-gold' 
                      : isMinimalist 
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-bss-navy' 
                        : 'bg-bss-navy-dark border-bss-gold/30 text-white focus:border-bss-gold'
                  }`}
                  id="role-picker-select"
                >
                  {MOCK_USER_PROFILES.map(p => (
                    <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                      {p.name} ({p.role.toUpperCase() === 'READ_ONLY' ? 'Observer' : p.role.replace('_', ' ').substring(0, 11)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* COMPACT SUB-HEADER METRICS GRID */}
      <section className={`transition-colors duration-300 ${
        isMidnight 
          ? 'bg-slate-950 text-white border-b border-slate-900' 
          : isMinimalist 
            ? 'bg-bss-gold-light text-bss-navy-dark border-b border-bss-gold/20' 
            : 'bg-bss-navy-dark text-white border-b border-bss-navy-deep'
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className={isMidnight || !isMinimalist ? 'text-slate-400' : 'text-bss-navy-dark/70'}>Total BSS Campuses:</span>
              <span className={`font-bold text-sm px-2 py-0.5 rounded ${
                isMidnight ? 'bg-slate-900 text-white' : isMinimalist ? 'bg-white text-bss-navy' : 'bg-bss-navy text-bss-gold border border-bss-gold/30'
              }`}>{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
              <span className={isMidnight || !isMinimalist ? 'text-slate-400' : 'text-bss-navy-dark/70'}>Category A Severe:</span>
              <span className="text-rose-500 font-bold text-sm">{stats.severe}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
              <span className={isMidnight || !isMinimalist ? 'text-slate-400' : 'text-bss-navy-dark/70'}>Category B Caution:</span>
              <span className={`${isMidnight || !isMinimalist ? 'text-amber-400' : 'text-amber-600'} font-bold text-sm`}>{stats.caution}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <span className={isMidnight || !isMinimalist ? 'text-slate-400' : 'text-bss-navy-dark/70'}>Operational Safe:</span>
              <span className="text-emerald-500 font-semibold text-sm">{stats.operational}</span>
            </div>
            {stats.geofenced > 0 && (
              <div className={`flex items-center gap-1.5 pl-3 border-l ${
                isMidnight ? 'border-slate-800' : 'border-bss-gold/30'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-500 font-bold font-sans">Geofenced: {stats.geofenced} branches active</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`${isMidnight || !isMinimalist ? 'text-bss-gold' : 'text-bss-navy'} font-bold`}>Logged:</span>
            <span className="font-sans font-bold">{currentProfile.name} ({currentProfile.email})</span>
            <span className={`px-2 py-0.5 rounded font-sans text-[11px] font-black border ${
              isMidnight 
                ? 'bg-bss-gold text-slate-950 border-bss-gold' 
                : isMinimalist 
                  ? 'bg-bss-navy text-white border-bss-navy' 
                  : 'bg-bss-navy text-bss-gold border-bss-gold'
            }`}>
              {activeUserPoints} PTS
            </span>
          </div>
        </div>
      </section>

      {/* CORE FRAME LAYOUT */}
      <main className="max-w-[1600px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* MAIN COLUMN (TELEMETRY + COLLABORATION TABS) */}
          <div className={`xl:col-span-8 space-y-6 ${!isHandsetOpen ? 'xl:col-span-12' : ''} transition-all duration-300`}>
            
            {/* TAB SELECTORS */}
            <div className={`flex items-center justify-between border-b pb-0 ${isMidnight ? 'border-slate-800' : 'border-slate-250'}`}>
              <nav className="flex gap-4">
                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${
                    activeTab === 'telemetry' 
                      ? isMidnight
                        ? 'border-bss-gold text-bss-gold font-black'
                        : isMinimalist
                          ? 'border-bss-navy text-bss-navy font-black'
                          : 'border-bss-gold text-bss-navy font-black'
                      : isMidnight 
                        ? 'border-transparent text-slate-400 hover:text-white' 
                        : 'border-transparent text-slate-500 hover:text-bss-navy'
                  }`}
                  id="tab-telemetry"
                >
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    BSS Meteorological Telemetry
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('dispatches')}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${
                    activeTab === 'dispatches' 
                      ? isMidnight
                        ? 'border-bss-gold text-bss-gold font-black'
                        : isMinimalist
                          ? 'border-bss-navy text-bss-navy font-black'
                          : 'border-bss-gold text-bss-navy font-black'
                      : isMidnight 
                        ? 'border-transparent text-slate-400 hover:text-white' 
                        : 'border-transparent text-slate-500 hover:text-bss-navy'
                  }`}
                  id="tab-dispatches"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Emergency Dispatch Review Queue
                    {safetyAlerts.filter(a => a.status === 'Pending Review').length > 0 && (
                      <span className={`ml-1 rounded-full text-[10px] w-4.5 h-4.5 flex items-center justify-center font-black ${
                        isMidnight ? 'bg-bss-gold text-slate-950 shadow-sm' : 'bg-rose-600 text-white'
                      }`}>
                        {safetyAlerts.filter(a => a.status === 'Pending Review').length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('gamification')}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${
                    activeTab === 'gamification' 
                      ? isMidnight
                        ? 'border-bss-gold text-bss-gold font-black'
                        : isMinimalist
                          ? 'border-bss-navy text-bss-navy font-black'
                          : 'border-bss-gold text-bss-navy font-black'
                      : isMidnight 
                        ? 'border-transparent text-slate-400 hover:text-white' 
                        : 'border-transparent text-slate-500 hover:text-bss-navy'
                  }`}
                  id="tab-gamification"
                >
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Gamification & Field Report Hub
                  </span>
                </button>
              </nav>

              <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isMidnight ? 'text-bss-gold' : 'text-bss-navy'}`}>
                BMW WATCHTOWER OK
              </div>
            </div>

            {/* TAB CONTENT: METEOROLOGICAL TELEMETRY */}
            {activeTab === 'telemetry' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* ADVANCED FILTER BAR */}
                <div className={`${clCard} grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-300`}>
                  <div className="relative">
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider ${isMidnight ? 'text-bss-gold-light' : 'text-slate-500'} mb-1`}>Search Campuses</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Name, City, ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-9 pr-4 py-2.5 w-full ${clInput}`}
                        id="search-campuses-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider ${isMidnight ? 'text-bss-gold-light' : 'text-slate-500'} mb-1`}>Filter Region</label>
                    <select
                      value={selectedRegion}
                      onChange={(e: any) => setSelectedRegion(e.target.value)}
                      className={`w-full font-bold ${clInput}`}
                      id="filter-region-select"
                    >
                      <option value="All" className="text-slate-900">All Regions (3 BCR/BSR/BNR)</option>
                      <option value="Centre" className="text-slate-900">Centre / BCR Region</option>
                      <option value="South" className="text-slate-900">South / BSR Region</option>
                      <option value="North" className="text-slate-900">North / BNR Region</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-extrabold uppercase tracking-wider ${isMidnight ? 'text-bss-gold-light' : 'text-slate-500'} mb-1`}>Filter Operations</label>
                    <select
                      value={selectedStatus}
                      onChange={(e: any) => setSelectedStatus(e.target.value)}
                      className={`w-full font-bold ${clInput}`}
                      id="filter-status-select"
                    >
                      <option value="All" className="text-slate-900">All Status Levels</option>
                      <option value="Operational" className="text-slate-900">Safe - Operational</option>
                      <option value="Caution" className="text-slate-900">Warning - Caution</option>
                      <option value="Severe Disruption" className="text-slate-900">Emergency - Severe Disruption</option>
                    </select>
                  </div>

                  <div className="flex items-end justify-end">
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRegion('All');
                        setSelectedStatus('All');
                      }}
                      className={`px-4 py-2.5 text-xs font-bold rounded-lg w-full transition-all flex items-center justify-center gap-1.5 ${
                        isMidnight 
                          ? 'bg-slate-900 hover:bg-slate-800 text-bss-gold border border-bss-gold/30' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-250'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Clear Filter Metrics
                    </button>
                  </div>
                </div>

                                {/* DISASTER PRESETS PANEL (GEOFENCING CONTROL) */}
                <div className={`p-4 rounded-xl transition-all duration-300 ${
                  isMidnight 
                    ? 'bg-amber-950/20 border border-bss-gold/30 shadow-xs' 
                    : isMinimalist
                      ? 'bg-bss-gold-light/40 border border-bss-gold-dark/30 shadow-xs'
                      : 'bg-amber-50/60 border border-amber-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={`w-5 h-5 ${isMidnight ? 'text-bss-gold' : 'text-amber-600'}`} />
                      <div>
                        <h3 className={`text-sm font-black leading-tight ${isMidnight ? 'text-bss-gold' : 'text-amber-900'}`}>
                          High-Consequence Disaster Presets (12 KM radius geofencing)
                        </h3>
                        <p className={`text-[11px] ${isMidnight ? 'text-slate-300' : 'text-amber-700'}`}>
                          Flag surrounding BSS campuses within Category A when regional environmental disasters are activated.
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase self-start sm:self-auto ${
                      isMidnight 
                        ? 'bg-slate-900 text-bss-gold border border-bss-gold/40' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>SAFETY DRILLS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DISASTER_PRESETS.map(preset => {
                      const isActive = !!disasterPresetsActive[preset.id];
                      return (
                        <div 
                          key={preset.id} 
                          className={`p-3 rounded-lg border transition-all ${
                            isActive 
                              ? isMidnight 
                                ? 'bg-rose-950/50 border-rose-500 shadow-sm text-white' 
                                : 'bg-rose-50 border-rose-300 shadow-sm' 
                              : isMidnight 
                                ? 'bg-slate-900/60 border-slate-800 text-slate-300' 
                                : 'bg-white border-slate-250 opacity-95'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                <h4 className={`text-xs font-bold ${isMidnight ? 'text-white' : 'text-slate-900'}`}>{preset.city} {preset.hazardType}</h4>
                              </div>
                              <p className={`text-[10px] mt-0.5 line-clamp-1 ${isMidnight ? 'text-slate-400' : 'text-slate-500'}`}>{preset.description}</p>
                            </div>
                            
                            <button
                              onClick={() => handleDisasterToggle(preset.id, isActive)}
                              className={`px-2 py-1 rounded text-[10px] font-black shrink-0 transition-colors ${
                                isActive 
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                  : isMidnight 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Activate Drill'}
                            </button>
                          </div>
                          
                          {isActive && (
                            <div className={`mt-2 text-[10px] font-bold font-mono flex items-center gap-1 px-2 py-0.5 rounded ${
                              isMidnight ? 'text-rose-400 bg-rose-950/40' : 'text-rose-700 bg-rose-100'
                            }`}>
                              <ShieldCheck className="w-3 h-3 text-rose-500" />
                              Auto dispatch activated - 12 KM geofence
                            </div>
                          )}
                        </div>
                      );
                    })}
                                 {/* THE 210 CAMPUSES CLUSTER SVG VISUALIZATION (Interactive view of Pakistan branches) */}
                <div className={`${clCard} p-5 transition-all duration-300`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className={`text-sm font-black ${isMidnight ? 'text-bss-gold' : 'text-slate-900'}`}>National BSS Micro-Stations Layout Clusters</h3>
                      <p className={`text-xs ${isMidnight ? 'text-slate-300' : 'text-slate-500'}`}>Interactive map approximation showcasing density hotspots across Pakistan (North, Centre & South Regions).</p>
                    </div>
                    <div className={`flex gap-4 font-mono text-[10px] p-2.5 rounded-lg border ${
                      isMidnight ? 'bg-slate-900 border-brass/25 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Operational</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Caution</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Severe</span>
                    </div>
                  </div>

                  {/* SVG Map of Pakistan */}
                  <div className={`relative ${isMidnight ? 'bg-slate-950/40 border-slate-800' : 'bg-indigo-50/25 border-slate-100'} border rounded-xl overflow-hidden py-4 flex items-center justify-center min-h-[380px] transition-all`}>
                    <div className={`absolute top-4 left-4 backdrop-blur-xs p-2.5 rounded-lg border text-[10px] space-y-1 z-10 ${
                      isMidnight ? 'bg-slate-900/95 text-slate-200 border-slate-800' : 'bg-white/90 border-slate-150 text-slate-700'
                    }`}>
                      <div className={`font-extrabold uppercase tracking-wider border-b pb-0.5 mb-1 ${isMidnight ? 'text-bss-gold border-slate-850' : 'text-slate-650'}`}>Regional Coordinates Range</div>
                      <div className="flex items-center justify-between gap-6"><span>North (BNR) Campuses:</span><span className={`font-mono font-bold ${isMidnight ? 'text-white' : 'text-slate-750'}`}>~80 stations</span></div>
                      <div className="flex items-center justify-between gap-6"><span>Centre (BCR) Campuses:</span><span className={`font-mono font-bold ${isMidnight ? 'text-white' : 'text-slate-750'}`}>~80 stations</span></div>
                      <div className="flex items-center justify-between gap-6"><span>South (BSR) Campuses:</span><span className={`font-mono font-bold ${isMidnight ? 'text-white' : 'text-slate-750'}`}>~50 stations</span></div>
                    </div>

                    <svg viewBox="0 0 800 500" className="w-full max-w-2xl h-auto" style={{ maxHeight: '380px' }}>
                      {/* Outline map of Pakistan provinces coordinates approximated */}
                      {/* Coastal South Sindh / Balochistan */}
                      <path d="M 120,440 L 160,420 L 220,425 L 300,435 L 340,380 L 320,330 L 250,300 L 180,310 L 100,340 Z" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                      {/* Central Punjab / Southern KP */}
                      <path d="M 320,330 L 390,290 L 450,280 L 480,210 L 410,180 L 330,220 L 250,300 Z" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                      {/* Northern Gilgit / Azad Kashmir / KP */}
                      <path d="M 450,210 L 480,150 L 520,120 L 500,80 L 420,110 L 380,160 Z" fill="none" stroke="#e2e8f0" strokeWidth="2" />

                      {/* Pakistan Rivers/Sea mock line for visual styling */}
                      <path d="M 300,435 Q 260,350 350,280 T 450,150" fill="none" stroke="#dbeafe" strokeWidth="2" />

                      {/* Render Disaster presets on map and visual geofence radius rings */}
                      {DISASTER_PRESETS.map(preset => {
                        const isActive = disasterPresetsActive[preset.id];
                        // Map coordinates roughly
                        let x = 380;
                        let y = 160;
                        if (preset.city === 'Lahore') { x = 440; y = 220; }
                        else if (preset.city === 'Islamabad') { x = 460; y = 140; }
                        else if (preset.city === 'Karachi') { x = 200; y = 420; }

                        return (
                          <g key={preset.id}>
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={isActive ? "28" : "15"} 
                              className={`fill-none stroke-2 ${isActive ? 'stroke-rose-500 animate-pulse' : 'stroke-slate-300'}`} 
                              strokeDasharray={isActive ? "none" : "3 3"}
                            />
                            <circle cx={x} cy={y} r="5" className={isActive ? 'fill-rose-600' : 'fill-slate-400'} />
                            <text x={x + 8} y={y + 4} className="text-[10px] font-sans font-extrabold fill-slate-500" pointerEvents="none">
                              {preset.city} ({preset.hazardType})
                            </text>
                          </g>
                        );
                      })}

                      {/* Map Campuses randomly spaced into regions to represent live state */}
                      {filteredCampuses.slice(0, 110).map((campus, idx) => {
                        // Project Lat-Long dynamically to SVG x-y coordinate system
                        // Pakistan coords ranges roughly: Lat 24 (Karachi) to 36 (North), Long 61 (West) to 76 (East)
                        // Lat mapping: 24 is y=440, 36 is y=80
                        // Long mapping: 61 is x=100, 76 is x=520
                        const x = 100 + ((campus.longitude - 61) / (76 - 61)) * 420;
                        const y = 440 - ((campus.latitude - 24) / (36 - 24)) * 360;

                        // Color of dot
                        let dotColor = 'fill-emerald-500';
                        if (campus.operationalStatus === 'Severe Disruption') dotColor = 'fill-rose-500 animate-ping';
                        else if (campus.operationalStatus === 'Caution') dotColor = 'fill-amber-500';

                        // Check if current campus coordinates make sense, if out of range, bound it
                        const safeX = Math.max(50, Math.min(750, x));
                        const safeY = Math.max(50, Math.min(450, y));

                        const isSelected = selectedCampusId === campus.branchId;

                        return (
                          <g 
                            key={campus.branchId} 
                            onClick={() => setSelectedCampusId(campus.branchId)}
                            className="cursor-pointer group"
                          >
                            {isSelected && (
                              <circle cx={safeX} cy={safeY} r="9" className="fill-none stroke-2 stroke-indigo-600" />
                            )}
                            <circle 
                              cx={safeX} 
                              cy={safeY} 
                              r={isSelected ? "5" : "3.5"} 
                              className={`${dotColor} hover:scale-150 transition-transform`} 
                            />
                            <title>{campus.name} | Temp: {campus.weather.temp}°C | {campus.operationalStatus}</title>
                          </g>
                        );
                      })}
                    </svg>

                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[9px] text-slate-500 rounded border border-slate-100">
                      *Representing {filteredCampuses.length} active matching micro-stations. Click dots to examine.
                    </div>
                  </div>
                </div>

                {/* THE TELEMETRY CARDS LIST / GRID */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      BSS Branch Operations Grids ({filteredCampuses.length} Campuses Matching)
                    </h3>
                    <div className="text-xs text-slate-500">
                      Showing results across Pakistan
                    </div>
                  </div>

                  {filteredCampuses.length === 0 ? (
                    <div className="bg-white rounded-xl py-12 px-4 shadow-3xs text-center border border-slate-200">
                      <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No school campuses found matching filter criteria.</p>
                      <p className="text-xs text-slate-500 mt-1">Please clarify your geographic search tags or select all regions.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCampuses.slice(0, 30).map(campus => {
                        const isSelected = selectedCampusId === campus.branchId;
                        return (
                          <div 
                            key={campus.branchId}
                            onClick={() => setSelectedCampusId(campus.branchId)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? isMidnight
                                  ? 'bg-slate-900 border-bss-gold ring-2 ring-bss-gold/30 shadow-md' 
                                  : isMinimalist
                                    ? 'bg-bss-gold-light/40 border-bss-navy ring-2 ring-bss-navy/20'
                                    : 'bg-indigo-50/40 border-bss-navy ring-2 ring-bss-gold/50 shadow-sm' 
                                : isMidnight 
                                  ? 'bg-slate-900/40 border-slate-850 hover:border-slate-800 shadow-3xs' 
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-3xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                    isMidnight ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {campus.branchId}
                                  </span>
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                    campus.region === 'Centre' ? 'bg-indigo-100 text-indigo-800' :
                                    campus.region === 'South' ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-sky-100 text-sky-800'
                                  }`}>
                                    {campus.region === 'Centre' ? 'BCR' : campus.region === 'South' ? 'BSR' : 'BNR'}
                                  </span>
                                  <span className={`text-xs font-semibold ${isMidnight ? 'text-slate-400' : 'text-slate-500'}`}>{campus.city}</span>
                                </div>
                                <h4 className={`font-bold mt-1.5 ${isMidnight ? 'text-white' : 'text-slate-900'}`}>{campus.name.split(' - ')[1]}</h4>
                              </div>
                              
                              <div className="flex flex-col items-end gap-1.5">
                                {getStatusBadge(campus.operationalStatus)}
                                <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {getWeatherIcon(campus)}
                                  <span>{campus.weather.temp}°C</span>
                                </div>
                              </div>
                            </div>

                            {/* Weather parameters spark list */}
                            <div className={`grid grid-cols-5 gap-1 mt-3.5 pt-3.5 border-t text-[10px] font-mono text-center ${
                              isMidnight ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
                            }`}>
                              <div>
                                <span className="block text-slate-400">AQI</span>
                                <span className={`font-bold ${campus.weather.aqi > 200 ? 'text-amber-600' : isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {campus.weather.aqi}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Rain %</span>
                                <span className={`font-bold ${isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>{campus.weather.chanceOfRain}%</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Hum%</span>
                                <span className={`font-bold ${isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>{campus.weather.humidity}%</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Wind</span>
                                <span className={`font-bold ${isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>{campus.weather.windSpeed}k/h</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">UV</span>
                                <span className={`font-bold ${isMidnight ? 'text-slate-200' : 'text-slate-800'}`}>{campus.weather.uvIndex}</span>
                              </div>
                            </div>

                            {campus.manualOverride && (
                              <div className="mt-3 bg-indigo-50/50 border border-indigo-100 text-[9px] text-indigo-800 p-2 rounded-lg flex items-start gap-1">
                                <Sliders className="w-3 h-3 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block">Manual Admin Override Active</span>
                                  <span className="text-slate-500 italic">"{campus.overrideReason}"</span>
                                </div>
                              </div>
                            )}

                            {campus.hazardEffectId && (
                              <div className="mt-3 bg-rose-50 border border-rose-100 text-[9px] text-rose-800 p-2 rounded-lg flex items-start gap-1 uppercase font-bold animate-pulse">
                                <ShieldAlert className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span>Active Emergency: {campus.hazardEffectId} disruption alert</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredCampuses.length > 30 && (
                    <div className="text-center py-2 text-xs text-slate-400">
                      *Showing first 30 BSS branches. Use the geographic filter tags to refine list.
                    </div>
                  )}
                </div>

              </div>
              </div>
              </div>
            )}

            {/* TAB CONTENT: EMERGENCY DISPATCH REVIEW QUEUE */}
            {activeTab === 'dispatches' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* HEADLINES */}
                <div className={`${clCard} transition-all duration-300`}>
                  <h3 className={`text-sm font-black flex items-center gap-2 mb-2 ${isMidnight ? 'text-bss-gold' : 'text-slate-950'}`}>
                    <ShieldAlert className={`w-5 h-5 ${isMidnight ? 'text-bss-gold' : 'text-indigo-600'}`} />
                    BSS Regional Emergency dispatches review line (Category B Holds)
                  </h3>
                  <p className={`text-xs ${isMidnight ? 'text-slate-300' : 'text-slate-500'}`}>
                    Category B ("Caution" weather hazards, such as moderate rain/fog indicators) holds the broadcast alerts in this Review Queue. Admins must authorize or dismiss. Category A (Severe Emergency weather) automatically dispatches notifications instantly.
                  </p>
                </div>

                {/* REVIEW LIST */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Active Review Roster</h4>
                  
                  {safetyAlerts.filter(a => a.status === 'Pending Review').length === 0 ? (
                    <div className={`${clCard} py-12 px-4 text-center text-slate-500 text-xs transition-all duration-300`}>
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <span className={isMidnight ? 'text-white font-bold' : 'text-slate-800 font-semibold'}>
                        All Category B environmental hazards have been cleared or reviewed. No items pending.
                      </span>
                    </div>
                  ) : (
                    safetyAlerts.filter(a => a.status === 'Pending Review').map(alert => {
                      return (
                        <div key={alert.id} className={`${clCard} space-y-4 transition-all duration-300`}>
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                  isMidnight 
                                    ? 'bg-slate-900 text-bss-gold border border-bss-gold/30' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  Category B Pending Approval
                                </span>
                                <span className="text-xs text-slate-400 font-mono">{alert.timestamp}</span>
                                <span className={`text-xs font-semibold px-1.5 py-0.2 rounded font-mono ${
                                  isMidnight ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-500'
                                }`}>{alert.region} Region</span>
                              </div>
                              <h5 className={`font-bold text-sm mt-2 ${isMidnight ? 'text-white' : 'text-slate-900'}`}>{alert.title}</h5>
                              <p className={`text-xs mt-1 ${isMidnight ? 'text-slate-300' : 'text-slate-600'}`}>{alert.message}</p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleModerateAlert(alert.id, 'Dismissed')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  isMidnight 
                                    ? 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                Dismiss Alert
                              </button>
                              <button
                                onClick={() => handleModerateAlert(alert.id, 'Broadcasted')}
                                className={`px-3.5 py-1.5 text-xs font-black rounded-lg flex items-center gap-1 transition-all ${
                                  isMidnight 
                                    ? 'bg-bss-gold hover:bg-bss-gold-light text-slate-950 shadow-sm' 
                                    : 'bg-bss-navy hover:bg-bss-navy-dark text-white'
                                }`}
                              >
                                <Send className="w-3 h-3" />
                                Approve & Broadcast
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* HISTORICAL BROADCAST LOGS */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Historically Broadcasted Notices</h4>
                  
                  {safetyAlerts.filter(a => a.status === 'Broadcasted').length === 0 ? (
                    <div className={`${clCard} py-8 text-center text-slate-405 text-xs transition-all duration-300`}>
                      No safety announcements dispatched yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {safetyAlerts.filter(a => a.status === 'Broadcasted').map(alert => {
                        return (
                          <div key={alert.id} className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all duration-300 ${
                            isMidnight 
                              ? 'bg-slate-950 border-bss-gold/20 text-white' 
                              : 'bg-slate-900 text-white border-slate-800'
                          }`}>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                                <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-red-950 text-red-400 border border-red-900 uppercase">
                                  {alert.severity === 'A' ? 'Severe Category A Broadcasted' : 'Category B Approved'}
                                </span>
                                <span className="text-slate-400">{alert.timestamp}</span>
                                <span className="text-slate-500 font-bold">Region: {alert.region}</span>
                              </div>
                              <h5 className="font-sans font-bold text-xs leading-snug">{alert.title}</h5>
                              <p className="text-[11px] text-slate-300 leading-normal font-sans italic">"{alert.message.substring(0, 150)}..."</p>
                            </div>

                            {/* Acknowledge trigger for points */}
                            <button
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className={`text-[10px] py-1 px-2.5 rounded hover:bg-opacity-90 transition-all uppercase font-extrabold shrink-0 ${
                                isMidnight 
                                  ? 'bg-slate-900 border border-bss-gold/30 text-bss-gold' 
                                  : 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                              }`}
                            >
                              +20 ACKNOWLEDGE BRIEF
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: GAMIFICATION & FIELD REPORT HUB */}
            {activeTab === 'gamification' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* ACTIVE PROFILE OVERVIEW */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 flex items-center gap-4">
                    <img 
                      src={currentProfile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                      alt="Avatar" 
                      className="w-16 h-16 rounded-full border-2 border-indigo-100 shadow-3xs"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">STAFF PORTAL</span>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded font-extrabold border border-indigo-200 uppercase">
                          {currentProfile.role.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{currentProfile.name}</h3>
                      <p className="text-xs text-slate-400">{currentProfile.email}</p>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-slate-900 text-white p-4 rounded-xl text-center space-y-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total Safety score</span>
                    <span className="block font-mono font-extrabold text-2xl text-indigo-300 tracking-tight">{activeUserPoints} PTS</span>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-slate-800">
                      {activeUserBadges.map(b => (
                        <span 
                          key={b} 
                          className="bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-indigo-200 font-extrabold border border-slate-700"
                        >
                          🏅 {b}
                        </span>
                      ))}
                      {activeUserBadges.length === 0 && <span className="text-[10px] text-slate-500 italic">No badges earned yet.</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CROWD-SOURCE INCIDENT FEEDBACK FORM */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        Lodge Crowdfield Incident Report
                      </h4>
                      <p className="text-xs text-slate-500">Provide direct telemetry fields on physical hazards (Hefty Smog, flash flooding, etc.). BSS Staff @bh.edu.pk email required.</p>
                    </div>

                    <form onSubmit={handleCrowdReportSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Select Campus</label>
                        <select
                          value={crowdCampusId}
                          onChange={(e) => setCrowdCampusId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none focus:border-indigo-500 font-semibold text-slate-800"
                          id="crowd-campus-select"
                        >
                          {campuses.map(c => (
                            <option key={c.branchId} value={c.branchId}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Sumaiya Zohaib"
                            value={crowdReporterName}
                            onChange={(e) => setCrowdAporterName(e.target.value)}
                            className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                            id="crowd-reporter-name-input"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">BSS Email (@bh.edu.pk)</label>
                          <input
                            type="email"
                            required
                            placeholder="staff@bh.edu.pk"
                            value={crowdReporterEmail}
                            onChange={(e) => setCrowdReporterEmail(e.target.value)}
                            className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                            id="crowd-reporter-email-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Hazard Category</label>
                          <select
                            value={crowdHazardType}
                            onChange={(e) => setCrowdHazardType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none text-slate-800"
                            id="crowd-hazard-select"
                          >
                            <option value="Smog">Heavy Smog</option>
                            <option value="Flash Flood">Margalla Flash Flood / Runoff</option>
                            <option value="Heatwave">Coastal High Heatwave</option>
                            <option value="Extreme Rain">Torrential Rainy Burst</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Observed Temp (°C)</label>
                          <input
                            type="number"
                            min="10"
                            max="50"
                            value={crowdTemp}
                            onChange={(e) => setCrowdTemp(parseInt(e.target.value) || 30)}
                            className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Observed Air AQI</label>
                          <input
                            type="number"
                            min="10"
                            max="600"
                            value={crowdAqi}
                            onChange={(e) => setCrowdAqi(parseInt(e.target.value) || 150)}
                            className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Humidity %</label>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={crowdHumidity}
                            onChange={(e) => setCrowdHumidity(parseInt(e.target.value) || 60)}
                            className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Description / Physical Hazard Report</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Localized thick smog around Johar Town sports fields has reduced visibility. Respiratory discomfort observed."
                          value={crowdDescription}
                          onChange={(e) => setCrowdDescription(e.target.value)}
                          className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-xs outline-none w-full"
                          id="crowd-desc-textarea"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingCrowd}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg w-full transition-colors flex items-center justify-center gap-1.5"
                      >
                        {submittingCrowd ? 'Submitting telemetry ticket...' : 'Submit Incident Report (+100 PTS potential)'}
                      </button>

                      {crowdFeedback && (
                        <div className={`p-3 rounded-lg text-xs font-medium border ${
                          crowdFeedback.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {crowdFeedback.message}
                        </div>
                      )}
                    </form>
                  </div>

                  {/* STAFF TELEMETRY REPORTS MODERATION QUEUE */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                        <Sliders className="w-5 h-5 text-indigo-600" />
                        HSEQ Incident Moderation Queue
                      </h4>
                      <p className="text-xs text-slate-500">Administrators check and endorse localized staff field reports. Dismissal deletes safety ticket; endorsement awards +100 points, unlocks "Weather Hero" Badge and pushes live weather modifies.</p>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                      {incidentReports.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-12">No field incident observation reports filed yet.</p>
                      ) : (
                        incidentReports.map(report => (
                          <div key={report.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{report.timestamp}</span>
                              <span className={`text-[9px] px-1.5 rounded-full font-bold ${
                                report.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                report.status === 'Dismissed' ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {report.status}
                              </span>
                            </div>

                            <div className="text-xs">
                              <span className="font-bold text-slate-900 block">{report.campusName}</span>
                              <span className="text-[10px] text-slate-500">Reporter: {report.reporterName} ({report.reporterEmail})</span>
                              <div className="text-slate-800 bg-white border border-slate-100 p-2 rounded-md mt-1 italic text-[11px]">
                                "{report.description}"
                              </div>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              <span>Temp: {report.reportedWeather.temp}°C</span>
                              <span>AQI: {report.reportedWeather.aqi}</span>
                              <span>Rain: {report.reportedWeather.chanceOfRain}%</span>
                            </div>

                            {report.status === 'Pending' && (
                              <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                                <button
                                  onClick={() => handleModerateIncident(report.id, 'Dismissed')}
                                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded"
                                >
                                  Dismiss Report
                                </button>
                                <button
                                  onClick={() => handleModerateIncident(report.id, 'Approved')}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold rounded"
                                >
                                  Approve & Award
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ROSTER LEADERBOARD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-500" />
                    BSS Meteorological Safety Leaderboard
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_USER_PROFILES.map(regUser => {
                      // Check transient addition states
                      const addPoints = userStateAdditions[regUser.id]?.points || 0;
                      const addBadges = userStateAdditions[regUser.id]?.badges || [];
                      const totPoints = regUser.points + addPoints;
                      const activeBadges = [...regUser.badges];
                      addBadges.forEach(b => {
                        if (!activeBadges.includes(b)) activeBadges.push(b);
                      });

                      const isSelf = currentProfile.id === regUser.id;

                      return (
                        <div 
                          key={regUser.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                            isSelf 
                              ? 'bg-indigo-50/50 border-indigo-400' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img src={regUser.avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs text-slate-900 leading-tight">{regUser.name}</span>
                                {isSelf && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">You</span>}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium block">{regUser.email}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activeBadges.map(b => (
                                  <span key={b} className="bg-white text-[8px] text-slate-600 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                                    🎖️ {b}
                                  </span>
                                ))}
                                {activeBadges.length === 0 && <span className="text-[9px] text-slate-400 italic">No safety badges yet</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right whitespace-nowrap">
                            <span className="font-mono text-xs font-extrabold text-slate-800 block">{totPoints} PTS</span>
                            <span className="text-[9px] text-slate-400 block font-mono">Role: {regUser.role.substring(0, 10)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* SIDE PANEL: CAMPUS MANAGEMENT CENTER */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* NO CAMPUS SELECTED STATE */}
            {!selectedCampus && (
              <div className={`${clCard} p-6 text-center space-y-4 transition-all duration-300`}>
                <div className={`p-4 rounded-full inline-block mx-auto ${isMidnight ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-50 text-slate-400'}`}>
                  <Building className={`w-8 h-8 animate-pulse ${isMidnight ? 'text-bss-gold' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isMidnight ? 'text-white' : 'text-slate-900'}`}>School Branch Console Panel</h3>
                  <p className={`text-xs mt-1 max-w-xs mx-auto ${isMidnight ? 'text-slate-300' : 'text-slate-500'}`}>
                    Select any BSS campus station from the national micro-stations grid or operations list to access overrides, real-time metrics, hazard status, and trigger generative safety bulletins.
                  </p>
                </div>
                <div className={`p-3 rounded-xl text-left border ${
                  isMidnight ? 'bg-slate-950/40 border-slate-850 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                }`}>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${
                    isMidnight ? 'text-bss-gold-light' : 'text-indigo-800'
                  }`}>PRO-TIP FOR ADMINS</span>
                  <span className="text-[10px] leading-relaxed block">
                    Switch user account role credentials in the top right to act as a Regional Core Admin (BCR/BSR/BNR) or national Head of Safety (Aymen Abdullah).
                  </span>
                </div>
              </div>
            )}

            {/* CAMPUS SELECTED CONSOLE */}
            {selectedCampus && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-slide-in">
                
                {/* Header overview */}
                <div className="p-4 bg-slate-900 text-white flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 px-2 py-0.2 rounded">
                        {selectedCampus.branchId}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Region: {selectedCampus.region} / {selectedCampus.region === 'Centre' ? 'BCR' : selectedCampus.region === 'South' ? 'BSR' : 'BNR'}</span>
                    </div>
                    <h3 className="font-bold text-sm tracking-tight mt-1">{selectedCampus.name}</h3>
                    <p className="text-xs text-slate-400">{selectedCampus.city}, Pakistan</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCampusId(null)} 
                    className="p-1 hover:bg-white/10 rounded"
                    title="Close preview"
                  >
                    <X className="w-4 h-4 cursor-pointer" />
                  </button>
                </div>

                {/* Sub-coordinates info */}
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    Coords: {selectedCampus.latitude.toFixed(4)}N, {selectedCampus.longitude.toFixed(4)}E
                  </span>
                  <span>Operational: {selectedCampus.operationalStatus}</span>
                </div>

                <div className="p-4 space-y-6">
                  
                  {/* Current conditions listing */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Current Meteorological Telemetry</h4>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-slate-800">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">AIR TEMP</span>
                        <span className="text-sm font-bold block">{selectedCampus.weather.temp}°C</span>
                        <span className="text-[8px] text-slate-400 block font-mono">Sensible</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">PAK AQI</span>
                        <span className={`text-sm font-bold block ${selectedCampus.weather.aqi > 200 ? 'text-amber-600' : ''}`}>{selectedCampus.weather.aqi}</span>
                        <span className="text-[8px] text-slate-400 block font-mono">PM2.5 index</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">RAIN CHANCE</span>
                        <span className="text-sm font-bold block">{selectedCampus.weather.chanceOfRain}%</span>
                        <span className="text-[8px] text-slate-400 block font-mono">Precipitation</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-slate-800 mt-2">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">HUMIDITY</span>
                        <span className="text-xs font-extrabold block">{selectedCampus.weather.humidity}%</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">WIND SPEED</span>
                        <span className="text-xs font-extrabold block">{selectedCampus.weather.windSpeed} km/h</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">UV INDEX</span>
                        <span className="text-xs font-extrabold block">{selectedCampus.weather.uvIndex}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-slate-800">Safety Status Evaluation:</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 pl-5">
                        {selectedCampus.operationalStatus === 'Severe Disruption' ? (
                          <>
                            <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                            <span className="font-semibold text-rose-800">Severe Disruption triggered (Immediate broadcast alerts dispatch)</span>
                          </>
                        ) : selectedCampus.operationalStatus === 'Caution' ? (
                          <>
                            <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" />
                            <span className="font-semibold text-amber-800">Caution level active (Retained in safety reviews queue)</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                            <span className="font-semibold text-emerald-800">Operational safe meteorological levels</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ADMIN ADJUSTMENT / MANUAL OVERRIDERS PANEL */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-700 flex items-center gap-1">
                        <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                        Manual Metrics Override Core
                      </h4>
                      <span className="text-[9px] text-slate-400 font-mono">Scoped permissions</span>
                    </div>

                    {/* Show override warning if user has no scope */}
                    {currentProfile.role !== 'super_admin' && (
                      currentProfile.role === 'regional_admin' ? (
                        currentProfile.region !== selectedCampus.region ? (
                          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-800">
                            🚫 Regional Authority Scoped. Your BCR/BSR/BNR clearance is for <strong>{currentProfile.region} Region</strong>. This campus lies in <strong>{selectedCampus.region}</strong>. Override disabled.
                          </div>
                        ) : (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-800">
                            ✅ Area Clear. Your Regional Authority covers BCR/BSR/BNR of <strong>{selectedCampus.region}</strong>. Edit access granted.
                          </div>
                        )
                      ) : (
                        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800">
                          🔒 Observer status active. Please switch profiles to Super Admin/Regional Admin in top-right to override metrics.
                        </div>
                      )
                    )}

                    {currentProfile.role === 'super_admin' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-800">
                        ⭐ Super Admin (HSEQ Core). You have global access clearance to override all 210 school branches globally.
                      </div>
                    )}

                    {/* FORM INPUTS */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 font-bold mb-0.5">Air Temp Overide (°C)</label>
                          <input 
                            type="number"
                            value={overrideTemp} 
                            onChange={(e) => setOverrideTemp(parseInt(e.target.value) || 30)}
                            min="-10" 
                            max="55"
                            disabled={currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true)}
                            className="bg-white border rounded p-1.5 text-xs w-full font-bold font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-bold mb-0.5">PAK AQI Index Override</label>
                          <input 
                            type="number"
                            value={overrideAqi} 
                            onChange={(e) => setOverrideAqi(parseInt(e.target.value) || 120)}
                            min="10" 
                            max="600"
                            disabled={currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true)}
                            className="bg-white border rounded p-1.5 text-xs w-full font-bold font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 font-bold mb-0.5">Humidity %</label>
                          <input 
                            type="number"
                            value={overrideHumidity} 
                            onChange={(e) => setOverrideHumidity(parseInt(e.target.value) || 60)}
                            min="0" 
                            max="100"
                            disabled={currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true)}
                            className="bg-white border rounded p-1.5 text-xs w-full font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-bold mb-0.5">Rain Prob %</label>
                          <input 
                            type="number"
                            value={overrideChanceOfRain} 
                            onChange={(e) => setOverrideChanceOfRain(parseInt(e.target.value) || 40)}
                            min="0" 
                            max="100"
                            disabled={currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true)}
                            className="bg-white border rounded p-1.5 text-xs w-full font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-0.5">Action Override Reason Text</label>
                        <input 
                          type="text" 
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Localized thermal burst affecting classroom operations."
                          disabled={currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true)}
                          className="bg-white border rounded p-1.5 text-xs w-full outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        onClick={() => handleManualOverrideSubmit(selectedCampus.branchId)}
                        disabled={submittingOverride || (currentProfile.role !== 'super_admin' && (currentProfile.role === 'regional_admin' ? currentProfile.region !== selectedCampus.region : true))}
                        className="w-full bg-slate-900 hover:bg-black text-white py-1.5 text-xs rounded-lg font-bold transition-colors shadow-3xs"
                      >
                        {submittingOverride ? 'Updating school metrics...' : 'Save Manual Override Metrics'}
                      </button>
                    </div>
                  </div>

                  {/* GENERATIVE AI SAFETY DISPATCH GENERATOR */}
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-950 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-indigo-700 animate-pulse" />
                        AI Communications Director
                      </h4>
                      <span className="text-[10px] text-indigo-600 bg-white border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold">GEMINI 2.5</span>
                    </div>

                    <p className="text-[11px] text-indigo-800 leading-normal">
                      Leverage context-aware server-side LLM services to draft professional bulletin notifications matching raw hazard telemetry for parents and drivers.
                    </p>

                    <button
                      onClick={() => handleDraftAlertWithGemini(selectedCampus)}
                      disabled={draftingAi}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-3xs"
                    >
                      {draftingAi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Consulting Gemini models...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Safety Bulletin Draft
                        </>
                      )}
                    </button>

                    {aiError && (
                      <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-800">
                        {aiError}
                      </div>
                    )}

                    {/* DRIFTS PREVIEW LOGS */}
                    {draftResult && (
                      <div className="space-y-3 pt-3.5 border-t border-indigo-200/50 animate-fade-in text-xs">
                        {draftResult.fallback && (
                          <span className="text-[9px] text-amber-600 font-extrabold font-mono uppercase bg-amber-150 px-2 py-0.5 rounded">
                            Notice: Local Copy Safebuffer Triggered
                          </span>
                        )}

                        <div className="bg-white p-3 rounded-lg border border-indigo-100 space-y-2">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">1. Subject Line (Matches Hazard with Emoji)</span>
                            <span className="text-sm font-bold text-slate-900 block leading-tight">{draftResult.subject}</span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">2. Empathetic Email Body</span>
                            <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-normal font-sans border-t border-slate-50 pt-1">
                              {draftResult.emailBody}
                            </p>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">3. 140-Char Notification (SMS & WhatsApp optimized)</span>
                            <p className="text-[11px] text-indigo-950 font-mono bg-indigo-50 p-2 rounded border border-indigo-150">
                              {draftResult.smsVolume}
                            </p>
                          </div>
                        </div>

                        {/* BROADCAST CONTROL TRIGGERS */}
                        <div className="bg-white border rounded-xl p-3.5 space-y-3">
                          <span className="text-[10px] font-extrabold uppercase text-slate-600 block">Commit Emergency Broadcasting</span>
                          
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-semibold py-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={smsDeliveryActive} 
                                onChange={(e) => setSmsDeliveryActive(e.target.checked)}
                              />
                              SMS
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={whatsappDeliveryActive} 
                                onChange={(e) => setWhatsappDeliveryActive(e.target.checked)}
                              />
                              WhatsApp
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={emailDeliveryActive} 
                                onChange={(e) => setEmailDeliveryActive(e.target.checked)}
                              />
                              GSuite
                            </label>
                          </div>

                          <button
                            onClick={() => {
                              setBroadcastTargetCampusId(selectedCampus.branchId);
                              handleBroadcastCommit();
                            }}
                            disabled={sendingBroadcast}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {sendingBroadcast ? 'Dispatching broadcasts...' : 'Approve & Push Live Broadcasts'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: FULL-SCREEN INTERACTIVE MOCK SMARTPHONE */}
          {isHandsetOpen && (
            <div className="xl:col-span-4" id="section-mock-smartphone">
              <div className="sticky top-24">
                
                {/* Smartphone Container frame */}
                <div className="bg-slate-900 text-slate-800 p-4.5 rounded-[40px] shadow-2xl border-4 border-slate-800 max-w-[340px] mx-auto min-h-[580px] relative flex flex-col justify-between">
                  {/* Speaker and Camera notch at top */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-850 h-5 w-32 rounded-b-2xl flex items-center justify-center gap-2 z-30">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></span>
                    <span className="w-12 h-1 bg-slate-900 rounded-full"></span>
                  </div>

                  {/* SCREEN */}
                  <div className="bg-slate-100 rounded-[28px] flex-1 overflow-hidden flex flex-col pt-6 relative border border-slate-800">
                    
                    {/* Status bar */}
                    <div className="px-5 py-1 flex items-center justify-between text-[10px] font-bold text-slate-600 leading-none">
                      <span>BSS-NET LTE</span>
                      <span>10:30 AM</span>
                      <div className="flex items-center gap-1">
                        <Wind className="w-2.5 h-2.5" />
                        <span>🔋 98%</span>
                      </div>
                    </div>

                    {/* Smartphone Screen Header logo */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4.5 h-4.5 text-indigo-400" />
                        <span className="font-extrabold text-[11px] uppercase tracking-wider font-display">BMW Client Notify</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">BSS School Head</span>
                    </div>

                    {/* Tabs on handset */}
                    <div className="grid grid-cols-3 text-center border-b text-[10px] bg-white font-bold">
                      <button 
                        onClick={() => setActiveHandsetTab('sms')}
                        className={`py-2 flex items-center justify-center gap-1 transition-colors ${
                          activeHandsetTab === 'sms' ? 'border-b-2 border-indigo-600 bg-slate-50 text-indigo-700' : 'text-slate-500'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        SMS ({mockSmartphoneNotifications.filter(n => n.type === 'sms').length})
                      </button>
                      <button 
                        onClick={() => setActiveHandsetTab('whatsapp')}
                        className={`py-2 flex items-center justify-center gap-1 transition-colors ${
                          activeHandsetTab === 'whatsapp' ? 'border-b-2 border-indigo-600 bg-slate-50 text-indigo-700' : 'text-slate-500'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        WhatsApp ({mockSmartphoneNotifications.filter(n => n.type === 'whatsapp').length})
                      </button>
                      <button 
                        onClick={() => setActiveHandsetTab('gsuite')}
                        className={`py-2 flex items-center justify-center gap-1 transition-colors ${
                          activeHandsetTab === 'gsuite' ? 'border-b-2 border-indigo-600 bg-slate-50 text-indigo-700' : 'text-slate-500'
                        }`}
                      >
                        <Inbox className="w-3 h-3 text-amber-500" />
                        GSuite ({mockSmartphoneNotifications.filter(n => n.type === 'gsuite').length})
                      </button>
                    </div>

                    {/* Notification Stream View */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 max-h-[380px]">
                      
                      {mockSmartphoneNotifications.filter(n => n.type === activeHandsetTab).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-10">No incoming notifications on this channel.</p>
                      ) : (
                        mockSmartphoneNotifications
                          .filter(n => n.type === activeHandsetTab)
                          .map(notif => (
                            <div 
                              key={notif.id}
                              className={`p-3 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-3xs transition-all relative ${
                                notif.read ? 'bg-white opacity-80' : 'bg-white border-l-4 border-l-indigo-500'
                              }`}
                              onClick={() => {
                                // Mark as read
                                setMockSmartphoneNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-extrabold text-[10px] text-indigo-950 block">{notif.sender}</span>
                                <span className="text-[9px] font-mono text-slate-400">{notif.timestamp}</span>
                              </div>
                              <span className="font-bold text-[11px] text-slate-900 block leading-tight mb-1">{notif.title}</span>
                              <p className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">{notif.message}</p>
                              
                              {!notif.read && (
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                              )}
                            </div>
                          ))
                      )}
                    </div>

                    {/* Smartphone home bar at bottom */}
                    <div className="bg-slate-200 py-2 border-t text-center text-[10px] uppercase font-bold text-slate-500">
                      BSS Emergency Dispatch Net
                    </div>

                  </div>

                  {/* Home indicator bar */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-800 h-1 w-24 rounded-full"></div>
                </div>

                <div className="text-center mt-3">
                  <span className="text-[11px] text-slate-400 block font-mono">Simulated Handset for Recipient BSS School Head</span>
                  <button 
                    onClick={() => {
                      setMockSmartphoneNotifications(MOCK_NOTIFICATIONS_INITIAL);
                      setGlobalBannerText({ text: 'Simulated safety smartphone notifications reset completed.', type: 'info' });
                    }} 
                    className="p-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline block mx-auto mt-1"
                  >
                    Reset Simulated Inboxes
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500 text-center">
        <div className="max-w-[1600px] mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-700">Beaconhouse Meteorological Watchtower (BMW) — Safety Dispatch System</p>
          <p>Designed strictly in accordance with BSS Pakistan Health, Safety & Environment (HSEQ) Frameworks. Utilizing Gemini 2.5 Generative Intelligence models.</p>
          <p className="text-[10px] text-slate-400">© 2026 Beaconhouse School System (BSS) Pakistan. All regions (BCR, BSR, BNR) micro-weather telemetry tracking active.</p>
        </div>
      </footer>
    </div>
  );
}
