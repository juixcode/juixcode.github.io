/**
 * SyncCal - Modern Multi-ICS Calendar Comparator & Viewer
 * Core Application Logic
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const APP_VERSION = 'v6.9';

  // Dedicated Production CORS Proxy hosted on Vercel
  const DRIVE_PROXY_URL = 'https://juix.vercel.app/api/google-drive-calendars-grabber';

  const TIME_START_HOUR = 8;  // 8h00
  const TIME_END_HOUR = 21;   // 21h00
  const TOTAL_HOURS = TIME_END_HOUR - TIME_START_HOUR; // 13 hours
  const TOTAL_MINUTES = TOTAL_HOURS * 60; // 780 minutes

  // Days of week: 6 Days (Lundi à Samedi) or 7 Days (Lundi à Dimanche)
  const DAYS_FR_7 = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const DAYS_FR_6 = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  function getDaysFr() {
    return state.showSundays ? DAYS_FR_7 : DAYS_FR_6;
  }
  const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Rentrée 2026 Threshold (1er Août 2026)
  const RENTREE_2026_START = new Date(2026, 7, 1);

  const STORAGE_KEY = 'synccal_stored_calendars_v3';
  const MAX_CALENDARS = 10;

  // 30 Distinct Vibrant Rainbow Calendar Palettes (Dark Theme: Solid, rich color fills)
  // Structured in 10 chromatic trios (30 total) so stepping by 3 visits each distinct rainbow hue:
  // 0: Rouge | 3: Orange | 6: Jaune | 9: Lime | 12: Vert | 15: Menthe/Teal | 18: Cyan | 21: Bleu Royal | 24: Violet | 27: Rose/Magenta
  const CALENDAR_PALETTES_DARK = [
    // Trio 1: Rouges
    { id: 0, name: 'Rouge Écarlate', primary: '#ef4444', border: '#ef4444', bg: 'rgba(185, 28, 28, 0.92)', bgHover: 'rgba(220, 38, 38, 0.96)', text: '#ffffff', badgeBg: '#b91c1c' },
    { id: 1, name: 'Rouge Carmin', primary: '#dc2626', border: '#dc2626', bg: 'rgba(153, 27, 27, 0.92)', bgHover: 'rgba(185, 28, 28, 0.96)', text: '#ffffff', badgeBg: '#991b1b' },
    { id: 2, name: 'Corail Vif', primary: '#f43f5e', border: '#f43f5e', bg: 'rgba(190, 18, 60, 0.92)', bgHover: 'rgba(225, 29, 72, 0.96)', text: '#ffffff', badgeBg: '#be123c' },

    // Trio 2: Oranges
    { id: 3, name: 'Orange Brûlé', primary: '#ea580c', border: '#ea580c', bg: 'rgba(194, 65, 12, 0.92)', bgHover: 'rgba(234, 88, 12, 0.96)', text: '#ffffff', badgeBg: '#c2410c' },
    { id: 4, name: 'Orange Mandarine', primary: '#f97316', border: '#f97316', bg: 'rgba(194, 65, 12, 0.92)', bgHover: 'rgba(249, 115, 22, 0.96)', text: '#ffffff', badgeBg: '#c2410c' },
    { id: 5, name: 'Ambre Vif', primary: '#fb923c', border: '#fb923c', bg: 'rgba(180, 83, 9, 0.92)', bgHover: 'rgba(217, 119, 6, 0.96)', text: '#ffffff', badgeBg: '#b45309' },

    // Trio 3: Jaunes & Dorés
    { id: 6, name: 'Ambre Solaire', primary: '#f59e0b', border: '#f59e0b', bg: 'rgba(180, 83, 9, 0.92)', bgHover: 'rgba(217, 119, 6, 0.96)', text: '#ffffff', badgeBg: '#b45309' },
    { id: 7, name: 'Jaune Safran', primary: '#eab308', border: '#eab308', bg: 'rgba(161, 98, 7, 0.92)', bgHover: 'rgba(202, 138, 4, 0.96)', text: '#ffffff', badgeBg: '#a16207' },
    { id: 8, name: 'Jaune Soleil', primary: '#facc15', border: '#facc15', bg: 'rgba(133, 77, 14, 0.92)', bgHover: 'rgba(161, 98, 7, 0.96)', text: '#ffffff', badgeBg: '#854d0e' },

    // Trio 4: Limes & Chartreuse
    { id: 9, name: 'Lime Vif', primary: '#84cc16', border: '#84cc16', bg: 'rgba(77, 124, 15, 0.92)', bgHover: 'rgba(101, 163, 13, 0.96)', text: '#ffffff', badgeBg: '#4d7c0f' },
    { id: 10, name: 'Lime Chartreuse', primary: '#a3e635', border: '#a3e635', bg: 'rgba(77, 124, 15, 0.92)', bgHover: 'rgba(101, 163, 13, 0.96)', text: '#ffffff', badgeBg: '#4d7c0f' },
    { id: 11, name: 'Vert Pomme', primary: '#65a30d', border: '#65a30d', bg: 'rgba(63, 98, 18, 0.92)', bgHover: 'rgba(77, 124, 15, 0.96)', text: '#ffffff', badgeBg: '#3f6212' },

    // Trio 5: Verts
    { id: 12, name: 'Vert Printemps', primary: '#22c55e', border: '#22c55e', bg: 'rgba(21, 128, 61, 0.92)', bgHover: 'rgba(22, 163, 74, 0.96)', text: '#ffffff', badgeBg: '#15803d' },
    { id: 13, name: 'Vert Émeraude', primary: '#10b981', border: '#10b981', bg: 'rgba(4, 120, 87, 0.92)', bgHover: 'rgba(16, 185, 129, 0.96)', text: '#ffffff', badgeBg: '#047857' },
    { id: 14, name: 'Vert Forêt', primary: '#059669', border: '#059669', bg: 'rgba(4, 120, 87, 0.92)', bgHover: 'rgba(5, 150, 105, 0.96)', text: '#ffffff', badgeBg: '#047857' },

    // Trio 6: Menthe & Sarcelle
    { id: 15, name: 'Vert Menthe', primary: '#34d399', border: '#34d399', bg: 'rgba(5, 150, 105, 0.92)', bgHover: 'rgba(16, 185, 129, 0.96)', text: '#ffffff', badgeBg: '#059669' },
    { id: 16, name: 'Sarcelle / Teal', primary: '#14b8a6', border: '#14b8a6', bg: 'rgba(15, 118, 110, 0.92)', bgHover: 'rgba(20, 184, 166, 0.96)', text: '#ffffff', badgeBg: '#0f766e' },
    { id: 17, name: 'Bleu Pétrole', primary: '#0f766e', border: '#0f766e', bg: 'rgba(17, 94, 89, 0.92)', bgHover: 'rgba(15, 118, 110, 0.96)', text: '#ffffff', badgeBg: '#115e59' },

    // Trio 7: Cyans & Bleus Clairs
    { id: 18, name: 'Cyan Néon', primary: '#06b6d4', border: '#06b6d4', bg: 'rgba(8, 145, 178, 0.92)', bgHover: 'rgba(6, 182, 212, 0.96)', text: '#ffffff', badgeBg: '#0e7490' },
    { id: 19, name: 'Bleu Océan', primary: '#38bdf8', border: '#38bdf8', bg: 'rgba(14, 116, 144, 0.92)', bgHover: 'rgba(2, 132, 199, 0.96)', text: '#ffffff', badgeBg: '#0284c7' },
    { id: 20, name: 'Bleu Azur', primary: '#0284c7', border: '#0284c7', bg: 'rgba(3, 105, 161, 0.92)', bgHover: 'rgba(2, 132, 199, 0.96)', text: '#ffffff', badgeBg: '#0369a1' },

    // Trio 8: Bleus Royaux & Cobalt
    { id: 21, name: 'Bleu Royal', primary: '#2563eb', border: '#2563eb', bg: 'rgba(29, 78, 216, 0.92)', bgHover: 'rgba(37, 99, 235, 0.96)', text: '#ffffff', badgeBg: '#1d4ed8' },
    { id: 22, name: 'Bleu Cobalt', primary: '#1d4ed8', border: '#1d4ed8', bg: 'rgba(30, 64, 175, 0.92)', bgHover: 'rgba(29, 78, 216, 0.96)', text: '#ffffff', badgeBg: '#1e40af' },
    { id: 23, name: 'Indigo Nuit', primary: '#4f46e5', border: '#4f46e5', bg: 'rgba(67, 56, 202, 0.92)', bgHover: 'rgba(79, 70, 229, 0.96)', text: '#ffffff', badgeBg: '#4338ca' },

    // Trio 9: Violets & Pourpres
    { id: 24, name: 'Violet Iris', primary: '#6366f1', border: '#6366f1', bg: 'rgba(67, 56, 202, 0.92)', bgHover: 'rgba(99, 102, 241, 0.96)', text: '#ffffff', badgeBg: '#4338ca' },
    { id: 25, name: 'Violet Électrique', primary: '#8b5cf6', border: '#8b5cf6', bg: 'rgba(109, 40, 217, 0.92)', bgHover: 'rgba(124, 58, 237, 0.96)', text: '#ffffff', badgeBg: '#6d28d9' },
    { id: 26, name: 'Pourpre Profond', primary: '#a855f7', border: '#a855f7', bg: 'rgba(126, 34, 206, 0.92)', bgHover: 'rgba(147, 51, 234, 0.96)', text: '#ffffff', badgeBg: '#7e22ce' },

    // Trio 10: Magentas & Roses
    { id: 27, name: 'Rose Magenta', primary: '#d946ef', border: '#d946ef', bg: 'rgba(162, 28, 175, 0.92)', bgHover: 'rgba(192, 38, 211, 0.96)', text: '#ffffff', badgeBg: '#a21caf' },
    { id: 28, name: 'Rose Bonbon', primary: '#f472b6', border: '#f472b6', bg: 'rgba(190, 24, 93, 0.92)', bgHover: 'rgba(219, 39, 119, 0.96)', text: '#ffffff', badgeBg: '#be185d' },
    { id: 29, name: 'Rose Fushia', primary: '#ec4899', border: '#ec4899', bg: 'rgba(190, 24, 93, 0.92)', bgHover: 'rgba(219, 39, 119, 0.96)', text: '#ffffff', badgeBg: '#be185d' }
  ];

  // 30 Distinct Light Theme Calendar Palettes (Solid vibrant fills with crisp white text)
  const CALENDAR_PALETTES_LIGHT = CALENDAR_PALETTES_DARK.map((p, idx) => ({
    id: idx,
    name: p.name,
    primary: p.primary,
    border: p.primary,
    bg: p.badgeBg,
    bgHover: p.primary,
    text: '#ffffff',
    badgeBg: p.badgeBg
  }));

  const CALENDAR_PALETTES = CALENDAR_PALETTES_DARK;

  function isThemeLight() {
    if (state.theme === 'light') return true;
    if (state.theme === 'auto') {
      return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    }
    return false;
  }

  function getCalendarPalette(colorIndex) {
    const list = isThemeLight() ? CALENDAR_PALETTES_LIGHT : CALENDAR_PALETTES_DARK;
    const safeIndex = typeof colorIndex === 'number' && !isNaN(colorIndex) ? Math.abs(colorIndex) : 0;
    return list[safeIndex % list.length];
  }

  // --- LocalStorage Keys ---
  const THEME_STORAGE_KEY = 'synccal_theme';
  const VIEW_TYPE_STORAGE_KEY = 'synccal_view_type';
  const DIM_CMO_STORAGE_KEY = 'synccal_dim_cmo';
  const FREE_TIME_STORAGE_KEY = 'synccal_show_free_time';
  const TYPE_FILTER_STORAGE_KEY = 'synccal_type_filter';
  const SHOW_SUNDAYS_STORAGE_KEY = 'synccal_show_sundays';

  // --- Comparison Instances Storage & Constants ---
  const INSTANCES_STORAGE_KEY = 'synccal_comparison_instances_v1';
  const LAST_USED_INSTANCE_STORAGE_KEY = 'synccal_last_used_instance_id';

  // 8 Modern Pastel Instance Color Presets
  const INSTANCE_GRADIENTS = [
    { id: 'gradient-red', name: 'Corail Doux', value: 'linear-gradient(135deg, #f07878 0%, #d85258 100%)', border: '#fca5a5' },
    { id: 'gradient-blue', name: 'Ciel Pastel', value: 'linear-gradient(135deg, #6ba5ed 0%, #457ec7 100%)', border: '#93c5fd' },
    { id: 'gradient-purple', name: 'Lavande Pastel', value: 'linear-gradient(135deg, #b28bf7 0%, #8c60dc 100%)', border: '#c4b5fd' },
    { id: 'gradient-emerald', name: 'Sauge & Menthe', value: 'linear-gradient(135deg, #56cf96 0%, #2fa670 100%)', border: '#86efac' },
    { id: 'gradient-amber', name: 'Pêche Dorée', value: 'linear-gradient(135deg, #fbb058 0%, #e07f35 100%)', border: '#fcd34d' },
    { id: 'gradient-rose', name: 'Rose Poudré', value: 'linear-gradient(135deg, #f082aa 0%, #cf5784 100%)', border: '#f9a8d4' },
    { id: 'gradient-indigo', name: 'Pervenche Pastel', value: 'linear-gradient(135deg, #8192f7 0%, #5d6edc 100%)', border: '#a5b4fc' },
    { id: 'gradient-cyan', name: 'Lagon & Aqua', value: 'linear-gradient(135deg, #4ed3cb 0%, #28a8a0 100%)', border: '#5eead4' }
  ];

  function getInstanceGradient(gradientId) {
    return INSTANCE_GRADIENTS.find(g => g.id === gradientId) || INSTANCE_GRADIENTS[0];
  }

  function getInstanceCalendarsStorageKey(instanceId) {
    return `synccal_instance_calendars_${instanceId}`;
  }

  function getInstanceUrlsStorageKey(instanceId) {
    return `synccal_instance_urls_${instanceId}`;
  }

  function getToolbarStorageKey() {
    return window.innerWidth < 768 ? 'synccal_show_toolbar_mobile' : 'synccal_show_toolbar_desktop';
  }

  function getInitialToolbarState() {
    const isMobile = window.innerWidth < 768;
    const key = getToolbarStorageKey();
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return saved === 'true';
    }
    return !isMobile; // Default: false on mobile (< 768px), true on desktop (>= 768px)
  }

  // Default date helper: If Sundays are disabled and today is Sunday, default to next day (Monday)
  // so that Week View shows next week (Mon-Sat) and Day View shows Monday.
  function getDefaultDate() {
    const d = new Date();
    if (!state?.showSundays && d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // --- App State ---
  const state = {
    instances: [], // Array of comparison instances: { id, name, gradient, createdAt }
    activeInstance: null, // Active instance object
    currentView: 'main', // 'main' or 'home'
    calendars: [], // Array of calendar objects up to 10
    currentDate: new Date(), // Initialized or adjusted by ensureValidStartingDate()
    viewType: localStorage.getItem(VIEW_TYPE_STORAGE_KEY) || (window.innerWidth < 768 ? 'day' : 'week'),
    dimCMo: localStorage.getItem(DIM_CMO_STORAGE_KEY) !== 'false', // Default: true (dim online courses)
    showToolbar: getInitialToolbarState(), // Default: collapsed on mobile, expanded on desktop
    searchQuery: '',
    typeFilter: localStorage.getItem(TYPE_FILTER_STORAGE_KEY) || 'ALL',
    showFreeTime: localStorage.getItem(FREE_TIME_STORAGE_KEY) !== 'false', // Default: true (display free time slots)
    showSundays: localStorage.getItem(SHOW_SUNDAYS_STORAGE_KEY) === 'true', // Default: false (ghost Sundays)
    theme: localStorage.getItem(THEME_STORAGE_KEY) || 'dark',
    selectedEvent: null
  };

  function isCMoEvent(event) {
    if (!event) return false;
    const type = (event.typecours || '').toUpperCase();
    const loc = (event.location || '').toUpperCase();
    const sum = (event.summary || '').toUpperCase();
    const title = (event.title || '').toUpperCase();
    const flag = (event.flagpresentiel || '').toUpperCase();
    return (
      type === 'CMO' ||
      type === 'CAO' ||
      type.includes('CMO') ||
      type.includes('CAO') ||
      flag === 'DISTANCIEL' ||
      flag.includes('DISTANCIEL') ||
      loc.includes('ZOOM') ||
      loc.includes('ONLINE') ||
      loc.includes('DISTANCIEL') ||
      loc.includes('DISTANCE') ||
      sum.includes('[CMO]') ||
      sum.includes('[CAO]') ||
      sum.includes('CMO') ||
      title.includes('[CMO]') ||
      title.includes('[CAO]') ||
      title.includes('CMO')
    );
  }

  // --- Class Letter & Metadata Extraction ---
  function extractClassLetterFromEvents(events) {
    const letterCounts = {};

    events.forEach(ev => {
      if (!ev.groupe) return;
      const g = ev.groupe.trim();

      // Pattern 1: ESILV-...-FT([A-Z]) (e.g. ESILV-2-A2-PAR-ST-FTM -> M, ESILV-1-A1-PAR-TP-FTJ2 -> J)
      const ftMatch = g.match(/ESILV-[A-Za-z0-9-]+-FT([A-Za-z])(?:\d*|\b)/i) ||
        g.match(/\bFT([A-Za-z])(?:\d*|\b)/i);
      if (ftMatch) {
        const letter = ftMatch[1].toUpperCase();
        letterCounts[letter] = (letterCounts[letter] || 0) + 3;
        return;
      }

      // Pattern 2: ESILV-...-([A-Z])$
      const esilvEndMatch = g.match(/ESILV-[A-Za-z0-9-]+-([A-Za-z])$/i);
      if (esilvEndMatch) {
        const letter = esilvEndMatch[1].toUpperCase();
        letterCounts[letter] = (letterCounts[letter] || 0) + 2;
        return;
      }

      // Pattern 3: General string ending in ...-FTX
      const genMatch = g.match(/FT([A-Za-z])$/i);
      if (genMatch) {
        const letter = genMatch[1].toUpperCase();
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      }
    });

    let detectedClass = null;
    let maxFreq = 0;
    for (const [letter, count] of Object.entries(letterCounts)) {
      if (count > maxFreq) {
        maxFreq = count;
        detectedClass = letter;
      }
    }

    return detectedClass;
  }

  // --- Day Mapping & Recurrence Constants ---
  const DAY_MAP = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const CODE_TO_DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const DAY_NAMES_FR = { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };

  // --- Date, Time & Duration Parsing ---
  function parseICSDate(str) {
    if (!str) return null;
    const isUtc = str.trim().endsWith('Z') || /TZID=(UTC|Etc\/UTC|GMT)/i.test(str);
    const cleanStr = str.replace(/^.*:/, '').trim();
    const m = cleanStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!m) return null;

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const isDateOnly = !m[4];
    const hours = m[4] ? parseInt(m[4], 10) : 0;
    const minutes = m[5] ? parseInt(m[5], 10) : 0;
    const seconds = m[6] ? parseInt(m[6], 10) : 0;

    const date = isUtc
      ? new Date(Date.UTC(year, month, day, hours, minutes, seconds))
      : new Date(year, month, day, hours, minutes, seconds);

    date.isDateOnly = isDateOnly;
    date.isUtc = isUtc;
    return date;
  }

  function parseICSDuration(str) {
    if (!str) return 0;
    const m = str.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
    if (!m) return 0;
    const weeks = parseInt(m[1] || '0', 10);
    const days = parseInt(m[2] || '0', 10);
    const hours = parseInt(m[3] || '0', 10);
    const mins = parseInt(m[4] || '0', 10);
    const secs = parseInt(m[5] || '0', 10);
    return (weeks * 7 * 24 * 3600 + days * 24 * 3600 + hours * 3600 + mins * 60 + secs) * 1000;
  }

  // --- RRULE Parser & French Summary Generator ---
  function parseRRULE(rruleStr) {
    if (!rruleStr) return null;
    const clean = rruleStr.replace(/^RRULE:/i, '').trim();
    const parts = clean.split(';');
    const rule = { interval: 1, byday: [], bymonthday: [], bymonth: [] };
    parts.forEach(p => {
      const idx = p.indexOf('=');
      if (idx === -1) return;
      const key = p.substring(0, idx).toUpperCase().trim();
      const val = p.substring(idx + 1).trim();
      if (key === 'FREQ') rule.freq = val.toUpperCase();
      else if (key === 'INTERVAL') rule.interval = Math.max(1, parseInt(val, 10) || 1);
      else if (key === 'COUNT') rule.count = parseInt(val, 10) || null;
      else if (key === 'UNTIL') rule.until = parseICSDate(val);
      else if (key === 'BYDAY') rule.byday = val.split(',').map(s => s.trim().toUpperCase());
      else if (key === 'BYMONTHDAY') rule.bymonthday = val.split(',').map(s => parseInt(s, 10));
      else if (key === 'BYMONTH') rule.bymonth = val.split(',').map(s => parseInt(s, 10));
      else if (key === 'WKST') rule.wkst = val.toUpperCase();
    });
    return rule;
  }

  function getRRULESummaryFR(rule) {
    if (!rule || !rule.freq) return 'Événement récurrent';
    const interval = rule.interval || 1;
    let text = '';

    if (rule.freq === 'DAILY') {
      text = interval === 1 ? 'Tous les jours' : `Tous les ${interval} jours`;
    } else if (rule.freq === 'WEEKLY') {
      const days = (rule.byday || []).map(d => {
        const code = d.replace(/[^A-Z]/g, '');
        const dow = CODE_TO_DOW[code];
        return dow !== undefined ? DAY_NAMES_FR[dow] : d;
      });
      const daysStr = days.length > 0 ? ` (${days.join(', ')})` : '';
      if (interval === 1) {
        text = `Toutes les semaines${daysStr}`;
      } else {
        text = `Toutes les ${interval} semaines${daysStr}`;
      }
    } else if (rule.freq === 'MONTHLY') {
      text = interval === 1 ? 'Tous les mois' : `Tous les ${interval} mois`;
    } else if (rule.freq === 'YEARLY') {
      text = interval === 1 ? 'Tous les ans' : `Tous les ${interval} ans`;
    } else {
      text = 'Événement récurrent';
    }

    if (rule.until) {
      text += ` jusqu'au ${rule.until.toLocaleDateString('fr-FR')}`;
    } else if (rule.count) {
      text += ` (${rule.count} fois)`;
    }

    return text;
  }

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // --- Recurrence Occurrence Generator ---
  function expandRecurrence(baseEvent, rrule, exdates = [], overrideDateKeys = new Set(), maxOccurrences = 365) {
    const occurrences = [];
    const start = new Date(baseEvent.startDate);
    const end = new Date(baseEvent.endDate);
    const duration = Math.max(0, end.getTime() - start.getTime());

    const exdateKeys = new Set(exdates.map(d => toDateKey(d)));
    const freq = rrule.freq;
    const interval = rrule.interval || 1;
    const count = rrule.count || null;
    const until = rrule.until || null;

    // Horizon: up to 1 year from today or from DTSTART (whichever is later)
    const today = new Date();
    const defaultHorizon = new Date(Math.max(today.getTime(), start.getTime()) + 365 * 24 * 3600 * 1000);
    const horizon = until ? new Date(Math.min(until.getTime(), defaultHorizon.getTime())) : defaultHorizon;

    let totalEvaluated = 0;

    if (freq === 'WEEKLY') {
      let targetDays = [];
      if (rrule.byday && rrule.byday.length > 0) {
        targetDays = rrule.byday.map(d => {
          const clean = d.replace(/[^A-Z]/g, '');
          return DAY_MAP[clean] !== undefined ? DAY_MAP[clean] : start.getDay();
        });
      } else {
        targetDays = [start.getDay()];
      }

      // Anchor to Monday of the week containing start
      const curWeek = new Date(start);
      const dayOfWeek = curWeek.getDay(); // 0 = Dimanche
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const weekMonday = new Date(curWeek);
      weekMonday.setDate(curWeek.getDate() + diffToMonday);
      weekMonday.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

      let loopSafety = 0;
      while (loopSafety++ < 2000 && occurrences.length < maxOccurrences) {
        const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // Lundi à Dimanche
        for (const dow of weekOrder) {
          if (!targetDays.includes(dow)) continue;
          const dayOffset = (dow === 0 ? 6 : dow - 1);
          const occStart = new Date(weekMonday);
          occStart.setDate(weekMonday.getDate() + dayOffset);
          occStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

          if (occStart < start) continue; // Avant DTSTART

          totalEvaluated++;
          if (count && totalEvaluated > count) break;
          if (until && occStart > until) break;
          if (occStart > horizon) break;

          const dateKey = toDateKey(occStart);
          if (!exdateKeys.has(dateKey) && !overrideDateKeys.has(dateKey)) {
            const occEnd = new Date(occStart.getTime() + duration);
            occurrences.push({
              startDate: occStart,
              endDate: occEnd,
              dateKey
            });
          }
        }

        if (count && totalEvaluated >= count) break;
        if (weekMonday > horizon) break;
        weekMonday.setDate(weekMonday.getDate() + 7 * interval);
      }
    } else if (freq === 'DAILY') {
      let cur = new Date(start);
      let loopSafety = 0;
      while (loopSafety++ < 2000 && occurrences.length < maxOccurrences) {
        totalEvaluated++;
        if (count && totalEvaluated > count) break;
        if (until && cur > until) break;
        if (cur > horizon) break;

        const dateKey = toDateKey(cur);
        if (!exdateKeys.has(dateKey) && !overrideDateKeys.has(dateKey)) {
          occurrences.push({
            startDate: new Date(cur),
            endDate: new Date(cur.getTime() + duration),
            dateKey
          });
        }
        cur.setDate(cur.getDate() + interval);
      }
    } else if (freq === 'MONTHLY') {
      let curMonthDate = new Date(start);
      let loopSafety = 0;
      while (loopSafety++ < 500 && occurrences.length < maxOccurrences) {
        const year = curMonthDate.getFullYear();
        const month = curMonthDate.getMonth();

        let daysInMonth = [];
        if (rrule.bymonthday && rrule.bymonthday.length > 0) {
          daysInMonth = rrule.bymonthday.map(d => {
            if (d < 0) {
              const lastDay = new Date(year, month + 1, 0).getDate();
              return lastDay + 1 + d;
            }
            return d;
          });
        } else if (rrule.byday && rrule.byday.length > 0) {
          rrule.byday.forEach(bd => {
            const match = bd.match(/^([+-]?\d+)?([A-Z]+)$/);
            if (match) {
              const nth = match[1] ? parseInt(match[1], 10) : 0;
              const targetDow = DAY_MAP[match[2]];
              if (targetDow !== undefined) {
                const lastDate = new Date(year, month + 1, 0).getDate();
                const matchingDates = [];
                for (let d = 1; d <= lastDate; d++) {
                  if (new Date(year, month, d).getDay() === targetDow) {
                    matchingDates.push(d);
                  }
                }
                if (nth > 0 && nth <= matchingDates.length) {
                  daysInMonth.push(matchingDates[nth - 1]);
                } else if (nth < 0 && Math.abs(nth) <= matchingDates.length) {
                  daysInMonth.push(matchingDates[matchingDates.length + nth]);
                } else if (nth === 0) {
                  daysInMonth.push(...matchingDates);
                }
              }
            }
          });
        } else {
          daysInMonth = [start.getDate()];
        }

        for (const d of daysInMonth) {
          const occStart = new Date(year, month, d, start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
          if (occStart < start) continue;

          totalEvaluated++;
          if (count && totalEvaluated > count) break;
          if (until && occStart > until) break;
          if (occStart > horizon) break;

          const dateKey = toDateKey(occStart);
          if (!exdateKeys.has(dateKey) && !overrideDateKeys.has(dateKey)) {
            const occEnd = new Date(occStart.getTime() + duration);
            occurrences.push({
              startDate: occStart,
              endDate: occEnd,
              dateKey
            });
          }
        }

        if (count && totalEvaluated >= count) break;
        if (curMonthDate > horizon) break;
        curMonthDate.setMonth(curMonthDate.getMonth() + interval);
      }
    } else if (freq === 'YEARLY') {
      let cur = new Date(start);
      let loopSafety = 0;
      while (loopSafety++ < 100 && occurrences.length < maxOccurrences) {
        totalEvaluated++;
        if (count && totalEvaluated > count) break;
        if (until && cur > until) break;
        if (cur > horizon) break;

        const dateKey = toDateKey(cur);
        if (!exdateKeys.has(dateKey) && !overrideDateKeys.has(dateKey)) {
          occurrences.push({
            startDate: new Date(cur),
            endDate: new Date(cur.getTime() + duration),
            dateKey
          });
        }
        cur.setFullYear(cur.getFullYear() + interval);
      }
    }

    return occurrences;
  }

  // --- Universal ICS Parser (Google Calendar, Outlook, Apple Calendar & Universities) ---
  function parseICS(icsContent, calendarId, defaultName) {
    if (!icsContent) return { name: defaultName, classLetter: null, events: [] };

    // Unfold multi-line strings (RFC 5545)
    const unfolded = icsContent
      .replace(/\r\n[ \t]/g, '')
      .replace(/\n[ \t]/g, '')
      .replace(/\r/g, '');

    // Extract calendar name with support for various sources
    let calName = defaultName;
    const nameMatch = unfolded.match(/^(?:X-WR-CALNAME|NAME|X-APPLE-CALENDAR-NAME)(?:;[^:]*)?:(.*)$/mi);
    if (nameMatch) {
      calName = nameMatch[1]
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/^Calendrier\s+/i, '')
        .trim();
    }

    // Identify source: ALV SIM (ESILV academic portal) has historical multi-year exports
    const prodidMatch = unfolded.match(/^PRODID:(.*)$/mi);
    const prodid = prodidMatch ? prodidMatch[1].trim() : '';
    const isAlvSim = prodid.includes('ALV SIM');

    const eventBlocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const rawEvents = [];
    const overridesByUid = new Map();

    for (let i = 0; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const parsed = parseVEvent(block, calendarId);
      if (!parsed) continue;

      if (parsed.rawRecurrenceId) {
        if (!overridesByUid.has(parsed.uid)) overridesByUid.set(parsed.uid, []);
        overridesByUid.get(parsed.uid).push(parsed);
      } else {
        if (parsed.status !== 'CANCELLED') {
          rawEvents.push(parsed);
        }
      }
    }

    const events = [];

    for (const rawEvt of rawEvents) {
      if (rawEvt.rruleStr) {
        const rrule = parseRRULE(rawEvt.rruleStr);
        if (rrule && rrule.freq) {
          const overrides = overridesByUid.get(rawEvt.uid) || [];
          const exdates = [...rawEvt.exdates];
          const overrideDateKeys = new Set();

          // Handle individual instance overrides and cancellations
          overrides.forEach(ov => {
            if (ov.recurrenceId) {
              const key = toDateKey(ov.recurrenceId);
              if (ov.status === 'CANCELLED') {
                exdates.push(ov.recurrenceId);
              } else {
                overrideDateKeys.add(key);
                if (!isAlvSim || ov.startDate >= RENTREE_2026_START) {
                  events.push({
                    ...ov,
                    id: `${calendarId}_${ov.uid}_${key}_ov`,
                    isRecurring: true,
                    rruleSummary: getRRULESummaryFR(rrule)
                  });
                }
              }
            }
          });

          // Generate recurring occurrences
          const occurrences = expandRecurrence(rawEvt, rrule, exdates, overrideDateKeys);
          const rruleSummary = getRRULESummaryFR(rrule);

          occurrences.forEach(occ => {
            if (!isAlvSim || occ.startDate >= RENTREE_2026_START) {
              events.push({
                ...rawEvt,
                id: `${calendarId}_${rawEvt.uid}_${occ.dateKey}`,
                startDate: occ.startDate,
                endDate: occ.endDate,
                isRecurring: true,
                rruleSummary
              });
            }
          });
          continue;
        }
      }

      // Standalone non-recurring event
      if (!isAlvSim || rawEvt.startDate >= RENTREE_2026_START) {
        events.push(rawEvt);
      }
    }

    // Extract class letter from parsed events (e.g. for student group schedules)
    const classLetter = extractClassLetterFromEvents(events);

    return { name: calName, classLetter, events };
  }

  function parseVEvent(block, calendarId) {
    function getField(fieldName) {
      const regex = new RegExp(`^${fieldName}(?:;[^:]*)?:(.*)$`, 'm');
      const m = block.match(regex);
      if (!m) return '';
      return m[1]
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
        .trim();
    }

    const status = getField('STATUS').toUpperCase();
    const rawSummary = getField('SUMMARY');
    const rawDtStart = getField('DTSTART');
    const rawDtEnd = getField('DTEND');
    const rawDuration = getField('DURATION');
    const rawRRule = getField('RRULE');
    const rawRecurrenceId = getField('RECURRENCE-ID');
    const location = getField('LOCATION');
    const prof = getField('PROF');
    const organizer = getField('ORGANIZER');
    const title = getField('TITLE') || rawSummary;
    const typecours = getField('TYPECOURS');
    const flagpresentiel = getField('FLAGPRESENTIEL');
    const categories = getField('CATEGORIES');
    const groupe = getField('GROUPE');
    const description = getField('DESCRIPTION');
    const uid = getField('UID') || `evt_${Math.random().toString(36).substr(2, 9)}`;

    // Parse EXDATE lines
    const exdateLines = block.match(/^EXDATE(?:;[^:]*)?:(.*)$/gim) || [];
    const exdates = [];
    exdateLines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const val = line.substring(colonIdx + 1);
        val.split(',').forEach(item => {
          const p = parseICSDate(item.trim());
          if (p) exdates.push(p);
        });
      }
    });

    const startDate = parseICSDate(rawDtStart);
    if (!startDate) return null;

    const isAllDay = Boolean(startDate.isDateOnly);
    let endDate = null;

    if (rawDtEnd) {
      endDate = parseICSDate(rawDtEnd);
    } else if (rawDuration) {
      const durMs = parseICSDuration(rawDuration);
      if (durMs > 0) endDate = new Date(startDate.getTime() + durMs);
    }

    if (!endDate) {
      if (isAllDay) {
        endDate = new Date(startDate.getTime() + 24 * 3600 * 1000);
      } else {
        endDate = new Date(startDate.getTime() + 3600 * 1000); // 1h par défaut
      }
    }

    // Clean summary title
    let cleanTitle = title;
    if (!cleanTitle && rawSummary) {
      cleanTitle = rawSummary.replace(/^\[[^\]]+\]/, '').trim();
    }

    // Extract instructor or organizer
    let teacher = prof;
    if (!teacher && organizer) {
      const cnMatch = organizer.match(/CN=(?:"([^"]+)"|([^;:]+))/i);
      if (cnMatch) teacher = (cnMatch[1] || cnMatch[2]).trim();
    }

    // Extract course / event type
    let finalType = typecours || extractTypeFromSummary(rawSummary);
    if (!finalType && categories) {
      finalType = categories.split(',')[0].trim();
    }
    if (!finalType) {
      finalType = 'AUTRE';
    }

    return {
      id: `${calendarId}_${uid}_${rawDtStart}`,
      uid,
      calendarId,
      summary: rawSummary,
      title: cleanTitle || rawSummary || 'Sans titre',
      startDate,
      endDate,
      isAllDay,
      location: location || '',
      prof: teacher || '',
      typecours: finalType,
      flagpresentiel: flagpresentiel || '',
      groupe: groupe || '',
      description: description || '',
      rawDtStart,
      rawDtEnd,
      rruleStr: rawRRule,
      exdates,
      rawRecurrenceId,
      recurrenceId: rawRecurrenceId ? parseICSDate(rawRecurrenceId) : null,
      status
    };
  }

  function extractTypeFromSummary(summary) {
    if (!summary) return '';
    const typeMatch = summary.match(/\[(CM[oO]?|CA[oO]?|TD|TP|Examen|Projet|DS|CC|Soutenance|Partiel)\]/i);
    if (typeMatch) return typeMatch[1];
    const match = summary.match(/\[([A-Za-z0-9_]+)\]$/) || summary.match(/\[([A-Za-z0-9_]+)\]/);
    if (match) return match[1];
    return '';
  }

  // --- Comparison Instances Persistence & Management ---
  function saveInstancesToStorage() {
    try {
      localStorage.setItem(INSTANCES_STORAGE_KEY, JSON.stringify(state.instances));
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde des instances :', e);
    }
  }

  function initInstances() {
    try {
      const rawInstances = localStorage.getItem(INSTANCES_STORAGE_KEY);
      if (rawInstances) {
        state.instances = JSON.parse(rawInstances);
      }
    } catch (e) {
      console.warn('Erreur lors du chargement des instances :', e);
      state.instances = [];
    }

    // Auto-migration & Default Instance Creation
    if (!Array.isArray(state.instances) || state.instances.length === 0) {
      // Check for legacy calendar data from synccal_stored_calendars_v3
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      const defaultInstId = 'inst_default';
      const defaultInstance = {
        id: defaultInstId,
        name: 'Défaut',
        gradient: 'gradient-red',
        createdAt: Date.now()
      };

      if (legacyRaw) {
        // Seamlessly migrate legacy data to default instance
        try {
          localStorage.setItem(getInstanceCalendarsStorageKey(defaultInstId), legacyRaw);
        } catch (e) {}
      }

      state.instances = [defaultInstance];
      saveInstancesToStorage();
    }

    // Determine Active Instance from last-used
    const lastUsedId = localStorage.getItem(LAST_USED_INSTANCE_STORAGE_KEY);
    let active = state.instances.find(inst => inst.id === lastUsedId);
    if (!active) {
      active = state.instances[0];
      localStorage.setItem(LAST_USED_INSTANCE_STORAGE_KEY, active.id);
    }
    state.activeInstance = active;

    // Asynchronously initialize IndexedDB store to rehydrate cache
    initIndexedDBStore();
  }

  // --- Multi-Tier Persistence: In-Memory Cache + IndexedDB + LocalStorage (Safari iOS Quota Proof) ---
  const instancesCache = new Map();

  const IDB_NAME = 'SyncCalDB';
  const IDB_VERSION = 1;
  const IDB_STORE = 'comparison_calendars';
  let idbPromise = null;

  function getIndexedDB() {
    if (!idbPromise) {
      idbPromise = new Promise(resolve => {
        try {
          if (!window.indexedDB) return resolve(null);
          const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
              db.createObjectStore(IDB_STORE, { keyPath: 'instanceId' });
            }
          };
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }
    return idbPromise;
  }

  async function saveToIndexedDB(instanceId, calendars) {
    try {
      const db = await getIndexedDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        instanceId,
        calendars: calendars.map(cal => ({
          id: cal.id,
          name: cal.name,
          classLetter: cal.classLetter,
          colorIndex: cal.colorIndex,
          enabled: cal.enabled,
          events: cal.events.map(e => ({
            id: e.id,
            uid: e.uid,
            calendarId: e.calendarId,
            summary: e.summary,
            title: e.title,
            startDate: (e.startDate instanceof Date && !isNaN(e.startDate.getTime()))
              ? e.startDate.toISOString()
              : (typeof e.startDate === 'string' ? e.startDate : new Date().toISOString()),
            endDate: (e.endDate instanceof Date && !isNaN(e.endDate.getTime()))
              ? e.endDate.toISOString()
              : (typeof e.endDate === 'string' ? e.endDate : new Date().toISOString()),
            isAllDay: Boolean(e.isAllDay),
            isRecurring: Boolean(e.isRecurring),
            rruleSummary: e.rruleSummary || '',
            location: e.location,
            prof: e.prof,
            typecours: e.typecours,
            flagpresentiel: e.flagpresentiel || '',
            groupe: e.groupe,
            description: e.description
          }))
        })),
        updatedAt: Date.now()
      });
    } catch (e) {
      console.warn('Erreur IndexedDB save:', e);
    }
  }

  async function initIndexedDBStore() {
    try {
      const db = await getIndexedDB();
      if (!db) return;

      // --- AUTO-MIGRATION: localStorage → IndexedDB (runs once per instance, transparent for existing users) ---
      // For each known instance, if localStorage has data but IndexedDB doesn't, copy it over.
      const migrateInstance = (instanceId) => {
        return new Promise(resolve => {
          try {
            // Read from localStorage
            let raw = localStorage.getItem(getInstanceCalendarsStorageKey(instanceId));
            if (!raw && instanceId === 'inst_default') {
              raw = localStorage.getItem(STORAGE_KEY);
            }
            if (!raw) return resolve();
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return resolve();

            // Check if IndexedDB already has data for this instance
            const checkTx = db.transaction(IDB_STORE, 'readonly');
            const checkStore = checkTx.objectStore(IDB_STORE);
            const checkReq = checkStore.get(instanceId);
            checkReq.onsuccess = () => {
              const existing = checkReq.result;
              // Only migrate if IndexedDB is empty/missing for this instance
              if (!existing || !Array.isArray(existing.calendars) || existing.calendars.length === 0) {
                // Write to IndexedDB
                const migTx = db.transaction(IDB_STORE, 'readwrite');
                const migStore = migTx.objectStore(IDB_STORE);
                migStore.put({
                  instanceId,
                  calendars: parsed.map(cal => ({
                    id: cal.id,
                    name: cal.name,
                    classLetter: cal.classLetter,
                    colorIndex: cal.colorIndex,
                    enabled: cal.enabled !== false,
                    events: (cal.events || []).map(e => ({
                      id: e.id, uid: e.uid, calendarId: e.calendarId,
                      summary: e.summary, title: e.title,
                      startDate: e.startDate, endDate: e.endDate,
                      isAllDay: Boolean(e.isAllDay), isRecurring: Boolean(e.isRecurring),
                      rruleSummary: e.rruleSummary || '',
                      location: e.location, prof: e.prof,
                      typecours: e.typecours, flagpresentiel: e.flagpresentiel || '', groupe: e.groupe, description: e.description
                    }))
                  })),
                  updatedAt: Date.now(),
                  migratedFromLocalStorage: true
                });
                migTx.oncomplete = () => {
                  console.info(`[Migration] Données de "${instanceId}" copiées du localStorage vers IndexedDB.`);
                  resolve();
                };
                migTx.onerror = () => resolve();
              } else {
                resolve(); // Already in IndexedDB
              }
            };
            checkReq.onerror = () => resolve();
          } catch (e) {
            resolve();
          }
        });
      };

      // Migrate all known instances from localStorage
      const migrationPromises = (state.instances || []).map(inst => migrateInstance(inst.id));
      await Promise.all(migrationPromises);

      // --- Load all IndexedDB entries into in-memory cache ---
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        if (Array.isArray(req.result)) {
          req.result.forEach(item => {
            if (item.instanceId && Array.isArray(item.calendars) && item.calendars.length > 0) {
              // Only populate cache if not already in it (localStorage took priority synchronously)
              if (!instancesCache.has(item.instanceId)) {
                const parsed = item.calendars.map((cal, idx) => ({
                  id: cal.id || `cal_${idx}`,
                  name: cal.name || `Calendrier ${idx + 1}`,
                  classLetter: cal.classLetter || null,
                  colorIndex: typeof cal.colorIndex === 'number' ? cal.colorIndex : (idx * 3) % CALENDAR_PALETTES_DARK.length,
                  enabled: cal.enabled !== false,
                  events: (cal.events || []).map(e => ({
                    ...e,
                    startDate: new Date(e.startDate),
                    endDate: new Date(e.endDate),
                    isAllDay: Boolean(e.isAllDay),
                    isRecurring: Boolean(e.isRecurring),
                    rruleSummary: e.rruleSummary || ''
                  }))
                }));
                instancesCache.set(item.instanceId, parsed);
              }
            }
          });
          if (state.currentView === 'home') {
            renderHomeInstances();
          } else if (state.activeInstance && (!state.calendars || state.calendars.length === 0)) {
            const idbCals = instancesCache.get(state.activeInstance.id);
            if (idbCals && idbCals.length > 0) {
              state.calendars = idbCals;
              ensureValidStartingDate();
              render();
              if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();
            }
          }
        }
      };
    } catch (e) {
      console.warn('Erreur IndexedDB init:', e);
    }
  }

  async function loadFromIndexedDB(instanceId) {
    try {
      const db = await getIndexedDB();
      if (!db) return null;
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(instanceId);
        req.onsuccess = () => {
          if (req.result && Array.isArray(req.result.calendars) && req.result.calendars.length > 0) {
            const parsed = req.result.calendars.map((cal, idx) => ({
              id: cal.id || `cal_${idx}`,
              name: cal.name || `Calendrier ${idx + 1}`,
              classLetter: cal.classLetter || null,
              colorIndex: typeof cal.colorIndex === 'number' ? cal.colorIndex : (idx * 3) % CALENDAR_PALETTES_DARK.length,
              enabled: cal.enabled !== false,
              events: (cal.events || []).map(e => ({
                ...e,
                startDate: new Date(e.startDate),
                endDate: new Date(e.endDate),
                isAllDay: Boolean(e.isAllDay),
                isRecurring: Boolean(e.isRecurring),
                rruleSummary: e.rruleSummary || ''
              }))
            }));
            instancesCache.set(instanceId, parsed);
            resolve(parsed);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  function getInstanceCalendarCount(instanceId) {
    if (state.activeInstance && state.activeInstance.id === instanceId) {
      return state.calendars.length;
    }
    if (instancesCache.has(instanceId)) {
      const cached = instancesCache.get(instanceId);
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.length;
      }
    }
    try {
      let raw = localStorage.getItem(getInstanceCalendarsStorageKey(instanceId));
      if (!raw && instanceId === 'inst_default') {
        raw = localStorage.getItem(STORAGE_KEY);
      }
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      return 0;
    }
  }

  // --- LocalStorage & Multi-Tier Persistence per Comparison Instance ---
  function saveToLocalStorage() {
    if (!state.activeInstance) return;
    try {
      const activeId = state.activeInstance.id;
      // 1. Instant Synchronous Cache Update (Guarantees zero data loss during navigation)
      instancesCache.set(activeId, [...state.calendars]);

      // 2. Asynchronous IndexedDB Save (Limitless storage quota on iOS Safari)
      saveToIndexedDB(activeId, state.calendars);

      // 3. LocalStorage persistence (Safe fallback with strict date validation)
      const data = state.calendars.map(cal => ({
        id: cal.id,
        name: cal.name,
        classLetter: cal.classLetter,
        colorIndex: cal.colorIndex,
        enabled: cal.enabled,
        events: cal.events.map(e => ({
          id: e.id,
          uid: e.uid,
          calendarId: e.calendarId,
          summary: e.summary,
          title: e.title,
          startDate: (e.startDate instanceof Date && !isNaN(e.startDate.getTime()))
            ? e.startDate.toISOString()
            : (typeof e.startDate === 'string' ? e.startDate : new Date().toISOString()),
          endDate: (e.endDate instanceof Date && !isNaN(e.endDate.getTime()))
            ? e.endDate.toISOString()
            : (typeof e.endDate === 'string' ? e.endDate : new Date().toISOString()),
          isAllDay: Boolean(e.isAllDay),
          isRecurring: Boolean(e.isRecurring),
          rruleSummary: e.rruleSummary || '',
          location: e.location,
          prof: e.prof,
          typecours: e.typecours,
          flagpresentiel: e.flagpresentiel || '',
          groupe: e.groupe,
          description: e.description
        }))
      }));
      const serialized = JSON.stringify(data);
      try {
        localStorage.setItem(getInstanceCalendarsStorageKey(activeId), serialized);
        if (activeId === 'inst_default') {
          localStorage.setItem(STORAGE_KEY, serialized);
        }
      } catch (storageErr) {
        console.warn('LocalStorage plein ou restreint (iOS/Safari) : données protégées via Cache et IndexedDB.', storageErr);
      }
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde locale :', e);
    }
  }

  function loadFromLocalStorage(targetInstanceId) {
    try {
      const activeId = targetInstanceId || (state.activeInstance ? state.activeInstance.id : 'inst_default');

      // 1. Check in-memory cache first (instant, 100% reliable)
      if (instancesCache.has(activeId)) {
        const cached = instancesCache.get(activeId);
        if (Array.isArray(cached) && cached.length > 0) {
          return cached;
        }
      }

      // 2. Check LocalStorage
      let raw = localStorage.getItem(getInstanceCalendarsStorageKey(activeId));
      if (!raw && activeId === 'inst_default') {
        raw = localStorage.getItem(STORAGE_KEY);
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const result = parsed.map((cal, idx) => ({
        id: cal.id || `cal_${idx}`,
        name: cal.name || `Calendrier ${idx + 1}`,
        classLetter: cal.classLetter || null,
        colorIndex: typeof cal.colorIndex === 'number' ? cal.colorIndex : (idx * 3) % CALENDAR_PALETTES_DARK.length,
        enabled: cal.enabled !== false,
        events: (cal.events || []).map(e => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          isAllDay: Boolean(e.isAllDay),
          isRecurring: Boolean(e.isRecurring),
          rruleSummary: e.rruleSummary || ''
        }))
      }));

      // Cache for future instant reads
      instancesCache.set(activeId, result);
      return result;
    } catch (e) {
      console.warn('Erreur lors de la lecture du stockage local :', e);
      return [];
    }
  }

  // --- View Navigation & Instance Management Functions ---
  function showView(viewName) {
    const homeView = document.getElementById('homePageView');
    const mainView = document.getElementById('mainPageView');

    if (viewName === 'home') {
      if (state.activeInstance) {
        saveToLocalStorage();
        instancesCache.set(state.activeInstance.id, [...state.calendars]);
      }
      state.currentView = 'home';
      state.activeInstance = null;
      state.calendars = [];
      if (homeView) homeView.classList.remove('hidden-view');
      if (mainView) mainView.classList.add('hidden-view');
      renderHomeInstances();
    } else {
      state.currentView = 'main';
      if (!state.activeInstance) {
        const lastUsedId = localStorage.getItem(LAST_USED_INSTANCE_STORAGE_KEY) || (state.instances[0] ? state.instances[0].id : 'inst_default');
        state.activeInstance = state.instances.find(i => i.id === lastUsedId) || state.instances[0] || null;
        if (state.activeInstance) {
          state.calendars = loadFromLocalStorage(state.activeInstance.id);
        }
      }
      if (homeView) homeView.classList.add('hidden-view');
      if (mainView) mainView.classList.remove('hidden-view');
      updateMainComparisonTitle();
      render();
    }
  }

  function updateMainComparisonTitle() {
    const titleEl = document.getElementById('mainComparisonTitle');
    if (titleEl) {
      titleEl.textContent = state.activeInstance ? state.activeInstance.name : 'MonCalendrier';
    }
  }

  function renderHomeInstances() {
    const listEl = document.getElementById('comparisonBlocksList');
    if (!listEl) return;

    if (!state.instances || state.instances.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-muted); font-size: 0.95rem;">Aucune comparaison disponible. Cliquez sur "Nouvelle comparaison" pour en créer une.</div>`;
      return;
    }

    const lastUsedId = localStorage.getItem(LAST_USED_INSTANCE_STORAGE_KEY);

    listEl.innerHTML = state.instances.map(inst => {
      const gradient = getInstanceGradient(inst.gradient);
      const calCount = getInstanceCalendarCount(inst.id);
      const isLastUsed = (inst.id === lastUsedId);
      const countLabel = calCount === 0 ? 'Aucun calendrier' : `${calCount} calendrier${calCount > 1 ? 's' : ''}`;

      return `
        <div class="instance-block-card" data-id="${escapeHTML(inst.id)}" style="background: ${gradient.value};">
          <div class="instance-card-inner">
            <div class="instance-info">
              <h3 class="instance-name">${escapeHTML(inst.name)}</h3>
              <div class="instance-badges">
                <span class="instance-count-badge">
                  <i class="ph-bold ph-calendar-blank"></i>
                  ${countLabel}
                </span>
                ${isLastUsed ? '<span class="instance-last-used-pill"><i class="ph-fill ph-play"></i> Chargé</span>' : ''}
              </div>
            </div>
            <div class="instance-actions">
              <button class="btn-instance-options" type="button" title="Options de la comparaison" aria-label="Options" data-id="${escapeHTML(inst.id)}">
                <i class="ph-bold ph-dots-three-vertical"></i>
              </button>
              <div class="instance-dropdown-menu" id="instanceDropdown-${escapeHTML(inst.id)}">
                <button class="dropdown-item btn-action-edit" type="button" data-id="${escapeHTML(inst.id)}">
                  <i class="ph-bold ph-pencil-simple"></i>
                  <span>Modifier le bloc</span>
                </button>
                <button class="dropdown-item btn-action-promote" type="button" data-id="${escapeHTML(inst.id)}">
                  <i class="ph-bold ph-arrow-fat-up"></i>
                  <span>Déplacer au 1er rang</span>
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item btn-action-delete text-danger" type="button" data-id="${escapeHTML(inst.id)}">
                  <i class="ph-bold ph-trash"></i>
                  <span>Supprimer le bloc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function setupHomeEventListeners() {
    const listEl = document.getElementById('comparisonBlocksList');
    if (listEl) {
      listEl.addEventListener('click', e => {
        // 1. Click on 3-dots button
        const btnOptions = e.target.closest('.btn-instance-options');
        if (btnOptions) {
          e.stopPropagation();
          const instId = btnOptions.dataset.id;
          toggleInstanceDropdown(instId);
          return;
        }

        // 2. Click on "Modifier le bloc"
        const btnEdit = e.target.closest('.btn-action-edit');
        if (btnEdit) {
          e.stopPropagation();
          closeAllInstanceDropdowns();
          openEditInstanceModal(btnEdit.dataset.id);
          return;
        }

        // 3. Click on "Déplacer au 1er rang"
        const btnPromote = e.target.closest('.btn-action-promote');
        if (btnPromote) {
          e.stopPropagation();
          closeAllInstanceDropdowns();
          promoteInstanceToFirst(btnPromote.dataset.id);
          return;
        }

        // 4. Click on "Supprimer le bloc"
        const btnDelete = e.target.closest('.btn-action-delete');
        if (btnDelete) {
          e.stopPropagation();
          closeAllInstanceDropdowns();
          openDeleteInstanceModal(btnDelete.dataset.id);
          return;
        }

        // 5. Click on Card itself -> Open instance and switch to main-page!
        const card = e.target.closest('.instance-block-card');
        if (card && !e.target.closest('.instance-dropdown-menu')) {
          const instId = card.dataset.id;
          selectInstanceAndOpen(instId);
        }
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', e => {
      if (!e.target.closest('.instance-actions')) {
        closeAllInstanceDropdowns();
      }
    });
  }

  function toggleInstanceDropdown(instId) {
    const targetMenu = document.getElementById(`instanceDropdown-${instId}`);
    const wasOpen = targetMenu && targetMenu.classList.contains('open');
    closeAllInstanceDropdowns();
    if (targetMenu && !wasOpen) {
      targetMenu.classList.add('open');
    }
  }

  function closeAllInstanceDropdowns() {
    document.querySelectorAll('.instance-dropdown-menu.open').forEach(menu => {
      menu.classList.remove('open');
    });
  }

  async function selectInstanceAndOpen(instId) {
    const target = state.instances.find(i => i.id === instId);
    if (!target) return;

    state.activeInstance = target;
    localStorage.setItem(LAST_USED_INSTANCE_STORAGE_KEY, target.id);
    state.calendars = loadFromLocalStorage(target.id);

    // Fallback: If not found in cache/localStorage, check IndexedDB
    if (!state.calendars || state.calendars.length === 0) {
      const idbCals = await loadFromIndexedDB(target.id);
      if (idbCals && idbCals.length > 0 && state.activeInstance && state.activeInstance.id === target.id) {
        state.calendars = idbCals;
      }
    }

    updateMainComparisonTitle();
    showView('main');
    ensureValidStartingDate();
    render();
    showToast(`Comparaison "${target.name}" chargée.`);
  }

  function promoteInstanceToFirst(instId) {
    const index = state.instances.findIndex(i => i.id === instId);
    if (index === -1) return;
    if (index === 0) {
      showToast(`"${state.instances[0].name}" est déjà au 1er rang.`);
      return;
    }
    const [moved] = state.instances.splice(index, 1);
    state.instances.unshift(moved);
    saveInstancesToStorage();
    renderHomeInstances();
    showToast(`"${moved.name}" déplacé au 1er rang.`);
  }

  let currentModalMode = 'create'; // 'create' or 'edit'
  let currentEditingInstanceId = null;
  let selectedModalGradient = 'gradient-red';

  function renderGradientPicker(selectedId) {
    selectedModalGradient = selectedId || 'gradient-red';
    const grid = document.getElementById('gradientPickerGrid');
    if (!grid) return;

    grid.innerHTML = INSTANCE_GRADIENTS.map(g => {
      const isSelected = (g.id === selectedModalGradient);
      return `
        <button 
          type="button" 
          class="gradient-picker-chip ${isSelected ? 'selected' : ''}" 
          data-gradient-id="${g.id}" 
          title="${g.name}" 
          style="background: ${g.value};"
          aria-label="${g.name}"
        >
          <i class="ph-bold ph-check gradient-chip-check"></i>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.gradient-picker-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.gradient-picker-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedModalGradient = chip.dataset.gradientId;
      });
    });
  }

  function openCreateInstanceModal() {
    currentModalMode = 'create';
    currentEditingInstanceId = null;
    const titleText = document.getElementById('comparisonModalTitleText');
    const subtitle = document.getElementById('comparisonModalSubtitle');
    const input = document.getElementById('comparisonNameInput');
    const btnSaveText = document.getElementById('btnSaveComparisonText');

    if (titleText) titleText.textContent = 'Nouvelle comparaison';
    if (subtitle) subtitle.textContent = 'Configurez le nom et la couleur de votre espace de comparaison';
    if (input) {
      input.value = '';
      input.placeholder = `Comparaison ${state.instances.length + 1}`;
    }
    if (btnSaveText) btnSaveText.textContent = 'Créer';

    renderGradientPicker('gradient-red');

    const backdrop = document.getElementById('comparisonModalBackdrop');
    if (backdrop) {
      backdrop.classList.add('open');
      setTimeout(() => input?.focus(), 100);
    }
  }

  function openEditInstanceModal(instId) {
    const inst = state.instances.find(i => i.id === instId);
    if (!inst) return;

    currentModalMode = 'edit';
    currentEditingInstanceId = instId;
    const titleText = document.getElementById('comparisonModalTitleText');
    const subtitle = document.getElementById('comparisonModalSubtitle');
    const input = document.getElementById('comparisonNameInput');
    const btnSaveText = document.getElementById('btnSaveComparisonText');

    if (titleText) titleText.textContent = 'Modifier le bloc';
    if (subtitle) subtitle.textContent = 'Modifiez le nom et la sélection de couleur de la comparaison';
    if (input) {
      input.value = inst.name;
    }
    if (btnSaveText) btnSaveText.textContent = 'Enregistrer';

    renderGradientPicker(inst.gradient);

    const backdrop = document.getElementById('comparisonModalBackdrop');
    if (backdrop) {
      backdrop.classList.add('open');
      setTimeout(() => input?.focus(), 100);
    }
  }

  function handleSaveComparisonForm(e) {
    e.preventDefault();
    const input = document.getElementById('comparisonNameInput');
    const name = (input ? input.value.trim() : '') || `Comparaison ${state.instances.length + 1}`;
    const gradient = selectedModalGradient || 'gradient-red';

    if (currentModalMode === 'create') {
      const newInst = {
        id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name,
        gradient: gradient,
        createdAt: Date.now()
      };
      // Quand on crée un nouveau bloc, il est automatiquement placé en tête de liste, au premier rang
      state.instances.unshift(newInst);
      saveInstancesToStorage();
      renderHomeInstances();
      closeAllModals();
      selectInstanceAndOpen(newInst.id);
      showToast(`"${newInst.name}" créé avec succès !`);
      return;
    } else if (currentModalMode === 'edit') {
      const inst = state.instances.find(i => i.id === currentEditingInstanceId);
      if (inst) {
        inst.name = name;
        inst.gradient = gradient;
        saveInstancesToStorage();
        if (state.activeInstance && state.activeInstance.id === inst.id) {
          state.activeInstance.name = name;
          state.activeInstance.gradient = gradient;
          updateMainComparisonTitle();
        }
        renderHomeInstances();
        showToast(`"${inst.name}" mis à jour avec succès.`);
      }
    }

    closeAllModals();
  }

  let deletingInstanceId = null;

  function openDeleteInstanceModal(instId) {
    const inst = state.instances.find(i => i.id === instId);
    if (!inst) return;

    deletingInstanceId = instId;
    const msgEl = document.getElementById('deleteComparisonConfirmMessage');
    if (msgEl) {
      msgEl.innerHTML = `Êtes-vous sûr de vouloir supprimer définitivement la comparaison <strong>"${escapeHTML(inst.name)}"</strong> ?`;
    }

    const backdrop = document.getElementById('deleteComparisonModalBackdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function confirmDeleteInstance() {
    if (!deletingInstanceId) return;

    const targetIndex = state.instances.findIndex(i => i.id === deletingInstanceId);
    if (targetIndex === -1) return;

    const deleted = state.instances[targetIndex];
    const lastUsedId = localStorage.getItem(LAST_USED_INSTANCE_STORAGE_KEY);
    const wasLastUsed = (deleted.id === lastUsedId);

    // Remove calendars from storage and caches
    try {
      localStorage.removeItem(getInstanceCalendarsStorageKey(deleted.id));
    } catch (e) {}
    instancesCache.delete(deleted.id);

    // Remove from instances list
    state.instances.splice(targetIndex, 1);

    // Exceptional Cases Handling:
    // 1. "Si l'utilisateur a détruit le bloc défaut ou son seul et dernier bloc et n'a plus de bloc, un nouveau bloc par défaut 'MonCalendrier' est recréé automatiquement."
    if (state.instances.length === 0) {
      const fallback = {
        id: `inst_${Date.now()}`,
        name: 'MonCalendrier',
        gradient: 'gradient-red',
        createdAt: Date.now()
      };
      state.instances = [fallback];
      saveInstancesToStorage();
      localStorage.setItem(LAST_USED_INSTANCE_STORAGE_KEY, fallback.id);
      state.activeInstance = fallback;
      state.calendars = [];
      saveToLocalStorage();
      updateMainComparisonTitle();
      showToast('Comparaison supprimée. Un nouveau bloc "MonCalendrier" a été recréé.');
    } else {
      // 2. "Quand un utilisateur supprime un bloc/instance qui était le 'last-used', 'last-used' est réattribué automatiquement au premier bloc de la liste."
      if (wasLastUsed) {
        const newLastUsed = state.instances[0];
        localStorage.setItem(LAST_USED_INSTANCE_STORAGE_KEY, newLastUsed.id);
        if (state.activeInstance && state.activeInstance.id === deleted.id) {
          state.activeInstance = newLastUsed;
          state.calendars = loadFromLocalStorage(newLastUsed.id);
          updateMainComparisonTitle();
        }
      }
      saveInstancesToStorage();
      showToast(`"${deleted.name}" supprimé définitivement.`);
    }

    deletingInstanceId = null;
    closeAllModals();
    renderHomeInstances();
  }

  // --- Calendar Management (Add / Remove) ---
  // Default calendar colors step by 3 through the 30 rainbow palettes (3 * 10 = 30)
  // Ensures striking color contrast: Rouge -> Rubis -> Ambre -> Jaune -> Vert Pomme -> Menthe -> Sarcelle -> Bleu Azur -> Indigo -> Pourpre
  function getNextColorIndex() {
    const totalPalettes = CALENDAR_PALETTES_DARK.length;
    const step = 3;
    const usedIndices = new Set(state.calendars.map(c => c.colorIndex));

    for (let i = 0; i < MAX_CALENDARS; i++) {
      const candidate = (i * step) % totalPalettes;
      if (!usedIndices.has(candidate)) {
        return candidate;
      }
    }

    for (let i = 0; i < totalPalettes; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }

    return (state.calendars.length * step) % totalPalettes;
  }

  // Helper to match candidate calendar against existing calendars in state
  function findMatchingCalendarIndex(candName) {
    if (!candName || !state.calendars || state.calendars.length === 0) return -1;
    const cleanCand = candName.trim().toLowerCase();
    const candFirst = getFirstName(candName).trim().toLowerCase();

    // 1. Exact match on full name
    let idx = state.calendars.findIndex(c => c.name.trim().toLowerCase() === cleanCand);
    if (idx !== -1) return idx;

    // 2. Match on first name (e.g. "Julien VIMART" vs "Julien")
    if (candFirst && candFirst.length >= 2) {
      idx = state.calendars.findIndex(c => {
        const cFirst = getFirstName(c.name).trim().toLowerCase();
        return cFirst === candFirst;
      });
      if (idx !== -1) return idx;
    }

    return -1;
  }

  function addCalendarFromICS(icsContent, filename) {
    const tempId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fallbackName = filename ? filename.replace(/\.ics$/i, '') : `Calendrier ${state.calendars.length + 1}`;
    const parsed = parseICS(icsContent, tempId, fallbackName);

    if (parsed.events.length === 0) {
      showToast(`⚠️ Aucun événement valide trouvé dans "${filename}". Vérifiez que le fichier contient des données au format .ics.`);
      return false;
    }

    const candName = parsed.name || fallbackName;
    const matchIndex = findMatchingCalendarIndex(candName);

    if (matchIndex !== -1) {
      // REPLACE IN-PLACE: Preserve calendar ID, colorIndex, and order in comparison!
      const existing = state.calendars[matchIndex];
      existing.name = candName;
      existing.events = parsed.events.map(e => ({ ...e, calendarId: existing.id }));
      if (parsed.classLetter) existing.classLetter = parsed.classLetter;
      saveToLocalStorage();
      ensureValidStartingDate();
      render();
      if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();
      const classMsg = existing.classLetter ? ` (Classe ${existing.classLetter})` : '';
      showToast(`✅ Calendrier "${existing.name}"${classMsg} mis à jour avec succès (${existing.events.length} cours) !`);
      return true;
    }

    if (state.calendars.length >= MAX_CALENDARS) {
      showToast(`Limite atteinte : Vous comparez déjà le maximum de ${MAX_CALENDARS} calendriers.`);
      return false;
    }

    const colorIndex = getNextColorIndex();
    const newCal = {
      id: tempId,
      name: candName,
      classLetter: parsed.classLetter,
      colorIndex: colorIndex,
      enabled: true,
      events: parsed.events
    };

    state.calendars.push(newCal);
    saveToLocalStorage();
    ensureValidStartingDate();
    render();
    if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();

    const classMsg = newCal.classLetter ? ` (Classe ${newCal.classLetter})` : '';
    showToast(`✅ "${newCal.name}"${classMsg} ajouté avec succès (${newCal.events.length} cours / événement(s)) !`);
    return true;
  }

  function removeCalendar(calId) {
    const target = state.calendars.find(c => c.id === calId);
    if (!target) return;

    state.calendars = state.calendars.filter(c => c.id !== calId);
    saveToLocalStorage();
    render();
    if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();
    if (typeof renderHomeInstances === 'function') renderHomeInstances();
    showToast(`🗑️ Calendrier "${target.name}" supprimé de la comparaison.`);
  }

  function openClearAllCalendarsModal() {
    if (!state.calendars || state.calendars.length === 0) {
      showToast('⚠️ Aucun calendrier à retirer.');
      return;
    }

    const count = state.calendars.length;
    const instanceName = state.activeInstance ? state.activeInstance.name : 'cette comparaison';
    const msgEl = document.getElementById('clearAllCalendarsConfirmMessage');
    if (msgEl) {
      msgEl.innerHTML = `Êtes-vous sûr de vouloir retirer les <strong>${count} calendrier${count > 1 ? 's' : ''}</strong> de <strong>"${escapeHTML(instanceName)}"</strong> ?`;
    }

    const backdrop = document.getElementById('clearAllCalendarsModalBackdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeClearAllCalendarsModal() {
    const backdrop = document.getElementById('clearAllCalendarsModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmClearAllCalendars() {
    if (!state.calendars || state.calendars.length === 0) {
      closeClearAllCalendarsModal();
      return;
    }

    state.calendars = [];
    saveToLocalStorage();
    render();
    if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();
    if (typeof renderHomeInstances === 'function') renderHomeInstances();
    closeClearAllCalendarsModal();
    showToast('🗑️ Tous les calendriers ont été retirés.');
  }

  // --- Date / Period Helpers ---
  function getMonday(d) {
    const date = new Date(d);
    if (!state.showSundays && date.getDay() === 0) {
      // If Sundays are disabled and it's Sunday, week view refers to the upcoming week starting on Monday (tomorrow)
      date.setDate(date.getDate() + 1);
    } else {
      const day = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      date.setDate(date.getDate() - day);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Returns days of the week: Monday to Saturday (6 days), or Monday to Sunday (7 days) if showSundays is true
  function getWeekDays(monday) {
    const days = [];
    const count = state.showSundays ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }
  const getWeekDays6 = getWeekDays;

  function isSameDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}h${m !== '00' ? m : ''}`;
  }

  function formatTimeFull(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  }

  // Extracts the owner's first name, omitting the surname
  function getFirstName(fullName) {
    if (!fullName) return '';
    let trimmed = fullName.trim();
    // Strip common calendar prefixes like "Calendrier ", "Emploi du temps ", "Agenda "
    trimmed = trimmed.replace(/^(?:calendrier|emploi\s+du\s+temps|agenda|edt)\s+/i, '');
    // If it's an email (e.g. from Google Calendar X-WR-CALNAME: secretghost.me@gmail.com)
    if (trimmed.includes('@')) {
      trimmed = trimmed.split('@')[0];
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    // If first word is an all-caps surname (e.g. "VIMART Julien"), take the second word
    if (parts[0] === parts[0].toUpperCase() && parts[0].length > 1 && parts[1] && parts[1] !== parts[1].toUpperCase()) {
      return parts[1];
    }
    // Standard format: "Julien VIMART" -> "Julien"
    return parts[0];
  }

  // Determines card display simplification mode: 'detailed', 'partial-with-owner', 'partial-no-owner', or 'compact'
  function getCardDisplayMode(isMobile, viewType, numEnabled) {
    if (!isMobile) {
      // Large screen / Desktop:
      // Day view: always detailed
      // Week view: 1-2 cals detailed, 3-10 cals compact mode
      if (viewType === 'day') return 'detailed';
      return numEnabled <= 2 ? 'detailed' : 'compact';
    } else {
      // Mobile:
      if (viewType === 'day') {
        // Day view: 1-2 cals detailed, 3-5 cals partial with owner, 6-10 cals compact
        if (numEnabled <= 2) return 'detailed';
        if (numEnabled <= 5) return 'partial-with-owner';
        return 'compact';
      } else {
        // Week view: 1 cal partial without owner, 2-7 cals compact, 8-10 cals ultra-compact
        if (numEnabled <= 1) return 'partial-no-owner';
        if (numEnabled >= 8) return 'ultra-compact';
        return 'compact';
      }
    }
  }

  function getISOWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }

  function ensureValidStartingDate() {
    const allEvents = state.calendars.flatMap(c => c.events);
    const defaultDate = getDefaultDate();
    if (allEvents.length === 0) {
      state.currentDate = defaultDate;
      return;
    }

    const today = new Date();

    // 1. If defaultDate's week has events, use defaultDate
    const targetMonday = getMonday(defaultDate);
    const weekDays = getWeekDays(targetMonday);
    const hasWeekEvents = allEvents.some(e => weekDays.some(d => isSameDay(e.startDate, d)));
    if (hasWeekEvents) {
      state.currentDate = defaultDate;
      return;
    }

    // 2. Look for upcoming events starting from today onwards
    const upcomingEvents = allEvents.filter(e => e.startDate >= today);
    if (upcomingEvents.length > 0) {
      let earliestUpcoming = upcomingEvents[0].startDate;
      for (const ev of upcomingEvents) {
        if (ev.startDate < earliestUpcoming) earliestUpcoming = ev.startDate;
      }
      const target = new Date(earliestUpcoming);
      if (!state.showSundays && target.getDay() === 0) target.setDate(target.getDate() + 1);
      state.currentDate = target;
      return;
    }

    // 3. Otherwise find the closest event in the past (most recent past event)
    let closestDate = allEvents[0].startDate;
    let minDiff = Math.abs(today - allEvents[0].startDate);
    for (const ev of allEvents) {
      const diff = Math.abs(today - ev.startDate);
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = ev.startDate;
      }
    }
    const target = new Date(closestDate);
    if (!state.showSundays && target.getDay() === 0) target.setDate(target.getDate() + 1);
    state.currentDate = target;
  }

  // --- Rendering Pipeline ---
  function render() {
    renderHeaderInfo();
    renderCalendarChips();
    renderCalendarGrid();
    renderWeeklyStats();
    renderModalCalendarList();
    updateHeaderBadges();
    if (typeof renderSettingsCalendarsList === 'function') renderSettingsCalendarsList();
  }

  function updateHeaderBadges() {
    const count = state.calendars.length;
    const badge = document.getElementById('headerCalCountBadge');
    if (badge) badge.textContent = `${count}/${MAX_CALENDARS}`;

    const settingsBadge = document.getElementById('settingsCalCountBadge');
    if (settingsBadge) settingsBadge.textContent = `${count}/${MAX_CALENDARS}`;

    const modalCount = document.getElementById('modalCalCount');
    if (modalCount) modalCount.textContent = count;
  }

  function renderHeaderInfo() {
    const titleEl = document.getElementById('currentPeriodTitle');
    const rangeEl = document.getElementById('currentPeriodRange');
    const datePicker = document.getElementById('periodDatePicker');

    if (state.viewType === 'week') {
      const monday = getMonday(state.currentDate);
      const lastDay = new Date(monday);
      const count = state.showSundays ? 7 : 6;
      lastDay.setDate(monday.getDate() + (count - 1));

      const weekNum = getISOWeekNumber(monday);

      if (titleEl) {
        titleEl.textContent = `Semaine ${weekNum} • ${MONTHS_FR[monday.getMonth()]}`;
      }
      if (rangeEl) {
        rangeEl.textContent = `Du ${monday.getDate()} au ${lastDay.getDate()} ${MONTHS_FR[lastDay.getMonth()].toLowerCase()} ${lastDay.getFullYear()}`;
      }
    } else {
      // Day View
      const dayIndex = (state.currentDate.getDay() + 6) % 7;
      const dayName = DAYS_FR_7[dayIndex] || 'Dimanche';
      const dayEvents = getEventsForDay(state.currentDate);

      if (titleEl) {
        titleEl.textContent = `${dayName} ${state.currentDate.getDate()} ${MONTHS_FR[state.currentDate.getMonth()]}`;
      }
      if (rangeEl) {
        rangeEl.textContent = `${state.currentDate.getFullYear()} • ${dayEvents.length} cours`;
      }
    }

    // Sync HTML5 Date Picker
    if (datePicker) {
      const yyyy = state.currentDate.getFullYear();
      const mm = String(state.currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(state.currentDate.getDate()).padStart(2, '0');
      datePicker.value = `${yyyy}-${mm}-${dd}`;
    }

    // Previous / Next / Today / Period navigation state when no calendar is loaded
    const hasCalendars = state.calendars && state.calendars.length > 0;
    const btnPrev = document.getElementById('btnPrevDate');
    const btnNext = document.getElementById('btnNextDate');
    const btnToday = document.getElementById('btnToday');
    const periodDisplay = document.getElementById('currentPeriodDisplay');
    const datePickerWrapper = document.getElementById('datePickerWrapper');

    if (btnPrev) {
      btnPrev.disabled = !hasCalendars;
      btnPrev.classList.toggle('disabled', !hasCalendars);
    }
    if (btnNext) {
      btnNext.disabled = !hasCalendars;
      btnNext.classList.toggle('disabled', !hasCalendars);
    }
    if (btnToday) {
      btnToday.disabled = !hasCalendars;
      btnToday.classList.toggle('disabled', !hasCalendars);
    }
    if (periodDisplay) {
      periodDisplay.classList.toggle('disabled', !hasCalendars);
    }
    if (datePickerWrapper) {
      datePickerWrapper.classList.toggle('disabled', !hasCalendars);
    }
    if (datePicker) {
      datePicker.disabled = !hasCalendars;
    }

    // View Switcher Buttons State
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === state.viewType);
    });

    // Quick Jump Buttons Active State
    document.querySelectorAll('.quick-jump-btn').forEach(btn => {
      const targetYear = parseInt(btn.dataset.year, 10);
      const targetMonth = parseInt(btn.dataset.month, 10);
      const isMatch = state.currentDate.getFullYear() === targetYear && state.currentDate.getMonth() === targetMonth;
      btn.classList.toggle('active', isMatch);
    });

    // Dim CMo button active state
    const btnToggleDimCMo = document.getElementById('btnToggleDimCMo');
    if (btnToggleDimCMo) {
      btnToggleDimCMo.classList.toggle('active', state.dimCMo);
    }

    // Toggle Toolbar state and active styling
    updateToolbarState();

    // Free Time button active state
    const btnToggleFreeTime = document.getElementById('btnToggleFreeTime');
    if (btnToggleFreeTime) {
      btnToggleFreeTime.classList.toggle('active', state.showFreeTime);
      btnToggleFreeTime.style.borderColor = state.showFreeTime ? 'var(--accent-emerald)' : '';
      btnToggleFreeTime.style.color = state.showFreeTime ? 'var(--accent-emerald)' : '';
    }

    // Type Filter Select sync
    const typeFilterSelect = document.getElementById('typeFilterSelect');
    if (typeFilterSelect && typeFilterSelect.value !== state.typeFilter) {
      typeFilterSelect.value = state.typeFilter;
    }
  }

  // --- Render Subheader Calendar Chips ---
  function renderCalendarChips() {
    const listEl = document.getElementById('calendarChipsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (state.calendars.length === 0) {
      listEl.innerHTML = `
        <div class="empty-chips-hint">
          <span>Aucun calendrier comparé</span>
          <button class="empty-chips-btn" id="btnQuickAddChip">
            <i class="ph-bold ph-plus"></i> Ajouter un calendrier .ics
          </button>
        </div>
      `;
      document.getElementById('btnQuickAddChip')?.addEventListener('click', () => {
        document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
      });
      return;
    }

    state.calendars.forEach((cal) => {
      const palette = getCalendarPalette(cal.colorIndex);
      const chip = document.createElement('div');
      chip.className = `calendar-chip cal-color-${cal.colorIndex % 10} ${!cal.enabled ? 'disabled' : ''}`;
      chip.style.setProperty('--cal-primary', palette.primary, 'important');
      chip.style.setProperty('--cal-border', palette.border, 'important');
      chip.style.setProperty('--cal-bg', palette.bg, 'important');
      chip.style.setProperty('--cal-bg-hover', palette.bgHover, 'important');
      chip.style.setProperty('--cal-text', palette.text, 'important');

      const firstName = getFirstName(cal.name);
      const classBadge = cal.classLetter ? `<span class="chip-class-tag" style="background:${palette.badgeBg}; color:#fff;" title="Classe ${escapeHTML(cal.classLetter)}">${escapeHTML(cal.classLetter)}</span>` : '';

      chip.innerHTML = `
        <button class="chip-main-click" title="Cliquer pour afficher ou masquer ce calendrier">
          <span class="chip-dot" style="background:${palette.primary};"></span>
          <span class="chip-name" title="${escapeHTML(cal.name)}">${escapeHTML(firstName)}</span>
          ${classBadge}
        </button>
        <button class="chip-delete-btn" title="Supprimer ${escapeHTML(cal.name)} de la comparaison">
          <i class="ph ph-trash"></i>
        </button>
      `;

      chip.querySelector('.chip-main-click')?.addEventListener('click', () => {
        cal.enabled = !cal.enabled;
        saveToLocalStorage();
        render();
      });

      chip.querySelector('.chip-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCalendar(cal.id);
      });

      listEl.appendChild(chip);
    });
  }

  // --- Render Modal Calendar List ---
  function renderModalCalendarList() {
    const listEl = document.getElementById('modalCalendarsList');
    const sectionEl = document.getElementById('modalCalendarsSection');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (state.calendars.length === 0) {
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }

    if (sectionEl) sectionEl.style.display = 'flex';

    state.calendars.forEach((cal) => {
      const palette = getCalendarPalette(cal.colorIndex);
      const item = document.createElement('div');
      item.className = 'modal-cal-item';

      const classBadge = cal.classLetter ? `<span class="chip-class-tag" style="background:${palette.badgeBg}; color:#fff;" title="Classe ${escapeHTML(cal.classLetter)}">${escapeHTML(cal.classLetter)}</span>` : '';

      item.innerHTML = `
        <div class="modal-cal-info">
          <span class="chip-dot" style="background:${palette.primary}; width:12px; height:12px; box-shadow: 0 0 8px ${palette.primary};"></span>
          <span style="font-weight:700; color:var(--text-primary);">${escapeHTML(cal.name)}</span>
          ${classBadge}
          <span style="font-size:0.75rem; color:var(--text-muted);">(${cal.events.length} cours)</span>
        </div>
        <button class="chip-delete-btn" style="background:rgba(239,68,68,0.15); color:#ef4444;" title="Supprimer ce calendrier">
          <i class="ph ph-trash"></i>
        </button>
      `;

      item.querySelector('.chip-delete-btn')?.addEventListener('click', () => {
        removeCalendar(cal.id);
      });

      listEl.appendChild(item);
    });
  }

  // --- Filter Events for a Specific Day ---
  function getEventsForDay(day) {
    let all = [];
    const enabledCals = state.calendars.filter(c => c.enabled);

    enabledCals.forEach(cal => {
      const calEvents = cal.events.filter(e => isSameDay(e.startDate, day));
      all = all.concat(calEvents);
    });

    // Apply Search Query filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      all = all.filter(e => {
        const cal = state.calendars.find(c => c.id === e.calendarId);
        const classLetter = cal?.classLetter || '';
        return (
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.prof.toLowerCase().includes(q) ||
          e.groupe.toLowerCase().includes(q) ||
          classLetter.toLowerCase().includes(q) ||
          (cal && cal.name.toLowerCase().includes(q))
        );
      });
    }

    // Apply Course Type filter
    if (state.typeFilter && state.typeFilter !== 'ALL') {
      all = all.filter(e => e.typecours.toUpperCase() === state.typeFilter.toUpperCase());
    }

    return all;
  }

  // --- Render Calendar Grid (Week or Day View) ---
  function renderCalendarGrid() {
    const wrapper = document.getElementById('calendarViewWrapper');
    const emptyContainer = document.getElementById('emptyStateContainer');
    const scrollContainer = document.getElementById('calendarGridScroll');
    const headerContainer = document.getElementById('calendarDaysHeader');
    const gridBody = document.getElementById('calendarGridBody');
    if (!scrollContainer || !headerContainer || !gridBody) return;

    // Always clear grid containers first
    headerContainer.innerHTML = '';
    gridBody.innerHTML = '';

    const mainPageView = document.getElementById('mainPageView');
    if (state.calendars.length === 0) {
      if (wrapper) wrapper.classList.add('empty');
      if (mainPageView) mainPageView.classList.add('is-empty');
      if (emptyContainer) emptyContainer.style.display = 'flex';
      scrollContainer.style.display = 'none';
      headerContainer.style.display = 'none';
      gridBody.style.display = 'none';
      return;
    }

    if (wrapper) wrapper.classList.remove('empty');
    if (mainPageView) mainPageView.classList.remove('is-empty');
    if (emptyContainer) emptyContainer.style.display = 'none';
    scrollContainer.style.display = '';
    headerContainer.style.display = '';
    gridBody.style.display = '';

    if (state.viewType === 'week') {
      renderWeekView(scrollContainer, headerContainer, gridBody);
    } else {
      renderDayView(scrollContainer, headerContainer, gridBody);
    }
  }

  // --- Helper to build synchronized Time Axis Column ---
  function createTimeAxisColumn() {
    const timeAxisCol = document.createElement('div');
    timeAxisCol.className = 'time-axis-column';
    for (let h = 0; h < TOTAL_HOURS; h++) {
      const hourNum = TIME_START_HOUR + h;
      const slot = document.createElement('div');
      slot.className = 'time-slot-label';
      slot.innerHTML = `<span class="time-slot-text">${String(hourNum).padStart(2, '0')}h00</span>`;
      timeAxisCol.appendChild(slot);
    }
    return timeAxisCol;
  }

  // --- 1. Render Week View (Lundi à Samedi / Dimanche) ---
  function renderWeekView(scrollContainer, headerContainer, gridBody) {
    scrollContainer.classList.remove('day-view-mode');
    headerContainer.classList.remove('day-view-mode');
    gridBody.classList.remove('day-view-mode');
    headerContainer.classList.remove('cals-many');
    gridBody.classList.remove('cals-many');
    headerContainer.classList.toggle('has-sundays', state.showSundays);
    gridBody.classList.toggle('has-sundays', state.showSundays);
    headerContainer.style.gridTemplateColumns = '';
    gridBody.style.gridTemplateColumns = '';

    const monday = getMonday(state.currentDate);
    const weekDays = getWeekDays(monday);
    const dayNames = getDaysFr();
    const today = new Date();
    const enabledCals = state.calendars.filter(c => c.enabled);
    const numEnabled = enabledCals.length;
    const isMobile = window.innerWidth < 768;
    const cardMode = getCardDisplayMode(isMobile, 'week', numEnabled);

    // Batch Header Cells with DocumentFragment
    const headerFrag = document.createDocumentFragment();
    const timeAxisHeader = document.createElement('div');
    timeAxisHeader.className = 'time-axis-header-cell';
    timeAxisHeader.title = 'Heures';
    timeAxisHeader.innerHTML = '<i class="ph-bold ph-clock"></i>';
    headerFrag.appendChild(timeAxisHeader);

    weekDays.forEach((day, index) => {
      const isToday = isSameDay(day, today);
      const dayCell = document.createElement('div');
      dayCell.className = `day-header-cell ${isToday ? 'is-today' : ''}`;
      dayCell.innerHTML = `
        <span class="day-name">${dayNames[index]}</span>
        <span class="day-date">${day.getDate()}</span>
      `;
      headerFrag.appendChild(dayCell);
    });
    headerContainer.appendChild(headerFrag);

    // Batch Grid Body with DocumentFragment
    const gridFrag = document.createDocumentFragment();
    gridFrag.appendChild(createTimeAxisColumn());

    // 6 Day Columns
    weekDays.forEach((day) => {
      const isToday = isSameDay(day, today);
      const dayCol = document.createElement('div');
      dayCol.className = `day-column ${isToday ? 'is-today' : ''}`;
      dayCol.dataset.date = day.toISOString();

      const dayFrag = document.createDocumentFragment();

      // Background Hour Grid Lines
      for (let h = 0; h < TOTAL_HOURS; h++) {
        const line = document.createElement('div');
        line.className = 'hour-grid-line';
        line.style.top = `${(h / TOTAL_HOURS) * 100}%`;
        dayFrag.appendChild(line);
      }

      // Today Red Time Indicator Line
      if (isToday) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMin = TIME_START_HOUR * 60;
        const endMin = TIME_END_HOUR * 60;
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          const indicator = document.createElement('div');
          indicator.className = 'current-time-indicator';
          indicator.style.top = `${((currentMinutes - startMin) / TOTAL_MINUTES) * 100}%`;
          dayFrag.appendChild(indicator);
        }
      }

      // Render Common Free Time
      const dayEvents = getEventsForDay(day);
      const isUltraCompact = (cardMode === 'ultra-compact');

      if (state.showFreeTime && numEnabled > 0) {
        renderFreeTimeSlots(dayFrag, dayEvents, false);
      }

      // Render Course Events in Sub-columns per Calendar
      if (numEnabled > 0) {
        enabledCals.forEach((cal, calIndex) => {
          const calEvents = dayEvents.filter(e => e.calendarId === cal.id);
          calEvents.sort((a, b) => a.startDate - b.startDate);
          const firstEvent = calEvents.length > 0 ? calEvents[0] : null;
          const firstNonCMoEvent = (state.dimCMo && firstEvent && isCMoEvent(firstEvent))
            ? calEvents.find(e => !isCMoEvent(e))
            : null;

          const subColWidth = 100 / numEnabled;
          const leftPercent = calIndex * subColWidth;

          calEvents.forEach(event => {
            const isFirstOfDay = firstEvent && (event.id === firstEvent.id);
            const isFirstNonCMoOfDay = firstNonCMoEvent && (event.id === firstNonCMoEvent.id);
            const showVerticalName = Boolean(isFirstOfDay || isFirstNonCMoOfDay);

            const card = createEventCard(event, cal, cardMode, showVerticalName);
            const { topPercent, heightPercent } = calculateCardPosition(event);

            card.style.top = `${topPercent}%`;
            card.style.height = `${heightPercent}%`;
            card.style.left = isUltraCompact ? `${leftPercent}%` : `calc(${leftPercent}% + 1px)`;
            card.style.width = isUltraCompact ? `calc(${subColWidth}% - 0.5px)` : `calc(${subColWidth}% - 2px)`;

            dayFrag.appendChild(card);
          });
        });
      }

      dayCol.appendChild(dayFrag);
      gridFrag.appendChild(dayCol);
    });

    gridBody.appendChild(gridFrag);
  }

  // --- 2. Render Day View (Jour par jour - Distinct Column per Calendar) ---
  function renderDayView(scrollContainer, headerContainer, gridBody) {
    scrollContainer.classList.add('day-view-mode');
    headerContainer.classList.add('day-view-mode');
    gridBody.classList.add('day-view-mode');
    headerContainer.classList.remove('has-sundays');
    gridBody.classList.remove('has-sundays');

    const day = state.currentDate;
    const today = new Date();
    const isToday = isSameDay(day, today);
    const dayEvents = getEventsForDay(day);
    const enabledCals = state.calendars.filter(c => c.enabled);
    const numEnabled = enabledCals.length;
    const numCols = Math.max(1, numEnabled);

    const isMobile = window.innerWidth < 768;
    const isManyCals = isMobile ? (numEnabled >= 3) : (numEnabled >= 5);
    headerContainer.classList.toggle('cals-many', isManyCals);
    gridBody.classList.toggle('cals-many', isManyCals);

    // Explicit grid column template for Day View using CSS variable for precision
    headerContainer.style.gridTemplateColumns = `var(--time-axis-width) repeat(${numCols}, minmax(0, 1fr))`;
    gridBody.style.gridTemplateColumns = `var(--time-axis-width) repeat(${numCols}, minmax(0, 1fr))`;

    // 1. Day Header: Time Axis Cell + 1 Lane Header Cell per Calendar
    const headerFrag = document.createDocumentFragment();
    const timeAxisHeader = document.createElement('div');
    timeAxisHeader.className = 'time-axis-header-cell';
    timeAxisHeader.title = 'Heures';
    timeAxisHeader.innerHTML = '<i class="ph-bold ph-clock"></i>';
    headerFrag.appendChild(timeAxisHeader);

    if (numEnabled === 0) {
      const emptyHeaderCell = document.createElement('div');
      emptyHeaderCell.className = 'day-lane-header-cell';
      emptyHeaderCell.innerHTML = `<span>Aucun calendrier sélectionné</span>`;
      headerFrag.appendChild(emptyHeaderCell);
    } else {
      enabledCals.forEach((cal) => {
        const palette = getCalendarPalette(cal.colorIndex);
        const laneHeader = document.createElement('div');
        laneHeader.className = `day-lane-header-cell cal-color-${cal.colorIndex % 10}`;
        laneHeader.style.setProperty('--cal-primary', palette.primary, 'important');
        laneHeader.style.setProperty('--cal-border', palette.border, 'important');
        laneHeader.style.setProperty('--cal-bg', palette.bg, 'important');
        laneHeader.style.borderBottom = `3px solid ${palette.primary}`;
        const firstName = getFirstName(cal.name);
        const letter = cal.classLetter || (firstName ? firstName.charAt(0).toUpperCase() : '?');
        const classBadge = `<span class="chip-class-tag" style="background:${palette.badgeBg}; color:#fff;" title="${escapeHTML(cal.name)}">${escapeHTML(letter)}</span>`;

        laneHeader.innerHTML = `
          <div class="lane-header-inner">
            <span class="chip-dot" style="background:${palette.primary}; width:9px; height:9px; box-shadow:0 0 8px ${palette.primary};"></span>
            <span class="lane-cal-name" title="${escapeHTML(cal.name)}">${escapeHTML(firstName)}</span>
            ${classBadge}
          </div>
        `;
        headerFrag.appendChild(laneHeader);
      });
    }
    headerContainer.appendChild(headerFrag);

    // 2. Grid Body: Time Axis + 1 Dedicated Column per Calendar
    const gridFrag = document.createDocumentFragment();
    gridFrag.appendChild(createTimeAxisColumn());

    if (numEnabled === 0) {
      const emptyCol = document.createElement('div');
      emptyCol.className = `day-column day-cal-column ${isToday ? 'is-today' : ''}`;
      // Background hour lines
      for (let h = 0; h < TOTAL_HOURS; h++) {
        const line = document.createElement('div');
        line.className = 'hour-grid-line';
        line.style.top = `${(h / TOTAL_HOURS) * 100}%`;
        emptyCol.appendChild(line);
      }
      // Today Red Indicator Line
      if (isToday) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMin = TIME_START_HOUR * 60;
        const endMin = TIME_END_HOUR * 60;
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          const indicator = document.createElement('div');
          indicator.className = 'current-time-indicator';
          indicator.style.top = `${((currentMinutes - startMin) / TOTAL_MINUTES) * 100}%`;
          emptyCol.appendChild(indicator);
        }
      }
      gridFrag.appendChild(emptyCol);
    } else {
      const isMobile = window.innerWidth < 768;
      const cardMode = getCardDisplayMode(isMobile, 'day', numEnabled);

      enabledCals.forEach((cal) => {
        const palette = getCalendarPalette(cal.colorIndex);
        const calEvents = dayEvents.filter(e => e.calendarId === cal.id);
        calEvents.sort((a, b) => a.startDate - b.startDate);
        const firstEvent = calEvents.length > 0 ? calEvents[0] : null;
        const firstNonCMoEvent = (state.dimCMo && firstEvent && isCMoEvent(firstEvent))
          ? calEvents.find(e => !isCMoEvent(e))
          : null;

        const col = document.createElement('div');
        col.className = `day-column day-cal-column ${isToday ? 'is-today' : ''}`;
        col.dataset.calId = cal.id;
        col.style.setProperty('--cal-primary', palette.primary, 'important');
        col.style.setProperty('--cal-border', palette.border, 'important');
        col.style.setProperty('--cal-bg', palette.bg, 'important');

        const colFrag = document.createDocumentFragment();

        // Background hour lines (Full hours only)
        for (let h = 0; h < TOTAL_HOURS; h++) {
          const line = document.createElement('div');
          line.className = 'hour-grid-line';
          line.style.top = `${(h / TOTAL_HOURS) * 100}%`;
          colFrag.appendChild(line);
        }

        // Today Red Indicator Line
        if (isToday) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const startMin = TIME_START_HOUR * 60;
          const endMin = TIME_END_HOUR * 60;
          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            const indicator = document.createElement('div');
            indicator.className = 'current-time-indicator';
            indicator.style.top = `${((currentMinutes - startMin) / TOTAL_MINUTES) * 100}%`;
            colFrag.appendChild(indicator);
          }
        }

        // Free time slots on this column if enabled
        if (state.showFreeTime) {
          renderFreeTimeSlots(colFrag, dayEvents, cardMode === 'compact');
        }

        // Render this calendar's events
        calEvents.forEach(event => {
          const isFirstOfDay = firstEvent && (event.id === firstEvent.id);
          const isFirstNonCMoOfDay = firstNonCMoEvent && (event.id === firstNonCMoEvent.id);
          const showVerticalName = Boolean(isFirstOfDay || isFirstNonCMoOfDay);

          const card = createEventCard(event, cal, cardMode, showVerticalName);
          const { topPercent, heightPercent } = calculateCardPosition(event);

          card.style.top = `${topPercent}%`;
          card.style.height = `${heightPercent}%`;
          card.style.left = '4px';
          card.style.right = '4px';
          card.style.width = 'calc(100% - 8px)';

          colFrag.appendChild(card);
        });

        col.appendChild(colFrag);
        gridFrag.appendChild(col);
      });
    }

    gridBody.appendChild(gridFrag);
  }

  // --- Create Event Card Element ---
  function createEventCard(event, cal, cardMode = 'detailed', showVerticalName = false) {
    const card = document.createElement('div');
    const palette = getCalendarPalette(cal.colorIndex);
    const isCMo = isCMoEvent(event);
    const firstName = getFirstName(cal.name);

    let modeClass = '';
    if (cardMode === 'compact') {
      modeClass = 'compact-block';
    } else if (cardMode === 'ultra-compact') {
      modeClass = 'compact-block ultra-compact';
    } else if (cardMode === 'partial-with-owner' || cardMode === 'partial-no-owner') {
      modeClass = 'partial-block';
    }

    card.className = `calendar-event-card cal-color-${cal.colorIndex % 10} ${modeClass} ${state.dimCMo && isCMo ? 'is-cmo-dimmed' : ''}`;
    card.style.setProperty('--cal-primary', palette.primary, 'important');
    card.style.setProperty('--cal-border', palette.border, 'important');
    card.style.setProperty('--cal-bg', palette.bg, 'important');
    card.style.setProperty('--cal-bg-hover', palette.bgHover, 'important');
    card.style.setProperty('--cal-text', palette.text, 'important');

    const classStr = cal.classLetter ? ` [${cal.classLetter}]` : '';
    const cmoLabel = isCMo ? ' [Distanciel / CMo]' : '';
    const recLabel = event.isRecurring ? `\n🔄 Récurrence : ${event.rruleSummary || 'Événement récurrent'}` : '';
    const timeDisplay = event.isAllDay ? 'Journée entière' : `${formatTimeFull(event.startDate)} - ${formatTimeFull(event.endDate)}`;
    const tooltipText = `${event.title}${cmoLabel}\n⏰ ${timeDisplay}\n📍 ${event.location || 'Salle non spécifiée'}\n👤 ${event.prof || 'Enseignant/Organisateur non spécifié'}\n👥 ${cal.name}${classStr}${recLabel}`;
    card.title = tooltipText;

    const repeatIcon = event.isRecurring ? `<span class="event-recurring-icon" title="Événement récurrent : ${escapeHTML(event.rruleSummary || '')}"><i class="ph-bold ph-repeat"></i></span>` : '';

    if (cardMode === 'compact' || cardMode === 'ultra-compact') {
      // Simplified compact mode: empty color block, except on first event of day (and first non-CMO if CMOs dimmed) where owner's first name is shown vertically
      if (showVerticalName && firstName) {
        card.innerHTML = `<span class="compact-first-event-name" title="${escapeHTML(cal.name)}">${escapeHTML(firstName)}</span>`;
      } else {
        card.innerHTML = '';
      }
    } else if (cardMode === 'partial-with-owner') {
      // Partial compact mode (Mobile Day 3-5 cals): type, course name (clipped if overflowing), and owner name at bottom
      card.innerHTML = `
        <div class="partial-event-content">
          <div class="partial-header-row">
            <span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span>
            ${repeatIcon}
          </div>
          <div class="partial-event-title" title="${escapeHTML(event.title)}">${escapeHTML(event.title)}</div>
          <div class="partial-footer-row">
            <span class="partial-owner-name" title="${escapeHTML(cal.name)}">${escapeHTML(firstName)}</span>
          </div>
        </div>
      `;
    } else if (cardMode === 'partial-no-owner') {
      // Partial compact mode (Mobile Week 1 cal): type, course name (clipped if overflowing)
      card.innerHTML = `
        <div class="partial-event-content">
          <div class="partial-header-row">
            <span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span>
            ${repeatIcon}
          </div>
          <div class="partial-event-title" title="${escapeHTML(event.title)}">${escapeHTML(event.title)}</div>
        </div>
      `;
    } else {
      // Full detailed card
      card.innerHTML = `
        <div class="event-header-row">
          <span class="event-time-badge">${timeDisplay}${repeatIcon}</span>
          <span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span>
        </div>
        <div class="event-title" title="${escapeHTML(event.title)}">${escapeHTML(event.title)}</div>
        ${event.location ? `<div class="event-meta-row"><span class="event-location" title="${escapeHTML(event.location)}">📍 ${escapeHTML(event.location)}</span></div>` : ''}
        ${event.prof ? `<div class="event-meta-row"><span class="event-prof" title="${escapeHTML(event.prof)}">👤 ${escapeHTML(event.prof)}</span></div>` : ''}
        <div class="event-owners-badges">
          <span class="owner-pill" style="color:${palette.text};">
            <span class="chip-dot" style="width:6px; height:6px; background:${palette.primary};"></span>
            ${escapeHTML(firstName)}${cal.classLetter ? ` (${cal.classLetter})` : ''}
          </span>
        </div>
      `;
    }

    card.addEventListener('click', () => openEventModal(event, cal));
    return card;
  }

  function calculateCardPosition(event) {
    if (event.isAllDay) {
      return { topPercent: 0, heightPercent: 100 };
    }
    const startMinutes = event.startDate.getHours() * 60 + event.startDate.getMinutes();
    const endMinutes = event.endDate.getHours() * 60 + event.endDate.getMinutes();

    const gridStartMin = TIME_START_HOUR * 60;
    const clampedStart = Math.max(gridStartMin, startMinutes);
    const clampedEnd = Math.min(TIME_END_HOUR * 60, endMinutes);

    const durationMin = Math.max(20, clampedEnd - clampedStart);
    const topPercent = ((clampedStart - gridStartMin) / TOTAL_MINUTES) * 100;
    const heightPercent = (durationMin / TOTAL_MINUTES) * 100;

    return { topPercent, heightPercent };
  }

  // --- Free Common Time Finder across All Enabled Calendars ---
  function createFreeSlotElement(topP, heightP, title, text, isCompact) {
    const freeEl = document.createElement('div');
    freeEl.className = `free-slot-highlight ${isCompact ? 'compact-free-slot' : ''}`;
    freeEl.style.top = `${topP}%`;
    freeEl.style.height = `${heightP}%`;
    freeEl.style.left = '2px';
    freeEl.style.right = '2px';
    freeEl.style.width = 'calc(100% - 4px)';
    freeEl.style.boxSizing = 'border-box';
    freeEl.title = title;
    if (!isCompact && text) {
      freeEl.innerHTML = `<span>${text}</span>`;
    }
    return freeEl;
  }

  function renderFreeTimeSlots(dayCol, dayEvents, isCompact = false) {
    if (dayEvents.length === 0) {
      const freeEl = createFreeSlotElement(0, 100, '✨ Journée 100% libre en commun', '✨ Journée 100% libre en commun', isCompact);
      dayCol.appendChild(freeEl);
      return;
    }

    const intervals = dayEvents.map(e => ({
      start: e.startDate.getHours() * 60 + e.startDate.getMinutes(),
      end: e.endDate.getHours() * 60 + e.endDate.getMinutes()
    })).sort((a, b) => a.start - b.start);

    const mergedBusy = [];
    let current = { ...intervals[0] };
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start <= current.end) {
        current.end = Math.max(current.end, intervals[i].end);
      } else {
        mergedBusy.push(current);
        current = { ...intervals[i] };
      }
    }
    mergedBusy.push(current);

    const gridStart = TIME_START_HOUR * 60;
    const gridEnd = TIME_END_HOUR * 60;
    let prevEnd = gridStart;

    mergedBusy.forEach(slot => {
      if (slot.start - prevEnd >= 45) { // Free gap >= 45 mins
        const topP = ((prevEnd - gridStart) / TOTAL_MINUTES) * 100;
        const heightP = ((slot.start - prevEnd) / TOTAL_MINUTES) * 100;
        const durStr = formatDuration(slot.start - prevEnd);

        const freeEl = createFreeSlotElement(topP, heightP, `🟢 Libre (${durStr})`, `🟢 Libre (${durStr})`, isCompact);
        dayCol.appendChild(freeEl);
      }
      prevEnd = Math.max(prevEnd, slot.end);
    });

    if (gridEnd - prevEnd >= 45) {
      const topP = ((prevEnd - gridStart) / TOTAL_MINUTES) * 100;
      const heightP = ((gridEnd - prevEnd) / TOTAL_MINUTES) * 100;
      const durStr = formatDuration(gridEnd - prevEnd);

      const freeEl = createFreeSlotElement(topP, heightP, `🟢 Libre (${durStr})`, `🟢 Libre (${durStr})`, isCompact);
      dayCol.appendChild(freeEl);
    }
  }

  // --- Weekly Stats Summary Popover ---
  function renderWeeklyStats() {
    const statsContainer = document.getElementById('statsPopoverContainer');
    const statsPill = document.getElementById('statsSummaryPill');
    if (!statsPill || !statsContainer) return;

    const enabledCals = state.calendars.filter(c => c.enabled);
    if (enabledCals.length === 0) {
      statsContainer.style.display = 'none';
      statsPill.classList.remove('open');
      return;
    }

    statsContainer.style.display = 'inline-flex';

    const monday = getMonday(state.currentDate);
    const weekDays = getWeekDays6(monday);

    let itemsHtml = '';
    enabledCals.forEach((cal) => {
      let totalMin = 0;
      weekDays.forEach(day => {
        const events = cal.events.filter(e => isSameDay(e.startDate, day));
        events.forEach(e => {
          totalMin += (e.endDate - e.startDate) / 60000;
        });
      });

      const palette = getCalendarPalette(cal.colorIndex);
      const letter = cal.classLetter || (cal.name ? cal.name.trim().charAt(0).toUpperCase() : '?');
      itemsHtml += `
        <div class="stats-popover-item">
          <div class="stats-item-info">
            <span class="chip-dot" style="background:${palette.primary}; box-shadow:0 0 6px ${palette.primary};"></span>
            <span class="stats-item-name" title="${escapeHTML(cal.name)}">${escapeHTML(cal.name)}</span>
            <span class="chip-class-tag" style="background:${palette.badgeBg}; font-size:0.62rem; padding:1px 4px;">${escapeHTML(letter)}</span>
          </div>
          <strong class="stats-item-duration">${formatDuration(totalMin)}</strong>
        </div>
      `;
    });

    statsPill.innerHTML = `
      <div class="stats-popover-header">
        <span class="stats-popover-title"><i class="ph-bold ph-chart-pie-slice"></i> Volume horaire (Semaine)</span>
        <button class="stats-popover-close-btn" id="btnCloseStatsPopover" title="Fermer" aria-label="Fermer">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <div class="stats-popover-list">
        ${itemsHtml}
      </div>
    `;

    document.getElementById('btnCloseStatsPopover')?.addEventListener('click', (e) => {
      e.stopPropagation();
      statsPill.classList.remove('open');
    });
  }

  // --- Empty State Hero ---
  function renderEmptyStateHero(gridBody) {
    const hero = document.createElement('div');
    hero.className = 'empty-state-hero';
    hero.innerHTML = `
      <div class="avatar-ring">
        <div class="avatar-core">
          <img src="icons/icon-192.png" alt="Co-op Calendar" class="hero-app-logo">
        </div>
      </div>
      <h2 class="hero-title">Co-op Calendar</h2>
      <p class="hero-desc">
        Compare jusqu'à <strong>10 emplois du temps .ics</strong> à partir de <strong>2026</strong>. Détecte automatiquement les créneaux communs & les temps libres.
      </p>
      <div class="empty-state-hero-badges">
        <span class="hero-pill"><span class="pill-dot dot-cyan"></span>🏷️ Détection de classe</span>
        <span class="hero-pill"><span class="pill-dot dot-emerald"></span>💾 Sauvegarde 100% locale</span>
        <span class="hero-pill"><span class="pill-dot dot-blue"></span>📅 Vue Semaine & Jour</span>
      </div>
      <button class="btn-primary-add hero-add-btn" id="btnHeroAddCalendar">
        <i class="ph-bold ph-plus-circle"></i>
        <span>Ajouter un premier calendrier (.ics)</span>
      </button>
    `;

    gridBody.appendChild(hero);

    document.getElementById('btnHeroAddCalendar')?.addEventListener('click', () => {
      document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
    });
  }

  // --- Event Details Modal ---
  function openEventModal(event, cal) {
    const modalBackdrop = document.getElementById('eventModalBackdrop');
    const modalTitle = document.getElementById('modalEventTitle');
    const modalSubtitle = document.getElementById('modalEventSubtitle');
    const modalBody = document.getElementById('modalEventBody');

    if (!modalBackdrop || !modalTitle || !modalBody) return;

    const palette = getCalendarPalette(cal.colorIndex);
    const dayIndex = (event.startDate.getDay() + 6) % 7;
    const dayName = DAYS_FR_7[dayIndex] || 'Dimanche';

    modalTitle.innerHTML = `
      <span class="chip-dot" style="background:${palette.primary}; box-shadow:0 0 10px ${palette.primary}; width:12px; height:12px;"></span>
      ${escapeHTML(event.title)}
    `;

    modalSubtitle.innerHTML = `
      ${dayName} ${event.startDate.getDate()} ${MONTHS_FR[event.startDate.getMonth()]} ${event.startDate.getFullYear()} &bull; 
      <strong>${escapeHTML(cal.name)}</strong>${cal.classLetter ? ` (Classe ${escapeHTML(cal.classLetter)})` : ''}
    `;

    const timeDisplay = event.isAllDay
      ? '📅 Journée entière'
      : `⏰ ${formatTimeFull(event.startDate)} - ${formatTimeFull(event.endDate)} (${formatDuration((event.endDate - event.startDate) / 60000)})`;

    const teacherLabel = event.prof ? 'Enseignant / Organisateur' : 'Organisateur';

    modalBody.innerHTML = `
      <div class="detail-section-grid">
        <div class="detail-item-box">
          <span class="detail-label">Horaire & Durée</span>
          <span class="detail-value">${timeDisplay}</span>
        </div>
        <div class="detail-item-box">
          <span class="detail-label">Type</span>
          <span class="detail-value"><span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span></span>
        </div>
        ${event.isRecurring ? `
          <div class="detail-item-box full-width recurrence-box">
            <span class="detail-label"><i class="ph-bold ph-repeat"></i> Récurrence</span>
            <span class="detail-value">🔄 ${escapeHTML(event.rruleSummary || 'Événement récurrent')}</span>
          </div>
        ` : ''}
        <div class="detail-item-box full-width">
          <span class="detail-label">Salle / Emplacement</span>
          <span class="detail-value">📍 ${renderClickableLinks(escapeHTML(event.location || 'Salle non spécifiée'))}</span>
        </div>
        ${event.prof ? `
          <div class="detail-item-box full-width">
            <span class="detail-label">${teacherLabel}</span>
            <span class="detail-value">👤 ${escapeHTML(event.prof)}</span>
          </div>
        ` : ''}
        ${event.groupe ? `
          <div class="detail-item-box full-width">
            <span class="detail-label">Groupe / Code promo</span>
            <span class="detail-value">👥 ${escapeHTML(event.groupe)}</span>
          </div>
        ` : ''}
      </div>

      ${event.description ? `
        <div class="detail-item-box full-width">
          <span class="detail-label">Description / Détails</span>
          <div class="detail-value" style="font-size:0.85rem; word-break:break-all; line-height:1.5;">
            ${renderClickableLinks(escapeHTML(event.description))}
          </div>
        </div>
      ` : ''}
    `;

    modalBackdrop.classList.add('open');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('open');
    });
    const statusBox = document.getElementById('driveUrlStatus');
    const btnLoad = document.getElementById('btnLoadDriveUrl');
    if (statusBox) statusBox.style.display = 'none';
    if (btnLoad) btnLoad.disabled = false;
  }

  function renderClickableLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="detail-value link" style="display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-arrow-square-out"></i> ${url}</a>`;
    });
  }

  // --- Export ICS Merged ---
  function exportMergedICS() {
    const enabledCals = state.calendars.filter(c => c.enabled);
    const allEvents = enabledCals.flatMap(c => c.events);

    if (allEvents.length === 0) {
      showToast('⚠️ Aucun événement à exporter.');
      return;
    }

    const pad = n => String(n).padStart(2, '0');
    const toICSDate = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const toICSDateOnly = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SyncCal Multi-ICS Viewer//FR',
      'X-WR-CALNAME:Calendriers Fusionnés SyncCal',
      'X-WR-TIMEZONE:Europe/Paris'
    ];

    allEvents.forEach(e => {
      const cal = state.calendars.find(c => c.id === e.calendarId);
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:synccal-${e.uid}-${e.startDate.getTime()}`);
      ics.push(`SUMMARY:${e.summary || e.title}`);
      if (e.isAllDay) {
        ics.push(`DTSTART;VALUE=DATE:${toICSDateOnly(e.startDate)}`);
        ics.push(`DTEND;VALUE=DATE:${toICSDateOnly(e.endDate)}`);
      } else {
        ics.push(`DTSTART:${toICSDate(e.startDate)}`);
        ics.push(`DTEND:${toICSDate(e.endDate)}`);
      }
      if (e.location) ics.push(`LOCATION:${e.location}`);
      let desc = e.description || '';
      if (cal) desc = `Calendrier: ${cal.name}${cal.classLetter ? ` (Classe ${cal.classLetter})` : ''}\\n${desc}`;
      if (e.prof) desc = `Enseignant: ${e.prof}\\n${desc}`;
      if (e.isRecurring && e.rruleSummary) desc = `Récurrence: ${e.rruleSummary}\\n${desc}`;
      ics.push(`DESCRIPTION:${desc}`);
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');

    const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendriers_fusionnes_synccal.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('📥 Calendrier fusionné téléchargé avec succès !');
  }

  // --- Navigation Action Helpers ---
  function goToPrevPeriod() {
    if (!state.calendars || state.calendars.length === 0) return;
    if (state.viewType === 'week') {
      const mon = getMonday(state.currentDate);
      mon.setDate(mon.getDate() - 7);
      state.currentDate = mon;
    } else {
      state.currentDate.setDate(state.currentDate.getDate() - 1);
      // If Sunday is disabled, jump to Saturday
      if (!state.showSundays && state.currentDate.getDay() === 0) {
        state.currentDate.setDate(state.currentDate.getDate() - 1);
      }
    }
    render();
  }

  function goToNextPeriod() {
    if (!state.calendars || state.calendars.length === 0) return;
    if (state.viewType === 'week') {
      const mon = getMonday(state.currentDate);
      mon.setDate(mon.getDate() + 7);
      state.currentDate = mon;
    } else {
      state.currentDate.setDate(state.currentDate.getDate() + 1);
      // If Sunday is disabled, jump to Monday
      if (!state.showSundays && state.currentDate.getDay() === 0) {
        state.currentDate.setDate(state.currentDate.getDate() + 1);
      }
    }
    render();
  }

  function goToToday() {
    if (!state.calendars || state.calendars.length === 0) return;
    state.currentDate = getDefaultDate();
    render();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // 1. Navigation: Prev / Next / Today
    document.getElementById('btnPrevDate')?.addEventListener('click', goToPrevPeriod);
    document.getElementById('btnNextDate')?.addEventListener('click', goToNextPeriod);
    document.getElementById('btnToday')?.addEventListener('click', goToToday);

    // Date Picker Input
    // Trigger date picker on current period display click
    document.getElementById('currentPeriodDisplay')?.addEventListener('click', () => {
      const dp = document.getElementById('periodDatePicker');
      try {
        if (dp && typeof dp.showPicker === 'function') {
          dp.showPicker();
        } else {
          dp?.focus();
        }
      } catch (e) {
        dp?.focus();
      }
    });

    document.getElementById('periodDatePicker')?.addEventListener('change', e => {
      if (e.target.value) {
        const picked = new Date(e.target.value);
        if (!state.showSundays && picked.getDay() === 0) {
          // Sunday is disabled -> advance to Monday (tomorrow)
          picked.setDate(picked.getDate() + 1);
        }
        state.currentDate = picked;
        render();
      }
    });

    // View Switcher (Week / Day)
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setViewType(btn.dataset.view);
      });
    });

    // Settings View Switcher (Option 1)
    document.getElementById('btnSettingsViewWeek')?.addEventListener('click', () => setViewType('week'));
    document.getElementById('btnSettingsViewDay')?.addEventListener('click', () => setViewType('day'));

    // Quick Jump Buttons
    document.querySelectorAll('.quick-jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const y = parseInt(btn.dataset.year, 10);
        const m = parseInt(btn.dataset.month, 10);
        const d = parseInt(btn.dataset.day || '1', 10);
        state.currentDate = new Date(y, m, d);
        render();
      });
    });

    // Toggle Stats Popover
    document.getElementById('btnStatsInfo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('statsSummaryPill')?.classList.toggle('open');
    });

    // Close Stats Popover when clicking outside
    document.addEventListener('click', (e) => {
      const statsPill = document.getElementById('statsSummaryPill');
      const statsBtn = document.getElementById('btnStatsInfo');
      if (statsPill && statsPill.classList.contains('open')) {
        if (!statsPill.contains(e.target) && !statsBtn?.contains(e.target)) {
          statsPill.classList.remove('open');
        }
      }
    });

    // --- Toolbar Toggle (Options Visibles / Masquées) ---
    document.getElementById('btnToggleToolbarCollapse')?.addEventListener('click', () => {
      state.showToolbar = !state.showToolbar;
      localStorage.setItem(getToolbarStorageKey(), state.showToolbar);
      updateToolbarState();
      showToast(state.showToolbar ? 'Options de configuration affichées 🛠️' : 'Options masquées 🧘 (Mode épuré)');
    });

    // Settings Toolbar Switch (Option 5)
    document.getElementById('switchSettingsToolbar')?.addEventListener('change', (e) => {
      state.showToolbar = e.target.checked;
      localStorage.setItem(getToolbarStorageKey(), state.showToolbar);
      updateToolbarState();
    });

    // Legal Notice Modal listeners
    document.getElementById('btnOpenLegalModal')?.addEventListener('click', () => {
      document.getElementById('legalNoticeModalBackdrop')?.classList.add('open');
    });

    document.getElementById('btnCloseLegalModalBtn')?.addEventListener('click', () => {
      document.getElementById('legalNoticeModalBackdrop')?.classList.remove('open');
    });

    document.getElementById('btnCloseLegalModalFooterBtn')?.addEventListener('click', () => {
      document.getElementById('legalNoticeModalBackdrop')?.classList.remove('open');
    });

    // Universal delegation for modals
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnOpenLegalModal')) {
        e.preventDefault();
        document.getElementById('legalNoticeModalBackdrop')?.classList.add('open');
        return;
      }
      if (e.target.closest('#btnHeroAddCalendar, #btnOpenAddModal, #btnSettingsOpenAddModal, #btnQuickAddChip, .hero-add-btn')) {
        e.preventDefault();
        document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
        return;
      }
      if (e.target.closest('#btnCloseLegalModalBtn, #btnCloseLegalModalFooterBtn')) {
        e.preventDefault();
        document.getElementById('legalNoticeModalBackdrop')?.classList.remove('open');
      }
    });

    // Search Input
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    searchInput?.addEventListener('input', e => {
      state.searchQuery = e.target.value.trim();
      if (btnClearSearch) btnClearSearch.style.display = state.searchQuery ? 'flex' : 'none';
      render();
    });

    btnClearSearch?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      btnClearSearch.style.display = 'none';
      render();
    });

    // Course Type Filter
    document.getElementById('typeFilterSelect')?.addEventListener('change', e => {
      state.typeFilter = e.target.value;
      localStorage.setItem(TYPE_FILTER_STORAGE_KEY, state.typeFilter);
      render();
    });

    // Toggle Dim CMo / Online Courses (Option 3 sync)
    document.getElementById('btnToggleDimCMo')?.addEventListener('click', function () {
      state.dimCMo = !state.dimCMo;
      localStorage.setItem(DIM_CMO_STORAGE_KEY, state.dimCMo);
      this.classList.toggle('active', state.dimCMo);
      const sw = document.getElementById('switchSettingsDimCMo');
      if (sw) sw.checked = state.dimCMo;
      render();
      showToast(state.dimCMo ? 'Cours en distanciel (CMo) atténués 🌫️' : 'Cours en distanciel (CMo) affichés normalement 👁️');
    });

    document.getElementById('switchSettingsDimCMo')?.addEventListener('change', function () {
      state.dimCMo = this.checked;
      localStorage.setItem(DIM_CMO_STORAGE_KEY, state.dimCMo);
      const btn = document.getElementById('btnToggleDimCMo');
      if (btn) btn.classList.toggle('active', state.dimCMo);
      render();
      showToast(state.dimCMo ? 'Cours en distanciel (CMo) atténués 🌫️' : 'Cours en distanciel (CMo) affichés normalement 👁️');
    });

    // Free Time Toggle (Option 4 sync)
    document.getElementById('btnToggleFreeTime')?.addEventListener('click', function () {
      state.showFreeTime = !state.showFreeTime;
      localStorage.setItem(FREE_TIME_STORAGE_KEY, state.showFreeTime);
      this.classList.toggle('active', state.showFreeTime);
      this.style.borderColor = state.showFreeTime ? 'var(--accent-emerald)' : '';
      this.style.color = state.showFreeTime ? 'var(--accent-emerald)' : '';
      const sw = document.getElementById('switchSettingsFreeTime');
      if (sw) sw.checked = state.showFreeTime;
      render();
      showToast(state.showFreeTime ? '✨ Créneaux libres communs affichés 🟢' : 'Créneaux libres masqués');
    });

    document.getElementById('switchSettingsFreeTime')?.addEventListener('change', function () {
      state.showFreeTime = this.checked;
      localStorage.setItem(FREE_TIME_STORAGE_KEY, state.showFreeTime);
      const btn = document.getElementById('btnToggleFreeTime');
      if (btn) {
        btn.classList.toggle('active', state.showFreeTime);
        btn.style.borderColor = state.showFreeTime ? 'var(--accent-emerald)' : '';
        btn.style.color = state.showFreeTime ? 'var(--accent-emerald)' : '';
      }
      render();
      showToast(state.showFreeTime ? '✨ Créneaux libres communs affichés 🟢' : 'Créneaux libres masqués');
    });

    // Option 6: Activer / Désactiver les Dimanches
    document.getElementById('switchSettingsShowSundays')?.addEventListener('change', function () {
      state.showSundays = this.checked;
      localStorage.setItem(SHOW_SUNDAYS_STORAGE_KEY, state.showSundays);
      if (!state.showSundays && state.currentDate && state.currentDate.getDay() === 0) {
        state.currentDate.setDate(state.currentDate.getDate() - 1);
      }
      render();
      showToast(state.showSundays ? '📅 Dimanches activés dans la vue semaine' : '👻 Dimanches désactivés (masqués)');
    });

    // Settings Menu Open & Close
    document.getElementById('btnOpenSettings')?.addEventListener('click', openSettings);
    document.getElementById('btnHomeOpenSettings')?.addEventListener('click', openSettings);
    document.getElementById('btnCloseSettings')?.addEventListener('click', closeSettings);

    // Settings Theme 3-Segment Switcher (Option 2)
    document.getElementById('btnThemeSegmentDark')?.addEventListener('click', () => setTheme('dark'));
    document.getElementById('btnThemeSegmentLight')?.addEventListener('click', () => setTheme('light'));
    document.getElementById('btnThemeSegmentAuto')?.addEventListener('click', () => setTheme('auto'));

    // Option 6: URL Update Guidance Popup
    document.getElementById('btnUrlUpdateInfo')?.addEventListener('click', () => {
      document.getElementById('urlUpdateInfoModalBackdrop')?.classList.add('open');
    });
    document.getElementById('btnCloseUrlInfoModal')?.addEventListener('click', () => {
      document.getElementById('urlUpdateInfoModalBackdrop')?.classList.remove('open');
    });
    document.getElementById('btnAckUrlInfoModal')?.addEventListener('click', () => {
      document.getElementById('urlUpdateInfoModalBackdrop')?.classList.remove('open');
    });

    // Option 6: Trigger URL Update
    document.getElementById('btnTriggerUrlUpdate')?.addEventListener('click', updateCalendarsFromUrls);

    // Option 7: Close Color Picker Modal
    document.getElementById('btnCloseColorPickerModal')?.addEventListener('click', closeColorPickerModal);

    // Home Navigation Button (main-page -> home-page)
    const btnGoHome = document.getElementById('btnGoHome');
    btnGoHome?.addEventListener('click', () => {
      showView('home');
    });

    // New Comparison Button
    document.getElementById('btnNewComparison')?.addEventListener('click', () => {
      openCreateInstanceModal();
    });

    // Comparison Form Submit
    document.getElementById('comparisonForm')?.addEventListener('submit', handleSaveComparisonForm);

    // Cancel / Close Comparison Modal
    document.getElementById('btnCancelComparisonModal')?.addEventListener('click', closeAllModals);
    document.getElementById('btnCloseComparisonModal')?.addEventListener('click', closeAllModals);

    // Delete Comparison Modal Actions
    document.getElementById('btnConfirmDeleteComparison')?.addEventListener('click', confirmDeleteInstance);
    document.getElementById('btnCancelDeleteComparison')?.addEventListener('click', closeAllModals);
    document.getElementById('btnCloseDeleteComparisonModal')?.addEventListener('click', closeAllModals);

    // Setup home page comparison cards & options delegation
    setupHomeEventListeners();

    // Hash navigation listener
    window.addEventListener('popstate', () => {
      if (window.location.hash === '#home') {
        showView('home');
      } else {
        showView('main');
      }
    });

    // Print Button
    document.getElementById('btnPrint')?.addEventListener('click', () => {
      window.print();
    });

    // Export Merged ICS Button
    document.getElementById('btnExportICS')?.addEventListener('click', exportMergedICS);

    // Open Add Calendar Modal (Main Header & Settings Hero)
    document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
      document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
    });
    document.getElementById('btnSettingsOpenAddModal')?.addEventListener('click', () => {
      document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
    });

    // Clear All Calendars in Modal
    document.getElementById('btnClearAllCalendars')?.addEventListener('click', openClearAllCalendarsModal);
    document.getElementById('btnCloseClearAllCalendarsModal')?.addEventListener('click', closeClearAllCalendarsModal);
    document.getElementById('btnCancelClearAllCalendars')?.addEventListener('click', closeClearAllCalendarsModal);
    document.getElementById('btnConfirmClearAllCalendars')?.addEventListener('click', confirmClearAllCalendars);

    // Close Modal buttons
    document.querySelectorAll('.modal-close-btn, #btnCloseAddModalBtn, #btnCloseEventModalBtn, #btnCloseLegalModalBtn, #btnCloseLegalModalFooterBtn, #btnCancelComparisonModal, #btnCancelDeleteComparison').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.id === 'btnCloseClearAllCalendarsModal' || btn.id === 'btnCancelClearAllCalendars') {
          closeClearAllCalendarsModal();
        } else {
          closeAllModals();
        }
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          if (modal.id === 'clearAllCalendarsModalBackdrop') {
            closeClearAllCalendarsModal();
          } else {
            closeAllModals();
          }
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const clearAllModal = document.getElementById('clearAllCalendarsModalBackdrop');
        if (clearAllModal && clearAllModal.classList.contains('open')) {
          closeClearAllCalendarsModal();
          return;
        }
        const colorModal = document.getElementById('calendarColorPickerModalBackdrop');
        if (colorModal && colorModal.classList.contains('open')) {
          closeColorPickerModal();
          return;
        }
        const infoModal = document.getElementById('urlUpdateInfoModalBackdrop');
        if (infoModal && infoModal.classList.contains('open')) {
          infoModal.classList.remove('open');
          return;
        }
        const addModal = document.getElementById('addCalendarModalBackdrop');
        if (addModal && addModal.classList.contains('open')) {
          closeAllModals();
          return;
        }
        const settingsOverlay = document.getElementById('settingsOverlay');
        if (settingsOverlay && settingsOverlay.classList.contains('open')) {
          closeSettings();
          return;
        }
        closeAllModals();
      }
      if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        goToPrevPeriod();
      } else if (e.key === 'ArrowRight') {
        goToNextPeriod();
      } else if (e.key === 't' || e.key === 'T') {
        goToToday();
      }
    });

    // Window Resize Handler (Debounced)
    let lastIsMobile = window.innerWidth < 768;
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const currentIsMobile = window.innerWidth < 768;
        if (currentIsMobile !== lastIsMobile) {
          lastIsMobile = currentIsMobile;
          state.showToolbar = getInitialToolbarState();
          updateToolbarState();
        }
        syncNavControlsPlacement();
        render();
      }, 150);
    });

    // Setup Drag & Drop and File Input Handlers
    setupFileHandlers();

    // Setup Import Mode Tabs (File vs Drive / URL)
    setupImportTabHandlers();

    // Setup Google Drive & URL Input Handlers
    setupDriveUrlHandlers();

    // Setup Mobile Swipe Gestures on Calendar
    setupCalendarSwipeGestures();
  }

  // --- Mobile Touch / Swipe Navigation on Calendar ---
  function setupCalendarSwipeGestures() {
    const calendarViewWrapper = document.getElementById('calendarViewWrapper');
    if (!calendarViewWrapper) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTracking = false;
    let canSwipePrevAtStart = false;
    let canSwipeNextAtStart = false;
    let isSwiping = false;
    // --- Nav Controls Swipe Hint Overlay Helpers ---
    const navControls = document.getElementById('mainNavControls');
    const getHintOverlay = () => {
      let overlay = document.getElementById('swipeNavHintOverlay');
      if (!overlay && navControls) {
        overlay = document.createElement('div');
        overlay.id = 'swipeNavHintOverlay';
        overlay.className = 'swipe-nav-hint-overlay';
        navControls.appendChild(overlay);
      }
      return overlay;
    };

    const showSwipeHintInNav = (direction, isReady) => {
      const overlay = getHintOverlay();
      if (!overlay) return;

      const icon = direction === 'prev'
        ? '<i class="ph-bold ph-arrow-left"></i>'
        : '<i class="ph-bold ph-arrow-right"></i>';
      const label = direction === 'prev'
        ? (state.viewType === 'week' ? 'Semaine précédente' : 'Jour précédent')
        : (state.viewType === 'week' ? 'Semaine suivante' : 'Jour suivant');

      overlay.innerHTML = `
        ${direction === 'prev' ? icon : ''}<span style="font-size:0.82rem; font-weight:600;">${label}</span>${direction === 'next' ? icon : ''}
      `;
      overlay.style.color = isReady ? 'var(--text-primary)' : 'var(--text-muted)';
      overlay.classList.add('active');
    };

    const restoreNavControls = () => {
      const overlay = getHintOverlay();
      if (overlay) {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
      }
    };

    calendarViewWrapper.addEventListener('touchstart', (e) => {
      // Ignore if no calendar is loaded
      if (!state.calendars || state.calendars.length === 0) {
        isTracking = false;
        return;
      }

      // Ignore multi-touch (e.g. pinch to zoom)
      if (e.touches.length !== 1) {
        isTracking = false;
        return;
      }

      // Ignore if a modal backdrop or settings overlay is currently open
      if (document.querySelector('.modal-backdrop.open') || document.querySelector('.settings-overlay.open')) {
        isTracking = false;
        return;
      }

      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      isTracking = true;

      const scrollContainer = document.getElementById('calendarGridScroll');
      if (state.viewType === 'week' && scrollContainer && scrollContainer.offsetParent !== null) {
        const scrollLeft = scrollContainer.scrollLeft;
        const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;

        if (maxScrollLeft > 5) {
          // En vue Semaine avec défilement horizontal :
          // Reculer la date UNIQUEMENT si le scroll vers la gauche est à son maximal (tout à gauche du calendrier)
          canSwipePrevAtStart = scrollLeft <= 8;
          // Avancer la date UNIQUEMENT si le scroll vers la droite est à son maximal (tout à droite du calendrier)
          canSwipeNextAtStart = scrollLeft >= (maxScrollLeft - 8);
        } else {
          // Pas de débordement horizontal
          canSwipePrevAtStart = true;
          canSwipeNextAtStart = true;
        }
      } else {
        // En vue Jour par jour : les deux swipes sont toujours autorisés
        canSwipePrevAtStart = true;
        canSwipeNextAtStart = true;
      }
    }, { passive: true });

    calendarViewWrapper.addEventListener('touchmove', (e) => {
      if (!isTracking || !state.calendars || state.calendars.length === 0) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const scrollContainer = document.getElementById('calendarGridScroll');
      if (!scrollContainer) return;

      // Déterminer si le mouvement actuel remplit les conditions de déformation
      let isDeforming = false;
      let direction = null; // 'prev' ou 'next'

      if (state.viewType === 'week') {
        if (deltaX > 0 && canSwipePrevAtStart) {
          isDeforming = true;
          direction = 'prev';
        } else if (deltaX < 0 && canSwipeNextAtStart) {
          isDeforming = true;
          direction = 'next';
        }
      } else {
        // En vue jour : dominante horizontale requise pour ne pas gêner le scroll vertical
        if (absX > absY) {
          if (deltaX > 0 && canSwipePrevAtStart) {
            isDeforming = true;
            direction = 'prev';
          } else if (deltaX < 0 && canSwipeNextAtStart) {
            isDeforming = true;
            direction = 'next';
          }
        }
      }

      if (isDeforming && absX > 8) {
        // Courbe de résistance élastique rubber-band (sans cisaillement skewX)
        const dampedX = Math.sign(deltaX) * Math.min(Math.pow(absX, 0.85) * 1.5, 80);
        // Légère dilatation horizontale pure (étirement linéaire sans déformation angulaire)
        const scaleX = 1 + Math.min(absX * 0.0003, 0.02);

        scrollContainer.style.transition = 'none';
        scrollContainer.style.transform = `translateX(${dampedX}px) scaleX(${scaleX})`;
        scrollContainer.style.transformOrigin = deltaX > 0 ? 'left center' : 'right center';

        const isWeek = (state.viewType === 'week');
        const isReady = isWeek ? (absX >= 45 && absX > absY * 1.1) : (absX >= 32 && absX > absY);
        showSwipeHintInNav(direction, isReady);
      } else {
        // Si non éligible (ex: défilement interne normal), annuler la transformation
        if (scrollContainer.style.transform) {
          scrollContainer.style.transition = 'transform 0.2s ease';
          scrollContainer.style.transform = '';
        }
        restoreNavControls();
      }
    }, { passive: true });

    calendarViewWrapper.addEventListener('touchend', (e) => {
      if (!isTracking || !state.calendars || state.calendars.length === 0) {
        isTracking = false;
        restoreNavControls();
        return;
      }
      isTracking = false;
      restoreNavControls();

      const touch = e.changedTouches ? e.changedTouches[0] : null;
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Critères de validation adaptés pour Semaine et Jour
      const isWeek = (state.viewType === 'week');
      const isHorizontal = isWeek ? (absX > absY * 1.1) : (absX > absY);
      const minDistance = isWeek ? 45 : 32;
      const isReadyGesture = absX >= minDistance && isHorizontal;
      const isQuickFlick = absX >= (isWeek ? 30 : 22) && isHorizontal && deltaTime <= 350;

      const scrollContainer = document.getElementById('calendarGridScroll');

      if (isReadyGesture || isQuickFlick) {
        if (deltaX > 0 && canSwipePrevAtStart) {
          // Swipe vers la droite -> Période précédente
          isSwiping = true;
          setTimeout(() => { isSwiping = false; }, 350);

          if (scrollContainer) {
            scrollContainer.style.transition = 'transform 0.16s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.16s ease';
            scrollContainer.style.transform = 'translateX(65px) scale(0.98)';
            scrollContainer.style.opacity = '0.5';
          }

          goToPrevPeriod();

          if (state.viewType === 'week') {
            const sc = document.getElementById('calendarGridScroll');
            if (sc) {
              const setEndScroll = () => {
                const maxScroll = sc.scrollWidth - sc.clientWidth;
                if (maxScroll > 0) {
                  sc.scrollLeft = maxScroll;
                }
              };
              setEndScroll();
              requestAnimationFrame(setEndScroll);
            }
          }

          if (scrollContainer) {
            scrollContainer.style.transition = 'none';
            scrollContainer.style.transform = 'translateX(-35px)';
            scrollContainer.style.opacity = '0.7';
            requestAnimationFrame(() => {
              scrollContainer.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease';
              scrollContainer.style.transform = '';
              scrollContainer.style.opacity = '';
            });
          }
        } else if (deltaX < 0 && canSwipeNextAtStart) {
          // Swipe vers la gauche -> Période suivante
          isSwiping = true;
          setTimeout(() => { isSwiping = false; }, 350);

          if (scrollContainer) {
            scrollContainer.style.transition = 'transform 0.16s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.16s ease';
            scrollContainer.style.transform = 'translateX(-65px) scale(0.98)';
            scrollContainer.style.opacity = '0.5';
          }

          goToNextPeriod();

          if (state.viewType === 'week') {
            const sc = document.getElementById('calendarGridScroll');
            if (sc) {
              sc.scrollLeft = 0;
              requestAnimationFrame(() => {
                sc.scrollLeft = 0;
              });
            }
          }

          if (scrollContainer) {
            scrollContainer.style.transition = 'none';
            scrollContainer.style.transform = 'translateX(35px)';
            scrollContainer.style.opacity = '0.7';
            requestAnimationFrame(() => {
              scrollContainer.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease';
              scrollContainer.style.transform = '';
              scrollContainer.style.opacity = '';
            });
          }
        } else {
          // Swipe non déclenché : retour élastique
          if (scrollContainer && scrollContainer.style.transform) {
            scrollContainer.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
            scrollContainer.style.transform = '';
            scrollContainer.style.opacity = '';
          }
        }
      } else {
        // Geste relâché sans seuil : rebond de retour
        if (scrollContainer && scrollContainer.style.transform) {
          scrollContainer.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
          scrollContainer.style.transform = '';
          scrollContainer.style.opacity = '';
        }
      }
    }, { passive: true });

    calendarViewWrapper.addEventListener('touchcancel', () => {
      isTracking = false;
      restoreNavControls();
      const scrollContainer = document.getElementById('calendarGridScroll');
      if (scrollContainer && scrollContainer.style.transform) {
        scrollContainer.style.transition = 'transform 0.24s ease, opacity 0.2s ease';
        scrollContainer.style.transform = '';
        scrollContainer.style.opacity = '';
      }
    }, { passive: true });

    // Empêcher les clics intempestifs (ghost clicks) sur les cartes de cours après un swipe
    calendarViewWrapper.addEventListener('click', (e) => {
      if (isSwiping) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  // --- Drag & Drop / File Upload Handlers ---
  function setupFileHandlers() {
    const fileInput = document.getElementById('icsFileInput');
    const btnBrowse = document.getElementById('btnBrowseFiles');
    const dropzone = document.getElementById('modalDropzone');
    const globalOverlay = document.getElementById('globalDragDropOverlay');

    // Trigger browse
    btnBrowse?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('click', (e) => {
      if (e.target !== btnBrowse && !btnBrowse?.contains(e.target)) {
        fileInput?.click();
      }
    });

    // File input change (Supports multiple files)
    fileInput?.addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      handleFileList(files);
      fileInput.value = '';
    });

    // Modal Dropzone Drag events
    if (dropzone) {
      dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          handleFileList(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Global Fullscreen Drag & Drop on entire window
    let dragCounter = 0;
    window.addEventListener('dragenter', e => {
      e.preventDefault();
      dragCounter++;
      if (globalOverlay) globalOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', e => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && globalOverlay) {
        globalOverlay.classList.remove('active');
        dragCounter = 0;
      }
    });

    window.addEventListener('dragover', e => e.preventDefault());

    window.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      if (globalOverlay) globalOverlay.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        handleFileList(Array.from(e.dataTransfer.files));
      }
    });
  }

  async function handleFileList(files) {
    if (!files || files.length === 0) return;

    let addedCount = 0;
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const fileNameLower = file.name.toLowerCase();

      // Check if it's a ZIP archive
      if (fileNameLower.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.type === 'application/x-zip') {
        try {
          if (typeof JSZip === 'undefined') {
            showToast('⚠️ La librairie de décompression ZIP est en cours de chargement...');
            continue;
          }

          const zip = await JSZip.loadAsync(file);
          const icsEntries = [];

          zip.forEach((relativePath, zipEntry) => {
            if (
              !zipEntry.dir &&
              zipEntry.name.toLowerCase().endsWith('.ics') &&
              !zipEntry.name.startsWith('__MACOSX') &&
              !zipEntry.name.includes('/.')
            ) {
              icsEntries.push(zipEntry);
            }
          });

          if (icsEntries.length === 0) {
            showToast(`⚠️ Aucun fichier .ics valide trouvé dans l'archive "${file.name}".`);
            continue;
          }

          let zipAdded = 0;
          for (const zipEntry of icsEntries) {
            if (state.calendars.length >= MAX_CALENDARS) {
              showToast(`Limite atteinte : Vous comparez déjà le maximum de ${MAX_CALENDARS} calendriers.`);
              break;
            }
            const icsText = await zipEntry.async('string');
            const cleanName = zipEntry.name.split('/').pop();
            const success = addCalendarFromICS(icsText, cleanName);
            if (success) {
              zipAdded++;
              addedCount++;
            }
          }

          if (zipAdded > 0) {
            showToast(`📦 Archive "${file.name}" : ${zipAdded} calendrier(s) .ics extrait(s) et ajouté(s) !`);
          }
        } catch (err) {
          console.error('Erreur lecture ZIP:', err);
          showToast(`❌ Erreur lors de l'extraction de l'archive "${file.name}".`);
        }
      }
      // Check if it's an ICS file
      else if (fileNameLower.endsWith('.ics') || file.type === 'text/calendar') {
        try {
          const content = await readFileAsText(file);
          const success = addCalendarFromICS(content, file.name);
          if (success) addedCount++;
        } catch (err) {
          console.error('Erreur lecture fichier:', err);
          showToast(`❌ Erreur lors de la lecture de "${file.name}".`);
        }
      } else {
        showToast(`⚠️ Le format du fichier "${file.name}" n'est pas supporté (formats acceptés : .ics, .zip).`);
      }
    }

    if (addedCount > 0) {
      closeAllModals();
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }

  // --- Import Mode Tabs Handler (Files vs Google Drive/URL) ---
  function setupImportTabHandlers() {
    const tabFile = document.getElementById('tabUploadFile');
    const tabDrive = document.getElementById('tabUploadDrive');
    const panelFile = document.getElementById('panelUploadFile');
    const panelDrive = document.getElementById('panelUploadDrive');
    const driveInput = document.getElementById('driveUrlInput');

    const switchTab = (mode) => {
      if (mode === 'drive') {
        tabFile?.classList.remove('active');
        tabFile?.setAttribute('aria-selected', 'false');
        tabDrive?.classList.add('active');
        tabDrive?.setAttribute('aria-selected', 'true');

        if (panelFile) panelFile.style.display = 'none';
        panelFile?.classList.remove('active');
        if (panelDrive) panelDrive.style.display = 'block';
        panelDrive?.classList.add('active');

        setTimeout(() => driveInput?.focus(), 50);
      } else {
        tabDrive?.classList.remove('active');
        tabDrive?.setAttribute('aria-selected', 'false');
        tabFile?.classList.add('active');
        tabFile?.setAttribute('aria-selected', 'true');

        if (panelDrive) panelDrive.style.display = 'none';
        panelDrive?.classList.remove('active');
        if (panelFile) panelFile.style.display = 'block';
        panelFile?.classList.add('active');
      }
    };

    tabFile?.addEventListener('click', () => switchTab('file'));
    tabDrive?.addEventListener('click', () => switchTab('drive'));
  }

  // --- Google Drive & URL Input Handlers ---
  function setupDriveUrlHandlers() {
    const input = document.getElementById('driveUrlInput');
    const btnClear = document.getElementById('btnClearDriveUrl');
    const btnLoad = document.getElementById('btnLoadDriveUrl');

    if (!input) return;

    input.addEventListener('input', () => {
      if (btnClear) {
        btnClear.style.display = input.value.trim().length > 0 ? 'flex' : 'none';
      }
    });

    btnClear?.addEventListener('click', () => {
      input.value = '';
      btnClear.style.display = 'none';
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDriveUrlImport();
      }
    });

    btnLoad?.addEventListener('click', () => {
      handleDriveUrlImport();
    });
  }

  // --- Main Drive / URL Import Entry Point ---
  async function handleDriveUrlImport() {
    const input = document.getElementById('driveUrlInput');
    const statusBox = document.getElementById('driveUrlStatus');
    const statusText = document.getElementById('driveUrlStatusText');
    const btnLoad = document.getElementById('btnLoadDriveUrl');

    const rawUrl = (input?.value || '').trim();
    if (!rawUrl) {
      showToast('⚠️ Veuillez coller un lien Google Drive ou une URL de calendrier.');
      input?.focus();
      return;
    }

    // Persist imported URL in active comparison instance for Option 6 pre-filling
    if (state.activeInstance) {
      if (!Array.isArray(state.activeInstance.updateUrls)) {
        state.activeInstance.updateUrls = [];
      }
      if (!state.activeInstance.updateUrls.includes(rawUrl)) {
        state.activeInstance.updateUrls.push(rawUrl);
        saveInstancesToStorage();
      }
    }

    if (state.calendars.length >= MAX_CALENDARS) {
      showToast(`Limite atteinte : Vous comparez déjà le maximum de ${MAX_CALENDARS} calendriers.`);
      return;
    }

    const setStatus = (msg, isVisible = true) => {
      if (statusBox) statusBox.style.display = isVisible ? 'flex' : 'none';
      if (statusText && msg) statusText.textContent = msg;
      if (btnLoad) btnLoad.disabled = isVisible;
    };

    try {
      setStatus('Analyse du lien...');

      // 1. Google Drive Folder Detection (/folders/ID)
      const folderMatch = rawUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
      if (folderMatch) {
        const folderId = folderMatch[1];
        await handleDriveFolderImport(folderId, setStatus);
        input.value = '';
        document.getElementById('btnClearDriveUrl')?.style.setProperty('display', 'none');
        return;
      }

      // 2. Google Drive Single File Detection (/file/d/ID or ?id=ID)
      const fileMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) || 
                        rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
      if (fileMatch && (rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com') || rawUrl.includes('drive.usercontent.google.com'))) {
        const fileId = fileMatch[1];
        await handleDriveSingleFileImport(fileId, setStatus);
        input.value = '';
        document.getElementById('btnClearDriveUrl')?.style.setProperty('display', 'none');
        return;
      }

      // 3. Webcal or generic HTTP URL
      let directUrl = rawUrl;
      if (directUrl.startsWith('webcal://')) {
        directUrl = 'https://' + directUrl.slice(9);
      }
      if (/^https?:\/\//i.test(directUrl)) {
        await handleDirectUrlImport(directUrl, setStatus);
        input.value = '';
        document.getElementById('btnClearDriveUrl')?.style.setProperty('display', 'none');
        return;
      }

      setStatus('', false);
      showToast('⚠️ Lien non reconnu. Collez un lien de partage Google Drive valide (fichier ou dossier) ou une URL .ics.');
    } catch (err) {
      console.error('Erreur importation URL:', err);
      setStatus('', false);
      showToast(`❌ Erreur lors de l'importation : ${err.message || 'Impossible de charger le calendrier'}`);
    }
  }

  // --- Google Drive Single File Importer ---
  async function handleDriveSingleFileImport(fileId, setStatus) {
    setStatus('Téléchargement du calendrier Google Drive...');
    const icsContent = await downloadDriveFile(fileId);

    const fallbackName = `Google_Drive_${fileId.slice(0, 6)}.ics`;
    const success = addCalendarFromICS(icsContent, fallbackName);
    setStatus('', false);

    if (success) {
      closeAllModals();
    }
  }

  // --- Google Drive Folder Importer (Loads all contained .ics files individually) ---
  // --- Google Drive Folder Importer (Loads all contained .ics files individually) ---
  async function handleDriveFolderImport(folderId, setStatus) {
    setStatus('Exploration du dossier Google Drive...');

    const html = await fetchDriveFolderHtml(folderId);
    if (!html) {
      setStatus('', false);
      showToast('⚠️ Google bloque la lecture automatique de dossiers complets sur ce site statique. Solution immédiate : ouvrez votre dossier Drive, faites un clic droit sur votre fichier .ics > "Partager" > "Copier le lien", puis collez ce lien de fichier direct ici !', 10000);
      return;
    }

    setStatus('Détection des fichiers calendriers .ics...');
    const files = extractFilesFromDriveHtml(html);

    if (files.length === 0) {
      setStatus('', false);
      showToast('⚠️ Aucun fichier .ics détecté dans ce dossier. Astuce : copiez et collez directement le lien de partage du fichier .ics spécifique.');
      return;
    }

    const availableSlots = MAX_CALENDARS - state.calendars.length;
    if (availableSlots <= 0) {
      setStatus('', false);
      showToast(`Limite atteinte : Vous comparez déjà le maximum de ${MAX_CALENDARS} calendriers.`);
      return;
    }

    const filesToImport = files.slice(0, availableSlots);
    let importedCount = 0;

    for (let i = 0; i < filesToImport.length; i++) {
      const file = filesToImport[i];
      setStatus(`Téléchargement de "${file.name}" (${i + 1}/${filesToImport.length})...`);
      try {
        const icsText = await downloadDriveFile(file.id);
        const success = addCalendarFromICS(icsText, file.name);
        if (success) {
          importedCount++;
        }
      } catch (fErr) {
        console.warn(`Erreur sur le fichier ${file.name}:`, fErr);
      }
    }

    setStatus('', false);

    if (importedCount > 0) {
      closeAllModals();
      const namesList = state.calendars.slice(-importedCount).map(c => getFirstName(c.name)).join(', ');
      showToast(`📁 Google Drive : ${importedCount} calendrier(s) importé(s) (${namesList}) !`);
      if (files.length > filesToImport.length) {
        showToast(`ℹ️ ${files.length - filesToImport.length} calendrier(s) ignoré(s) (limite de ${MAX_CALENDARS} calendriers atteinte).`);
      }
    } else {
      showToast('❌ Aucun calendrier valide n\'a pu être importé depuis ce dossier. Essayez de coller directement le lien de partage de votre fichier .ics.');
    }
  }

  // --- Direct Web / Webcal URL Importer ---
  async function handleDirectUrlImport(url, setStatus) {
    setStatus('Téléchargement du fichier distant...');
    let text = null;

    try {
      const res = await fetch(url);
      if (res.ok) {
        text = await res.text();
      }
    } catch (e) {
      console.warn('Direct fetch failed, trying proxy...', e);
    }

    if (!text || !text.includes('BEGIN:VCALENDAR')) {
      const proxyUrls = [
        `${DRIVE_PROXY_URL}?url=${encodeURIComponent(url)}`,
        `/api/proxy?url=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      ];

      for (const pUrl of proxyUrls) {
        try {
          const res = await fetch(pUrl);
          if (res.ok) {
            const pText = await res.text();
            if (pText && pText.includes('BEGIN:VCALENDAR')) {
              text = pText;
              break;
            }
          }
        } catch (err) {}
      }
    }

    if (!text || !text.includes('BEGIN:VCALENDAR')) {
      setStatus('', false);
      throw new Error('Impossible de télécharger un calendrier .ics valide depuis cette URL.');
    }

    let filename = 'calendrier_web.ics';
    try {
      const parsed = new URL(url);
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
      if (lastSegment) {
        filename = decodeURIComponent(lastSegment);
        if (!filename.toLowerCase().endsWith('.ics')) filename += '.ics';
      }
    } catch (e) {}

    const success = addCalendarFromICS(text, filename);
    setStatus('', false);

    if (success) {
      closeAllModals();
    }
  }

  // --- Helper: Download Google Drive file content ---
  async function downloadDriveFile(fileId) {
    const directUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;

    // 1. Direct fetch (supported natively by Google usercontent with CORS Access-Control-Allow-Origin: *)
    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('BEGIN:VCALENDAR')) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Direct Google Drive download failed, trying proxy...', e);
    }

    // 2. Proxies fallback (Vercel proxy first, then relative /api/proxy, then public)
    const fallbackUrls = [
      `${DRIVE_PROXY_URL}?url=${encodeURIComponent(directUrl)}`,
      `/api/proxy?url=${encodeURIComponent(directUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
    ];

    for (const url of fallbackUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('BEGIN:VCALENDAR')) {
            return text;
          }
        }
      } catch (err) {
        console.warn('Proxy download attempt failed:', url, err);
      }
    }

    throw new Error('Impossible de télécharger le fichier calendrier depuis Google Drive.');
  }

  // --- Helper: Fetch Google Drive folder HTML ---
  async function fetchDriveFolderHtml(folderId) {
    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    const fullUrl = `https://drive.google.com/drive/folders/${folderId}`;

    const requestsToTry = [
      // 1. Primary dedicated Vercel proxy
      { url: `${DRIVE_PROXY_URL}?url=${encodeURIComponent(embedUrl)}`, type: 'raw' },
      { url: `${DRIVE_PROXY_URL}?url=${encodeURIComponent(fullUrl)}`, type: 'raw' },
      // 2. Localhost or relative /api/proxy
      { url: `/api/proxy?url=${encodeURIComponent(embedUrl)}`, type: 'raw' },
      { url: `/api/proxy?url=${encodeURIComponent(fullUrl)}`, type: 'raw' },
      // 3. Public proxy fallback
      { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(embedUrl)}`, type: 'raw' },
      { url: `https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`, type: 'json' }
    ];

    for (const req of requestsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(req.url, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          let text = await res.text();
          if (req.type === 'json') {
            try {
              const data = JSON.parse(text);
              text = data.contents || '';
            } catch (je) {}
          }
          if (text && (text.includes('flip-entry') || text.includes('_DRIVE_ivd') || text.includes('data-id=') || text.toLowerCase().includes('.ics'))) {
            return text;
          }
        }
      } catch (e) {
        console.warn('Folder proxy fetch failed:', req.url, e);
      }
    }
    return null;
  }

  // --- Helper: Extract .ics files from Google Drive folder HTML ---
  function extractFilesFromDriveHtml(rawHtml) {
    const files = [];
    const seenIds = new Set();
    const seenNames = new Set();

    // 1. Embedded folderview HTML (lightweight HTML flip-entries list)
    const regexEmbed = /id=["']entry-([a-zA-Z0-9_-]+)["'][\s\S]*?class=["'][^"']*flip-entry-title[^"']*["'][^>]*>([^<]+)<\/div>/gi;
    let m;
    while ((m = regexEmbed.exec(rawHtml)) !== null) {
      const id = m[1].trim();
      const name = m[2].trim();
      const nameLower = name.toLowerCase();
      if (nameLower.endsWith('.ics') && !seenIds.has(id) && !seenNames.has(nameLower)) {
        seenIds.add(id);
        seenNames.add(nameLower);
        files.push({ id, name });
      }
    }
    const regexEmbedLink = /href=["'][^"']*drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)[^"']*["'][\s\S]*?class=["'][^"']*flip-entry-title[^"']*["'][^>]*>([^<]+)<\/div>/gi;
    while ((m = regexEmbedLink.exec(rawHtml)) !== null) {
      const id = m[1].trim();
      const name = m[2].trim();
      const nameLower = name.toLowerCase();
      if (nameLower.endsWith('.ics') && !seenIds.has(id) && !seenNames.has(nameLower)) {
        seenIds.add(id);
        seenNames.add(nameLower);
        files.push({ id, name });
      }
    }

    if (files.length > 0) {
      return files;
    }

    // 2. window['_DRIVE_ivd'] hex-encoded JSON (canonical full folder page)
    const ivdMatch = rawHtml.match(/window\['_DRIVE_ivd'\]\s*=\s*'([^']+)'/);
    if (ivdMatch) {
      try {
        const decoded = ivdMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const cleanJson = decoded.replace(/\\\//g, '/');
        const data = JSON.parse(cleanJson);

        function walk(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            if (
              typeof obj[0] === 'string' &&
              obj[0].length >= 20 &&
              typeof obj[2] === 'string' &&
              obj[2].toLowerCase().endsWith('.ics')
            ) {
              const id = obj[0].replace(/-[0-9]+-[0-9]+$/, '').trim();
              const name = obj[2].trim();
              const nameLower = name.toLowerCase();
              if (!seenIds.has(id) && !seenNames.has(nameLower)) {
                seenIds.add(id);
                seenNames.add(nameLower);
                files.push({ id, name });
              }
            }
            for (const item of obj) walk(item);
          }
        }
        walk(data);
      } catch (e) {
        console.warn('IVD parsing error:', e);
      }
    }

    // If IVD successfully extracted files, stop here to avoid duplicate regex matches
    if (files.length > 0) {
      return files;
    }

    // 3. HTML data-id & data-tooltip fallback
    const regex = /data-id=["']([a-zA-Z0-9_-]{20,})["'][^>]*?data-tooltip=["']([^"']+\.ics)/gi;
    while ((m = regex.exec(rawHtml)) !== null) {
      const id = m[1].replace(/-[0-9]+-[0-9]+$/, '').trim();
      let name = m[2].trim();
      if (name.endsWith(' Calendar')) name = name.replace(/ Calendar$/, '');
      const nameLower = name.toLowerCase();
      if (!seenIds.has(id) && !seenNames.has(nameLower)) {
        seenIds.add(id);
        seenNames.add(nameLower);
        files.push({ id, name });
      }
    }

    // 4. Fallback aria-label and ssk attribute
    const regexAria = /aria-label=["']([^"']+\.ics)[^"']*?["'][^>]*?ssk=["'][^"']*?:([a-zA-Z0-9_-]{20,})/gi;
    while ((m = regexAria.exec(rawHtml)) !== null) {
      const name = m[1].trim();
      const id = m[2].replace(/-[0-9]+-[0-9]+$/, '').trim();
      const nameLower = name.toLowerCase();
      if (!seenIds.has(id) && !seenNames.has(nameLower)) {
        seenIds.add(id);
        seenNames.add(nameLower);
        files.push({ id, name });
      }
    }

    return files;
  }

  // --- Toolbar Toggle & Collapsed State Helper ---
  function updateToolbarState() {
    if (document.body) {
      document.body.classList.toggle('toolbar-collapsed', !state.showToolbar);
    }
    if (document.documentElement) {
      document.documentElement.classList.toggle('toolbar-collapsed', !state.showToolbar);
    }
    const btn = document.getElementById('btnToggleToolbarCollapse');
    if (btn) {
      btn.classList.toggle('active', !!state.showToolbar);
      btn.title = state.showToolbar ? 'Masquer la barre de configuration 🧘' : 'Afficher la barre de configuration 🛠️';
      btn.setAttribute('aria-expanded', state.showToolbar ? 'true' : 'false');
      btn.innerHTML = `<i class="ph-bold ${state.showToolbar ? 'ph-eye' : 'ph-eye-slash'}" id="iconToggleToolbar"></i>`;
    }
    const switchToolbar = document.getElementById('switchSettingsToolbar');
    if (switchToolbar) {
      switchToolbar.checked = !!state.showToolbar;
    }
  }

  // --- Theme Setup & 3-Choice Management ('dark', 'light', 'auto') ---
  function applyThemeDOM() {
    if (!document.body) return;
    const isLight = isThemeLight();
    document.body.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('light-theme', isLight);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#f8fafc' : '#04060d');
    }

    const btnDark = document.getElementById('btnThemeSegmentDark');
    const btnLight = document.getElementById('btnThemeSegmentLight');
    const btnAuto = document.getElementById('btnThemeSegmentAuto');

    if (btnDark) btnDark.classList.toggle('active', state.theme === 'dark');
    if (btnLight) btnLight.classList.toggle('active', state.theme === 'light');
    if (btnAuto) btnAuto.classList.toggle('active', state.theme === 'auto');
  }

  function setTheme(themeMode) {
    if (!['dark', 'light', 'auto'].includes(themeMode)) themeMode = 'dark';
    state.theme = themeMode;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyThemeDOM();
    render();
    const label = themeMode === 'auto' ? 'Automatique (navigateur)' : (themeMode === 'light' ? 'Clair' : 'Sombre');
    showToast(`Thème d'affichage : ${label}`);
  }

  function setupTheme() {
    applyThemeDOM();

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: light)');
      const handleSystemThemeChange = () => {
        if (state.theme === 'auto') {
          applyThemeDOM();
          render();
        }
      };
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleSystemThemeChange);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handleSystemThemeChange);
      }
    }
  }

  // --- Settings Menu (Fullscreen Slide-down) ---
  function openSettings() {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) return;

    // Synchronize Badges
    updateHeaderBadges();

    // Synchronize View Switcher
    const btnWeek = document.getElementById('btnSettingsViewWeek');
    const btnDay = document.getElementById('btnSettingsViewDay');
    if (btnWeek) btnWeek.classList.toggle('active', state.viewType === 'week');
    if (btnDay) btnDay.classList.toggle('active', state.viewType === 'day');

    // Synchronize Theme
    applyThemeDOM();

    // Synchronize Apple Switches
    const switchDim = document.getElementById('switchSettingsDimCMo');
    if (switchDim) switchDim.checked = !!state.dimCMo;

    const switchFree = document.getElementById('switchSettingsFreeTime');
    if (switchFree) switchFree.checked = !!state.showFreeTime;

    const switchToolbar = document.getElementById('switchSettingsToolbar');
    if (switchToolbar) switchToolbar.checked = !!state.showToolbar;

    const switchSundays = document.getElementById('switchSettingsShowSundays');
    if (switchSundays) switchSundays.checked = !!state.showSundays;

    // Render Option 6 (URLs list)
    renderSettingsUrlFields();

    // Render Option 7 (Calendars reorder & colors)
    renderSettingsCalendarsList();

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // --- Option 1: View Type Switcher Sync Helper ---
  function setViewType(type) {
    if (state.viewType === 'week' && type === 'day') {
      const baseDate = state.currentDate || new Date();
      const loadedMonday = getMonday(baseDate);
      const currentMonday = getMonday(new Date());
      if (isSameDay(loadedMonday, currentMonday)) {
        state.currentDate = getDefaultDate();
      } else {
        state.currentDate = new Date(loadedMonday);
      }
    } else if (state.viewType === 'day' && type === 'week') {
      const baseDate = state.currentDate || new Date();
      state.currentDate = getMonday(baseDate);
    }

    state.viewType = type;
    localStorage.setItem(VIEW_TYPE_STORAGE_KEY, type);

    // If Sundays are disabled and current date is Sunday, advance to tomorrow (Monday)
    if (!state.showSundays && state.currentDate && state.currentDate.getDay() === 0) {
      state.currentDate.setDate(state.currentDate.getDate() + 1);
    }

    // Sync header view buttons
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === type);
    });

    // Sync settings view buttons
    const btnWeek = document.getElementById('btnSettingsViewWeek');
    const btnDay = document.getElementById('btnSettingsViewDay');
    if (btnWeek) btnWeek.classList.toggle('active', type === 'week');
    if (btnDay) btnDay.classList.toggle('active', type === 'day');

    render();
  }

  // --- Option 6: Settings URL Fields List & Management ---
  function getActiveInstanceUrls() {
    if (!state.activeInstance) return [''];
    if (!Array.isArray(state.activeInstance.updateUrls)) {
      state.activeInstance.updateUrls = [];
    }
    if (state.activeInstance.updateUrls.length === 0) {
      return [''];
    }
    return state.activeInstance.updateUrls;
  }

  function renderSettingsUrlFields() {
    const container = document.getElementById('settingsUrlFieldsList');
    if (!container) return;

    const btnTrigger = document.getElementById('btnTriggerUrlUpdate');

    // On Home Page: no active instance loaded → show disabled informative state
    if (state.currentView === 'home' || !state.activeInstance) {
      container.innerHTML = `
        <div style="padding: 16px 8px; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <i class="ph-bold ph-link" style="font-size: 1.3rem; display: block; margin-bottom: 6px; opacity: 0.6;"></i>
          Aucune comparaison chargée
        </div>
      `;
      if (btnTrigger) btnTrigger.disabled = true;
      return;
    }

    if (btnTrigger) btnTrigger.disabled = false;

    const urls = getActiveInstanceUrls();
    container.innerHTML = '';

    // Instance context badge
    const contextBadge = document.createElement('div');
    contextBadge.style.cssText = 'font-size: 0.76rem; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;';
    contextBadge.innerHTML = `<i class="ph-bold ph-folder-simple" style="font-size: 0.85rem;"></i> URLs de <strong style="color: var(--text-secondary);">${escapeHTML(state.activeInstance.name)}</strong>`;
    container.appendChild(contextBadge);

    urls.forEach((url, idx) => {
      const row = document.createElement('div');
      row.className = 'settings-url-row';

      const input = document.createElement('input');
      input.type = 'url';
      input.className = 'settings-url-input';
      input.placeholder = idx === 0
        ? 'https://drive.google.com/drive/folders/... ou fichier .ics'
        : 'Autre URL Google Drive ou lien .ics...';
      input.value = url;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `URL de synchronisation ${idx + 1}`);

      input.addEventListener('input', (e) => {
        if (!state.activeInstance) return;
        if (!Array.isArray(state.activeInstance.updateUrls)) {
          state.activeInstance.updateUrls = [];
        }
        state.activeInstance.updateUrls[idx] = e.target.value.trim();
        saveInstancesToStorage();
      });

      row.appendChild(input);

      if (idx === 0) {
        // '+' button on the first row
        const btnAdd = document.createElement('button');
        btnAdd.type = 'button';
        btnAdd.className = 'btn-url-add';
        btnAdd.title = 'Ajouter une URL supplémentaire';
        btnAdd.setAttribute('aria-label', 'Ajouter une URL');
        btnAdd.innerHTML = '<i class="ph-bold ph-plus"></i>';
        btnAdd.addEventListener('click', () => {
          if (!state.activeInstance) return;
          if (!Array.isArray(state.activeInstance.updateUrls)) {
            state.activeInstance.updateUrls = [];
          }
          state.activeInstance.updateUrls.push('');
          saveInstancesToStorage();
          renderSettingsUrlFields();
          setTimeout(() => {
            const inputs = container.querySelectorAll('.settings-url-input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
          }, 50);
        });
        row.appendChild(btnAdd);
      } else {
        // Trash button on subsequent rows
        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'btn-url-delete';
        btnDelete.title = 'Supprimer cette URL';
        btnDelete.setAttribute('aria-label', 'Supprimer cette URL');
        btnDelete.innerHTML = '<i class="ph-bold ph-trash"></i>';
        btnDelete.addEventListener('click', () => {
          if (!state.activeInstance) return;
          state.activeInstance.updateUrls.splice(idx, 1);
          saveInstancesToStorage();
          renderSettingsUrlFields();
        });
        row.appendChild(btnDelete);
      }

      container.appendChild(row);
    });
  }

  // --- Option 6: Execute URL Update for Active Comparison Space ---
  async function updateCalendarsFromUrls() {
    if (!state.activeInstance) {
      showToast('⚠️ Ouvrez une comparaison depuis l\'accueil pour charger des calendriers.');
      return;
    }

    const container = document.getElementById('settingsUrlFieldsList');
    const btnTrigger = document.getElementById('btnTriggerUrlUpdate');
    const icon = document.getElementById('iconLoadUrls');
    const text = document.getElementById('textLoadUrls');

    const inputEls = container ? container.querySelectorAll('.settings-url-input') : [];
    const enteredUrls = Array.from(inputEls).map(inp => inp.value.trim()).filter(Boolean);

    if (enteredUrls.length === 0) {
      showToast('⚠️ Veuillez renseigner au moins une URL Google Drive ou .ics valide.');
      return;
    }

    if (state.activeInstance) {
      state.activeInstance.updateUrls = enteredUrls;
      saveInstancesToStorage();
    }

    if (btnTrigger) btnTrigger.disabled = true;
    if (icon) icon.className = 'ph-bold ph-arrows-clockwise icon-spin';
    if (text) text.textContent = 'Chargement...';

    let updatedCount = 0;
    let addedCount = 0;
    let errorsCount = 0;

    const processIcsText = (icsText, filename) => {
      if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) return false;

      const tempId = `temp_${Date.now()}`;
      const fallbackName = filename ? filename.replace(/\.ics$/i, '') : `Calendrier ${state.calendars.length + 1}`;
      const parsed = parseICS(icsText, tempId, fallbackName);

      if (!parsed || parsed.events.length === 0) return false;

      const candName = parsed.name || fallbackName;
      const matchIndex = findMatchingCalendarIndex(candName);

      if (matchIndex !== -1) {
        // REPLACE IN-PLACE: Preserve calendar ID, colorIndex, and order in array!
        const existing = state.calendars[matchIndex];
        existing.name = candName;
        existing.events = parsed.events.map(e => ({ ...e, calendarId: existing.id }));
        if (parsed.classLetter) existing.classLetter = parsed.classLetter;
        updatedCount++;
        return true;
      } else {
        // ADD NEW CALENDAR (up to MAX_CALENDARS)
        if (state.calendars.length >= MAX_CALENDARS) {
          return false;
        }
        const newId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const newCal = {
          id: newId,
          name: candName,
          classLetter: parsed.classLetter || null,
          colorIndex: getNextColorIndex(),
          enabled: true,
          events: parsed.events.map(e => ({ ...e, calendarId: newId }))
        };
        state.calendars.push(newCal);
        addedCount++;
        return true;
      }
    };

    try {
      for (const url of enteredUrls) {
        // 1. Google Drive Folder (/folders/ID)
        const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
        if (folderMatch) {
          const folderId = folderMatch[1];
          const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          const html = await fetchDriveFolderHtml(folderUrl);
          if (html) {
            const files = extractFilesFromDriveHtml(html);
            for (const f of files) {
              try {
                const icsText = await downloadDriveFile(f.id);
                processIcsText(icsText, f.name);
              } catch (err) {
                console.warn(`Erreur téléchargement fichier Drive ${f.name}:`, err);
                errorsCount++;
              }
            }
          } else {
            errorsCount++;
          }
          continue;
        }

        // 2. Google Drive Single File (/file/d/ID or ?id=ID)
        const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
        if (fileMatch && (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('drive.usercontent.google.com'))) {
          const fileId = fileMatch[1];
          try {
            const icsText = await downloadDriveFile(fileId);
            processIcsText(icsText, `Google_Drive_${fileId.slice(0, 6)}.ics`);
          } catch (err) {
            console.warn(`Erreur téléchargement fichier Drive ${fileId}:`, err);
            errorsCount++;
          }
          continue;
        }

        // 3. Webcal or direct URL
        let directUrl = url;
        if (directUrl.startsWith('webcal://')) directUrl = 'https://' + directUrl.slice(9);

        let icsText = null;
        try {
          const res = await fetch(directUrl);
          if (res.ok) icsText = await res.text();
        } catch (e) {}

        if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
          const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || !!window.location.port;
          const proxyUrls = [];
          if (isLocal) proxyUrls.push(`/api/proxy?url=${encodeURIComponent(directUrl)}`);
          proxyUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`);
          proxyUrls.push(`https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`);

          for (const pUrl of proxyUrls) {
            try {
              const res = await fetch(pUrl);
              if (res.ok) {
                const pText = await res.text();
                if (pText && pText.includes('BEGIN:VCALENDAR')) {
                  icsText = pText;
                  break;
                }
              }
            } catch (err) {}
          }
        }

        if (icsText && icsText.includes('BEGIN:VCALENDAR')) {
          let filename = 'calendrier_web.ics';
          try {
            const parsed = new URL(url);
            const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
            if (lastSegment) filename = decodeURIComponent(lastSegment);
          } catch (e) {}
          processIcsText(icsText, filename);
        } else {
          errorsCount++;
        }
      }

      saveToLocalStorage();
      ensureValidStartingDate();
      render();
      renderSettingsCalendarsList();

      if (updatedCount > 0 || addedCount > 0) {
        showToast(`✅ Mise à jour : ${updatedCount} calendrier(s) actualisé(s), ${addedCount} nouveau(x) ajouté(s).`);
      } else if (errorsCount > 0) {
        showToast('⚠️ Impossible de mettre à jour les calendriers. Vérifiez les URLs saisies.');
      } else {
        showToast('ℹ️ Aucun changement détecté dans les calendriers distants.');
      }
    } catch (err) {
      console.error('Erreur globale mise à jour URL:', err);
      showToast(`❌ Erreur lors de la mise à jour : ${err.message || 'Échec de la connexion'}`);
    } finally {
      if (btnTrigger) btnTrigger.disabled = false;
      if (icon) icon.className = 'ph-bold ph-arrows-clockwise';
      if (text) text.textContent = 'Charger';
    }
  }

  // --- Option 7: Calendar Reordering & Rainbow Color Management ---
  let currentEditingCalColorIndex = null;

  function renderSettingsCalendarsList() {
    const listEl = document.getElementById('settingsCalendarsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    // In Home Page (Mes comparaisons): no comparison instance is loaded
    if (state.currentView === 'home' || !state.activeInstance) {
      listEl.innerHTML = `
        <div style="padding: 16px 8px; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <i class="ph-bold ph-calendar-blank" style="font-size: 1.3rem; display: block; margin-bottom: 6px; opacity: 0.6;"></i>
          Aucun calendrier chargé dans l'accueil
          <div style="font-size: 0.76rem; margin-top: 4px; opacity: 0.85;">
            Ouvrez une comparaison depuis l'accueil pour afficher et personnaliser ses calendriers.
          </div>
        </div>
      `;
      return;
    }

    // In Main Page: check if active comparison has calendars
    if (!state.calendars || state.calendars.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 16px 8px; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <i class="ph-bold ph-plus-circle" style="font-size: 1.3rem; display: block; margin-bottom: 6px; opacity: 0.6;"></i>
          Aucun calendrier dans cette comparaison
          <div style="font-size: 0.76rem; margin-top: 4px; opacity: 0.85;">
            Ajoutez des fichiers .ics via le bouton "Ajouter un calendrier".
          </div>
        </div>
      `;
      return;
    }

    state.calendars.forEach((cal, idx) => {
      const palette = getCalendarPalette(cal.colorIndex);
      const firstName = getFirstName(cal.name);
      const isFirst = (idx === 0);
      const isLast = (idx === state.calendars.length - 1);

      const row = document.createElement('div');
      row.className = 'cal-reorder-row';
      row.dataset.index = idx;

      row.innerHTML = `
        <div class="cal-reorder-left">
          <span class="cal-rank-badge">#${idx + 1}</span>
          <button 
            type="button" 
            class="cal-color-dot-btn" 
            data-index="${idx}" 
            style="background: ${palette.primary}; color: ${palette.primary};" 
            title="Modifier la couleur de ${escapeHTML(firstName)}"
            aria-label="Changer la couleur"
          ></button>
          <div class="cal-owner-info">
            <span class="cal-first-name">${escapeHTML(firstName)}${cal.classLetter ? ` (${escapeHTML(cal.classLetter)})` : ''}</span>
            <span class="cal-full-name" title="${escapeHTML(cal.name)}">${escapeHTML(cal.name)}</span>
          </div>
        </div>
        <div class="cal-reorder-actions">
          <button 
            type="button" 
            class="cal-arrow-btn btn-cal-up" 
            data-index="${idx}" 
            ${isFirst ? 'disabled' : ''} 
            title="Remonter d'un rang (colonne plus à gauche)"
            aria-label="Remonter"
          >
            <i class="ph-bold ph-caret-up"></i>
          </button>
          <button 
            type="button" 
            class="cal-arrow-btn btn-cal-down" 
            data-index="${idx}" 
            ${isLast ? 'disabled' : ''} 
            title="Descendre d'un rang (colonne plus à droite)"
            aria-label="Descendre"
          >
            <i class="ph-bold ph-caret-down"></i>
          </button>
        </div>
      `;

      row.querySelector('.btn-cal-up')?.addEventListener('click', () => {
        if (idx > 0) {
          const temp = state.calendars[idx];
          state.calendars[idx] = state.calendars[idx - 1];
          state.calendars[idx - 1] = temp;
          saveToLocalStorage();
          render();
          renderSettingsCalendarsList();
          showToast(`"${firstName}" déplacé au rang #${idx}.`);
        }
      });

      row.querySelector('.btn-cal-down')?.addEventListener('click', () => {
        if (idx < state.calendars.length - 1) {
          const temp = state.calendars[idx];
          state.calendars[idx] = state.calendars[idx + 1];
          state.calendars[idx + 1] = temp;
          saveToLocalStorage();
          render();
          renderSettingsCalendarsList();
          showToast(`"${firstName}" déplacé au rang #${idx + 2}.`);
        }
      });

      row.querySelector('.cal-color-dot-btn')?.addEventListener('click', () => {
        openColorPickerForCalendar(idx);
      });

      listEl.appendChild(row);
    });
  }

  function openColorPickerForCalendar(calIndex) {
    const cal = state.calendars[calIndex];
    if (!cal) return;

    currentEditingCalColorIndex = calIndex;
    const titleEl = document.getElementById('calendarColorPickerTitle');
    const grid = document.getElementById('rainbowPaletteGrid');
    const backdrop = document.getElementById('calendarColorPickerModalBackdrop');

    if (titleEl) {
      titleEl.textContent = `Couleur : ${getFirstName(cal.name)}`;
    }

    if (grid) {
      grid.innerHTML = CALENDAR_PALETTES_DARK.map((p) => {
        const isSelected = (p.id === cal.colorIndex);
        return `
          <button 
            type="button" 
            class="rainbow-color-btn ${isSelected ? 'selected' : ''}" 
            data-color-id="${p.id}" 
            style="background: ${p.primary}; color: ${p.primary};" 
            title="${p.name}" 
            aria-label="${p.name}"
          >
            ${isSelected ? '<i class="ph-bold ph-check rainbow-chip-check"></i>' : ''}
          </button>
        `;
      }).join('');

      grid.querySelectorAll('.rainbow-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const colorId = parseInt(btn.dataset.colorId, 10);
          if (currentEditingCalColorIndex !== null && state.calendars[currentEditingCalColorIndex]) {
            const targetCal = state.calendars[currentEditingCalColorIndex];
            targetCal.colorIndex = colorId;
            saveToLocalStorage();
            render();
            renderSettingsCalendarsList();
            closeColorPickerModal();
            const palette = getCalendarPalette(colorId);
            showToast(`🎨 Couleur "${palette.name}" appliquée à ${getFirstName(targetCal.name)}.`);
          }
        });
      });
    }

    if (backdrop) backdrop.classList.add('open');
  }

  function closeColorPickerModal() {
    currentEditingCalColorIndex = null;
    const backdrop = document.getElementById('calendarColorPickerModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  // --- Toast Notification Helper ---
  function showToast(msg) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="ph ph-info" style="color:var(--accent-purple); font-size:1.2rem;"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- PWA Helper & Standalone Detection ---
  function isStandalonePWA() {
    try {
      const isStandaloneMedia = Boolean(
        window.matchMedia && (
          window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches ||
          window.matchMedia('(display-mode: window-controls-overlay)').matches
        )
      );
      const isIosStandalone = Boolean(window.navigator?.standalone || (typeof navigator !== 'undefined' && navigator.standalone));
      const isAndroidTwa = Boolean(document.referrer && document.referrer.includes('android-app://'));
      const urlParams = window.location ? new URLSearchParams(window.location.search) : null;
      const isUrlMode = Boolean(urlParams && (urlParams.get('mode') === 'standalone' || urlParams.get('source') === 'pwa'));
      return isStandaloneMedia || isIosStandalone || isAndroidTwa || isUrlMode;
    } catch (e) {
      return false;
    }
  }

  // --- PWA Service Worker & Install Flow ---
  let deferredInstallPrompt = null;

  function setupPwa() {
    // 1. Register Service Worker for Offline Caching
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(registration => {
            console.log('[PWA] Service Worker registered successfully:', registration.scope);
            // Check for updates
            registration.update();
          })
          .catch(error => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = isStandalonePWA();
    if (isStandalone) {
      document.documentElement.classList.add('is-standalone-pwa');
      if (document.body) document.body.classList.add('is-standalone-pwa');
    }

    const pwaBanner = document.getElementById('pwaInstallBanner');
    const btnBannerInstall = document.getElementById('btnPwaBannerInstall');
    const btnBannerClose = document.getElementById('btnPwaBannerClose');
    const btnMobilePwa = document.getElementById('btnMobilePwaInstall');
    const isDismissed = localStorage.getItem('synccal_pwa_banner_dismissed') === 'true';

    const showBanner = () => {
      if (isStandalonePWA() || isDismissed || !pwaBanner) return;
      setTimeout(() => {
        pwaBanner.style.display = 'flex';
        requestAnimationFrame(() => pwaBanner.classList.add('visible'));
      }, 1200);
    };

    const hideBanner = () => {
      if (!pwaBanner) return;
      pwaBanner.classList.remove('visible');
      setTimeout(() => {
        pwaBanner.style.display = 'none';
      }, 300);
    };

    const updateMobilePwaBtnVisibility = () => {
      if (!btnMobilePwa) return;
      if (isStandalonePWA()) {
        btnMobilePwa.classList.remove('visible');
        btnMobilePwa.style.setProperty('display', 'none', 'important');
        return;
      }
      if (deferredInstallPrompt || isIOS) {
        btnMobilePwa.classList.add('visible');
        btnMobilePwa.style.display = 'inline-flex';
      } else {
        btnMobilePwa.classList.remove('visible');
        btnMobilePwa.style.display = 'none';
      }
    };

    // Immediate check
    updateMobilePwaBtnVisibility();

    // Listen to display-mode changes dynamically
    try {
      const standaloneMql = window.matchMedia('(display-mode: standalone)');
      const handleDisplayModeChange = (e) => {
        if (e.matches) {
          document.documentElement.classList.add('is-standalone-pwa');
          if (document.body) document.body.classList.add('is-standalone-pwa');
          hideBanner();
        }
        updateMobilePwaBtnVisibility();
      };
      if (typeof standaloneMql.addEventListener === 'function') {
        standaloneMql.addEventListener('change', handleDisplayModeChange);
      } else if (typeof standaloneMql.addListener === 'function') {
        standaloneMql.addListener(handleDisplayModeChange);
      }
    } catch (err) {}

    // 2. Intercept beforeinstallprompt for Android, Windows, macOS, ChromeOS
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!isStandalonePWA()) {
        showBanner();
        updateMobilePwaBtnVisibility();
      }
    });

    // iOS Safari Detection (if non-standalone and first visit)
    if (isIOS && !isStandalonePWA()) {
      if (!isDismissed) showBanner();
      updateMobilePwaBtnVisibility();
    }

    // 3. Handle Install Action (Shared for Popup Banner & Mobile Header Button)
    const triggerInstallFlow = async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          showToast('Installation de Co-op Calendar en cours... 📲');
        }
        deferredInstallPrompt = null;
        updateMobilePwaBtnVisibility();
      } else if (isIOS) {
        showToast("📲 Sur iPhone/iPad : Utilise 'Partager' puis 'Sur l'écran d'accueil'", 6000);
      } else {
        showToast("📲 Ouvrez le menu de votre navigateur et choisissez 'Installer l'application'", 5000);
      }
      localStorage.setItem('synccal_pwa_banner_dismissed', 'true');
      hideBanner();
    };

    btnBannerInstall?.addEventListener('click', triggerInstallFlow);
    btnMobilePwa?.addEventListener('click', triggerInstallFlow);

    // 4. Handle Close Button Click in Popup Banner
    btnBannerClose?.addEventListener('click', () => {
      localStorage.setItem('synccal_pwa_banner_dismissed', 'true');
      hideBanner();
    });

    // 5. Track successful install
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      document.documentElement.classList.add('is-standalone-pwa');
      if (document.body) document.body.classList.add('is-standalone-pwa');
      localStorage.setItem('synccal_pwa_banner_dismissed', 'true');
      hideBanner();
      if (btnMobilePwa) {
        btnMobilePwa.classList.remove('visible');
        btnMobilePwa.style.setProperty('display', 'none', 'important');
      }
      showToast('🎉 Co-op Calendar est maintenant installée sur votre appareil !');
    });
  }

  // --- Version Badge Updater ---
  function updateVersionBadge() {
    document.querySelectorAll('.badge-version').forEach(badge => {
      badge.textContent = APP_VERSION;
    });
  }

  // --- Real Viewport Height for Mobile Browser Toolbars ---
  function setupRealViewportHeight() {
    const update = () => {
      if (document.documentElement) {
        const h = window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${h}px`);
        document.documentElement.style.setProperty('--app-vh', `${h * 0.01}px`);
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
    }
  }

  // --- Responsive Navigation Controls Placement Helper ---
  // On mobile: #mainNavControls sits directly above the calendar (main.main-content), below all toolbar/settings
  // On desktop: #mainNavControls sits inside header.app-header between brand-section and header-controls-row
  function syncNavControlsPlacement() {
    const navControls = document.getElementById('mainNavControls') || document.querySelector('.nav-controls');
    const mainPageView = document.getElementById('mainPageView');
    if (!navControls || !mainPageView) return;

    const appHeader = mainPageView.querySelector('.app-header');
    const mainContent = mainPageView.querySelector('.main-content');
    const headerControlsRow = mainPageView.querySelector('.header-controls-row');

    if (!appHeader || !mainContent) return;

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Mobile: Ensure navControls is immediately before mainContent
      if (navControls.nextElementSibling !== mainContent || navControls.parentNode !== mainPageView) {
        mainPageView.insertBefore(navControls, mainContent);
      }
    } else {
      // Desktop: Ensure navControls is inside appHeader before headerControlsRow
      if (navControls.parentNode !== appHeader) {
        if (headerControlsRow && headerControlsRow.parentNode === appHeader) {
          appHeader.insertBefore(navControls, headerControlsRow);
        } else {
          appHeader.appendChild(navControls);
        }
      }
    }
  }

  // --- App Initialization ---
  function initApp() {
    setupRealViewportHeight();
    updateVersionBadge();
    setupTheme();
    updateToolbarState();
    syncNavControlsPlacement();

    // Initialize Comparison Instances (migration & default instance)
    initInstances();

    setupEventListeners();
    setupPwa();

    // Load saved calendars for active instance from LocalStorage
    state.calendars = loadFromLocalStorage(state.activeInstance ? state.activeInstance.id : 'inst_default');

    // Update main page title with active instance name
    updateMainComparisonTitle();

    // Ensure valid starting date
    ensureValidStartingDate();

    // Check if initial hash is #home
    if (window.location.hash === '#home') {
      state.activeInstance = null;
      state.calendars = [];
      showView('home');
    } else {
      state.calendars = loadFromLocalStorage(state.activeInstance ? state.activeInstance.id : 'inst_default');
      updateMainComparisonTitle();
      ensureValidStartingDate();
      showView('main');
    }

    // Initial Render
    render();

    // Start live current-time indicator update loop (30s)
    setInterval(updateLiveCurrentTimeIndicator, 30000);
  }

  // Live update for current time indicator (progression bar)
  let lastIndicatorDay = new Date().getDate();
  function updateLiveCurrentTimeIndicator() {
    const now = new Date();
    // If the day changed while app was open, re-render to shift 'is-today' column
    if (now.getDate() !== lastIndicatorDay) {
      lastIndicatorDay = now.getDate();
      renderCalendar();
      return;
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMin = TIME_START_HOUR * 60;
    const endMin = TIME_END_HOUR * 60;
    const inRange = (currentMinutes >= startMin && currentMinutes <= endMin);
    const topPercent = `${((currentMinutes - startMin) / TOTAL_MINUTES) * 100}%`;

    const indicators = document.querySelectorAll('.current-time-indicator');
    if (indicators.length > 0) {
      indicators.forEach(ind => {
        if (inRange) {
          ind.style.display = '';
          ind.style.top = topPercent;
        } else {
          ind.style.display = 'none';
        }
      });
    } else if (inRange) {
      const todayCols = document.querySelectorAll('.day-column.is-today');
      todayCols.forEach(col => {
        if (!col.querySelector('.current-time-indicator')) {
          const indicator = document.createElement('div');
          indicator.className = 'current-time-indicator';
          indicator.style.top = topPercent;
          col.appendChild(indicator);
        }
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
