/**
 * SyncCal - Modern Multi-ICS Calendar Comparator & Viewer
 * Core Application Logic
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const APP_VERSION = 'v1.9';

  const TIME_START_HOUR = 8;  // 8h00
  const TIME_END_HOUR = 21;   // 21h00
  const TOTAL_HOURS = TIME_END_HOUR - TIME_START_HOUR; // 13 hours
  const TOTAL_MINUTES = TOTAL_HOURS * 60; // 780 minutes

  // 6 Days: Lundi à Samedi (Dimanche retiré)
  const DAYS_FR_6 = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Rentrée 2026 Threshold (1er Août 2026)
  const RENTREE_2026_START = new Date(2026, 7, 1);

  const STORAGE_KEY = 'synccal_stored_calendars_v3';
  const MAX_CALENDARS = 10;

  // 10 Distinct Vibrant Modern Calendar Palettes
  const CALENDAR_PALETTES = [
    {
      id: 0,
      name: 'Bleu Océan',
      primary: '#3b82f6',
      border: '#60a5fa',
      bg: 'rgba(59, 130, 246, 0.22)',
      bgHover: 'rgba(59, 130, 246, 0.35)',
      text: '#bfdbfe',
      badgeBg: '#1d4ed8'
    },
    {
      id: 1,
      name: 'Rouge Corail',
      primary: '#f43f5e',
      border: '#fb7185',
      bg: 'rgba(244, 63, 94, 0.22)',
      bgHover: 'rgba(244, 63, 94, 0.35)',
      text: '#fecdd3',
      badgeBg: '#be123c'
    },
    {
      id: 2,
      name: 'Émeraude',
      primary: '#10b981',
      border: '#34d399',
      bg: 'rgba(16, 185, 129, 0.22)',
      bgHover: 'rgba(16, 185, 129, 0.35)',
      text: '#a7f3d0',
      badgeBg: '#047857'
    },
    {
      id: 3,
      name: 'Ambre / Orange',
      primary: '#f59e0b',
      border: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.22)',
      bgHover: 'rgba(245, 158, 11, 0.35)',
      text: '#fde68a',
      badgeBg: '#b45309'
    },
    {
      id: 4,
      name: 'Violet Électrique',
      primary: '#8b5cf6',
      border: '#a78bfa',
      bg: 'rgba(139, 92, 246, 0.22)',
      bgHover: 'rgba(139, 92, 246, 0.35)',
      text: '#ddd6fe',
      badgeBg: '#6d28d9'
    },
    {
      id: 5,
      name: 'Cyan Néon',
      primary: '#06b6d4',
      border: '#22d3ee',
      bg: 'rgba(6, 182, 212, 0.22)',
      bgHover: 'rgba(6, 182, 212, 0.35)',
      text: '#cffafe',
      badgeBg: '#0e7490'
    },
    {
      id: 6,
      name: 'Rose Magenta',
      primary: '#d946ef',
      border: '#e879f9',
      bg: 'rgba(217, 70, 239, 0.22)',
      bgHover: 'rgba(217, 70, 239, 0.35)',
      text: '#f5d0fe',
      badgeBg: '#a21caf'
    },
    {
      id: 7,
      name: 'Lime Vif',
      primary: '#84cc16',
      border: '#a3e635',
      bg: 'rgba(132, 204, 22, 0.22)',
      bgHover: 'rgba(132, 204, 22, 0.35)',
      text: '#ecfccb',
      badgeBg: '#4d7c0f'
    },
    {
      id: 8,
      name: 'Indigo Nuit',
      primary: '#6366f1',
      border: '#818cf8',
      bg: 'rgba(99, 102, 241, 0.22)',
      bgHover: 'rgba(99, 102, 241, 0.35)',
      text: '#e0e7ff',
      badgeBg: '#4338ca'
    },
    {
      id: 9,
      name: 'Orange Solaire',
      primary: '#ea580c',
      border: '#fb923c',
      bg: 'rgba(234, 88, 12, 0.22)',
      bgHover: 'rgba(234, 88, 12, 0.35)',
      text: '#ffedd5',
      badgeBg: '#c2410c'
    }
  ];

  // --- LocalStorage Keys ---
  const THEME_STORAGE_KEY = 'synccal_theme';
  const VIEW_TYPE_STORAGE_KEY = 'synccal_view_type';
  const DIM_CMO_STORAGE_KEY = 'synccal_dim_cmo';
  const FREE_TIME_STORAGE_KEY = 'synccal_show_free_time';
  const TYPE_FILTER_STORAGE_KEY = 'synccal_type_filter';
  const CHIPS_COLLAPSED_STORAGE_KEY = 'synccal_chips_collapsed';
  const SHOW_TOOLBAR_STORAGE_KEY = 'synccal_show_toolbar';

  // --- App State ---
  const state = {
    calendars: [], // Array of calendar objects up to 10
    currentDate: new Date(2026, 8, 1), // Default: 1st September 2026 (start of academic year)
    viewType: localStorage.getItem(VIEW_TYPE_STORAGE_KEY) || (window.innerWidth < 768 ? 'day' : 'week'),
    dimCMo: localStorage.getItem(DIM_CMO_STORAGE_KEY) !== 'false', // Default: true (dim online courses)
    chipsCollapsed: localStorage.getItem(CHIPS_COLLAPSED_STORAGE_KEY) === 'true',
    showToolbar: localStorage.getItem(SHOW_TOOLBAR_STORAGE_KEY) !== 'false', // Default: true (options visible & button active/enfoncé) // Comparison chips collapsed
    searchQuery: '',
    typeFilter: localStorage.getItem(TYPE_FILTER_STORAGE_KEY) || 'ALL',
    showFreeTime: localStorage.getItem(FREE_TIME_STORAGE_KEY) === 'true', // Saved free time preference
    theme: localStorage.getItem(THEME_STORAGE_KEY) || 'dark',
    selectedEvent: null
  };

  function isCMoEvent(event) {
    if (!event) return false;
    const type = (event.typecours || '').toUpperCase();
    const loc = (event.location || '').toUpperCase();
    const sum = (event.summary || '').toUpperCase();
    const title = (event.title || '').toUpperCase();
    return (
      type === 'CMO' ||
      type === 'CAO' ||
      type.includes('CMO') ||
      loc.includes('ZOOM') ||
      loc.includes('ONLINE') ||
      loc.includes('DISTANCIEL') ||
      sum.includes('[CMO]') ||
      sum.includes('[CAO]') ||
      title.includes('[CMO]')
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

  // --- ICS Parser (Filters out data before Rentrée 2026) ---
  function parseICS(icsContent, calendarId, defaultName) {
    if (!icsContent) return { name: defaultName, classLetter: null, events: [] };

    // Unfold multi-line strings
    const unfolded = icsContent
      .replace(/\r\n[ \t]/g, '')
      .replace(/\n[ \t]/g, '')
      .replace(/\r/g, '');

    // Extract calendar name
    let calName = defaultName;
    const nameMatch = unfolded.match(/^X-WR-CALNAME:(.+)$/m);
    if (nameMatch) {
      calName = nameMatch[1]
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/^Calendrier\s+/i, '')
        .trim();
    }

    const eventBlocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const events = [];

    for (let i = 0; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const parsed = parseVEvent(block, calendarId);

      // Keep only events from rentrée 2026 onwards
      if (parsed && parsed.startDate && parsed.endDate) {
        if (parsed.startDate >= RENTREE_2026_START) {
          events.push(parsed);
        }
      }
    }

    // Extract class letter from parsed events
    const classLetter = extractClassLetterFromEvents(events);

    return { name: calName, classLetter, events };
  }

  function parseVEvent(block, calendarId) {
    function getField(fieldName) {
      const regex = new RegExp(`^${fieldName}(?:;[^:]*)?:(.*)$`, 'm');
      const m = block.match(regex);
      if (!m) return '';
      return m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
        .trim();
    }

    const rawSummary = getField('SUMMARY');
    const rawDtStart = getField('DTSTART');
    const rawDtEnd = getField('DTEND');
    const location = getField('LOCATION');
    const prof = getField('PROF');
    const title = getField('TITLE') || rawSummary;
    const typecours = getField('TYPECOURS') || extractTypeFromSummary(rawSummary);
    const groupe = getField('GROUPE');
    const description = getField('DESCRIPTION');
    const uid = getField('UID') || `evt_${Math.random().toString(36).substr(2, 9)}`;

    const startDate = parseICSDate(rawDtStart);
    const endDate = parseICSDate(rawDtEnd);

    if (!startDate || !endDate) return null;

    // Clean summary title
    let cleanTitle = title;
    if (!cleanTitle && rawSummary) {
      cleanTitle = rawSummary.replace(/^\[[^\]]+\]/, '').trim();
    }

    return {
      id: `${calendarId}_${uid}_${rawDtStart}`,
      uid,
      calendarId,
      summary: rawSummary,
      title: cleanTitle || rawSummary || 'Sans titre',
      startDate,
      endDate,
      location: location || '',
      prof: prof || '',
      typecours: typecours || 'AUTRE',
      groupe: groupe || '',
      description: description || '',
      rawDtStart,
      rawDtEnd
    };
  }

  function parseICSDate(str) {
    if (!str) return null;
    const cleanStr = str.replace(/^.*:/, '').trim();
    const m = cleanStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!m) return null;

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const hours = m[4] ? parseInt(m[4], 10) : 0;
    const minutes = m[5] ? parseInt(m[5], 10) : 0;
    const seconds = m[6] ? parseInt(m[6], 10) : 0;

    return new Date(year, month, day, hours, minutes, seconds);
  }

  function extractTypeFromSummary(summary) {
    if (!summary) return '';
    const match = summary.match(/\[([A-Za-z0-9_]+)\]$/) || summary.match(/\[([A-Za-z0-9_]+)\]/);
    if (match) return match[1];
    return '';
  }

  // --- LocalStorage Persistence ---
  function saveToLocalStorage() {
    try {
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
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          location: e.location,
          prof: e.prof,
          typecours: e.typecours,
          groupe: e.groupe,
          description: e.description
        }))
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde locale :', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((cal, idx) => ({
        id: cal.id || `cal_${idx}`,
        name: cal.name || `Calendrier ${idx + 1}`,
        classLetter: cal.classLetter || null,
        colorIndex: typeof cal.colorIndex === 'number' ? cal.colorIndex : idx % CALENDAR_PALETTES.length,
        enabled: cal.enabled !== false,
        events: (cal.events || []).map(e => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate)
        }))
      }));
    } catch (e) {
      console.warn('Erreur lors de la lecture du stockage local :', e);
      return [];
    }
  }

  // --- Calendar Management (Add / Remove) ---
  function getNextColorIndex() {
    const usedIndices = new Set(state.calendars.map(c => c.colorIndex));
    for (let i = 0; i < MAX_CALENDARS; i++) {
      if (!usedIndices.has(i)) return i;
    }
    return state.calendars.length % CALENDAR_PALETTES.length;
  }

  function addCalendarFromICS(icsContent, filename) {
    if (state.calendars.length >= MAX_CALENDARS) {
      showToast(`Limite atteinte : Vous comparez déjà le maximum de ${MAX_CALENDARS} calendriers.`);
      return false;
    }

    const calId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fallbackName = filename ? filename.replace(/\.ics$/i, '') : `Calendrier ${state.calendars.length + 1}`;
    const parsed = parseICS(icsContent, calId, fallbackName);

    if (parsed.events.length === 0) {
      showToast(`⚠️ Aucun cours trouvé à partir de la rentrée 2026 dans "${filename}". Les données passées ont été ignorées.`);
      return false;
    }

    const colorIndex = getNextColorIndex();
    const newCal = {
      id: calId,
      name: parsed.name || fallbackName,
      classLetter: parsed.classLetter,
      colorIndex: colorIndex,
      enabled: true,
      events: parsed.events
    };

    state.calendars.push(newCal);
    saveToLocalStorage();
    ensureValidStartingDate();
    render();

    const classMsg = newCal.classLetter ? ` (Classe ${newCal.classLetter})` : '';
    showToast(`✅ "${newCal.name}"${classMsg} ajouté avec succès (${newCal.events.length} cours) !`);
    return true;
  }

  function removeCalendar(calId) {
    const target = state.calendars.find(c => c.id === calId);
    if (!target) return;

    state.calendars = state.calendars.filter(c => c.id !== calId);
    saveToLocalStorage();
    render();
    showToast(`🗑️ Calendrier "${target.name}" supprimé de la comparaison.`);
  }

  function clearAllCalendars() {
    if (state.calendars.length === 0) return;
    if (!confirm('Voulez-vous vraiment retirer tous les calendriers de la comparaison ?')) return;

    state.calendars = [];
    saveToLocalStorage();
    render();
    showToast('🗑️ Tous les calendriers ont été retirés.');
  }

  // --- Date / Period Helpers ---
  function getMonday(d) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Returns 6 days: Monday to Saturday (excludes Sunday)
  function getWeekDays6(monday) {
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

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

  function getISOWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }

  function ensureValidStartingDate() {
    const allEvents = state.calendars.flatMap(c => c.events);
    if (allEvents.length === 0) {
      state.currentDate = new Date(2026, 8, 1);
      return;
    }

    const today = new Date();
    // Check if today is in the future/present academic term and has events
    if (today >= RENTREE_2026_START) {
      const todayMonday = getMonday(today);
      const weekDays = getWeekDays6(todayMonday);
      const hasTodayEvents = allEvents.some(e => weekDays.some(d => isSameDay(e.startDate, d)));
      if (hasTodayEvents) {
        state.currentDate = today;
        return;
      }
    }

    // Default to the first available event in 2026
    let minDate = allEvents[0].startDate;
    for (const ev of allEvents) {
      if (ev.startDate < minDate) minDate = ev.startDate;
    }
    state.currentDate = new Date(minDate);
  }

  // --- Rendering Pipeline ---
  function render() {
    renderHeaderInfo();
    renderCalendarChips();
    renderCalendarGrid();
    renderWeeklyStats();
    renderModalCalendarList();
    updateHeaderBadges();
  }

  function updateHeaderBadges() {
    const count = state.calendars.length;
    const badge = document.getElementById('headerCalCountBadge');
    if (badge) badge.textContent = `${count}/${MAX_CALENDARS}`;

    const modalCount = document.getElementById('modalCalCount');
    if (modalCount) modalCount.textContent = count;
  }

  function renderHeaderInfo() {
    const titleEl = document.getElementById('currentPeriodTitle');
    const rangeEl = document.getElementById('currentPeriodRange');
    const datePicker = document.getElementById('periodDatePicker');

    if (state.viewType === 'week') {
      const monday = getMonday(state.currentDate);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      const weekNum = getISOWeekNumber(monday);

      if (titleEl) {
        titleEl.textContent = `Semaine ${weekNum} • ${MONTHS_FR[monday.getMonth()]}`;
      }
      if (rangeEl) {
        rangeEl.textContent = `Du ${monday.getDate()} au ${saturday.getDate()} ${MONTHS_FR[saturday.getMonth()].toLowerCase()} ${saturday.getFullYear()}`;
      }
    } else {
      // Day View
      const dayIndex = (state.currentDate.getDay() + 6) % 7;
      const dayName = dayIndex < 6 ? DAYS_FR_6[dayIndex] : 'Dimanche';
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
    const wrapperEl = document.getElementById('calendarChipsWrapper');
    const collapseIcon = document.getElementById('chipsCollapseIcon');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (wrapperEl) {
      wrapperEl.classList.toggle('collapsed', !!state.chipsCollapsed);
    }
    if (collapseIcon) {
      collapseIcon.className = state.chipsCollapsed ? 'ph-bold ph-caret-right' : 'ph-bold ph-caret-down';
    }

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
      const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
      const chip = document.createElement('div');
      chip.className = `calendar-chip ${!cal.enabled ? 'disabled' : ''}`;
      chip.style.setProperty('--cal-primary', palette.primary);
      chip.style.setProperty('--cal-border', palette.border);
      chip.style.setProperty('--cal-bg', palette.bg);
      chip.style.setProperty('--cal-bg-hover', palette.bgHover);
      chip.style.setProperty('--cal-text', palette.text);

      const classBadge = cal.classLetter ? `<span class="chip-class-tag" title="Classe ${escapeHTML(cal.classLetter)}">${escapeHTML(cal.classLetter)}</span>` : '';

      chip.innerHTML = `
        <button class="chip-main-click" title="Cliquer pour afficher ou masquer ce calendrier">
          <span class="chip-dot"></span>
          <span class="chip-name" title="${escapeHTML(cal.name)}">${escapeHTML(cal.name)}</span>
          ${classBadge}
          <span class="chip-event-count">${cal.events.length}</span>
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
      const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
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
    const emptyContainer = document.getElementById('emptyStateContainer');
    const scrollContainer = document.getElementById('calendarGridScroll');
    const headerContainer = document.getElementById('calendarDaysHeader');
    const gridBody = document.getElementById('calendarGridBody');
    if (!scrollContainer || !headerContainer || !gridBody) return;

    if (state.calendars.length === 0) {
      if (emptyContainer) emptyContainer.style.display = 'flex';
      scrollContainer.style.display = 'none';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';
    scrollContainer.style.display = '';
    headerContainer.innerHTML = '';
    gridBody.innerHTML = '';

    if (state.viewType === 'week') {
      renderWeekView(headerContainer, gridBody);
    } else {
      renderDayView(headerContainer, gridBody);
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

  // --- 1. Render Week View (6 Days: Lundi à Samedi) ---
  function renderWeekView(headerContainer, gridBody) {
    headerContainer.classList.remove('day-view-mode');
    gridBody.classList.remove('day-view-mode');
    headerContainer.style.gridTemplateColumns = '';
    gridBody.style.gridTemplateColumns = '';

    const monday = getMonday(state.currentDate);
    const weekDays = getWeekDays6(monday);
    const today = new Date();
    const enabledCals = state.calendars.filter(c => c.enabled);
    const numEnabled = enabledCals.length;
    const isCompactMode = numEnabled > 2; // When > 2 calendars compared, use simplified colored blocks!

    // Header Time Axis Cell
    headerContainer.innerHTML = '<div class="time-axis-header-cell"><i class="ph ph-clock"></i> Heures</div>';

    // 6 Day Header Cells
    weekDays.forEach((day, index) => {
      const isToday = isSameDay(day, today);
      const dayEvents = getEventsForDay(day);

      const dayCell = document.createElement('div');
      dayCell.className = `day-header-cell ${isToday ? 'is-today' : ''}`;
      dayCell.innerHTML = `
        <span class="day-name">${DAYS_FR_6[index]}</span>
        <span class="day-date">${day.getDate()}</span>
        <span class="day-events-count">${dayEvents.length} cours</span>
      `;
      headerContainer.appendChild(dayCell);
    });

    // Time Axis Column
    gridBody.appendChild(createTimeAxisColumn());

    // 6 Day Columns
    weekDays.forEach((day) => {
      const isToday = isSameDay(day, today);
      const dayCol = document.createElement('div');
      dayCol.className = `day-column ${isToday ? 'is-today' : ''}`;
      dayCol.dataset.date = day.toISOString();

      // Background Hour Grid Lines (Full hours only - no cluttering half-hour lines)
      for (let h = 0; h < TOTAL_HOURS; h++) {
        const line = document.createElement('div');
        line.className = 'hour-grid-line';
        line.style.top = `${(h / TOTAL_HOURS) * 100}%`;
        dayCol.appendChild(line);
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
          dayCol.appendChild(indicator);
        }
      }

      // Render Common Free Time
      const dayEvents = getEventsForDay(day);
      if (state.showFreeTime && numEnabled > 0) {
        renderFreeTimeSlots(dayCol, dayEvents);
      }

      // Render Course Events in Sub-columns per Calendar
      if (numEnabled > 0) {
        enabledCals.forEach((cal, calIndex) => {
          const calEvents = dayEvents.filter(e => e.calendarId === cal.id);
          const subColWidth = 100 / numEnabled;
          const leftPercent = calIndex * subColWidth;

          calEvents.forEach(event => {
            const card = createEventCard(event, cal, isCompactMode);
            const { topPercent, heightPercent } = calculateCardPosition(event);

            card.style.top = `${topPercent}%`;
            card.style.height = `${heightPercent}%`;
            card.style.left = `calc(${leftPercent}% + 1px)`;
            card.style.width = `calc(${subColWidth}% - 2px)`;

            dayCol.appendChild(card);
          });
        });
      }

      gridBody.appendChild(dayCol);
    });
  }

  // --- 2. Render Day View (Jour par jour - Distinct Column per Calendar) ---
  function renderDayView(headerContainer, gridBody) {
    headerContainer.classList.add('day-view-mode');
    gridBody.classList.add('day-view-mode');

    const day = state.currentDate;
    const today = new Date();
    const isToday = isSameDay(day, today);
    const dayEvents = getEventsForDay(day);
    const enabledCals = state.calendars.filter(c => c.enabled);
    const numEnabled = enabledCals.length;
    const numCols = Math.max(1, numEnabled);

    // Explicit grid column template for Day View
    headerContainer.style.gridTemplateColumns = `60px repeat(${numCols}, minmax(0, 1fr))`;
    gridBody.style.gridTemplateColumns = `60px repeat(${numCols}, minmax(0, 1fr))`;

    // 1. Day Header: Time Axis Cell + 1 Lane Header Cell per Calendar
    headerContainer.innerHTML = '<div class="time-axis-header-cell"><i class="ph ph-clock"></i> Heures</div>';

    if (numEnabled === 0) {
      const emptyHeaderCell = document.createElement('div');
      emptyHeaderCell.className = 'day-lane-header-cell';
      emptyHeaderCell.innerHTML = `<span>Aucun calendrier sélectionné</span>`;
      headerContainer.appendChild(emptyHeaderCell);
    } else {
      enabledCals.forEach((cal) => {
        const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
        const calEvents = dayEvents.filter(e => e.calendarId === cal.id);

        const laneHeader = document.createElement('div');
        laneHeader.className = 'day-lane-header-cell';
        laneHeader.style.setProperty('--cal-primary', palette.primary);
        laneHeader.style.setProperty('--cal-border', palette.border);
        laneHeader.style.setProperty('--cal-bg', palette.bg);
        laneHeader.style.setProperty('--cal-text', palette.text);

        const letter = cal.classLetter || (cal.name ? cal.name.trim().charAt(0).toUpperCase() : '?');
        const classBadge = `<span class="chip-class-tag" style="background:${palette.badgeBg}; color:#fff;" title="${escapeHTML(cal.name)}">${escapeHTML(letter)}</span>`;

        laneHeader.innerHTML = `
          <div class="lane-header-inner">
            <span class="chip-dot" style="background:${palette.primary}; width:9px; height:9px; box-shadow:0 0 8px ${palette.primary};"></span>
            <span class="lane-cal-name" title="${escapeHTML(cal.name)}">${escapeHTML(cal.name)}</span>
            ${classBadge}
            <span class="lane-cal-count">(${calEvents.length})</span>
          </div>
        `;
        headerContainer.appendChild(laneHeader);
      });
    }

    // 2. Time Axis Column in Grid Body
    gridBody.appendChild(createTimeAxisColumn());

    // 3. Grid Columns in Body: 1 Dedicated Column per Calendar!
    if (numEnabled === 0) {
      const emptyCol = document.createElement('div');
      emptyCol.className = 'day-column day-cal-column';
      gridBody.appendChild(emptyCol);
    } else {
      const isMobile = window.innerWidth < 768;
      const isDayCompact = isMobile && numEnabled >= 4;

      enabledCals.forEach((cal) => {
        const calEvents = dayEvents.filter(e => e.calendarId === cal.id);

        const col = document.createElement('div');
        col.className = `day-column day-cal-column ${isToday ? 'is-today' : ''}`;
        col.dataset.calId = cal.id;

        // Background hour lines (Full hours only)
        for (let h = 0; h < TOTAL_HOURS; h++) {
          const line = document.createElement('div');
          line.className = 'hour-grid-line';
          line.style.top = `${(h / TOTAL_HOURS) * 100}%`;
          col.appendChild(line);
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
            col.appendChild(indicator);
          }
        }

        // Free time slots on this column if enabled (Empty green box in compact mode)
        if (state.showFreeTime) {
          renderFreeTimeSlots(col, dayEvents, isDayCompact);
        }

        // Render this calendar's events (Empty color boxes on mobile if >= 4 calendars, otherwise full details)
        calEvents.forEach(event => {
          const card = createEventCard(event, cal, isDayCompact);
          const { topPercent, heightPercent } = calculateCardPosition(event);

          card.style.top = `${topPercent}%`;
          card.style.height = `${heightPercent}%`;
          card.style.left = '4px';
          card.style.right = '4px';
          card.style.width = 'calc(100% - 8px)';

          col.appendChild(card);
        });

        gridBody.appendChild(col);
      });
    }
  }

  // --- Create Event Card Element ---
  function createEventCard(event, cal, isCompact) {
    const card = document.createElement('div');
    const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
    const isCMo = isCMoEvent(event);

    card.className = `calendar-event-card ${isCompact ? 'compact-block' : ''} ${state.dimCMo && isCMo ? 'is-cmo-dimmed' : ''}`;
    card.style.setProperty('--cal-primary', palette.primary);
    card.style.setProperty('--cal-border', palette.border);
    card.style.setProperty('--cal-bg', palette.bg);
    card.style.setProperty('--cal-bg-hover', palette.bgHover);
    card.style.setProperty('--cal-text', palette.text);

    const classStr = cal.classLetter ? ` [${cal.classLetter}]` : '';
    const cmoLabel = isCMo ? ' [Distanciel / CMo]' : '';
    const tooltipText = `${event.title}${cmoLabel}\n⏰ ${formatTimeFull(event.startDate)} - ${formatTimeFull(event.endDate)}\n📍 ${event.location || 'Salle non spécifiée'}\n👤 ${event.prof || 'Enseignant non spécifié'}\n👥 ${cal.name}${classStr}`;
    card.title = tooltipText;

    if (isCompact) {
      // Simplified sleek color block (Empty colored box as requested)
      card.innerHTML = '';
    } else {
      // Full detailed card
      card.innerHTML = `
        <div class="event-header-row">
          <span class="event-time-badge">${formatTimeFull(event.startDate)} - ${formatTimeFull(event.endDate)}</span>
          <span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span>
        </div>
        <div class="event-title" title="${escapeHTML(event.title)}">${escapeHTML(event.title)}</div>
        ${event.location ? `<div class="event-meta-row"><span class="event-location" title="${escapeHTML(event.location)}">📍 ${escapeHTML(event.location)}</span></div>` : ''}
        ${event.prof ? `<div class="event-meta-row"><span class="event-prof" title="${escapeHTML(event.prof)}">👤 ${escapeHTML(event.prof)}</span></div>` : ''}
        <div class="event-owners-badges">
          <span class="owner-pill" style="color:${palette.text};">
            <span class="chip-dot" style="width:6px; height:6px; background:${palette.primary};"></span>
            ${escapeHTML(cal.name.split(' ')[0])}${cal.classLetter ? ` (${cal.classLetter})` : ''}
          </span>
        </div>
      `;
    }

    card.addEventListener('click', () => openEventModal(event, cal));
    return card;
  }

  function calculateCardPosition(event) {
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
  function renderFreeTimeSlots(dayCol, dayEvents, isCompact = false) {
    if (dayEvents.length === 0) {
      const freeEl = document.createElement('div');
      freeEl.className = `free-slot-highlight ${isCompact ? 'compact-free-slot' : ''}`;
      freeEl.style.top = '5%';
      freeEl.style.height = '90%';
      freeEl.title = '✨ Journée 100% libre en commun';
      if (!isCompact) {
        freeEl.innerHTML = '<span>✨ Journée 100% libre en commun</span>';
      }
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

        const freeEl = document.createElement('div');
        freeEl.className = `free-slot-highlight ${isCompact ? 'compact-free-slot' : ''}`;
        freeEl.style.top = `${topP}%`;
        freeEl.style.height = `${heightP}%`;
        freeEl.title = `🟢 Libre (${durStr})`;
        if (!isCompact) {
          freeEl.innerHTML = `<span>🟢 Libre (${durStr})</span>`;
        }
        dayCol.appendChild(freeEl);
      }
      prevEnd = Math.max(prevEnd, slot.end);
    });

    if (gridEnd - prevEnd >= 45) {
      const topP = ((prevEnd - gridStart) / TOTAL_MINUTES) * 100;
      const heightP = ((gridEnd - prevEnd) / TOTAL_MINUTES) * 100;
      const durStr = formatDuration(gridEnd - prevEnd);

      const freeEl = document.createElement('div');
      freeEl.className = `free-slot-highlight ${isCompact ? 'compact-free-slot' : ''}`;
      freeEl.style.top = `${topP}%`;
      freeEl.style.height = `${heightP}%`;
      freeEl.title = `🟢 Libre (${durStr})`;
      if (!isCompact) {
        freeEl.innerHTML = `<span>🟢 Libre (${durStr})</span>`;
      }
      dayCol.appendChild(freeEl);
    }
  }

  // --- Weekly Stats Summary ---
  function renderWeeklyStats() {
    const statsPill = document.getElementById('statsSummaryPill');
    if (!statsPill) return;

    const enabledCals = state.calendars.filter(c => c.enabled);
    if (enabledCals.length === 0) {
      statsPill.style.display = 'none';
      return;
    }

    statsPill.style.display = 'flex';

    const monday = getMonday(state.currentDate);
    const weekDays = getWeekDays6(monday);

    let html = '';
    enabledCals.forEach((cal) => {
      let totalMin = 0;
      weekDays.forEach(day => {
        const events = cal.events.filter(e => isSameDay(e.startDate, day));
        events.forEach(e => {
          totalMin += (e.endDate - e.startDate) / 60000;
        });
      });

      const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
      html += `
        <span class="stat-item" style="color:${palette.primary};">
          <span class="chip-dot" style="display:inline-block; width:6px; height:6px; background:${palette.primary};"></span>
          ${escapeHTML(cal.name.split(' ')[0])}: <strong>${formatDuration(totalMin)}</strong>
        </span>
      `;
    });

    statsPill.innerHTML = html;
  }

  // --- Empty State Hero ---
  function renderEmptyStateHero(gridBody) {
    const hero = document.createElement('div');
    hero.className = 'empty-state-hero';
    hero.innerHTML = `
      <div class="empty-state-hero-icon">
        <i class="ph-bold ph-calendar-plus"></i>
      </div>
      <h2>Co-op Calendar</h2>
      <p>
        Compare jusqu'à <strong>10 emplois du temps .ics</strong> à partir de <strong>2026</strong>. Détecte automatiquement les créneaux communs & les temps libres.
      </p>
      <div class="empty-state-hero-badges">
        <span class="hero-pill">🏷️ Détection de classe</span>
        <span class="hero-pill">💾 Sauvegarde 100% locale</span>
        <span class="hero-pill">📅 Vue Semaine & Jour</span>
      </div>
      <button class="btn-primary-add" id="btnHeroAddCalendar" style="margin-top:8px; font-size:0.9rem; padding:10px 22px;">
        <i class="ph-bold ph-plus-circle" style="font-size:20px;"></i>
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

    const palette = CALENDAR_PALETTES[cal.colorIndex % CALENDAR_PALETTES.length];
    const dayIndex = (event.startDate.getDay() + 6) % 7;
    const dayName = dayIndex < 6 ? DAYS_FR_6[dayIndex] : 'Dimanche';

    modalTitle.innerHTML = `
      <span class="chip-dot" style="background:${palette.primary}; box-shadow:0 0 10px ${palette.primary}; width:12px; height:12px;"></span>
      ${escapeHTML(event.title)}
    `;

    modalSubtitle.innerHTML = `
      ${dayName} ${event.startDate.getDate()} ${MONTHS_FR[event.startDate.getMonth()]} ${event.startDate.getFullYear()} &bull; 
      <strong>${escapeHTML(cal.name)}</strong>${cal.classLetter ? ` (Classe ${escapeHTML(cal.classLetter)})` : ''}
    `;

    modalBody.innerHTML = `
      <div class="detail-section-grid">
        <div class="detail-item-box">
          <span class="detail-label">Horaire & Durée</span>
          <span class="detail-value">⏰ ${formatTimeFull(event.startDate)} - ${formatTimeFull(event.endDate)} (${formatDuration((event.endDate - event.startDate) / 60000)})</span>
        </div>
        <div class="detail-item-box">
          <span class="detail-label">Type de cours</span>
          <span class="detail-value"><span class="event-type-badge type-${escapeHTML(event.typecours)}">${escapeHTML(event.typecours)}</span></span>
        </div>
        <div class="detail-item-box full-width">
          <span class="detail-label">Salle / Emplacement</span>
          <span class="detail-value">📍 ${escapeHTML(event.location || 'Salle non spécifiée')}</span>
        </div>
        ${event.prof ? `
          <div class="detail-item-box full-width">
            <span class="detail-label">Enseignant / Intervenant</span>
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
          <span class="detail-label">Description / Lien Visio</span>
          <div class="detail-value" style="font-size:0.8rem; word-break:break-all;">
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
      ics.push(`UID:synccal-${e.uid}`);
      ics.push(`SUMMARY:${e.summary}`);
      ics.push(`DTSTART:${toICSDate(e.startDate)}`);
      ics.push(`DTEND:${toICSDate(e.endDate)}`);
      if (e.location) ics.push(`LOCATION:${e.location}`);
      let desc = e.description || '';
      if (cal) desc = `Calendrier: ${cal.name}${cal.classLetter ? ` (Classe ${cal.classLetter})` : ''}\\n${desc}`;
      if (e.prof) desc = `Enseignant: ${e.prof}\\n${desc}`;
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

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // 1. Navigation: Prev / Next / Today
    document.getElementById('btnPrevDate')?.addEventListener('click', () => {
      if (state.viewType === 'week') {
        state.currentDate.setDate(state.currentDate.getDate() - 7);
      } else {
        state.currentDate.setDate(state.currentDate.getDate() - 1);
        // If Sunday, jump to Saturday
        if (state.currentDate.getDay() === 0) {
          state.currentDate.setDate(state.currentDate.getDate() - 1);
        }
      }
      render();
    });

    document.getElementById('btnNextDate')?.addEventListener('click', () => {
      if (state.viewType === 'week') {
        state.currentDate.setDate(state.currentDate.getDate() + 7);
      } else {
        state.currentDate.setDate(state.currentDate.getDate() + 1);
        // If Sunday, jump to Monday
        if (state.currentDate.getDay() === 0) {
          state.currentDate.setDate(state.currentDate.getDate() + 1);
        }
      }
      render();
    });

    document.getElementById('btnToday')?.addEventListener('click', () => {
      const today = new Date();
      state.currentDate = today < RENTREE_2026_START ? new Date(2026, 8, 1) : today;
      render();
    });

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
        state.currentDate = new Date(e.target.value);
        render();
      }
    });

    // View Switcher (Week / Day)
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.viewType = btn.dataset.view;
        localStorage.setItem(VIEW_TYPE_STORAGE_KEY, state.viewType);
        render();
      });
    });

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

    // Toggle Comparison Chips Collapse/Expand
    document.getElementById('btnToggleChipsCollapse')?.addEventListener('click', () => {
      state.chipsCollapsed = !state.chipsCollapsed;
      localStorage.setItem(CHIPS_COLLAPSED_STORAGE_KEY, state.chipsCollapsed);
      renderCalendarChips();
    });

    
    // --- Toolbar Toggle (Options Visibles / Masquées) ---
    document.getElementById('btnToggleToolbarCollapse')?.addEventListener('click', () => {
      state.showToolbar = !state.showToolbar;
      localStorage.setItem(SHOW_TOOLBAR_STORAGE_KEY, state.showToolbar);
      updateToolbarState();
      showToast(state.showToolbar ? 'Options de configuration affichées 🛠️' : 'Options masquées 🧘 (Mode épuré)');
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
      if (e.target.closest('#btnHeroAddCalendar, #btnOpenAddModal, #btnQuickAddChip, .hero-add-btn')) {
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

    // Toggle Dim CMo / Online Courses
    document.getElementById('btnToggleDimCMo')?.addEventListener('click', function () {
      state.dimCMo = !state.dimCMo;
      localStorage.setItem(DIM_CMO_STORAGE_KEY, state.dimCMo);
      this.classList.toggle('active', state.dimCMo);
      render();
      showToast(state.dimCMo ? 'Cours en distanciel (CMo) atténués 🌫️' : 'Cours en distanciel (CMo) affichés normalement 👁️');
    });

    // Free Time Toggle
    document.getElementById('btnToggleFreeTime')?.addEventListener('click', function () {
      state.showFreeTime = !state.showFreeTime;
      localStorage.setItem(FREE_TIME_STORAGE_KEY, state.showFreeTime);
      this.classList.toggle('active', state.showFreeTime);
      this.style.borderColor = state.showFreeTime ? 'var(--accent-emerald)' : '';
      this.style.color = state.showFreeTime ? 'var(--accent-emerald)' : '';
      render();
      showToast(state.showFreeTime ? '✨ Créneaux libres communs affichés 🟢' : 'Créneaux libres masqués');
    });

    // Theme Toggle
    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      setupTheme();
      render();
    });

    // Print Button
    document.getElementById('btnPrint')?.addEventListener('click', () => {
      window.print();
    });

    // Export Merged ICS Button
    document.getElementById('btnExportICS')?.addEventListener('click', exportMergedICS);

    // Open Add Calendar Modal
    document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
      document.getElementById('addCalendarModalBackdrop')?.classList.add('open');
    });

    // Clear All Calendars in Modal
    document.getElementById('btnClearAllCalendars')?.addEventListener('click', clearAllCalendars);

    // Close Modal buttons
    document.querySelectorAll('.modal-close-btn, #btnCloseAddModalBtn, #btnCloseEventModalBtn, #btnCloseLegalModalBtn, #btnCloseLegalModalFooterBtn').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeAllModals();
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllModals();
      if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        document.getElementById('btnPrevDate')?.click();
      } else if (e.key === 'ArrowRight') {
        document.getElementById('btnNextDate')?.click();
      } else if (e.key === 't' || e.key === 'T') {
        document.getElementById('btnToday')?.click();
      }
    });

    // Window Resize Handler (Debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        render();
      }, 150);
    });

    // Setup Drag & Drop and File Input Handlers
    setupFileHandlers();
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
      btn.title = state.showToolbar ? 'Masquer les options de configuration 🧘' : 'Afficher les options de configuration 🛠️';
      btn.setAttribute('aria-expanded', state.showToolbar ? 'true' : 'false');
    }
  }

  // --- Theme Setup ---
  function setupTheme() {
    if (!document.body) return;
    if (state.theme === 'light') {
      document.body.classList.add('light-theme');
      const icon = document.querySelector('#btnThemeToggle i');
      if (icon) icon.className = 'ph ph-moon';
    } else {
      document.body.classList.remove('light-theme');
      const icon = document.querySelector('#btnThemeToggle i');
      if (icon) icon.className = 'ph ph-sun';
    }
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

  // --- PWA Service Worker & Install Flow ---
  let deferredInstallPrompt = null;

  function setupPwa() {
    // 1. Register Service Worker for Offline Caching
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(registration => {
            console.log('[PWA] Service Worker registered successfully:', registration.scope);
          })
          .catch(error => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });
    }

    const btnInstall = document.getElementById('btnPwaInstall');

    // 2. Intercept beforeinstallprompt for Android, Windows, macOS, Linux, ChromeOS
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstall) {
        btnInstall.style.display = 'inline-flex';
      }
    });

    // 3. Handle Install Button Click
    btnInstall?.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          showToast('Installation de Co-op Calendar en cours... 📲');
        }
        deferredInstallPrompt = null;
        btnInstall.style.display = 'none';
      } else {
        // iOS Safari Helper
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          showToast("📲 Pour installer sur iPhone/iPad : touchez Partager ⎋ puis 'Sur l'écran d'accueil' ➕");
        } else {
          showToast("📲 Ouvrez le menu de votre navigateur et choisissez 'Installer l'application'");
        }
      }
    });

    // 4. Track successful install
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (btnInstall) btnInstall.style.display = 'none';
      showToast('🎉 Co-op Calendar est maintenant installée sur votre appareil !');
    });
  }

  // --- Version Badge Updater ---
  function updateVersionBadge() {
    const badgeSpan = document.querySelector('#app > header > div.brand-section > div.brand-text > h1 > span, .badge-version');
    if (badgeSpan) {
      badgeSpan.textContent = APP_VERSION;
    }
  }

  // --- App Initialization ---
  function initApp() {
    updateVersionBadge();
    setupTheme();
    updateToolbarState();
    setupEventListeners();
    setupPwa();

    // Load saved calendars from LocalStorage
    state.calendars = loadFromLocalStorage();

    // Ensure valid starting date
    ensureValidStartingDate();

    // Initial Render
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
