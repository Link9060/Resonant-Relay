(() => {
  if (window.ArrowOS) { window.ArrowOS.mountAll(); return; }
  const STORAGE = {
    links: 'arrow_os_links_v1',
    theme: 'arrow_os_theme_v1',
    motion: 'arrow_os_motion_v1',
    accent: 'arrow_os_accent_v1',
    customAccent: 'arrow_os_custom_accent_v1',
    adaptPalettes: 'arrow_os_adapt_palettes_v1',
    adaptCustomColors: 'arrow_os_adapt_custom_colors_v1',
    experience: 'arrow_os_experience_v1',
    adapt: 'arrow_os_adapt_v1',
    focusMinutes: 'arrow_os_focus_minutes_v1',
    focusState: 'arrow_os_focus_state_v1',
  };

  const BETA_BASE = location.hostname === 'link9060.github.io' && location.pathname.startsWith('/Resonant-Relay/') ? '/Resonant-Relay/arrow' : '';
  function resolveHref(href) {
    const url=new URL(href,location.origin);
    if(!BETA_BASE)return url.toString();
    const aliases={'Resonant-Orbit':'orbit','Resonant-Waypoint':'waypoint','Resonant-Field':'atlas','Project-R.A.V.I.N.-1.1':'ravin'};
    if(url.hostname==='link9060.github.io'){const first=url.pathname.split('/')[1];if(aliases[first])url.pathname='/'+aliases[first]+url.pathname.slice(first.length+1);}
    if((url.origin===location.origin || ['enterarrow.com','www.enterarrow.com','link9060.github.io'].includes(url.hostname)) && /^\/(orbit|relay|ravin|atlas|waypoint)(\/|$)/.test(url.pathname)) {
      const path=url.pathname.startsWith('/relay')?'/Resonant-Relay'+url.pathname.slice(6):BETA_BASE+url.pathname;
      return new URL(path+url.search+url.hash,location.origin).toString();
    }
    return url.toString();
  }

  const ON_ENTERARROW = ['enterarrow.com', 'www.enterarrow.com'].includes(window.location.hostname);
  const ORBIT_URL = BETA_BASE ? BETA_BASE+'/orbit/' : ON_ENTERARROW ? '/orbit/' : 'https://link9060.github.io/Resonant-Orbit/';
  const WAYPOINT_URL = BETA_BASE ? BETA_BASE+'/waypoint/' : ON_ENTERARROW ? '/waypoint/' : 'https://link9060.github.io/Resonant-Waypoint/';
  const RELAY_URL = BETA_BASE ? '/Resonant-Relay/' : ON_ENTERARROW ? '/relay/' : 'https://link9060.github.io/Resonant-Relay/';
  const RAVIN_URL = BETA_BASE ? BETA_BASE+'/ravin/' : ON_ENTERARROW ? '/ravin/' : 'https://link9060.github.io/Project-R.A.V.I.N.-1.1/';
  const CHANNEL_LINK = BETA_BASE
    ? '<a class="arrow-os-control arrow-os-channel-link" data-arrow-channel href="https://enterarrow.com/" aria-label="Back to public ARROW"><span>↗ Public site</span></a>'
    : '<a class="arrow-os-control arrow-os-channel-link" data-arrow-channel href="https://link9060.github.io/Resonant-Relay/beta-access/" aria-label="Request or access ARROW Beta"><span>↗ Beta access</span></a>';
  const SIGNOUT_URL = BETA_BASE ? '/Resonant-Relay/login/' : ON_ENTERARROW ? '/signout/' : '';

  document.addEventListener('click', event => {if(!BETA_BASE)return;const link=event.target.closest?.('a[href]');if(link && !link.hasAttribute('data-arrow-channel'))link.href=resolveHref(link.href);},true);

  // Public client credentials only. User ownership is enforced by Supabase RLS.
  const ARROW_SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const ARROW_SUPABASE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const ARROW_AUTH_STORAGE_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';
  const VALID_MODULES = new Set(['relay', 'orbit', 'atlas', 'ravin', 'waypoint']);
  const PANEL_LABELS = {
    ravin: 'RAVIN',
    notes: 'Notes',
    tasks: 'Tasks',
    focus: 'Focus',
    calendar: 'Calendar',
    links: 'Links',
    appearance: 'Appearance',
    settings: 'Settings',
    notifications: 'Notifications',
    support: 'ARROW support',
    moderation: 'ARROW staff',
  };

  const ACCENTS = [
    ['mono', 'Monochrome', '#f3f3f4'],
    ['cobalt', 'Cobalt', '#2f6fed'],
    ['violet', 'Violet', '#7c3aed'],
    ['rose', 'Rose', '#e11d48'],
    ['cyan', 'Cyan', '#0891b2'],
    ['emerald', 'Emerald', '#059669'],
    ['amber', 'Amber', '#d97706'],
  ];

  // Adapt is independent of the existing ARROW motion and palette settings.
  const ADAPT_CHOICES = [
    ['core', 'Core'], ['bloom', 'Bloom'], ['haven', 'Haven'],
    ['atelier', 'Atelier'], ['pulse', 'Pulse'],
  ];
  // Each identity owns an independent palette. Paired swatches become gradient
  // surfaces across the suite; Core retains its original bold accent options.
  const ADAPT_PALETTES = {
    core: [
      ...ACCENTS.map(([id,label,color]) => [id,label,color,color]),
      ['scarlet','Scarlet','#dc2626','#f97316'],
      ['fuchsia','Fuchsia','#c026d3','#8b5cf6'],
      ['orange','Orange','#ea580c','#facc15'],
      ['electric','Electric blue','#2563eb','#22d3ee'],
    ],
    bloom: [
      ['petal','Rosewater','#ad477f','#efbad4'],
      ['lilac','Lilac dream','#8362ba','#d8b8ed'],
      ['peach','Peach blossom','#ba6b58','#f5c2a5'],
      ['periwinkle','Bluebell','#5f7bb3','#bcd5f7'],
      ['orchid','Orchid mist','#995aa3','#ebb5e7'],
      ['meadow','Mint bloom','#438e82','#b8e4ce'],
    ],
    haven: [
      ['sage','Sage valley','#4b7764','#a9c29c'],
      ['forest','Evergreen','#32634a','#86a884'],
      ['clay','Terracotta','#a45e4b','#e0ad8c'],
      ['dune','Desert sand','#93724e','#d5bf98'],
      ['lake','Stillwater','#427f8e','#b3d8d8'],
      ['moss','Moss & honey','#657746','#d3bd70'],
    ],
    atelier: [
      ['champagne','Champagne','#94723f','#d5bd8d'],
      ['ink','Midnight ink','#33415d','#8b9ab2'],
      ['burgundy','Burgundy','#792f49','#caa0aa'],
      ['espresso','Espresso','#684b3f','#c1a68f'],
      ['copper','Copper atelier','#a56a45','#e5af80'],
      ['graphite','Graphite','#62636f','#a7a8b5'],
    ],
    pulse: [
      ['voltage','Voltage','#854dff','#00d4ff'],
      ['hyperpop','Hyperpop','#f02c91','#8e65ff'],
      ['laser','Laser cyan','#008dab','#8cffd4'],
      ['afterburn','Afterburn','#ef533b','#f7b955'],
      ['neon','Neon arcade','#667f16','#e0fa5b'],
      ['ultraviolet','Ultraviolet','#6335d5','#e04de5'],
    ],
  };
  const PALETTE_LEGACY = {
    bloom:'rose', haven:'emerald', atelier:'amber', pulse:'pulse', core:'monochrome',
  };
  const state = {
    instances: new Set(),
    renderVersion: 0,
    activePanel: null,
    activeModule: null,
    panelEl: null,
    panelBody: null,
    panelTitle: null,
    lastFocused: null,
    panelAnchor: null,
    focusTimer: null,
    focusRemaining: 25 * 60,
    focusRunning: false,
    focusUpdatedAt: 0,
    arrivalHandled: false,
    departing: false,
  };

  function id() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    window.dispatchEvent(new CustomEvent('arrow-os:datachange', { detail: { key, value } }));
  }

  function readString(key, fallback = '') {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeString(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
    window.dispatchEvent(new CustomEvent('arrow-os:datachange', { detail: { key, value } }));
  }

  function readArrowSession() {
    try {
      const session = JSON.parse(localStorage.getItem(ARROW_AUTH_STORAGE_KEY) || 'null');
      return session && typeof session.access_token === 'string' ? session : null;
    } catch {
      return null;
    }
  }

  function saveArrowSession(session) {
    try { localStorage.setItem(ARROW_AUTH_STORAGE_KEY, JSON.stringify(session)); } catch {}
  }

  async function refreshArrowSession(session) {
    if (!session?.refresh_token) return null;
    if (window.__arrowSessionRefreshPromise && window.__arrowSessionRefreshToken === session.refresh_token) return window.__arrowSessionRefreshPromise;
    window.__arrowSessionRefreshToken=session.refresh_token;
    window.__arrowSessionRefreshPromise = (async () => {
      const response = await fetch(ARROW_SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', signal: AbortSignal.timeout(15000), headers: { apikey: ARROW_SUPABASE_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!response.ok) return null;
      const fresh = await response.json();
      const merged = { ...session, ...fresh, user: fresh.user || session.user };
      if(readArrowSession()?.refresh_token !== session.refresh_token) throw new Error('Your ARROW account changed. Open this panel again.');
      saveArrowSession(merged); return merged;
    })();
    const pending=window.__arrowSessionRefreshPromise;
    try { return await pending; }
    finally { if(window.__arrowSessionRefreshPromise===pending) window.__arrowSessionRefreshPromise = null; }
  }

  async function arrowData(pathname, options = {}, retry = true) {
    let session = readArrowSession();
    if (!session?.access_token) {
      const error = new Error('Sign in to ARROW to use shared data.');
      error.code = 'ARROW_AUTH_REQUIRED';
      throw error;
    }
    const accountId=session.user?.id;
    if (session.expires_at && Number(session.expires_at) * 1000 < Date.now() + 30000) {
      session = await refreshArrowSession(session) || session;
    }

    if(readArrowSession()?.user?.id !== accountId) throw new Error('Your ARROW account changed. Open this panel again.');
    const headers = {
      apikey: ARROW_SUPABASE_KEY,
      Authorization: 'Bearer ' + session.access_token,
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(ARROW_SUPABASE_URL + pathname, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });

    if(readArrowSession()?.user?.id !== accountId) throw new Error('Your ARROW account changed. Open this panel again.');
    if (response.status === 401 && retry) {
      const fresh = await refreshArrowSession(session);
      if (fresh) return arrowData(pathname, options, false);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || payload?.error || 'ARROW data could not load.');
    }

    if (!options.readOnly && (options.method || 'GET').toUpperCase() !== 'GET') {
      try { localStorage.setItem('arrow_shared_data_ping_v1', String(Date.now())); } catch {}
      window.dispatchEvent(new CustomEvent('arrow:planning-changed'));
    }

    if (response.status === 204) return null;
    const text = await response.text();
    if(readArrowSession()?.user?.id !== accountId) throw new Error('Your ARROW account changed. Open this panel again.');
    return text ? JSON.parse(text) : null;
  }

  function currentArrowUserId() {
    return readArrowSession()?.user?.id || null;
  }

  function sharedDataError(error) {
    const signIn = error?.code === 'ARROW_AUTH_REQUIRED'
      ? '<a href="' + escapeAttr(ORBIT_URL) + '">Open ARROW sign in ↗</a>'
      : '';
    return '<div class="arrow-os-empty"><strong>Shared ARROW data is unavailable.</strong><span>' +
      escapeHtml(error?.message || 'Try again in a moment.') + '</span>' + signIn + '</div>';
  }

  function resolveTheme(choice) {
    if (choice === 'light' || choice === 'dark') return choice;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getThemeChoice() {
    const value = readString(STORAGE.theme, 'system');
    return ['system', 'light', 'dark'].includes(value) ? value : 'system';
  }

  function applyTheme(choice = getThemeChoice(), persist = false) {
    const resolved = resolveTheme(choice);

    if (persist) writeString(STORAGE.theme, choice);

    try {
      localStorage.setItem('relay-theme', resolved);
      localStorage.setItem('resonant-theme', resolved);
      localStorage.setItem('ravin_theme', resolved);
    } catch {}

    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
    if (root.dataset.arrowTheme !== resolved) root.dataset.arrowTheme = resolved;
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f5f6f8' : '#08090b');

    window.dispatchEvent(new CustomEvent('arrow:themechange', {
      detail: { choice, resolved },
    }));

    updateHostTheme();
    state.instances.forEach(updateInstanceState);
    if (state.activePanel === 'appearance') updateAppearanceState();
  }

  function getAdaptChoice() {
    const value = readString(STORAGE.adapt, 'core');
    return ADAPT_CHOICES.some(([id]) => id === value) ? value : 'core';
  }
  function paletteChoices(identity = getAdaptChoice()) {
    return ADAPT_PALETTES[identity] || ADAPT_PALETTES.core;
  }
  function getCustomColor(identity = getAdaptChoice()) {
    const saved = readJson(STORAGE.adaptCustomColors, {});
    const legacy = identity === 'core' ? readString(STORAGE.customAccent, '#2f6fed') : '#8b5cf6';
    const color = saved && typeof saved === 'object' && typeof saved[identity] === 'string' ? saved[identity] : legacy;
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '#8b5cf6';
  }
  function getAccentChoice(identity = getAdaptChoice()) {
    const options = paletteChoices(identity);
    const stored = readJson(STORAGE.adaptPalettes, {});
    const selection = stored && typeof stored === 'object' ? stored[identity] : null;
    if (selection === 'custom' || options.some(([id]) => id === selection)) return selection;
    if (identity === 'core') {
      const legacy = readString(STORAGE.accent, 'mono');
      if (legacy === 'custom' || options.some(([id]) => id === legacy)) return legacy;
    }
    return options[0][0];
  }
  function applyAdapt(choice, persist = false) {
    const normalized = ADAPT_CHOICES.some(([id]) => id === choice) ? choice : 'core';
    if (persist) writeString(STORAGE.adapt, normalized);
    document.documentElement.dataset.arrowAdapt = normalized;
    applyAccent(getAccentChoice(normalized), false, normalized);
    window.dispatchEvent(new CustomEvent('arrow:adaptchange', { detail: { identity: normalized } }));
    if (state.activePanel === 'appearance') renderAppearance();
  }
  // Experience modes have been retired. Keep the old API for cross-module
  // compatibility, but consistently render the neutral baseline everywhere.
  function getExperienceChoice() { return 'balanced'; }

  function applyExperienceChoice(_choice, _persist = false) {
    const normalized = 'balanced';
    document.documentElement.dataset.arrowExperience = normalized;

    const relayMap = {
      balanced: 'flow',
      quiet: 'still',
      dynamic: 'spark',
      glass: 'lucid',
    };

    try {
      localStorage.setItem('relay-experience-mode', relayMap[normalized] || 'flow');
    } catch {}

    window.dispatchEvent(new CustomEvent('relay-experience-change'));
    window.dispatchEvent(new CustomEvent('arrow:experiencechange', { detail: { experience: normalized } }));

    if (state.activePanel === 'appearance') updateAppearanceState();
  }

  function applyAccent(accent, persist = false, identity = getAdaptChoice()) {
    const options = paletteChoices(identity);
    const hex = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent.toLowerCase() : null;
    const stored = hex ? 'custom' : (accent === 'custom' || options.some(([id]) => id === accent) ? accent : options[0][0]);
    if (persist) {
      if (hex) {
        const existing = readJson(STORAGE.adaptCustomColors, {});
        writeJson(STORAGE.adaptCustomColors, { ...(existing && typeof existing === 'object' ? existing : {}), [identity]: hex });
        if (identity === 'core') writeString(STORAGE.customAccent, hex);
      }
      const selections = readJson(STORAGE.adaptPalettes, {});
      writeJson(STORAGE.adaptPalettes, { ...(selections && typeof selections === 'object' ? selections : {}), [identity]: stored });
      if (identity === 'core') writeString(STORAGE.accent, stored);
    }
    const preset = options.find(([id]) => id === stored) || options[0];
    const primary = stored === 'custom' ? (hex || getCustomColor(identity)) : preset[2];
    const secondary = stored === 'custom' ? primary : preset[3];
    const root = document.documentElement;
    const rgb = [1,3,5].map(start => parseInt(primary.slice(start,start+2),16));
    const secondaryRgb = [1,3,5].map(start => parseInt(secondary.slice(start,start+2),16));
    root.dataset.arrowAccent = identity === 'core' ? stored : 'custom';
    root.dataset.arrowPalette = stored;
    root.style.setProperty('--arrow-accent-color', primary);
    root.style.setProperty('--arrow-accent-secondary-color', secondary);
    root.style.setProperty('--arrow-adapt-primary', primary);
    root.style.setProperty('--arrow-adapt-secondary', secondary);
    root.style.setProperty('--arrow-adapt-gradient', 'linear-gradient(135deg,' + primary + ',' + secondary + ')');
    root.style.setProperty('--arrow-accent-rgb', rgb.join(','));
    root.style.setProperty('--arrow-accent-channels', rgb.join(' '));
    root.style.setProperty('--arrow-accent-secondary-rgb', secondaryRgb.join(','));
    const luminance = rgb.map(v => {const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    root.style.setProperty('--arrow-accent-on', luminance > .179 ? '#101114' : '#ffffff');
    root.style.setProperty('--accent', rgb.join(' '));
    root.style.setProperty('--accent-secondary', secondaryRgb.join(' '));
    root.style.setProperty('--accent-contrast', luminance > .179 ? '16 17 20' : '255 255 255');
    root.style.setProperty('--rv-accent', rgb.join(' '));
    root.style.setProperty('--rv-accent-soft', rgb.join(' '));
    root.style.setProperty('--accent-color', primary);
    root.style.setProperty('--accent-rgb', rgb.join(','));
    // Relay's historical experience styles use a named palette. Preserve
    // their settings while adapting shared ARROW chrome to the new scheme.
    const relayPalette = identity === 'core'
      ? ({ mono: 'monochrome', electric: 'cobalt' }[stored] || (['custom'].includes(stored) ? 'monochrome' : stored))
      : PALETTE_LEGACY[identity];
    try { localStorage.setItem('relay-experience-palette', relayPalette); } catch {}
    root.dataset.relayPalette = relayPalette;
    window.dispatchEvent(new CustomEvent('relay-experience-change'));
    window.dispatchEvent(new CustomEvent('arrow:accentchange', { detail: { identity, palette:stored, primary, secondary } }));
    if (state.activePanel === 'appearance') updateAppearanceState();
  }
  function getMotionChoice() {
    const value = readString(STORAGE.motion, 'system');
    return ['system', 'full', 'reduce'].includes(value) ? value : 'system';
  }

  function motionReduced() {
    const choice = getMotionChoice();
    if (choice === 'reduce') return true;
    if (choice === 'full') return false;
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function applyMotion(choice, persist = false) {
    if (persist) writeString(STORAGE.motion, choice);
    document.documentElement.dataset.arrowMotion = motionReduced() ? 'reduce' : 'full';
    window.dispatchEvent(new CustomEvent('arrow:motionchange', {
      detail: { choice, reduced: motionReduced() },
    }));
    if (state.activePanel === 'appearance') updateAppearanceState();
  }

  function hostIsDark() {
    const root = document.documentElement;
    if (root.dataset.theme === 'dark' || root.getAttribute('data-theme') === 'dark') return true;
    if (root.dataset.theme === 'light' || root.getAttribute('data-theme') === 'light') return false;
    if (root.classList.contains('dark')) return true;

    const target = document.body || root;
    const value = getComputedStyle(target).backgroundColor;
    const match = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!match) return matchMedia('(prefers-color-scheme: dark)').matches;
    const [, r, g, b] = match.map(Number);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.48;
  }

  function updateHostTheme() {
    const hostTheme = hostIsDark() ? 'dark' : 'light';
    state.instances.forEach(instance => {
      if (instance.root.dataset.hostTheme !== hostTheme) instance.root.dataset.hostTheme = hostTheme;
    });
    if (state.panelEl && state.panelEl.dataset.hostTheme !== hostTheme) state.panelEl.dataset.hostTheme = hostTheme;
  }

  function icon(name) {
    const paths = {
      orbit: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="8.2" ry="3.7" fill="none"/><ellipse cx="12" cy="12" rx="3.7" ry="8.2" fill="none"/>',
      notes: '<path d="M6.5 4.5h11v15h-11zM9 8h6M9 11.5h6M9 15h4" fill="none"/>',
      tasks: '<path d="m5.5 7.5 1.8 1.8 3.2-3.4M12.5 8h6M5.5 15l1.8 1.8 3.2-3.4M12.5 15.5h6" fill="none"/>',
      focus: '<circle cx="12" cy="12" r="6.5" fill="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none"/>',
      calendar: '<rect x="4.5" y="6" width="15" height="13" rx="2" fill="none"/><path d="M8 3.8v4.4M16 3.8v4.4M4.5 10h15" fill="none"/>',
      links: '<path d="M9.5 14.5 14.5 9.5M8 16l-1.2 1.2a3.1 3.1 0 0 1-4.4-4.4L6.2 9a3.1 3.1 0 0 1 4.4 0M16 8l1.2-1.2a3.1 3.1 0 0 1 4.4 4.4L17.8 15a3.1 3.1 0 0 1-4.4 0" fill="none"/>',
      appearance: '<circle cx="12" cy="12" r="7.2" fill="none"/><path d="M12 4.8a7.2 7.2 0 0 0 0 14.4V4.8Z" fill="currentColor" stroke="none"/>',
      settings: '<circle cx="12" cy="12" r="3" fill="none"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" fill="none"/>',
      ravin: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="12" r="6.8" fill="none"/><path d="M12 2.5v2M21.5 12h-2M12 21.5v-2M2.5 12h2" fill="none"/>',
      plus: '<path d="M12 5v14M5 12h14" fill="none"/>',
      trash: '<path d="M6 7h12M9 7V5h6v2M8 9l.6 9h6.8L16 9" fill="none"/>',
      close: '<path d="m7 7 10 10M17 7 7 17" fill="none"/>',
      play: '<path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none"/>',
      pause: '<path d="M8 7h3v10H8zM13 7h3v10h-3z" fill="currentColor" stroke="none"/>',
      reset: '<path d="M6.5 8.5A6.5 6.5 0 1 1 6 15M6.5 8.5V4.8M6.5 8.5h3.7" fill="none"/>',
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  function controlButton(name, label, extra = '') {
    return '<button type="button" class="arrow-os-control" data-arrow-panel="' + name + '" aria-label="' + label + '" title="' + label + '" aria-haspopup="dialog" aria-expanded="false" ' + extra + '>' +
      icon(name) + '<span>' + label + '</span></button>';
  }

  function createInstance(mount) {
    if (mount.dataset.arrowOsMounted === 'true') return;
    mount.dataset.arrowOsMounted = 'true';

    // eslint-disable-next-line @next/next/no-assign-module-variable -- Browser-only ARROW center identifier.
    const module = VALID_MODULES.has(mount.dataset.module) ? mount.dataset.module : 'relay';
    const orbitAccess = mount.dataset.orbitAccess || 'enabled';
    const orbitEnabled = orbitAccess !== 'disabled';
    const root = document.createElement('div');
    root.className = 'arrow-os-root';
    root.dataset.module = module;
    root.dataset.open = 'false';
    root.dataset.pinned = 'false';
    root.innerHTML =
      '<div class="arrow-os-island" aria-label="ARROW controls">' +
        '<button type="button" class="arrow-os-trigger" aria-label="Open ARROW controls" aria-expanded="false" title="ARROW controls">' +
          '<span class="arrow-os-trigger-symbol" aria-hidden="true"><span class="arrow-os-mark"></span></span>' +
          '<span class="arrow-os-trigger-label">ARROW</span>' +
          '<span class="arrow-os-trigger-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '</button>' +
        '<nav class="arrow-os-content" aria-label="ARROW quick controls" aria-hidden="true">' +
          '<header class="arrow-os-tray-header"><div><span class="arrow-os-tray-kicker">SYSTEM CONTROL</span><strong>ARROW<span class="arrow-os-tray-dot">.</span></strong></div>' +
            '<span class="arrow-os-tray-module">' + module.toUpperCase() + '</span></header>' +
          '<div class="arrow-os-tray-section"><span class="arrow-os-tray-section-label">EXPLORE</span><div class="arrow-os-tray-grid arrow-os-tray-featured">' +
            '<button type="button" class="arrow-os-control arrow-os-orbit" aria-label="Orbit" title="Orbit">' + icon('orbit') + '<span>Orbit</span></button>' +
            controlButton('ravin', 'RAVIN') +
          '</div></div>' +
          '<div class="arrow-os-tray-section"><span class="arrow-os-tray-section-label">WORKSPACE</span><div class="arrow-os-tray-grid">' +
            controlButton('notes', 'Notes') + controlButton('tasks', 'Tasks') +
            controlButton('calendar', 'Calendar') + controlButton('focus', 'Focus') +
            controlButton('links', 'Links') +
          '</div></div>' +
          '<div class="arrow-os-tray-section"><span class="arrow-os-tray-section-label">PERSONALIZE</span><div class="arrow-os-tray-grid">' +
            controlButton('appearance', 'Appearance') + controlButton('settings', 'Settings') +
            controlButton('support', 'Support') +
          '</div></div>' +
          '<footer class="arrow-os-tray-footer"><span>RESONANT ASSIST <i aria-hidden="true"></i> CONNECTED</span>' + CHANNEL_LINK + '</footer>' +
        '</nav>' +
      '</div>';

    mount.replaceChildren(root);

    const instance = {
      mount,
      root,
      module,
      orbitAccess,
      orbitEnabled,
      trigger: root.querySelector('.arrow-os-trigger'),
      content: root.querySelector('.arrow-os-content'),
      hover: false,
      pinned: false,
      closeTimer: null,
    };

    state.instances.add(instance);

    root.addEventListener('mouseenter', () => {
      if (instance.closeTimer !== null) clearTimeout(instance.closeTimer);
      instance.closeTimer = null;
      instance.hover = true;
      // Pointer hover previews the command tray; click/tap can still pin it.
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) setOpen(instance, true);
    });
    root.addEventListener('mouseleave', () => {
      instance.hover = false;
      instance.closeTimer = setTimeout(() => {
        instance.closeTimer = null;
        if (!instance.pinned && !state.activePanel && !instance.hover && !root.contains(document.activeElement)) setOpen(instance, false);
      }, 260);
    });
    root.addEventListener('focusin', () => setOpen(instance, true));
    root.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (!instance.pinned && !state.activePanel && !root.contains(document.activeElement)) {
          setOpen(instance, false);
        }
      });
    });

    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || root.dataset.open !== 'true') return;
      event.preventDefault();
      instance.pinned = false;
      root.dataset.pinned = 'false';
      setOpen(instance, false);
      instance.trigger.focus({ preventScroll:true });
    });
    instance.trigger.addEventListener('click', () => {
      if (state.activePanel) {
        closePanel(false);
        instance.pinned = false;
        root.dataset.pinned = 'false';
        setOpen(instance, false);
        instance.trigger.focus({ preventScroll: true });
        return;
      }

      instance.pinned = !instance.pinned;
      root.dataset.pinned = String(instance.pinned);
      setOpen(instance, instance.pinned || root.dataset.open !== 'true');
    });

    const orbitButton = root.querySelector('.arrow-os-orbit');
    if (module === 'orbit') {
      orbitButton.classList.add('is-active');
      orbitButton.setAttribute('aria-current', 'page');
    } else if (!orbitEnabled) {
      orbitButton.classList.add('is-disabled');
      orbitButton.disabled = true;
      orbitButton.setAttribute('aria-disabled', 'true');
      orbitButton.setAttribute('aria-label', 'Orbit — coming soon');
      orbitButton.setAttribute('title', 'Orbit — coming soon');
      orbitButton.querySelector('span')?.replaceChildren('Orbit · Soon');
    }

    orbitButton.addEventListener('click', () => {
      if (!orbitEnabled && module !== 'orbit') return;
      if (module === 'orbit') {
        closePanel();
        const core = document.querySelector('.orbit-core-label');
        if (core instanceof HTMLButtonElement) core.click();
        window.dispatchEvent(new CustomEvent('arrow:orbit-home'));
        return;
      }
      launchToOrbit(module, orbitButton, instance.orbitAccess);
    });

    root.querySelectorAll('[data-arrow-panel]').forEach(button => {
      button.addEventListener('click', () => {
        const name = button.dataset.arrowPanel;
        state.lastFocused = button;
        state.panelAnchor = instance.trigger;
        openPanel(name, module, button);
      });
    });

    setOpen(instance, false);
    updateInstanceState(instance);
    updateHostTheme();
  }

  function setOpen(instance, open) {
    if (!open && instance.closeTimer !== null) { clearTimeout(instance.closeTimer); instance.closeTimer = null; }
    instance.root.dataset.open = String(open);
    instance.trigger.setAttribute('aria-expanded', String(open));
    instance.trigger.setAttribute('aria-label', open ? 'Close ARROW controls' : 'Open ARROW controls');
    instance.content.setAttribute('aria-hidden', String(!open));
    instance.content.inert = !open;
  }

  function updateInstanceState(instance) {
    instance.root.querySelectorAll('[data-arrow-panel]').forEach(button => {
      const active = button.dataset.arrowPanel === state.activePanel;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
      button.setAttribute('aria-controls', 'arrow-os-system-panel');
    });
  }

  function ensurePanel() {
    if (state.panelEl) return state.panelEl;

    const panel = document.createElement('section');
    const staffHost = document.querySelector('[data-arrow-staff-workspace]');
    panel.className = 'arrow-os-panel' + (staffHost ? ' arrow-staff-page' : '');
    panel.id = 'arrow-os-system-panel';
    panel.hidden = true;
    panel.setAttribute('role', staffHost ? 'region' : 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'arrow-os-panel-title');
    panel.innerHTML =
      '<header class="arrow-os-panel-head">' +
        '<div><span>ARROW SYSTEM</span><h2 id="arrow-os-panel-title"></h2></div>' +
        '<button type="button" class="arrow-os-panel-close" aria-label="Close ARROW panel">' + icon('close') + '</button>' +
      '</header>' +
      '<div class="arrow-os-panel-body"></div>';

    (staffHost || document.body).appendChild(panel);
    if(staffHost) { staffHost.querySelector('[data-staff-startup]')?.remove(); panel.querySelector('.arrow-os-panel-close').textContent = 'Back to Orbit'; panel.querySelector('.arrow-os-panel-close').setAttribute('aria-label','Back to Orbit'); }
    state.panelEl = panel;
    state.panelBody = panel.querySelector('.arrow-os-panel-body');
    state.panelTitle = panel.querySelector('h2');

    panel.querySelector('.arrow-os-panel-close').addEventListener('click', closePanel);
    panel.addEventListener('keydown', handlePanelKeydown);
    return panel;
  }

  function positionPanel(anchor) {
    const panel = ensurePanel();
    if(panel.classList?.contains('arrow-staff-page')) return;
    const rect = anchor?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const availableWidth = viewport?.width || innerWidth;
    const availableHeight = viewport?.height || innerHeight;
    const offsetLeft = viewport?.offsetLeft || 0;
    const offsetTop = viewport?.offsetTop || 0;
    const margin = 12;
    const width = Math.max(0, Math.min(430, availableWidth - margin * 2));
    const left = Math.max(offsetLeft + margin, Math.min((rect?.right || offsetLeft + availableWidth - margin) - width, offsetLeft + availableWidth - width - margin));
    const top = Math.max(offsetTop + margin, Math.min((rect?.bottom || offsetTop + 50) + 8, offsetTop + availableHeight - Math.min(240, availableHeight - margin * 2) - margin));
    panel.style.left = left + 'px';
    panel.style.right = 'auto';
    panel.style.width = width + 'px';
    panel.style.top = top + 'px';
    panel.style.maxHeight = Math.max(80, offsetTop + availableHeight - top - margin) + 'px';
  }

  function openPanel(name, module, anchor) {
    if (!PANEL_LABELS[name]) return;
    if(name === 'moderation' && !document.querySelector('[data-arrow-staff-workspace]')) { location.assign(resolveHref('/orbit/staff/')); return; }
    window.dispatchEvent(new CustomEvent('arrow:panelopen', {detail:{name}}));
    const panel = ensurePanel();
    state.renderVersion++;
    state.activePanel = name;
    state.activeModule = module;
    state.lastFocused = anchor || state.lastFocused;

    state.panelTitle.textContent = PANEL_LABELS[name];
    panel.dataset.panel = name;
    panel.hidden = false;
    panel.dataset.open = 'true';
    positionPanel(state.panelAnchor || anchor || document.querySelector('.arrow-os-trigger'));
    updateHostTheme();
    renderPanel(name);

    state.instances.forEach(instance => {
      instance.pinned = false;
      instance.root.dataset.pinned = 'false';
      setOpen(instance, false);
      updateInstanceState(instance);
    });

    requestAnimationFrame(() => {
      panel.querySelector('input, textarea, button:not(.arrow-os-panel-close), a[href]')?.focus({ preventScroll: true });
    });
  }

  function closePanel(restoreFocus = true) {
    if (!state.panelEl || state.panelEl.hidden) return;
    if(state.panelEl.classList?.contains('arrow-staff-page')) { if(restoreFocus) location.assign(resolveHref('/orbit/')); return; }
    state.panelEl.dataset.open = 'false';
    state.panelEl.hidden = true;
    state.renderVersion++;
    state.activePanel = null;
    state.activeModule = null;
    state.instances.forEach(instance => {
      updateInstanceState(instance);
      if (!instance.pinned && !instance.hover && !instance.root.contains(document.activeElement)) {
        setOpen(instance, false);
      }
    });
    const target = state.lastFocused;
    state.lastFocused = null;
    state.panelAnchor = null;
    if (restoreFocus) {
      const instance = [...state.instances].find(item => item.root.contains(target));
      instance?.trigger.focus({ preventScroll: true });
    }
  }

  function handlePanelKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  }

  function panelEmpty(copy) {
    return '<div class="arrow-os-empty">' + copy + '</div>';
  }

  function renderPanel(name) {
    if (!state.panelBody) return;
    if (name === 'ravin') renderRavin();
    if (name === 'notes') renderNotes();
    if (name === 'tasks') renderTasks();
    if (name === 'calendar') renderCalendar();
    if (name === 'links') renderLinks();
    if (name === 'focus') renderFocus();
    if (name === 'appearance') { renderAppearance(); updateAppearanceState(); }
    if (name === 'settings') renderSettings();
    if (name === 'notifications') renderNotifications();
    if (name === 'support') renderSupport();
    if (name === 'moderation') renderModeration();
  }

  const STAFF_PREVIEW_KEY = 'relay-owner-role-preview';
  function staffPreviewRole(actualRole) {
    if(actualRole !== 'owner')return actualRole;
    const saved=readJson(STAFF_PREVIEW_KEY,null);
    return saved?.userId===currentArrowUserId() && ['user','moderator','admin','owner'].includes(saved.role) ? saved.role : actualRole;
  }
  async function staffRole(actual = false) {
    const userId = currentArrowUserId();
    if (!userId) return 'user';
    const result = await arrowData('/rest/v1/rpc/current_app_role',{method:'POST',body:{},readOnly:true});
    const role = ['user','moderator','admin','owner'].includes(result) ? result : 'user';
    return actual ? role : staffPreviewRole(role);
  }
  async function setStaffPreview(role) {
    if(!['user','moderator','admin','owner'].includes(role) || await staffRole(true)!=='owner')return;
    writeJson(STAFF_PREVIEW_KEY,{userId:currentArrowUserId(),role});
    window.dispatchEvent(new CustomEvent('relay-role-preview-change',{detail:role}));
    if(role==='user' && document.querySelector('[data-arrow-staff-workspace]'))location.assign(resolveHref('/orbit/'));
    else location.reload();
  }
  async function refreshStaffPreviewBar() {
    const account=currentArrowUserId();
    try {
      const actual=await staffRole(true);
      if(account!==currentArrowUserId())return;
      document.querySelector('[data-arrow-role-preview]')?.remove();
      const effective=staffPreviewRole(actual);
      const workspace=document.querySelector('.arrow-staff-workspace');
      if(state.activePanel==='moderation' && workspace && workspace.dataset.staffRole!==effective)void renderModeration();
      if(actual!=='owner')return;
      const bar=document.createElement('aside');bar.className='arrow-role-preview';bar.dataset.arrowRolePreview='true';bar.setAttribute('aria-label','Owner experience preview');
      const label=document.createElement('label');label.textContent='View as ';
      const select=document.createElement('select');select.setAttribute('aria-label','Preview experience as');
      for(const [value,name] of [['owner','Owner'],['admin','Administrator'],['moderator','Moderator'],['user','Normal user']]){const option=document.createElement('option');option.value=value;option.textContent=name;option.selected=value===effective;select.append(option);}label.append(select);bar.append(label);
      const copy=document.createElement('span');copy.textContent=effective==='owner'?'Owner access':'Read-only preview · account remains Owner';bar.append(copy);
      select.onchange=()=>{select.disabled=true;void setStaffPreview(select.value).catch(()=>{select.disabled=false;});};
      if(effective!=='owner'){const restore=document.createElement('button');restore.type='button';restore.textContent='Return to Owner';restore.onclick=()=>{void setStaffPreview('owner');};bar.append(restore);}
      document.body.append(bar);
    } catch { document.querySelector('[data-arrow-role-preview]')?.remove(); }
  }

  const rpc = async (name, body) => {
    if((name.startsWith('owner_') || name.startsWith('staff_update_') || name==='set_user_role') && !['owner_dashboard_stats','owner_storage_overview','owner_list_audit_log','owner_list_beta_requests'].includes(name)) {
      const actual=await staffRole(true);
      if(staffPreviewRole(actual)!==actual)throw new Error('Role preview is read-only. Return to Owner to make changes.');
    }
    return arrowData('/rest/v1/rpc/' + name, { method: 'POST', body });
  };

  async function renderSupport() {
    // eslint-disable-next-line @next/next/no-assign-module-variable -- Browser-only ARROW center identifier.
    const module = state.activeModule || 'orbit';
    state.panelBody.innerHTML = '<p class="arrow-os-panel-copy">Support for every ARROW location. Track replies and status here.</p>' +
      '<form class="arrow-os-form" id="arrow-support-form">' +
      '<label>Location<select name="module">' + [...VALID_MODULES].map(m => '<option ' + (m === module ? 'selected' : '') + '>' + m + '</option>').join('') + '</select></label>' +
      '<label>Request<select name="type"><option value="bug_report">Something is broken</option><option value="safety_report">Safety or abuse</option><option value="feature_request">Feature idea</option><option value="privacy_request">Privacy or data</option><option value="general_feedback">Other feedback</option></select></label>' +
      '<label>Subject<input name="subject" required minlength="3" maxlength="105" /></label>' +
      '<label>Details<textarea name="description" required minlength="10" maxlength="5000" rows="5" placeholder="What happened, and what did you expect?"></textarea></label>' +
      '<button type="submit">Send to ARROW support</button><p role="status" id="arrow-support-status"></p></form><div id="arrow-support-history"></div>';
    const form = state.panelBody.querySelector('form');
    const history = state.panelBody.querySelector('#arrow-support-history');
    const message = state.panelBody.querySelector('[role="status"]');
    async function loadHistory() {
      try {
        const rows = await arrowData('/rest/v1/staff_requests?requester_id=eq.' + encodeURIComponent(currentArrowUserId()) + '&select=id,subject,status,staff_note,created_at&order=created_at.desc&limit=12');
        if (!history.isConnected) return;
        history.innerHTML = '<h3>Your requests</h3>' + (rows.length ? rows.map(r => '<article class="arrow-os-support-row"><strong>' + escapeHtml(r.subject) + '</strong><span>' + escapeHtml(r.status) + ' · ' + escapeHtml(new Date(r.created_at).toLocaleDateString()) + '</span>' + (r.staff_note ? '<p>' + escapeHtml(r.staff_note) + '</p>' : '') + '</article>').join('') : panelEmpty('No requests yet.'));
      } catch (error) { if (history.isConnected) history.innerHTML = sharedDataError(error); }
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form); const button = form.querySelector('button'); button.disabled = true;
      message.textContent = 'Sending…';
      try {
        await rpc('submit_staff_request', { p_request_type: data.get('type'), p_subject: '[' + data.get('module') + '] ' + String(data.get('subject')).trim(), p_description: String(data.get('description')).trim(), p_requested_role: null, p_metadata: { source: 'arrow_support', module: data.get('module'), path: location.pathname, viewport: innerWidth + 'x' + innerHeight } });
        form.querySelector('[name="subject"]').value = ''; form.querySelector('textarea').value = '';
        message.textContent = 'Sent. Your request is in the ARROW staff queue.'; await loadHistory();
      } catch (error) { message.textContent = error.message || 'Could not send. Please retry.'; }
      finally { button.disabled = false; }
    });
    await loadHistory();
  }

  function renderStaffInspector(host, data) {
    host.replaceChildren();
    const heading=document.createElement('h3');heading.textContent='Account inspector';host.append(heading);
    const privacy=document.createElement('p');privacy.textContent='Operational account information. Private message bodies are excluded; reported messages stay in Reports.';host.append(privacy);
    const nav=document.createElement('div');nav.className='arrow-staff-inspector-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Account inspector sections');
    const panel=document.createElement('section');panel.className='arrow-staff-inspector-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;
    const prefix='staff-inspector-'+Math.random().toString(36).slice(2);panel.id=prefix+'-panel';host.append(nav,panel);
    const labels={overview:'Overview',sessions:'Sessions',timeline:'Activity',contacts:'Contacts',groups:'Groups',conversations:'Conversations',reports:'Reports',storage:'Storage',notes:'Owner notes'};
    const fields={overview:['display_name','primary_email','relay_number','school','role','created_at','last_sign_in_at','banned_at','ban_reason','message_count','contact_count','group_count','open_report_count','todo_count','calendar_accounts'],sessions:['created_at','refreshed_at','not_after','user_agent','aal'],timeline:['type','action','created_at','actor_name','other_user_name','subject','status'],contacts:['display_name','relay_number','school','connected_at','mutual_count'],groups:['name','role','joined_at','member_count','message_count','last_message_at'],conversations:['type','group_name','created_at','last_message_at','message_count'],reports:['reason','details','status','created_at','moderation_note','reporter_name','reported_name'],storage:['file_count','file_bytes','database_bytes_estimated','total_bytes','average_user_total_bytes'],notes:['note','created_by_name','created_at']};
    const name=key=>key.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
    const format=(key,value)=>{
      if(value===null||value===undefined||value==='')return key==='last_sign_in_at'?'Never signed in':'Not available';
      if(key.endsWith('_at')||key==='not_after'){const parsed=new Date(value);return Number.isFinite(parsed.getTime())?parsed.toLocaleString():'Not available';}
      if(key.includes('bytes')){const bytes=Number(value);return Number.isFinite(bytes)?(bytes>=1048576?(bytes/1048576).toLocaleString(undefined,{maximumFractionDigits:1})+' MB':bytes>=1024?(bytes/1024).toLocaleString(undefined,{maximumFractionDigits:1})+' KB':bytes.toLocaleString()+' B'):'Not available';}
      return typeof value==='object'?'Not available':String(value);
    };
    function draw(key) {
      panel.replaceChildren();panel.setAttribute('aria-labelledby',prefix+'-'+key);
      nav.querySelectorAll('button').forEach(button=>{const selected=button.dataset.section===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
      if(key==='sessions'){const hint=document.createElement('p');hint.textContent='Stored authentication sessions are not proof that someone is online. Session expiry and refresh times are shown when available.';panel.append(hint);}
      let entries=key==='reports'?[...(data.reports?.received||[]).map(row=>({...row,_heading:'Received report'})),...(data.reports?.submitted||[]).map(row=>({...row,_heading:'Submitted report'}))]:Array.isArray(data[key])?data[key]:data[key]?[data[key]]:[];
      if(!entries.length){const empty=document.createElement('p');empty.textContent='No '+labels[key].toLowerCase()+' recorded.';panel.append(empty);return;}
      for(const row of entries){const card=document.createElement('section');card.className='arrow-staff-inspector-card';const title=document.createElement('h4');title.textContent=row._heading||row.display_name||row.name||row.subject||labels[key];card.append(title);const facts=document.createElement('dl');facts.className='arrow-staff-account-facts';for(const field of fields[key]){if(!(field in row))continue;const pair=document.createElement('div');const label=document.createElement('dt');label.textContent=field==='last_sign_in_at'?'Last sign-in':name(field);const value=document.createElement('dd');value.textContent=format(field,row[field]);pair.append(label,value);facts.append(pair);}card.append(facts);panel.append(card);}
    }
    for(const [key,label] of Object.entries(labels)){const button=document.createElement('button');button.type='button';button.id=prefix+'-'+key;button.dataset.section=key;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.textContent=label;button.onclick=()=>draw(key);nav.append(button);}
    nav.onkeydown=event=>{const buttons=[...nav.querySelectorAll('button')];const current=buttons.indexOf(document.activeElement);if(current<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[target].click();buttons[target].focus();};
    draw('overview');
  }

  function renderOwnerOverview(host, stats, storage) {
    host.replaceChildren();
    const label = key => key.replaceAll('_',' ').replace(/\b24h\b/g,'today').replace(/\b7d\b/g,'this week').replace(/\b30d\b/g,'this month').replace(/^./,c=>c.toUpperCase());
    const bytes = value => {
      if (!Number.isFinite(Number(value))) return '—';
      const amount=Number(value);
      for(const [unit,divisor] of [['GB',1073741824],['MB',1048576],['KB',1024]]) if(amount>=divisor)return (amount/divisor).toLocaleString(undefined,{maximumFractionDigits:1})+' '+unit;
      return amount.toLocaleString()+' B';
    };
    function card(title, values) {
      const section=document.createElement('section');section.className='arrow-os-support-row';
      const heading=document.createElement('h3');heading.textContent=title;section.append(heading);
      const metrics=document.createElement('dl');metrics.className='arrow-staff-metrics';
      for(const [key,value] of Object.entries(values||{})) {
        if(typeof value!=='number')continue;
        const metric=document.createElement('div');metric.className='arrow-staff-metric';
        const name=document.createElement('dt');name.textContent=label(key);
        const amount=document.createElement('dd');amount.textContent=key.includes('bytes')?bytes(value):value.toLocaleString();
        metric.append(name,amount);metrics.append(metric);
      }
      if(!metrics.children.length)return;
      section.append(metrics);host.append(section);
    }
    for(const [key,values] of Object.entries(stats||{})) if(values&&typeof values==='object'&&!Array.isArray(values)) card(label(key),values);
    card('Storage',storage);
    const users=Array.isArray(storage?.top_users)?storage.top_users:[];
    if(users.length) {
      const section=document.createElement('section');section.className='arrow-os-support-row';
      const heading=document.createElement('h3');heading.textContent='Storage by account';section.append(heading);
      const table=document.createElement('table');table.className='arrow-staff-storage';
      const head=document.createElement('thead');const headers=document.createElement('tr');
      for(const title of ['Account','Files','Total']){const th=document.createElement('th');th.scope='col';th.textContent=title;headers.append(th);}head.append(headers);table.append(head);
      const body=document.createElement('tbody');
      for(const user of users){const row=document.createElement('tr');for(const value of [user.display_name||'Account',bytes(user.file_bytes),bytes(user.total_bytes)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}table.append(body);section.append(table);host.append(section);
    }
    if(stats?.generated_at){const updated=document.createElement('p');updated.className='arrow-os-panel-copy';updated.textContent='Updated '+new Date(stats.generated_at).toLocaleString();host.append(updated);}
  }

  async function renderModeration() {
    state.panelBody.innerHTML = '<p class="arrow-os-loading" role="status">Verifying staff access…</p>';
    try {
      const actualRole = await staffRole(true);
      const role = staffPreviewRole(actualRole);
      const previewing = actualRole === 'owner' && role !== 'owner';
      if (state.activePanel !== 'moderation') return;
      if (!['moderator', 'admin', 'owner'].includes(role)) {
        state.panelBody.innerHTML = panelEmpty('Staff access is required. For help, open ARROW support.'); return;
      }
      const sections = [
        {id:'requests',label:'Support requests',group:'Operations',description:'Review requests and staff applications.'},
        {id:'email',label:'Support inbox',group:'Operations',description:'Read support conversations and manage replies.'},
        {id:'reports',label:'Reports',group:'Operations',description:'Review reported content and moderation notes.'},
        ...(role !== 'moderator' ? [{id:'users',label:'Accounts',group:'Accounts',description:'Find accounts and review their access.'}] : []),
        ...(role === 'owner' ? [{id:'beta',label:'Beta access',group:'Accounts',description:'Review pending beta applications.'},{id:'overview',label:'Overview',group:'Oversight',description:'Account, activity and storage statistics.'},{id:'audit',label:'Audit log',group:'Oversight',description:'Inspect recorded staff actions.'}] : []),
      ];
      const identity = {
        owner: {label:'Owner',initial:'O',title:'Steward the whole system.',copy:'A dedicated space for the people shaping ARROW.',scope:'Operations · Accounts · Oversight'},
        admin: {label:'Administrator',initial:'A',title:'Keep ARROW moving.',copy:'Your workspace for supporting people and managing access.',scope:'Operations · Accounts'},
        moderator: {label:'Moderator',initial:'M',title:'Care for the community.',copy:'A focused workspace for thoughtful reviews and support.',scope:'Support · Inbox · Reports'},
      }[role];
      const paths = {requests:'M4 5h16v11H9l-5 4V5Z',email:'M3 5h18v14H3V5Zm0 1 9 7 9-7',reports:'M6 21V3m0 1h13l-3 5 3 5H6',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-4m-1-12a4 4 0 0 1 0 8',beta:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',overview:'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',audit:'M8 3H5v18h14V3h-3M8 2h8v4H8V2Zm0 9h8m-8 5h5'};
      const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
      let group = '';
      const navigation = sections.map(section => { const heading = section.group !== group ? '<h3>'+section.group+'</h3>' : ''; group = section.group; return heading+'<button type="button" data-queue="'+section.id+'">'+icon(section.id)+'<span>'+section.label+'</span><span class="arrow-staff-nav-arrow" aria-hidden="true">↗</span></button>'; }).join('');
      state.panelBody.innerHTML = '<div class="arrow-staff-workspace" data-staff-role="'+role+'"><nav class="arrow-staff-nav" aria-label="Staff sections"><div class="arrow-staff-identity"><span class="arrow-staff-crest" aria-hidden="true">'+identity.initial+'</span><div><span class="arrow-staff-eyebrow">ARROW STAFF</span><strong>'+identity.label+'</strong></div></div>'+navigation+'<div class="arrow-staff-nav-foot"><span class="arrow-staff-eyebrow">YOUR WORKSPACE</span><p>'+identity.scope+'</p></div></nav><section class="arrow-staff-content"><div class="arrow-staff-welcome"><div><span class="arrow-staff-eyebrow">'+identity.label+' workspace</span><h2>'+identity.title+'</h2><p>'+identity.copy+'</p></div><div class="arrow-staff-orbit" aria-hidden="true"><span>↗</span></div></div><header class="arrow-staff-section-head"><div><h2 id="arrow-staff-section-title"></h2><p id="arrow-staff-section-description"></p></div><div class="arrow-staff-refresh-group"><span id="arrow-staff-updated" role="status"></span><button type="button" id="arrow-staff-refresh">↻ Refresh</button></div></header><div class="arrow-staff-toolbar"><label class="arrow-os-form" id="arrow-staff-search-label">Search this page<input id="arrow-staff-search" type="search" placeholder="Search loaded records…" /></label><label class="arrow-os-form" id="arrow-staff-status-label">Status<select id="arrow-staff-status"></select></label><label class="arrow-os-form" id="arrow-staff-sort-label">Order<select id="arrow-staff-sort"><option value="priority">Needs attention first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div><div class="arrow-staff-results-bar"><p id="arrow-staff-result-count" role="status"></p><button type="button" id="arrow-staff-clear" hidden>Clear filters</button></div><div id="arrow-staff-queue" aria-live="polite" aria-busy="false"></div></section></div>';
      const host = state.panelBody.querySelector('#arrow-staff-queue');
      const search = state.panelBody.querySelector('#arrow-staff-search');
      const statusFilter = state.panelBody.querySelector('#arrow-staff-status');
      const refresh = state.panelBody.querySelector('#arrow-staff-refresh');
      const sort = state.panelBody.querySelector('#arrow-staff-sort');
      const clear = state.panelBody.querySelector('#arrow-staff-clear');
      const updated = state.panelBody.querySelector('#arrow-staff-updated');
      const sectionTitle = state.panelBody.querySelector('#arrow-staff-section-title');
      const description = state.panelBody.querySelector('#arrow-staff-section-description');
      const resultCount = state.panelBody.querySelector('#arrow-staff-result-count');
      let active = ''; let records = []; let offset = 0; let loadVersion = 0;
      const paging = document.createElement('div'); paging.className = 'arrow-staff-paging';
      const previous = document.createElement('button'); previous.textContent = 'Previous'; previous.type = 'button';
      const nextPage = document.createElement('button'); nextPage.textContent = 'Next'; nextPage.type = 'button';
      const pageLabel = document.createElement('span'); paging.append(previous,pageLabel,nextPage); host.after(paging);
      previous.onclick = () => load(active, Math.max(0, offset - 100)); nextPage.onclick = () => load(active, offset + 100);
      async function action(name, body, button) {
        button.disabled = true;
        try { await rpc(name, body); await load(active,offset); }
        catch (error) { host.prepend(Object.assign(document.createElement('p'), { textContent: error.message, role: 'alert' })); }
        finally { button.disabled = false; }
      }
      const recordStatus = row => active === 'users' ? (row.banned_at ? 'suspended' : 'active') : row.request_status || row.status || '';
      const needsAttention = row => ['new','submitted','pending','open','reviewing'].includes(recordStatus(row));
      const recordDate = row => { const value = new Date(row.latest_message_at || row.created_at || row.updated_at || '').getTime(); return Number.isFinite(value) ? value : 0; };
      function draw() {
        const query = search.value.toLowerCase();
        host.replaceChildren();
        const visible = records.filter(row => JSON.stringify(row).toLowerCase().includes(query) && (!statusFilter.value || recordStatus(row) === statusFilter.value));
        visible.sort((a,b) => sort.value === 'priority' ? Number(needsAttention(b))-Number(needsAttention(a)) || recordDate(b)-recordDate(a) : sort.value === 'oldest' ? recordDate(a)-recordDate(b) : recordDate(b)-recordDate(a));
        const attention = records.filter(needsAttention).length;
        resultCount.textContent = visible.length+' of '+records.length+' records on this page'+(attention ? ' · '+attention+' need attention' : '');
        clear.hidden = !search.value && !statusFilter.value;
        if (!visible.length) {
          const empty=document.createElement('div');empty.className='arrow-staff-empty';
          const heading=document.createElement('h3');heading.textContent=records.length?'No matching records':'You’re up to date';
          const copy=document.createElement('p');copy.textContent=records.length?'Try a different search or clear your filters.':'There are no records on this page. Refresh to check again.';
          empty.append(heading,copy);host.append(empty);
        }
        visible.forEach(row => {
          const article = document.createElement('article'); article.className = 'arrow-os-support-row arrow-staff-record';
          const review=document.createElement('details');review.className='arrow-staff-review';
          const summary=document.createElement('summary');summary.className='arrow-staff-record-summary';
          const heading=document.createElement('div');heading.className='arrow-staff-record-heading';
          const title = document.createElement('strong');
          title.textContent = row.subject || row.reason || row.action || row.display_name || row.primary_email || row.email || 'Account'; heading.append(title);
          const meta=document.createElement('span');meta.className='arrow-staff-record-meta';
          const date=recordDate(row);
          meta.textContent=[row.sender_email || row.primary_email || row.email || row.requester_name || row.metadata?.module || (active==='reports'?'Relay':'ARROW'), date ? new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : ''].filter(Boolean).join(' · ');heading.append(meta);
          const badge=document.createElement('span');badge.className='arrow-staff-status';badge.dataset.attention=String(needsAttention(row));badge.textContent=recordStatus(row).replaceAll('_',' ') || (active==='audit'?'Recorded':'Record');
          const affordance=document.createElement('span');affordance.className='arrow-staff-review-label';affordance.textContent=active==='audit'?'Details':'Review';
          summary.append(heading,badge,affordance);review.append(summary);article.append(review);
          const content=document.createElement('div');content.className='arrow-staff-record-body';review.append(content);
          const detail = document.createElement('p');detail.className='arrow-staff-record-copy';
          detail.textContent = active === 'users' ? [row.primary_email || row.email, row.role, row.banned_at ? 'Suspended' : 'Active'].filter(Boolean).join(' · ') : [row.description || row.details].filter(Boolean).join(' · '); if(detail.textContent)content.append(detail);
          if(active==='users') {
            const facts=document.createElement('dl');facts.className='arrow-staff-account-facts';
            const date=value=>{const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?parsed.toLocaleString():'Never signed in';};
            const signIn=document.createElement('span');signIn.className='arrow-staff-sign-in';signIn.textContent='Last sign-in: '+date(row.last_sign_in_at);heading.append(signIn);
            for(const [label,value] of [['Last sign-in',date(row.last_sign_in_at)],['Joined',row.created_at?date(row.created_at):'Unavailable'],['Relay number',row.relay_number||'Unavailable'],['School',row.school||'Not provided'],['Messages',row.message_count??'Unavailable'],['Connections',row.connection_count??'Unavailable'],['Open reports',row.open_report_count??'Unavailable'],['Account status',row.banned_at?'Suspended':'Enabled']]){const pair=document.createElement('div');const name=document.createElement('dt');name.textContent=label;const amount=document.createElement('dd');amount.textContent=String(value);pair.append(name,amount);facts.append(pair);}content.append(facts);
            const hint=document.createElement('p');hint.textContent='Last sign-in records authentication, not live online presence.';content.append(hint);
          }
          if(active==='requests' || active==='reports') {
            const context=document.createElement('p');context.textContent=active==='requests'?[row.requester_name,row.request_type?.replaceAll('_',' '),row.requested_role?'Requested role: '+row.requested_role:'',row.handled_by_name?'Handled by '+row.handled_by_name:''].filter(Boolean).join(' · '):[row.reporter_name?'Reported by '+row.reporter_name:'',row.reported_name?'Account: '+row.reported_name:''].filter(Boolean).join(' · ');content.append(context);
            if(active==='reports' && row.message_body){const quote=document.createElement('blockquote');quote.className='arrow-staff-reported-message';quote.textContent=row.message_body;content.append(quote);}
          }
          if (active === 'email') {
            const open=document.createElement('button');open.type='button';open.textContent='Open thread';content.append(open);
            open.onclick=async()=>{open.disabled=true;try{const messages=await arrowData('/rest/v1/support_email_messages?thread_id=eq.'+encodeURIComponent(row.id)+'&select=id,direction,from_email,text_body,created_at&order=created_at.asc&limit=200');const thread=document.createElement('section');thread.className='arrow-staff-thread';for(const message of messages){const copy=document.createElement('p');copy.style.whiteSpace='pre-wrap';copy.textContent=(message.direction==='outbound'?'Support':message.from_email)+' · '+new Date(message.created_at).toLocaleString()+'\n'+(message.text_body||'(No text body)');thread.append(copy);}
              if(role!=='moderator'){const reply=document.createElement('textarea');reply.placeholder='Reply to '+row.sender_email;reply.setAttribute('aria-label','Reply to '+row.sender_email);reply.maxLength=10000;thread.append(reply);const send=document.createElement('button');send.type='button';send.textContent='Send reply';send.onclick=async()=>{if(previewing||!reply.value.trim()||!confirm('Send this reply to '+row.sender_email+'?'))return;send.disabled=true;try{await arrowData('/functions/v1/support-email',{method:'POST',body:{action:'reply',threadId:row.id,text:reply.value.trim()}});reply.value='';await load('email',offset);}catch(error){thread.append(Object.assign(document.createElement('p'),{textContent:error.message}));}finally{send.disabled=false;}};thread.append(send);
              const status=document.createElement('select');status.setAttribute('aria-label','Conversation status');for(const value of ['new','open','pending','closed']){const option=document.createElement('option');option.value=value;option.textContent=value;option.selected=value===row.status;status.append(option);}thread.append(status);const save=document.createElement('button');save.textContent='Save status';save.onclick=()=>action('staff_update_support_thread',{p_thread_id:row.id,p_status:status.value,p_assigned_to:null},save);thread.append(save);}
              if(previewing)thread.querySelectorAll('textarea,select,button').forEach(control=>control.disabled=true);content.append(thread);open.remove();}catch(error){content.append(Object.assign(document.createElement('p'),{textContent:error.message}));open.disabled=false;}};
          } else if (active === 'audit') {
            const info = document.createElement('p'); info.textContent = [row.actor_name || row.actor_email, row.target_name || row.target_email, new Date(row.created_at).toLocaleString()].filter(Boolean).join(' · ');content.append(info);
            const details = document.createElement('details');const summary = document.createElement('summary');summary.textContent='Action details';const copy=document.createElement('pre');copy.textContent=JSON.stringify(row.metadata||{},null,2);details.append(summary,copy);content.append(details);
          } else if (active === 'beta') {
            const info=document.createElement('p');info.textContent=[row.primary_email,row.request_status,row.request_message].filter(Boolean).join(' · ');content.append(info);
            if(row.request_status==='pending'){const reply=document.createElement('textarea');reply.placeholder='Response to applicant';reply.setAttribute('aria-label','Response to applicant');reply.maxLength=1000;content.append(reply);
              for(const approved of [true,false]){const review=document.createElement('button');review.type='button';review.textContent=approved?'Approve access':'Decline';review.onclick=()=>{if(!reply.value.trim()){reply.focus();return;}void action('owner_review_beta_request',{p_request_id:row.request_id,p_approve:approved,p_message:reply.value.trim()},review);};content.append(review);}
            }
          } else if (active !== 'users') {
            const note = document.createElement('textarea'); note.rows = 2; note.placeholder = 'Staff note'; note.maxLength = active==='reports'?500:2000; note.setAttribute('aria-label','Staff note for '+title.textContent); note.value = row.staff_note || row.moderation_note || ''; content.append(note);
            const select = document.createElement('select');select.setAttribute('aria-label','Status for '+title.textContent);
            (active === 'requests' ? ['new','reviewing','resolved','dismissed'] : ['submitted','reviewing','resolved','dismissed']).forEach(status => { const option = document.createElement('option'); option.value = status; option.textContent = status; option.selected = status === row.status; select.append(option); }); content.append(select);
            const save = document.createElement('button'); save.textContent = 'Save status'; save.type = 'button'; content.append(save);
            if(active==='requests'&&role==='owner'&&row.request_type==='role_application'&&row.status!=='resolved'){const approve=document.createElement('button');approve.type='button';approve.textContent='Approve staff application';approve.onclick=()=>{if(!confirm('Approve this staff role application?'))return;void action('owner_approve_role_request',{p_request_id:row.request_id,p_note:note.value},approve);};content.append(approve);}
            save.onclick = () => action(active === 'requests' ? 'staff_update_request_status' : 'staff_update_report_status', active === 'requests' ? { p_request_id: row.request_id, p_status: select.value, p_note: note.value } : { p_report_id: row.report_id, p_status: select.value, p_note: note.value }, save);
          } else if (role === 'owner') {
            const tools=document.createElement('details');tools.className='arrow-staff-account-tools';const summary=document.createElement('summary');summary.textContent='Manage account';tools.append(summary);content.append(tools);
            const inspect = document.createElement('button');inspect.type='button';inspect.textContent='Inspect account';tools.append(inspect);
            inspect.onclick=async()=>{inspect.disabled=true;try{const result=await rpc('owner_user_inspector',{p_user_id:row.id});let inspector=tools.querySelector('.arrow-staff-inspector');if(!inspector){inspector=document.createElement('section');inspector.className='arrow-staff-inspector';tools.append(inspector);}renderStaffInspector(inspector,result);}catch(error){tools.append(Object.assign(document.createElement('p'),{textContent:error.message,role:'alert'}));}finally{inspect.disabled=false;}};
            const ban = document.createElement('button'); ban.type = 'button'; ban.textContent = row.banned_at ? 'Restore account' : 'Suspend account'; tools.append(ban);
            ban.onclick = () => { const reason = prompt('Reason for this ARROW account action:'); if (reason === null || !reason.trim()) return; if (!confirm(ban.textContent + ' for ' + title.textContent + '?')) return; void action('owner_set_user_ban', {p_user_id:row.id, p_banned:!row.banned_at, p_reason:reason}, ban); };
            const roleSelect = document.createElement('select');roleSelect.setAttribute('aria-label','Role for '+title.textContent);
            ['user','moderator','admin','owner'].forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = value === row.role; roleSelect.append(option); }); tools.append(roleSelect);
            const changeRole = document.createElement('button'); changeRole.type = 'button'; changeRole.textContent = 'Update role'; tools.append(changeRole);
            changeRole.onclick = () => { if (roleSelect.value === row.role || !confirm('Change ' + title.textContent + ' to ' + roleSelect.value + '?')) return; void action('set_user_role', {p_user_id:row.id,p_role:roleSelect.value},changeRole); };
            const ownerNote=document.createElement('textarea');ownerNote.placeholder='Private owner note';ownerNote.maxLength=1000;ownerNote.setAttribute('aria-label','Private owner note');tools.append(ownerNote);
            const addNote=document.createElement('button');addNote.type='button';addNote.textContent='Save owner note';addNote.onclick=()=>{if(ownerNote.value.trim())void action('owner_add_user_note',{p_user_id:row.id,p_note:ownerNote.value.trim()},addNote);};tools.append(addNote);
            const revokeBeta=document.createElement('button');revokeBeta.type='button';revokeBeta.textContent='Revoke beta access';revokeBeta.onclick=()=>{if(confirm('Revoke beta access for '+title.textContent+'?'))void action('owner_revoke_beta_access',{p_user_id:row.id,p_message:null},revokeBeta);};tools.append(revokeBeta);
            const deleteAccount=document.createElement('button');deleteAccount.type='button';deleteAccount.textContent='Delete account';deleteAccount.onclick=()=>{if(prompt('Permanently delete '+title.textContent+' and their data? Type DELETE to confirm.')==='DELETE')void action('owner_delete_user',{p_user_id:row.id},deleteAccount);};tools.append(deleteAccount);
            const signOut = document.createElement('button'); signOut.type = 'button'; signOut.textContent = 'Revoke sessions'; tools.append(signOut);
            signOut.onclick = () => { if (!confirm('Sign out all sessions for ' + title.textContent + '?')) return; void action('owner_force_sign_out',{p_user_id:row.id},signOut); };
            const groupTools=(label,nodes)=>{const group=document.createElement('fieldset');group.className='arrow-staff-tool-group';const legend=document.createElement('legend');legend.textContent=label;group.append(legend,...nodes);tools.append(group);};
            groupTools('Account insights',[inspect]);
            groupTools('Role & permissions',[roleSelect,changeRole]);
            groupTools('Private owner notes',[ownerNote,addNote]);
            const sensitive=document.createElement('details');sensitive.className='arrow-staff-sensitive';const sensitiveTitle=document.createElement('summary');sensitiveTitle.textContent='Access & account safety';sensitive.append(sensitiveTitle,ban,revokeBeta,signOut,deleteAccount);tools.append(sensitive);


          }
          if(previewing)content.querySelectorAll('textarea,select,button').forEach(control=>{if(control.textContent!=='Open thread')control.disabled=true;});
          host.append(article);
        });
      }
      async function load(queue, nextOffset = 0) {
        const section=sections.find(item=>item.id===queue); if(!section) return;
        sectionTitle.textContent=section.label;description.textContent=section.description;
        if(document.querySelector('[data-arrow-staff-workspace]')) { const url=new URL(location.href);url.searchParams.set('queue',queue);history.replaceState({},'',url); }
        state.panelBody.querySelectorAll('[data-queue]').forEach(button=>button.setAttribute('aria-current',button.dataset.queue===queue?'page':'false'));
        if(queue!==active) { search.value=''; statusFilter.replaceChildren(); const options=queue==='users'?['','active','suspended']:queue==='requests'?['','new','reviewing','resolved','dismissed']:queue==='reports'?['','submitted','reviewing','resolved','dismissed']:queue==='email'?['','new','open','pending','closed']:queue==='beta'?['','pending','approved','declined']:[''];for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value||'All statuses';statusFilter.append(option);} }
        state.panelBody.querySelector('.arrow-staff-toolbar').hidden=queue==='overview';state.panelBody.querySelector('#arrow-staff-search-label').hidden=queue==='overview';state.panelBody.querySelector('#arrow-staff-sort-label').hidden=queue==='overview';clear.hidden=true;state.panelBody.querySelector('#arrow-staff-status-label').hidden=['overview','audit'].includes(queue);
        resultCount.textContent='Loading…';updated.textContent='';refresh.disabled=true;search.disabled=true;statusFilter.disabled=true;sort.disabled=true;previous.disabled=true;nextPage.disabled=true;records=[];
        const version = ++loadVersion; offset = nextOffset; active = queue; host.setAttribute('aria-busy','true');host.innerHTML='<div class="arrow-staff-skeleton" aria-hidden="true"><i></i><i></i><i></i></div>'; 
        try {
          if(queue==='overview') {
            paging.hidden=true;
            const [stats,storage]=await Promise.all([rpc('owner_dashboard_stats',{}),rpc('owner_storage_overview',{})]);
            if(version!==loadVersion || state.activePanel !== 'moderation')return;
            resultCount.textContent='Live account overview';
            renderOwnerOverview(host,stats,storage);
            updated.textContent='Updated '+new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
            return;
          }
          paging.hidden=false;
          const result = queue==='email'?await arrowData('/rest/v1/support_email_threads?select=id,sender_email,sender_name,subject,status,latest_message_at&order=latest_message_at.desc&limit=100&offset='+nextOffset):await rpc(queue === 'requests' ? 'staff_list_requests' : queue === 'reports' ? 'staff_list_reports' : queue==='audit'?'owner_list_audit_log':queue==='beta'?'owner_list_beta_requests':'admin_list_users_v2', { ...(['requests','reports','beta'].includes(queue) ? { p_status: queue==='beta'?'all':null } : {}), p_limit: 100, p_offset: nextOffset }) || [];
          if (version !== loadVersion || state.activePanel !== 'moderation') return;
          records = previewing && queue==='requests' ? result.filter(row=>role==='moderator'?row.request_type==='safety_report':['bug_report','feature_request','safety_report','general_feedback'].includes(row.request_type)) : result;
          if(previewing && role==='moderator' && queue==='reports')records=records.map(row=>({...row,reported_email:null}));
          previous.disabled = nextOffset === 0; nextPage.disabled = result.length < 100; pageLabel.textContent = 'Page ' + (Math.floor(nextOffset / 100) + 1);
          if (host.isConnected) { draw();updated.textContent='Updated '+new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
        } catch (error) { if (version === loadVersion && host.isConnected) { host.innerHTML = sharedDataError(error); resultCount.textContent='Could not load this section. Use Refresh to retry.'; } }
        finally { if(version===loadVersion) { refresh.disabled=false;search.disabled=false;statusFilter.disabled=false;sort.disabled=false;host.setAttribute('aria-busy','false'); } }
      }
      search.oninput = draw;statusFilter.onchange=draw;sort.onchange=draw;clear.onclick=()=>{search.value='';statusFilter.value='';draw();search.focus();};refresh.onclick=()=>load(active,offset);
      state.panelBody.querySelectorAll('[data-queue]').forEach(button => button.onclick = () => load(button.dataset.queue));
      const requested=new URLSearchParams(location.search).get('queue');
      const allowed=['requests','reports','email',...(role!=='moderator'?['users']:[]),...(role==='owner'?['overview','audit','beta']:[])];
      await load(allowed.includes(requested)?requested:(role==='owner'?'overview':'requests'));
    } catch (error) { if (state.activePanel === 'moderation') state.panelBody.innerHTML = sharedDataError(error); }
  }

  let calendarLoad = null;
  let calendarLoadOwner = null;
  async function loadCalendarSources() {
    const owner=currentArrowUserId();
    if(calendarLoad && calendarLoadOwner===owner)return calendarLoad;
    calendarLoadOwner=owner;
    calendarLoad=(async()=>{
      const warnings=[];
      const [owned,memberships,connected]=await Promise.all([
        arrowData('/rest/v1/relay_calendar_events?select=id,title,event_date,start_time,end_time,is_all_day,source_key,details&order=event_date.asc&limit=500'),
        arrowData('/rest/v1/group_members?user_id=eq.'+encodeURIComponent(currentArrowUserId())+'&select=group_id').catch(()=>{warnings.push('Relay group plans could not load.');return [];}),
        arrowData('/functions/v1/calendar-hub',{method:'POST',body:{action:'calendar_events'},readOnly:true}).catch(()=>{warnings.push('Connected calendars could not load.');return {events:[]};})
      ]);
      if(connected?.accountErrors?.length)warnings.push('Some connected calendars need reconnecting in Relay.');
      const groups=[...new Set((memberships||[]).map(m=>m.group_id))];
      const plans=groups.length?await arrowData('/rest/v1/plans?group_id=in.('+groups.map(encodeURIComponent).join(',')+')&select=id,name,start_time,end_time,instances:plan_instances(id,occurs_on)').catch(()=>{warnings.push('Relay group plans could not load.');return [];}):[];
      const events=[...(owned||[])];
      for(const plan of plans||[])for(const instance of plan.instances||[])events.push({id:'relay-plan-'+instance.id,title:plan.name,event_date:instance.occurs_on,start_time:plan.start_time,end_time:plan.end_time,is_all_day:!plan.start_time,read_only:true,source:'Relay plan',source_href:resolveHref('/relay/')+'planner/view/?id='+encodeURIComponent(plan.id)});
      for(const event of connected?.events||[]) {
        const start=new Date(event.isAllDay?event.start.slice(0,10)+'T00:00:00':event.start);
        if(!Number.isFinite(start.getTime()))continue;
        const end=event.end?new Date(event.isAllDay?event.end.slice(0,10)+'T00:00:00':event.end):null;
        // Split multi-day events so every occupied day is visible to the planner.
        const day=new Date(start);day.setHours(0,0,0,0);
        for(let count=0;count<366;count++) {
          const nextDay=new Date(day);nextDay.setDate(day.getDate()+1);
          const first=localDateInputValue(day)===localDateInputValue(start);
          const last=!end||end<=nextDay;
          const clock=date=>String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
          const allDay=Boolean(event.isAllDay)||!first&&!last;
          events.push({id:'calendar-'+event.accountId+'-'+event.id+'-'+localDateInputValue(day),title:event.summary||'Calendar event',event_date:localDateInputValue(day),start_time:allDay?null:first?clock(start):'00:00',end_time:allDay?null:last&&end?clock(end):'23:59',is_all_day:allDay,read_only:true,source:event.calendarName||'Connected calendar',source_href:/^https?:\/\//i.test(event.htmlLink||'')?event.htmlLink:resolveHref('/relay/')+'calendar/'});
          if(last||!end)break;
          day.setDate(day.getDate()+1);
          if(day>=end)break;
        }
      }
      return {events:events.sort((a,b)=>(a.event_date+' '+(a.start_time||'')).localeCompare(b.event_date+' '+(b.start_time||''))),warnings};
    })();
    const pending=calendarLoad;
    try{return await pending;}finally{if(calendarLoad===pending)calendarLoad=null;}
  }

  async function nextMove() {
    if(BETA_BASE || ON_ENTERARROW){
      const [tasks,events,plans]=await Promise.all([
        arrowData('/rest/v1/todos?select=id,title,due_on,completed,position,scheduled_on,scheduled_start,depends_on,priority&limit=500'),
        loadCalendarSources().then(result=>result.events),
        arrowData('/rest/v1/waypoint_items?status=eq.active&select=id,title,item_type,placement,source_key,due_date,due_time,depends_on,why,status&limit=100')
      ]);
      const {planningCandidates}=await import(BETA_BASE+'/next-move.js?v=beta-repair-1');
      const candidates=planningCandidates({tasks,events,plans,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      return {next:candidates[0]||null,source:'calendar',generated_at:new Date().toISOString()};
    }
    const session = readArrowSession();
    if (!session) throw new Error('Sign in to see what is next.');
    const fresh = session.expires_at * 1000 < Date.now() + 30000 ? await refreshArrowSession(session) || session : session;
    const response = await fetch(ON_ENTERARROW ? '/ravin/api/arrow/next' : 'https://ravin-hyeq.onrender.com/api/arrow/next', { method: 'POST', headers: { Authorization: 'Bearer ' + fresh.access_token, 'content-type': 'application/json' }, body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }), signal: AbortSignal.timeout(25000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'RAVIN could not load your next move.');
    return result;
  }

  async function previewPlan(start,end){
    if(!BETA_BASE && !ON_ENTERARROW)throw new Error('Open ARROW to preview your plan.');
    const [tasks,events]=await Promise.all([
      arrowData('/rest/v1/todos?select=id,title,due_on,completed,position,estimated_minutes,scheduled_on,scheduled_start,priority,depends_on&limit=500'),
      loadCalendarSources().then(result=>result.events)
    ]);
    const {buildSchedule}=await import(BETA_BASE+'/autoPlanner.js?v=beta-repair-1');
    return {...buildSchedule({tasks,events,start,end,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}),source:'calendar',can_apply:true};
  }

  function moduleRavinProfile(module) {
    const profiles = {
      orbit: {
        line: 'RAVIN sees the whole ARROW system from here.',
        prompts: ['What needs my attention across ARROW?', 'Find the most connected thing in my Field', 'Where should I go next?'],
      },
      relay: {
        line: 'RAVIN can use your shared notes, tasks, calendar, and Field context without reading private Relay chats by default.',
        prompts: ['What should I follow up on today?', 'Turn my current notes into next actions', 'What do I have coming up?'],
      },
      waypoint: {
        line: 'RAVIN is in planning mode here: tasks, calendar, notes, plans, and direction.',
        prompts: ['What is my best next move?', 'Help me organize what I need to do today', 'What am I forgetting this week?'],
      },
      atlas: {
        line: 'RAVIN is in retrieval mode here: find, connect, and explain the knowledge in your Field.',
        prompts: ['Find everything related to my current project', 'What connects these ideas?', 'Summarize my most relevant recent knowledge'],
      },
      ravin: {
        line: 'Full RAVIN workspace. Ask across every RAVIN-readable part of ARROW.',
        prompts: ['What changed across ARROW recently?', 'Pull together my current priorities', 'Search my Field for something useful'],
      },
    };
    return profiles[module] || profiles.orbit;
  }

  function ravinUrl(prompt = '') {
    const url = new URL(RAVIN_URL, location.href);
    const surface = state.activeModule || 'orbit';
    url.searchParams.set('from', surface);
    url.searchParams.set('surface', surface);
    if (prompt) url.searchParams.set('prompt', prompt);
    return url;
  }

  function renderRavin() {
    // eslint-disable-next-line @next/next/no-assign-module-variable -- Browser-only ARROW center identifier.
    const module = state.activeModule || 'orbit';
    const profile = moduleRavinProfile(module);
    state.panelBody.innerHTML =
      '<div class="arrow-os-ravin-card">' +
        '<div class="arrow-os-ravin-core" aria-hidden="true"></div>' +
        '<div><span>RAVIN · ' + escapeHtml(module.toUpperCase()) + '</span><p>' + escapeHtml(profile.line) + '</p></div>' +
      '</div>' +
      '<div class="arrow-os-ravin-prompts">' +
        profile.prompts.map(prompt => '<button type="button" data-ravin-prompt="' + escapeAttr(prompt) + '">' + escapeHtml(prompt) + '</button>').join('') +
      '</div>' +
      '<form class="arrow-os-ravin-form">' +
        '<input type="text" maxlength="500" placeholder="Ask RAVIN from ' + escapeAttr(module) + '..." aria-label="Ask RAVIN" />' +
        '<button type="submit">Ask ↗</button>' +
      '</form>' +
      '<div class="arrow-os-panel-foot"><span>Context follows you into RAVIN.</span><a href="' + escapeAttr(ravinUrl().toString()) + '">Open full RAVIN ↗</a></div>';

    state.panelBody.querySelectorAll('[data-ravin-prompt]').forEach(button => {
      button.addEventListener('click', () => location.assign(ravinUrl(button.dataset.ravinPrompt).toString()));
    });
    state.panelBody.querySelector('.arrow-os-ravin-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const value = event.currentTarget.querySelector('input')?.value?.trim();
      location.assign(ravinUrl(value || '').toString());
    });
  }

  async function renderNotes() {
    if (state.activePanel !== 'notes') return;
    const version = ++state.renderVersion;
    state.panelBody.innerHTML = '<div class="arrow-os-loading" role="status">Loading shared notes…</div>';
    try {
      const notes = await arrowData('/rest/v1/notes?select=id,title,content,is_pinned,updated_at&order=is_pinned.desc,updated_at.desc&limit=12');
      if (state.activePanel !== 'notes' || version !== state.renderVersion) return;
      state.panelBody.innerHTML =
        '<div class="arrow-os-owner-note"><span>ONE NOTES LIBRARY</span><p>Relay edits the same notes that Field indexes and RAVIN can read.</p><a href="' + escapeAttr(new URL('notes', new URL(RELAY_URL, location.href)).toString()) + '">Open full Notes ↗</a></div>' +
        '<form class="arrow-os-note-form">' +
          '<textarea rows="4" maxlength="4000" placeholder="Quick note — this saves to your shared ARROW notes…" aria-label="Quick note"></textarea>' +
          '<button type="submit">Save shared note</button>' +
        '</form>' +
        '<div class="arrow-os-list">' +
          (notes?.length ? notes.map(note => {
            const blocks = Array.isArray(note.content) ? note.content : [];
            const snippet = blocks.map(block => typeof block?.text === 'string' ? block.text.trim() : '').filter(Boolean).slice(0, 2).join(' · ');
            return '<div class="arrow-os-list-row arrow-os-note-row"><div><strong>' + escapeHtml(note.title || 'Untitled') + '</strong><span>' + escapeHtml(snippet || 'Empty note') + '</span></div></div>';
          }).join('') : panelEmpty('No notes yet.')) +
        '</div>';

      state.panelBody.querySelector('.arrow-os-note-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const area = event.currentTarget.querySelector('textarea');
        const value = area?.value?.trim();
        const userId = currentArrowUserId();
        if (!value || !userId) return;
        const title = value.split(/\n/)[0].slice(0, 80) || 'Quick note';
        const saveButton = event.currentTarget.querySelector('button');
        if (saveButton.disabled) return;
        saveButton.disabled = true;
        try {
          await arrowData('/rest/v1/notes', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: { user_id: userId, title, content: [{ id: id(), type: 'paragraph', text: value }], is_pinned: false },
          });
          renderNotes();
        } catch (error) {
          if (state.activePanel === 'notes') { const status=document.createElement('p'); status.setAttribute('role','alert'); status.textContent=error?.message||'Could not save note.'; state.panelBody.appendChild(status); saveButton.disabled=false; }
        }
      });
    } catch (error) {
      if (state.activePanel === 'notes' && version === state.renderVersion) state.panelBody.innerHTML = sharedDataError(error);
    }
  }

  function ownerNote(tab, copy) {
    const url = new URL(WAYPOINT_URL, location.href);
    url.searchParams.set('from', state.activeModule || 'orbit');
    url.searchParams.set('tab', tab);
    return '<div class="arrow-os-owner-note"><span>WAYPOINT</span><p>' + copy + '</p><a href="' + escapeAttr(url.toString()) + '">Open Waypoint ↗</a></div>';
  }

  async function savePanelAction(control, action) {
    if (control?.dataset.busy === 'true') return false;
    if (control) { control.dataset.busy = 'true'; control.disabled = true; }
    const version = state.renderVersion;
    try { await action(); return true; }
    catch (error) {
      if (version === state.renderVersion && state.panelBody) {
        let status = state.panelBody.querySelector('.arrow-os-action-error');
        if (!status) { status = document.createElement('p'); status.className = 'arrow-os-action-error'; status.setAttribute('role','alert'); state.panelBody.appendChild(status); }
        status.textContent = error?.message || 'Could not save. Try again.';
      }
      return false;
    } finally { if (control) { delete control.dataset.busy; control.disabled = false; } }
  }

  let taskListView = "open";
  let taskListPage = 0;
  async function renderTasks() {
    if (state.activePanel !== 'tasks') return;
    const version = ++state.renderVersion;
    state.panelBody.innerHTML = '<div class="arrow-os-loading" role="status">Loading shared tasks…</div>';
    try {
      const filter = taskListView==='all' ? '' : '&completed=eq.'+(taskListView==='completed');
      const order = taskListView==='open' ? 'due_on.asc,position.asc,created_at.asc,id.asc' : 'created_at.desc,id.asc';
      const page = await arrowData('/rest/v1/todos?select=id,title,due_on,completed,position,created_at,scheduled_on,scheduled_start'+filter+'&order='+order+'&limit=81&offset='+taskListPage*80);
      const tasks = (page || []).slice(0,80);
      if (state.activePanel !== 'tasks' || version !== state.renderVersion) return;
      state.panelBody.innerHTML =
        ownerNote('today', 'Waypoint is the planning view. Relay and RAVIN use this exact same task data.') +
        '<form class="arrow-os-inline-form arrow-os-task-form">' +
          '<input type="text" maxlength="120" placeholder="Add a task…" aria-label="Task name" required />' +
          '<input type="date" aria-label="Due date" required />' +
          '<button type="submit" aria-label="Add task">' + icon('plus') + '</button>' +
        '</form>' +
        '<div class="arrow-os-task-filters" role="group" aria-label="Task view">'+['open','completed','all'].map(view=>'<button type="button" data-task-view="'+view+'" aria-pressed="'+(view===taskListView)+'">'+(view==='open'?'Open':view==='completed'?'Completed':'All')+'</button>').join('')+'</div>'+
        '<p class="arrow-os-panel-copy">'+(taskListView==='open'?'Open tasks · completed work is in Completed.':'Page '+(taskListPage+1))+'</p>'+
        '<div class="arrow-os-list">' +
          (tasks?.length ? tasks.map(task =>
            '<div class="arrow-os-list-row ' + (task.completed ? 'is-done' : '') + '" data-id="' + escapeAttr(task.id) + '">' +
              '<label><input type="checkbox" ' + (task.completed ? 'checked' : '') + ' /><span>' + escapeHtml(task.title) + '<small>' + escapeHtml((task.due_on || 'No deadline')+(task.scheduled_on?' · Scheduled '+task.scheduled_on+' '+(task.scheduled_start?.slice(0,5)||''):'')) + '</small></span></label>' +
              '<button type="button" class="arrow-os-row-delete" aria-label="Delete task">' + icon('trash') + '</button>' +
            '</div>'
          ).join('') : panelEmpty(taskListView==='open'?'No open tasks.':'No tasks in this view.')) +
        '</div><div class="arrow-os-task-filters"><button type="button" data-task-page="previous" '+(taskListPage===0?'disabled':'')+'>Previous tasks</button><button type="button" data-task-page="next" '+((page||[]).length<=80?'disabled':'')+'>Next tasks</button></div>';
      state.panelBody.querySelectorAll('[data-task-view]').forEach(button=>button.addEventListener('click',()=>{taskListView=button.dataset.taskView;taskListPage=0;renderTasks();}));
      state.panelBody.querySelectorAll('[data-task-page]').forEach(button=>button.addEventListener('click',()=>{taskListPage=Math.max(0,taskListPage+(button.dataset.taskPage==='next'?1:-1));renderTasks();}));

      const form = state.panelBody.querySelector('.arrow-os-task-form');
      form.querySelector('input[type="date"]').value = localDateInputValue();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const [titleInput, dateInput] = form.querySelectorAll('input');
        const userId = currentArrowUserId();
        const title = titleInput.value.trim();
        if (!title || !dateInput.value || !userId) return;
        const saved = await savePanelAction(form.querySelector('button'), () => arrowData('/rest/v1/todos', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: { user_id: userId, title, due_on: dateInput.value },
        }));
        if (saved) renderTasks();
      });

      state.panelBody.querySelectorAll('.arrow-os-list-row').forEach(row => {
        row.querySelector('input')?.addEventListener('change', async event => {
          const saved = await savePanelAction(event.currentTarget, () => arrowData('/rest/v1/todos?id=eq.' + encodeURIComponent(row.dataset.id), {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: { completed: event.target.checked },
          }));
          if (saved) renderTasks(); else event.target.checked = !event.target.checked;
        });
        row.querySelector('.arrow-os-row-delete')?.addEventListener('click', async () => {
          if (!confirm('Delete this task?')) return;
          const saved = await savePanelAction(row.querySelector('.arrow-os-row-delete'), () => arrowData('/rest/v1/todos?id=eq.' + encodeURIComponent(row.dataset.id), { method: 'DELETE' }));
          if (saved) renderTasks();
        });
      });
    } catch (error) {
      if (state.activePanel === 'tasks' && version === state.renderVersion) state.panelBody.innerHTML = sharedDataError(error);
    }
  }

  async function renderCalendar() {
    if (state.activePanel !== 'calendar') return;
    const version = ++state.renderVersion;
    state.panelBody.innerHTML = '<div class="arrow-os-loading" role="status">Loading shared calendar…</div>';
    try {
      const {events,warnings} = await loadCalendarSources();
      if (state.activePanel !== 'calendar' || version !== state.renderVersion) return;
      state.panelBody.innerHTML =
        ownerNote('calendar', 'Shared events, Relay plans, and connected calendars in one view. Manage imported events at their source.') +
        warnings.map(warning=>'<p role="status" class="arrow-os-panel-copy">'+escapeHtml(warning)+'</p>').join('') +
        '<form class="arrow-os-calendar-form">' +
          '<input type="text" maxlength="100" placeholder="Event title" aria-label="Event title" required />' +
          '<div class="arrow-os-form-grid">' +
            '<input type="date" aria-label="Event date" required />' +
            '<input type="time" aria-label="Event time" />' +
            '<input type="time" aria-label="Event end time" disabled />' +
          '</div>' +
          '<button type="submit">Add shared event</button>' +
        '</form>' +
        '<div class="arrow-os-list arrow-os-events">' +
          (events?.length ? events.map(item =>
            '<div class="arrow-os-list-row" data-id="' + escapeAttr(item.id) + '">' +
              '<div><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(formatEventDate(item.event_date, item.is_all_day?'All day':(item.start_time?.slice(0,5)||'')+(item.end_time?'–'+item.end_time.slice(0,5):item.start_time?' · end time not set':''))) + '</span></div>' +
              (item.read_only ? '<a class="arrow-os-source-link" href="'+escapeAttr(item.source_href||resolveHref('/relay/')+'calendar/')+'">'+escapeHtml(item.source||'Open source')+' ↗</a>' : '<button type="button" class="arrow-os-row-delete" aria-label="Delete event">' + icon('trash') + '</button>') +
            '</div>'
          ).join('') : panelEmpty('No ARROW events yet.')) +
        '</div>';

      const form = state.panelBody.querySelector('.arrow-os-calendar-form');
      const [startInput,endInput] = form.querySelectorAll('input[type="time"]');
      startInput.addEventListener('change',()=>{endInput.disabled=!startInput.value;endInput.required=!!startInput.value;if(!startInput.value)endInput.value='';});
      form.querySelector('input[type="date"]').value = localDateInputValue();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const [titleInput, dateInput, timeInput, endInput] = form.querySelectorAll('input');
        const userId = currentArrowUserId();
        const title = titleInput.value.trim();
        if (!title || !dateInput.value || !userId) return;
        if(timeInput.value && (!endInput.value || endInput.value<=timeInput.value)) {
          endInput.setCustomValidity('Choose an end time after the start time.');endInput.reportValidity();
          endInput.addEventListener('input',()=>endInput.setCustomValidity(''),{once:true});return;
        }
        const saved = await savePanelAction(form.querySelector('button'), () => arrowData('/rest/v1/relay_calendar_events', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: { user_id: userId, title, event_date: dateInput.value, is_all_day: !timeInput.value, start_time: timeInput.value || null, end_time: timeInput.value ? endInput.value : null },
        }));
        if (saved) renderCalendar();
      });

      state.panelBody.querySelectorAll('.arrow-os-events .arrow-os-list-row').forEach(row => {
        row.querySelector('.arrow-os-row-delete')?.addEventListener('click', async () => {
          if (!confirm('Delete this event?')) return;
          const saved = await savePanelAction(row.querySelector('.arrow-os-row-delete'), () => arrowData('/rest/v1/relay_calendar_events?id=eq.' + encodeURIComponent(row.dataset.id), { method: 'DELETE' }));
          if (saved) renderCalendar();
        });
      });
    } catch (error) {
      if (state.activePanel === 'calendar' && version === state.renderVersion) state.panelBody.innerHTML = sharedDataError(error);
    }
  }

  function renderLinks() {
    const rawLinks = readJson(STORAGE.links, []);
    const links = Array.isArray(rawLinks)
      ? rawLinks
          .filter(item => item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.url === 'string')
          .map(item => ({ ...item, url: normalizeUrl(item.url) }))
          .filter(item => item.url)
          .slice(0, 500)
      : [];
    state.panelBody.innerHTML =
      '<form class="arrow-os-link-form">' +
        '<input type="text" maxlength="70" placeholder="Name" aria-label="Link name" required />' +
        '<input type="url" placeholder="https://..." aria-label="Link URL" required />' +
        '<button type="submit">Add link</button>' +
      '</form>' +
      '<div class="arrow-os-list arrow-os-links">' +
        (links.length ? links.map(item =>
          '<div class="arrow-os-list-row" data-id="' + escapeAttr(item.id) + '">' +
            '<a href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(item.label) + '</strong><span>' + escapeHtml(shortHost(item.url)) + '</span></a>' +
            '<button type="button" class="arrow-os-row-delete" aria-label="Delete link">' + icon('trash') + '</button>' +
          '</div>'
        ).join('') : panelEmpty('No saved links yet.')) +
      '</div>';

    state.panelBody.querySelector('.arrow-os-link-form').addEventListener('submit', event => {
      event.preventDefault();
      const [nameInput, urlInput] = event.currentTarget.querySelectorAll('input');
      const label = nameInput.value.trim();
      const url = normalizeUrl(urlInput.value.trim());
      if (!label || !url) return;
      writeJson(STORAGE.links, [{ id: id(), label, url, createdAt: Date.now() }, ...links]);
      renderLinks();
    });

    state.panelBody.querySelectorAll('.arrow-os-links .arrow-os-list-row').forEach(row => {
      row.querySelector('.arrow-os-row-delete').addEventListener('click', () => {
        writeJson(STORAGE.links, links.filter(item => item.id !== row.dataset.id));
        renderLinks();
      });
    });
  }

  function localDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function focusMinutes() {
    const value = Number(readString(STORAGE.focusMinutes, '25'));
    return [15, 25, 45, 60].includes(value) ? value : 25;
  }

  function saveFocusState() {
    if (state.focusRunning) {
      const elapsed = Math.max(0, Math.floor((Date.now() - state.focusUpdatedAt) / 1000));
      state.focusRemaining = Math.max(0, state.focusRemaining - elapsed);
      state.focusUpdatedAt += elapsed * 1000;
    }
    writeJson(STORAGE.focusState, {
      remaining: Math.min(3600, Math.max(0, Math.floor(state.focusRemaining))),
      running: Boolean(state.focusRunning),
      updatedAt: Date.now(),
    });
  }

  function restoreFocusState() {
    const saved = readJson(STORAGE.focusState, null);
    if (!saved || typeof saved !== 'object') {
      state.focusRemaining = focusMinutes() * 60;
      state.focusRunning = false;
      state.focusUpdatedAt = Date.now();
      return;
    }

    const baseRemaining = Math.min(3600, Number(saved.remaining));
    state.focusRemaining = Number.isFinite(baseRemaining) && baseRemaining >= 0
      ? baseRemaining
      : focusMinutes() * 60;
    state.focusRunning = Boolean(saved.running) && state.focusRemaining > 0;
    const savedAt = Number(saved.updatedAt) || Date.now();

    if (state.focusRunning) {
      const elapsed = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
      state.focusRemaining = Math.max(0, state.focusRemaining - elapsed);
      if (state.focusRemaining <= 0) state.focusRunning = false;
    }

    state.focusUpdatedAt = Date.now();
    if (state.focusRunning) beginFocusInterval();
  }

  function resetFocus(minutes = focusMinutes()) {
    stopFocusTimer(false);
    state.focusRemaining = minutes * 60;
    state.focusUpdatedAt = Date.now();
    saveFocusState();
    renderFocus();
  }

  function beginFocusInterval() {
    clearInterval(state.focusTimer);
    state.focusTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.focusUpdatedAt) / 1000);
      if (elapsed <= 0) return;
      state.focusUpdatedAt += elapsed * 1000;
      state.focusRemaining = Math.max(0, state.focusRemaining - elapsed);
      updateFocusDisplay();
      if (state.focusRemaining <= 0) {
        stopFocusTimer(true);
        if (state.activePanel === 'focus') renderFocus();
        const previousTitle = document.title;
        document.title = 'Focus complete · ARROW';
        setTimeout(() => {
          if (document.title === 'Focus complete · ARROW') document.title = previousTitle;
        }, 4000);
      }
    }, 250);
  }

  function startFocusTimer() {
    if (state.focusRunning) return;
    if (state.focusRemaining <= 0) state.focusRemaining = focusMinutes() * 60;
    state.focusRunning = true;
    state.focusUpdatedAt = Date.now();
    beginFocusInterval();
    saveFocusState();
    renderFocus();
  }

  function stopFocusTimer(save = true) {
    if (save && state.focusRunning) {
      const elapsed = Math.max(0, Math.floor((Date.now() - state.focusUpdatedAt) / 1000));
      state.focusRemaining = Math.max(0, state.focusRemaining - elapsed);
    }
    state.focusRunning = false;
    clearInterval(state.focusTimer);
    state.focusTimer = null;
    state.focusUpdatedAt = Date.now();
    if (save) saveFocusState();
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return min + ':' + sec;
  }

  function updateFocusDisplay() {
    const display = state.panelBody?.querySelector('.arrow-os-focus-time');
    if (display) display.textContent = formatTime(state.focusRemaining);
  }

  function renderFocus() {
    if (!state.focusRunning && state.focusUpdatedAt === 0) {
      state.focusRemaining = focusMinutes() * 60;
      state.focusUpdatedAt = Date.now();
    }

    state.panelBody.innerHTML =
      '<div class="arrow-os-focus">' +
        '<span class="arrow-os-focus-label">FOCUS TIMER</span>' +
        '<strong class="arrow-os-focus-time">' + formatTime(state.focusRemaining) + '</strong>' +
        '<div class="arrow-os-focus-actions">' +
          '<button type="button" data-focus-action="toggle">' + (state.focusRunning ? icon('pause') + 'Pause' : icon('play') + 'Start') + '</button>' +
          '<button type="button" data-focus-action="reset">' + icon('reset') + 'Reset</button>' +
        '</div>' +
        '<div class="arrow-os-presets">' +
          [15,25,45,60].map(value => '<button type="button" data-focus-minutes="' + value + '" class="' + (focusMinutes() === value ? 'is-active' : '') + '">' + value + ' min</button>').join('') +
        '</div>' +
      '</div>';

    state.panelBody.querySelector('[data-focus-action="toggle"]').addEventListener('click', () => {
      if (state.focusRunning) {
        stopFocusTimer(true);
        renderFocus();
      } else {
        startFocusTimer();
      }
    });
    state.panelBody.querySelector('[data-focus-action="reset"]').addEventListener('click', () => resetFocus());
    state.panelBody.querySelectorAll('[data-focus-minutes]').forEach(button => {
      button.addEventListener('click', () => {
        const value = Number(button.dataset.focusMinutes);
        writeString(STORAGE.focusMinutes, String(value));
        resetFocus(value);
      });
    });
  }

  function updateAppearanceState() {
    if (!state.panelBody) return;
    const choices = {
      adapt: getAdaptChoice(), theme: getThemeChoice(), motion: getMotionChoice(),
      experience: getExperienceChoice(), accent: getAccentChoice(),
    };
    Object.entries(choices).forEach(([kind, value]) => {
      state.panelBody.querySelectorAll('[data-' + kind + '-choice]').forEach(button => {
        const selected = button.getAttribute('data-' + kind + '-choice') === value;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    });
  }


  // Preview Lab has local state only. Browsing identities must NEVER write a
  // preference, switch the active module, or alter account data.
  function renderIdentityPreview(identity, surface = 'home') {
    const safe = ADAPT_CHOICES.some(([id]) => id === identity) ? identity : 'core';
    const nav = {
      core:'<span>◈  Orbit</span><span>▦  Tasks</span><span>✦  RAVIN</span>',
      bloom:'<span>✿  Home</span><span>♡  Tasks</span><span>✦  RAVIN</span>',
      haven:'<span>Home /</span><span>Notes /</span><span>Plans /</span>',
      atelier:'<span>01. HOME</span><span>02. NOTES</span><span>03. AI</span>',
      pulse:'<span>01 HOME</span><span>02 OPS</span><span>03 AI</span>',
    }[safe];
    const header = {
      core:'ARROW // COMMAND',
      bloom:'Your happy place ✿',
      haven:'A place to return to.',
      atelier:'On the things ahead.',
      pulse:'YOUR WORLD. YOUR RULES.',
    }[safe];
    const titles = {
      core:['TASKS','RAVIN'],
      bloom:['Little wins','Your AI companion'],
      haven:['Today’s notes','A thought from RAVIN'],
      atelier:['Priorities','Correspondence'],
      pulse:['TASK STATUS','AI ACTIVE'],
    }[safe];
    if (surface === 'conversation') {
      const role = {
        core:'SYSTEM / RAVIN',
        bloom:'✿ From RAVIN',
        haven:'FROM A FRIEND',
        atelier:'II. CORRESPONDENCE',
        pulse:'◆ SIGNAL RECEIVED',
      }[safe];
      return '<div class="arrow-os-lab-nav">' + nav + '</div>' +
        '<div class="arrow-os-lab-content arrow-os-lab-conversation">' +
          '<div class="arrow-os-lab-masthead"><small>ARROW / RELAY + RAVIN</small><strong>Conversation</strong></div>' +
          '<div class="arrow-os-lab-chat-rows">' +
            '<div class="arrow-os-lab-chat incoming"><small>' + role + '</small><span>The same conversations. A new interface.</span></div>' +
            '<div class="arrow-os-lab-chat outgoing"><small>YOU</small><span>Show me what we can build next.</span></div>' +
          '</div>' +
          '<div class="arrow-os-lab-composer"><span>Write a message...</span><strong aria-hidden="true">↗</strong></div>' +
        '</div>';
    }
    return '<div class="arrow-os-lab-nav">' + nav + '</div>' +
      '<div class="arrow-os-lab-content">' +
        '<div class="arrow-os-lab-masthead"><small>ARROW / ' + safe.toUpperCase() + '</small><strong>' + header + '</strong></div>' +
        '<div class="arrow-os-lab-samples">' +
          '<div class="arrow-os-lab-sample"><span aria-hidden="true">✓</span><small>' + titles[0] + '</small><strong>04</strong></div>' +
          '<div class="arrow-os-lab-sample"><span aria-hidden="true">✦</span><small>' + titles[1] + '</small><strong>Ready</strong></div>' +
        '</div>' +
        '<div class="arrow-os-lab-message"><span aria-hidden="true">◉</span> The same workspace, a different experience.</div>' +
      '</div>';
  }
  function renderPreviewLab(choice, resolvedDark, surface = 'home') {
    const lab = state.panelBody?.querySelector('[data-adapt-preview-lab]');
    if (!lab) return;
    const normalized = ADAPT_CHOICES.some(([id]) => id === choice) ? choice : 'core';
    const preset = paletteChoices(normalized).find(([id]) => id === getAccentChoice(normalized)) || paletteChoices(normalized)[0];
    const color = getAccentChoice(normalized) === 'custom' ? getCustomColor(normalized) : preset[2];
    const secondary = getAccentChoice(normalized) === 'custom' ? color : preset[3];
    const stage = lab.querySelector('[data-adapt-preview-stage]');
    stage.dataset.previewIdentity = normalized;
    stage.dataset.previewTheme = resolvedDark ? 'dark' : 'light';
    stage.style.setProperty('--lab-accent',color);
    stage.style.setProperty('--lab-secondary',secondary);
    stage.dataset.previewSurface = surface;
    stage.innerHTML = renderIdentityPreview(normalized,surface);
    lab.querySelectorAll('[data-adapt-preview-surface]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.adaptPreviewSurface===surface));
    });
    lab.querySelectorAll('[data-adapt-preview-choice]').forEach(button => {
      const selected=button.dataset.adaptPreviewChoice===normalized;
      button.setAttribute('aria-pressed',String(selected));
    });
    const modeButton = lab.querySelector('[data-adapt-preview-theme]');
    modeButton.textContent = resolvedDark ? '☀ Light preview' : '☾ Dark preview';
    modeButton.setAttribute('aria-label',resolvedDark?'Preview light mode':'Preview dark mode');
    lab.querySelector('[data-adapt-preview-apply]').disabled = getAdaptChoice()===normalized;
    lab.querySelector('[data-adapt-preview-apply]').textContent = getAdaptChoice()===normalized ? 'Current identity' : 'Use '+capitalize(normalized);
  }

  function renderAppearance() {
    const theme = getThemeChoice();
    const motion = getMotionChoice();
    const currentIdentity = getAdaptChoice();
    const accent = getAccentChoice(currentIdentity);
    state.panelBody.innerHTML =
      '<div class="arrow-os-section">' +
        '<span class="arrow-os-section-label">ARROW ADAPT · VISUAL IDENTITY</span>' +
        '<div class="arrow-os-segmented arrow-os-adapt-grid">' +
          ADAPT_CHOICES.map(([value,label]) => '<button type="button" data-adapt-choice="' + value + '">' + label + '</button>').join('') +
        '</div>' +
        '<small class="arrow-os-adapt-help">Identity changes ARROW navigation, component design, fonts and widget composition.</small>' +
      '</div>' +
      '<div class="arrow-os-section arrow-os-preview-lab" data-adapt-preview-lab>' +
        '<span class="arrow-os-section-label">IDENTITY PREVIEW LAB · NO CHANGES UNTIL APPLIED</span>' +
        '<div class="arrow-os-lab-controls" role="group" aria-label="Preview an ARROW identity">' +
          ADAPT_CHOICES.map(([value,label]) => '<button type="button" data-adapt-preview-choice="' + value + '">' + label + '</button>').join('') +
        '</div>' +
        '<div class="arrow-os-lab-surface-switch" role="group" aria-label="Preview surface">' +
          '<button type="button" data-adapt-preview-surface="home" aria-pressed="true">Home</button>' +
          '<button type="button" data-adapt-preview-surface="conversation">Messaging</button>' +
        '</div>' +
        '<div class="arrow-os-lab-stage" data-adapt-preview-stage aria-label="Sample ARROW interface preview"></div>' +
        '<div class="arrow-os-lab-actions">' +
          '<button type="button" data-adapt-preview-theme>☾ Dark preview</button>' +
          '<button type="button" data-adapt-preview-apply>Use this identity</button>' +
        '</div>' +
        '<small class="arrow-os-adapt-help">Sample content only. Previewing does not change your active identity or saved settings.</small>' +
      '</div>' +
      '<div class="arrow-os-section">' +
        '<span class="arrow-os-section-label">THEME</span>' +
        '<div class="arrow-os-segmented">' +
          ['system','light','dark'].map(value => '<button type="button" data-theme-choice="' + value + '" class="' + (theme === value ? 'is-active' : '') + '">' + capitalize(value) + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<div class="arrow-os-section">' +
        '<span class="arrow-os-section-label">MOTION</span>' +
        '<div class="arrow-os-segmented">' +
          [['system','System'],['full','Full'],['reduce','Reduced']].map(([value,label]) => '<button type="button" data-motion-choice="' + value + '" class="' + (motion === value ? 'is-active' : '') + '">' + label + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<div class="arrow-os-section">' +
        '<span class="arrow-os-section-label">COLOR PALETTE · ' + escapeHtml(currentIdentity.toUpperCase()) + '</span>' +
        '<div class="arrow-os-accents arrow-os-palette-grid">' +
          paletteChoices(currentIdentity).map(([value,label,primary,secondary]) =>
            '<button type="button" data-accent-choice="' + value + '" aria-label="' + escapeAttr(label) + '" class="' + (accent === value ? 'is-active' : '') + '">' +
              '<i style="--swatch:' + primary + ';--swatch-secondary:' + secondary + '"></i><span>' + escapeHtml(label) + '</span>' +
            '</button>'
          ).join('') +
          '<button type="button" data-accent-choice="custom" class="arrow-os-custom-choice' + (accent === 'custom' ? ' is-active' : '') + '">' +
            '<i style="--swatch:' + getCustomColor(currentIdentity) + ';--swatch-secondary:' + getCustomColor(currentIdentity) + '"></i><span>Custom</span>' +
          '</button>' +
        '</div>' +
        '<label class="arrow-os-custom-accent">Custom color for ' + escapeHtml(capitalize(currentIdentity)) + '<input type="color" data-custom-accent value="' + escapeAttr(getCustomColor(currentIdentity)) + '" /></label>' +
        '<small class="arrow-os-adapt-help">Every identity remembers its palette and custom color.</small>' +
      '</div>';

    let previewIdentity = currentIdentity;
    let previewDark = document.documentElement.dataset.arrowTheme === 'dark';
    let previewSurface = 'home';
    renderPreviewLab(previewIdentity,previewDark,previewSurface);
    state.panelBody.querySelectorAll('[data-adapt-preview-surface]').forEach(button => {
      button.addEventListener('click', () => {
        previewSurface=button.dataset.adaptPreviewSurface;
        renderPreviewLab(previewIdentity,previewDark,previewSurface);
      });
    });
    state.panelBody.querySelectorAll('[data-adapt-preview-choice]').forEach(button => {
      button.addEventListener('click', () => {
        previewIdentity=button.dataset.adaptPreviewChoice;
        renderPreviewLab(previewIdentity,previewDark,previewSurface);
      });
    });
    state.panelBody.querySelector('[data-adapt-preview-theme]').addEventListener('click', () => {
      previewDark=!previewDark;
      renderPreviewLab(previewIdentity,previewDark,previewSurface);
    });
    state.panelBody.querySelector('[data-adapt-preview-apply]').addEventListener('click', () => applyAdapt(previewIdentity,true));
    state.panelBody.querySelector('[data-custom-accent]').addEventListener('input', event => applyAccent(event.target.value, true));
    state.panelBody.querySelectorAll('[data-adapt-choice]').forEach(button => {
      button.addEventListener('click', () => applyAdapt(button.dataset.adaptChoice, true));
    });
    updateAppearanceState();
    state.panelBody.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => applyTheme(button.dataset.themeChoice, true));
    });
    state.panelBody.querySelectorAll('[data-motion-choice]').forEach(button => {
      button.addEventListener('click', () => applyMotion(button.dataset.motionChoice, true));
    });
    state.panelBody.querySelectorAll('[data-accent-choice]').forEach(button => {
      button.addEventListener('click', () => {
        applyAccent(button.dataset.accentChoice, true);
      });
    });
  }

  function renderSettings() {
    const asArray = value => Array.isArray(value) ? value : [];
    const links = asArray(readJson(STORAGE.links, []));

    state.panelBody.innerHTML =
      '<div class="arrow-os-settings-card">' +
        '<span>Preferences on this device</span>' +
        '<strong>' + links.length + ' saved links · ' + escapeHtml(getThemeChoice()) + ' theme · ' + escapeHtml(getMotionChoice()) + ' motion</strong>' +
        '<small>Appearance, links and focus settings are shared across ARROW tabs on this device. Tasks, notes, calendar and plans are saved to your account.</small>' +
      '</div>' +
      '<div class="arrow-os-settings-actions">' +
        '<a href="' + escapeAttr(resolveHref('/relay/profile/')) + '">Profile, account and recovery</a>' +
        '<button type="button" data-open-notifications>Open shared notifications</button>' +
        '<a href="' + escapeAttr(resolveHref('/relay/profile/#notifications')) + '">Notifications and device setup</a>' +
        '<a href="' + escapeAttr(resolveHref('/relay/profile/#appearance')) + '">Relay appearance, layout and particles</a>' +
        '<a href="' + escapeAttr(resolveHref('/relay/profile/#account-data')) + '">Export account data or delete account</a>' +
        '<a href="' + escapeAttr(resolveHref('/relay/privacy/')) + '">ARROW privacy policy</a>' +
        '<a href="' + escapeAttr(resolveHref('/relay/terms/')) + '">Terms of use</a>' +
        '<a href="' + escapeAttr(resolveHref('/relay/help/')) + '">Setup guide and help</a>' +
        '<a data-arrow-channel href="https://link9060.github.io/Resonant-Relay/beta-access/">Request Beta access</a>' +
        '<a data-arrow-channel href="https://link9060.github.io/Resonant-Relay/">Open Beta site</a>' +
        '<a data-arrow-channel href="https://enterarrow.com/">'+(BETA_BASE?'Back to public ARROW':'Public ARROW site')+'</a>' +
        '<button type="button" data-settings-action="intro">Replay Orbit intro</button>' +
        '<button type="button" data-settings-action="export">Export preferences</button>' +
        '<label class="arrow-os-import">Import preferences<input type="file" accept="application/json" data-settings-action="import" /></label>' +
        (SIGNOUT_URL ? '<button type="button" class="is-danger" data-settings-action="signout">Sign out of ARROW</button>' : '') +
        '<button type="button" class="is-danger" data-settings-action="reset">Reset preferences</button>' +
      '</div>';

    state.panelBody.querySelector('[data-open-notifications]').onclick=()=>openPanel('notifications',state.activeModule||'orbit');
    state.panelBody.querySelector('[data-settings-action="intro"]').addEventListener('click', () => {
      const url = new URL(ORBIT_URL, location.origin);
      url.searchParams.set('intro', '1');
      location.assign(url.toString());
    });
    state.panelBody.querySelector('[data-settings-action="export"]').addEventListener('click', exportData);
    state.panelBody.querySelector('[data-settings-action="import"]').addEventListener('change', importData);
    const signoutButton = state.panelBody.querySelector('[data-settings-action="signout"]');
    signoutButton?.addEventListener('click', async () => {
      signoutButton.disabled=true;
      if(BETA_BASE){
        try {await arrowData('/auth/v1/logout?scope=local',{method:'POST'});} catch { /* Always clear this device's session even if the network is unavailable. */ }
        localStorage.removeItem(ARROW_AUTH_STORAGE_KEY);
        for(const key of ['ravin_access_token','ravin_refresh_token','ravin_user','ravin_token_expires_at'])localStorage.removeItem(key);
      }
      location.assign(SIGNOUT_URL);
    });

    state.panelBody.querySelector('[data-settings-action="reset"]').addEventListener('click', () => {
      if (!confirm('Reset appearance, saved links and focus settings on this device? Your account tasks, notes, plans and events stay saved.')) return;
      Object.values(STORAGE).forEach(key => {
        try { localStorage.removeItem(key); } catch {}
      });
      applyTheme('system', false);
      applyMotion('system', false);
      applyExperienceChoice('balanced', false);
      applyAdapt('core', false);
      stopFocusTimer(false);
      state.focusRemaining = 25 * 60;
      state.focusUpdatedAt = 0;
      renderSettings();
      state.instances.forEach(updateInstanceState);
    });
  }

  function exportData() {
    const data = {};
    Object.entries(STORAGE).forEach(([name, key]) => {
      data[name] = readString(key, '');
    });
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arrow-preferences.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('ARROW import files must be smaller than 1 MB.');
      const payload = JSON.parse(await file.text());
      if (payload?.version !== 1 || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new Error('Invalid ARROW export.');
      for (const name of ['tasks', 'events', 'links']) {
        const raw = payload.data[name];
        if (raw && (typeof raw !== 'string' || !Array.isArray(JSON.parse(raw)))) throw new Error('Invalid ARROW ' + name + ' data.');
      }
      Object.entries(STORAGE).forEach(([name, key]) => {
        if (typeof payload.data[name] === 'string') localStorage.setItem(key, payload.data[name]);
      });
      applyTheme(getThemeChoice(), false);
      applyMotion(getMotionChoice(), false);
      applyExperienceChoice(getExperienceChoice(), false);
      applyAdapt(getAdaptChoice(), false);
      stopFocusTimer(false);
      restoreFocusState();
      renderSettings();
      alert('ARROW preferences imported.');
    } catch (error) {
      alert(error?.message || 'Could not import that ARROW data file.');
    } finally {
      event.target.value = '';
    }
  }

  function formatEventDate(date, time) {
    const parsed = new Date(date + 'T' + (time || '12:00'));
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
  }

  function normalizeUrl(value) {
    try {
      const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : 'https://' + value;
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function shortHost(value) {
    try { return new URL(value).hostname.replace(/^www\./, ''); }
    catch { return value; }
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function moduleOrbitControl(module) {
    const instance = [...state.instances].find(item => item.module === module);
    if (!instance?.root) return null;
    return (
      instance.root.querySelector('.arrow-os-trigger') ||
      instance.root.querySelector('.arrow-os-orbit')
    );
  }

  function viewportPoint(element) {
    const rect = element?.getBoundingClientRect?.();
    if (!rect || (!rect.width && !rect.height)) {
      return { x: innerWidth / 2, y: innerHeight / 2 };
    }
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function startParticleCanvas(canvas, direction) {
    if (!(canvas instanceof HTMLCanvasElement)) return;
    let context = null;
    try {
      context = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!context) return;

    const width = innerWidth;
    const height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width / 2;
    const cy = height / 2;
    const count = width < 700 ? 150 : 230;
    const radius = Math.hypot(width, height) * .62;
    const particles = Array.from({ length: count }, (_, index) => {
      const angle = Math.PI * 2 * index / count + (index % 9) * .018;
      const lane = .18 + ((index * 37) % 100) / 100 * .82;
      return {
        angle,
        distance: radius * lane,
        size: 1.1 + (index % 5) * .52,
        delay: (index % 17) * 5.5,
        bend: ((index % 7) - 3) * .028,
        alpha: .44 + (index % 6) * .09,
      };
    });

    const inward = direction === 'in';
    const startedAt = performance.now();
    const duration = inward ? 420 : 380;
    let frame = 0;

    const easeIn = value => value * value * value;
    const easeOut = value => 1 - Math.pow(1 - value, 3);

    const draw = now => {
      const elapsed = now - startedAt;
      const global = Math.min(1, elapsed / duration);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        const local = Math.max(0, Math.min(1, (elapsed - particle.delay) / (duration - particle.delay)));
        if (local <= 0) continue;

        const travel = inward ? easeIn(local) : easeOut(local);
        const r = inward
          ? particle.distance * (1 - travel)
          : particle.distance * travel;
        const spiral = particle.angle + particle.bend * travel * 12;
        const x = cx + Math.cos(spiral) * r;
        const y = cy + Math.sin(spiral) * r * .72;
        const speedGlow = inward ? travel : 1 - Math.abs(.5 - travel) * .8;
        const length = 3 + speedGlow * (inward ? 19 : 13);
        const tailX = x - Math.cos(spiral) * length * (inward ? -1 : 1);
        const tailY = y - Math.sin(spiral) * length * .72 * (inward ? -1 : 1);

        const fade = inward
          ? Math.min(1, local * 3) * (1 - Math.max(0, (local - .86) / .14))
          : Math.min(1, local * 4) * (1 - Math.max(0, (local - .9) / .1));

        context.strokeStyle = `rgba(255,255,255,${particle.alpha * fade})`;
        context.lineWidth = Math.max(.65, particle.size * .58);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x, y);
        context.stroke();

        context.fillStyle = `rgba(255,255,255,${Math.min(1, particle.alpha * 1.22) * fade})`;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = 'source-over';
      if (global < 1 && document.documentElement.contains(canvas)) {
        frame = requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };

    frame = requestAnimationFrame(draw);
    canvas.dataset.frame = String(frame);
  }

  function warpPageIntoSingularity(point) {
    const selector = [
      'header','nav','aside','main > *','main section','main article',
      'h1','h2','h3','p','button','a','[role="button"]',
      '[class*="card"]','[class*="panel"]'
    ].join(',');

    const candidates = [...document.querySelectorAll(selector)]
      .filter(element => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.closest('.arrow-os-handoff')) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 10) return false;
        if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return false;
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > .03;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      })
      .slice(0, 28);

    const maxDistance = Math.max(1, Math.hypot(innerWidth, innerHeight));

    candidates.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = point.x - cx;
      const dy = point.y - cy;
      const distance = Math.hypot(dx, dy);
      const normalized = Math.min(1, distance / maxDistance);
      const direction = dx * dy >= 0 ? 1 : -1;
      const bendX = -dy * .055 * direction;
      const bendY = dx * .055 * direction;

      const rotation = direction * (4 + normalized * 10);
      element.style.setProperty('--arrow-warp-x', dx + 'px');
      element.style.setProperty('--arrow-warp-y', dy + 'px');
      element.style.setProperty('--arrow-warp-mid-x', (dx * .62) + 'px');
      element.style.setProperty('--arrow-warp-mid-y', (dy * .62) + 'px');
      element.style.setProperty('--arrow-warp-bend-x', bendX + 'px');
      element.style.setProperty('--arrow-warp-bend-y', bendY + 'px');
      element.style.setProperty('--arrow-warp-rot', rotation + 'deg');
      element.style.setProperty('--arrow-warp-rot-a', (rotation * .28) + 'deg');
      element.style.setProperty('--arrow-warp-rot-b', (rotation * .72) + 'deg');
      element.style.setProperty('--arrow-warp-delay', (36 + normalized * 90 + (index % 4) * 7) + 'ms');
      element.style.setProperty('--arrow-warp-duration', (850 + normalized * 170) + 'ms');
      element.classList.add('arrow-os-gravity-target');
    });
  }

  let handoffTimer = null;
  function resetHandoff() {
    if(handoffTimer!==null){clearTimeout(handoffTimer);handoffTimer=null;}
    state.departing=false;
    document.documentElement.classList.remove('arrow-os-blackhole-active');
    document.querySelectorAll('.arrow-os-handoff').forEach(node=>node.remove());
    document.querySelectorAll('.arrow-os-gravity-target').forEach(node=>{
      node.classList.remove('arrow-os-gravity-target');
      [...node.style].filter(key=>key.startsWith('--arrow-warp-')).forEach(key=>node.style.removeProperty(key));
    });
  }
  window.addEventListener('pageshow',event=>{if(event.persisted)resetHandoff();});
  window.addEventListener('pagehide',()=>{if(handoffTimer!==null){clearTimeout(handoffTimer);handoffTimer=null;}});

  function launchToOrbit(module, anchor, orbitAccess = 'enabled', destination = null) {
    if ((module === 'orbit' && !destination) || state.departing) return;
    const url = new URL(resolveHref(destination || ORBIT_URL), window.location.origin);
    if (destination && !ON_ENTERARROW && !BETA_BASE) { location.assign(url.toString()); return; }
    if (destination && (url.origin !== location.origin || !(/^\/(orbit|relay|ravin|atlas|waypoint)(\/|$)/.test(url.pathname) || BETA_BASE && (url.pathname.startsWith(BETA_BASE+'/') || url.pathname.startsWith('/Resonant-Relay/'))))) return;
    state.departing = true;
    url.searchParams.set('from', module);
    if (orbitAccess === 'relay-only') url.searchParams.set('access', 'relay-only');

    if (motionReduced()) {
      location.assign(url.toString());
      return;
    }

    const point = { x: innerWidth / 2, y: innerHeight / 2 };
    document.documentElement.style.setProperty('--arrow-bh-x', point.x + 'px');
    document.documentElement.style.setProperty('--arrow-bh-y', point.y + 'px');

    const overlay = document.createElement('div');
    overlay.className = 'arrow-os-handoff arrow-os-blackhole-departure';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.setProperty('--bh-x', point.x + 'px');
    overlay.style.setProperty('--bh-y', point.y + 'px');
    overlay.innerHTML =
      '<span class="arrow-os-gravity-vignette"></span>' +
      '<span class="arrow-os-blackhole-halo"></span>' +
      '<span class="arrow-os-blackhole-lens lens-upper"></span>' +
      '<span class="arrow-os-blackhole-lens lens-lower"></span>' +
      '<span class="arrow-os-blackhole-disk disk-far"></span>' +
      '<span class="arrow-os-blackhole-disk disk-main"></span>' +
      '<span class="arrow-os-blackhole-photon-ring"></span>' +
      '<span class="arrow-os-blackhole-core"></span>' +
      '<canvas class="arrow-os-particle-canvas" aria-hidden="true"></canvas>' +
      '<p>' + (destination ? 'Traveling to ' + escapeHtml(url.pathname.split('/')[1].toUpperCase()) : 'Collapsing to Orbit') + '</p>';
    document.body.appendChild(overlay);
    startParticleCanvas(overlay.querySelector('.arrow-os-particle-canvas'), 'in');

    requestAnimationFrame(() => {
      document.documentElement.classList.add('arrow-os-blackhole-active');
      warpPageIntoSingularity(point);
    });

    handoffTimer = setTimeout(() => {handoffTimer=null;location.assign(url.toString());}, 1380);
  }

  function receiveFromOrbit(module) {
    if (module === 'orbit' || state.arrivalHandled) return;
    state.arrivalHandled = true;
    const url = new URL(location.href);
    if (url.searchParams.get('from') !== 'orbit') return;

    const clear = () => {
      url.searchParams.delete('from');
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    };

    if (motionReduced()) {
      clear();
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'arrow-os-handoff arrow-os-center-arrival';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML =
      '<span class="arrow-os-center-arrival-core"></span>' +
      '<span class="arrow-os-center-shock shock-a"></span>' +
      '<span class="arrow-os-center-shock shock-b"></span>' +
      '<canvas class="arrow-os-particle-canvas" aria-hidden="true"></canvas>' +
      '<p>Arriving in ' + module.toUpperCase() + '</p>';
    document.body.appendChild(overlay);
    startParticleCanvas(overlay.querySelector('.arrow-os-particle-canvas'), 'out');

    setTimeout(() => {
      overlay.remove();
      clear();
    }, 1260);
  }

  function pruneInstances() {
    state.instances.forEach(instance => {
      if (!document.documentElement.contains(instance.mount)) {
        if (instance.closeTimer !== null) clearTimeout(instance.closeTimer);
        state.instances.delete(instance);
      }
    });
  }

  function mountAll() {
    pruneInstances();
    const previousCount = state.instances.size;
    document.querySelectorAll('[data-arrow-os-shell]').forEach(createInstance);
    const first = [...state.instances][0];

    if (first && state.instances.size > previousCount && readString(STORAGE.theme, '')) {
      applyTheme(getThemeChoice(), false);
    }

    if (first) receiveFromOrbit(first.module);
    const staffHost = document.querySelector('[data-arrow-staff-workspace]');
    if(staffHost && staffHost.dataset.staffMounted !== 'true') { staffHost.dataset.staffMounted='true'; openPanel('moderation','orbit',staffHost); }
    updateHostTheme();
    void pollNotifications();
  }

  function closeSharedOverlays() {
    closePanel(false);
    state.instances.forEach(instance => {
      instance.pinned = false;
      instance.root.dataset.pinned = 'false';
      setOpen(instance, false);
    });
  }

  function closeEverythingOnOutsidePointer(event) {
    const insideRoot = [...state.instances].some(instance => instance.root.contains(event.target));
    const insidePanel = state.panelEl?.contains(event.target);
    if (insideRoot || insidePanel) return;
    closeSharedOverlays();
  }

  document.addEventListener('pointerdown', closeEverythingOnOutsidePointer);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (!state.activePanel && event.target instanceof Element && event.target.closest('[data-arrow-escape-local],dialog[open],[role="dialog"][aria-modal="true"]')) return;

    if (state.activePanel) { event.preventDefault(); event.stopPropagation(); closePanel(); return; }
    if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
    const openTray = [...state.instances].find(instance => instance.root.dataset.open === 'true');
    if (openTray) {
      event.preventDefault();
      event.stopPropagation();
      state.instances.forEach(instance => { instance.pinned = false; instance.root.dataset.pinned = 'false'; setOpen(instance, false); });
      openTray.trigger.focus({ preventScroll: true });
      // Focusing the trigger opens the tray for keyboard entry; Escape must leave it closed.
      setOpen(openTray, false);
      return;
    }
    const current = [...state.instances][0];
    if (current && current.module !== 'orbit') {
      event.preventDefault();
      closePanel(false);
      state.instances.forEach(instance => {
        instance.pinned = false;
        instance.root.dataset.pinned = 'false';
        setOpen(instance, false);
      });
      launchToOrbit(current.module, moduleOrbitControl(current.module), current.orbitAccess);
      return;
    }

    if (state.activePanel) {
      closePanel();
      return;
    }

    state.instances.forEach(instance => {
      instance.pinned = false;
      instance.root.dataset.pinned = 'false';
      setOpen(instance, false);
    });
  }, true);

  const repositionPanel = () => {
    if (state.activePanel) positionPanel(state.panelAnchor);
  };
  window.addEventListener('resize', repositionPanel);
  window.visualViewport?.addEventListener('resize', repositionPanel);

  let planningPanelRefresh;
  const refreshPlanningPanel=()=>{
    if(document.hidden || !['notes','tasks','calendar'].includes(state.activePanel)) return;
    // Incoming changes must not discard an unsaved quick-add draft.
    if(state.panelBody.querySelector('textarea')?.value?.trim() || state.panelBody.querySelector('input[type=\"text\"]')?.value?.trim()) return;
    if(state.panelBody.contains(document.activeElement) && document.activeElement.matches('input,textarea,select,[contenteditable]')) return;
    clearTimeout(planningPanelRefresh);
    planningPanelRefresh=setTimeout(()=>{calendarLoad=null;if(['notes','tasks','calendar'].includes(state.activePanel))renderPanel(state.activePanel);},200);
  };
  window.addEventListener('arrow:planning-changed',refreshPlanningPanel);
  window.addEventListener('online',refreshPlanningPanel);
  window.addEventListener('focus',refreshPlanningPanel);
  document.addEventListener('visibilitychange',refreshPlanningPanel);
  setInterval(refreshPlanningPanel,30000);
  let shellAccountId=currentArrowUserId();
  window.addEventListener('storage', event => {
    if(event.key===ARROW_AUTH_STORAGE_KEY){
      const account=currentArrowUserId();
      if(account!==shellAccountId){shellAccountId=account;calendarLoad=null;if(state.activePanel==='moderation')state.panelBody?.replaceChildren();document.querySelector('[data-arrow-role-preview]')?.remove();closePanel(false);}
      return;
    }
    if (event.key === 'arrow_shared_data_ping_v1') {
      window.dispatchEvent(new CustomEvent('arrow:planning-changed'));
      return;
    }
    if (!Object.values(STORAGE).includes(event.key)) return;
    if (event.key === STORAGE.theme) applyTheme(getThemeChoice(), false);
    if (event.key === STORAGE.motion) applyMotion(getMotionChoice(), false);
    if (event.key === STORAGE.experience) applyExperienceChoice(getExperienceChoice(), false);
    if (event.key === STORAGE.adapt) applyAdapt(getAdaptChoice(), false);
    if (event.key === STORAGE.adaptPalettes || event.key === STORAGE.adaptCustomColors) applyAccent(getAccentChoice(), false);
    if (event.key === STORAGE.customAccent) applyAccent(getAccentChoice(), false);
    if (event.key === STORAGE.accent) applyAccent(getAccentChoice(), false);
    if (event.key === STORAGE.focusState || event.key === STORAGE.focusMinutes) {
      stopFocusTimer(false);
      restoreFocusState();
    }
    const panelKeys = { links: [STORAGE.links], focus: [STORAGE.focusState, STORAGE.focusMinutes], settings: Object.values(STORAGE) };
    if (panelKeys[state.activePanel]?.includes(event.key)) renderPanel(state.activePanel);
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getThemeChoice() === 'system') applyTheme('system', false);
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => {
    if (getMotionChoice() === 'system') applyMotion('system', false);
  });

  new MutationObserver(updateHostTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-arrow-theme'],
  });

  applyTheme(getThemeChoice(), false);
  applyExperienceChoice(getExperienceChoice(), false);
  applyAdapt(getAdaptChoice(), false);
  applyMotion(getMotionChoice(), false);
  restoreFocusState();
  // State is persisted on timer actions. An old background tab must not overwrite it on exit.

  // Every signed-in ARROW surface observes the same durable, owner-scoped inbox.
  let notificationBusy = false;
  let notificationAccount = '';
  let notificationRows = [];
  let notificationButton = null;
  let notificationToast = null;
  let notificationError = '';
  function clearNotificationUI() {
    notificationRows = [];
    notificationButton?.remove(); notificationButton = null;
    notificationToast?.remove(); notificationToast = null;
    if (state.panelEl?.dataset.panel === 'notifications') {state.panelBody?.replaceChildren();closePanel(false);}
  }
  function notificationHref(link) {
    let url;try{url=new URL(link || '/relay/', location.origin);}catch{return resolveHref('/relay/');}
    if (/^\/(chats|planner|profile|contacts|todo)(\/|$)/.test(url.pathname)) url.pathname='/relay'+url.pathname;
    if (url.origin !== location.origin || !/^\/(relay|ravin|orbit|atlas|waypoint)(\/|$)/.test(url.pathname)) return resolveHref('/relay/');
    if (/^\/relay\/(chats|planner)\/[^/]+\/?$/.test(url.pathname)) {
      const [,kind,detail] = url.pathname.match(/^\/relay\/(chats|planner)\/([^/]+)\/?$/);
      if (detail !== 'view') {url.pathname='/relay/'+kind+'/view/';url.searchParams.set('id',decodeURIComponent(detail));}
    }
    return resolveHref(url.pathname + url.search + url.hash);
  }
  async function selectNotification(row) {
    const account = notificationAccount;
    try {
      await arrowData('/rest/v1/notifications?id=eq.'+encodeURIComponent(row.id)+'&user_id=eq.'+encodeURIComponent(account), {method:'PATCH',body:{read_at:new Date().toISOString()}});
      if (readArrowSession()?.user?.id !== account) return;
      location.assign(notificationHref(row.link));
    } catch {notificationError='Could not open this alert. Try again.';if(state.activePanel==='notifications')renderNotifications();}
  }
  function renderNotifications() {
    if (!state.panelBody) return;
    state.panelBody.replaceChildren();
    const setup = document.createElement('a');setup.className='arrow-os-notification-setup';setup.href=resolveHref('/relay/profile/#notifications');setup.textContent='Device notification settings';state.panelBody.append(setup);
    if (notificationError) {const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=notificationError;state.panelBody.append(error);}
    if (!notificationRows.length) {const empty=document.createElement('p');empty.textContent='No notifications yet.';state.panelBody.append(empty);}
    notificationRows.forEach(row=>{
      const button=document.createElement('button');button.type='button';button.className='arrow-os-inbox-row';button.dataset.unread=String(!row.read_at);
      const title=document.createElement('strong');title.textContent=row.title;
      const body=document.createElement('span');body.textContent=row.body;
      const time=document.createElement('time');time.dateTime=row.created_at;time.textContent=new Date(row.created_at).toLocaleString();
      button.append(title,body,time);button.onclick=()=>void selectNotification(row);state.panelBody.append(button);
    });
  }
  function updateNotificationButton() {
    if (!notificationButton) {
      notificationButton=document.createElement('button');notificationButton.type='button';notificationButton.className='arrow-os-notification-button';
      notificationButton.onclick=()=>{openPanel('notifications',state.activeModule||'orbit');void pollNotifications();};document.body.append(notificationButton);
    }
    const count=notificationRows.filter(row=>!row.read_at).length;
    notificationButton.textContent=count ? 'Notifications · '+count : 'Notifications';
    notificationButton.setAttribute('aria-label',count ? 'Notifications, '+count+' unread' : 'Notifications');
  }
  function showNotificationToast(row) {
    notificationToast?.remove();
    const toast=document.createElement('div');toast.className='arrow-os-notification-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
    const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=row.title;const body=document.createElement('span');body.textContent=row.body;copy.append(title,body);
    const open=document.createElement('button');open.type='button';open.textContent='Open';open.onclick=()=>void selectNotification(row);
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','Dismiss notification');dismiss.onclick=()=>toast.remove();
    toast.append(copy,open,dismiss);document.body.append(toast);notificationToast=toast;
    setTimeout(()=>toast.remove(),12000);
  }
  async function pollNotifications() {
    const account=readArrowSession()?.user?.id || '';
    if(account!==notificationAccount){clearNotificationUI();notificationAccount=account;}
    if(!account || notificationBusy || document.hidden || !state.instances.size)return;
    notificationBusy=true;
    try {
      const rows=await arrowData('/rest/v1/notifications?user_id=eq.'+encodeURIComponent(account)+'&select=id,title,body,link,created_at,read_at&order=created_at.desc&limit=30');
      if(readArrowSession()?.user?.id!==account || notificationAccount!==account || !Array.isArray(rows))return;
      notificationRows=rows;notificationError='';
      // Relay already has a header bell; other centers get a compact shared inbox control.
      if(![...state.instances].some(instance=>instance.module==='relay'))updateNotificationButton();
      const seenKey='arrow_notifications_seen_v1:'+account;
      const seen=readJson(seenKey,[]);const ids=new Set(Array.isArray(seen)?seen:[]);
      const fresh=rows.filter(row=>!row.read_at && !ids.has(row.id) && Date.now()-new Date(row.created_at).getTime()<86400000);
      const viewing = row => {
        if(!row.link?.startsWith('/ravin/') || !location.pathname.includes('/ravin/') || !document.hasFocus())return false;
        try{const conversation=new URL(row.link,location.origin).searchParams.get('conversation_id');return Boolean(conversation) && conversation===new URL(location.href).searchParams.get('conversation_id');}catch{return false;}
      };
      const unseen=fresh.find(row=>!viewing(row));
      if(unseen)showNotificationToast(unseen);
      // Only consume displayed alerts, preserving queued alerts for later polls.
      for(const row of fresh)if(row===unseen || viewing(row))ids.add(row.id);
      try{localStorage.setItem(seenKey,JSON.stringify([...ids].slice(-120)));}catch{}
      if(state.activePanel==='notifications')renderNotifications();
    } catch {if(readArrowSession()?.user?.id!==account)return;notificationError='Notifications could not refresh. They will retry automatically.';if(state.activePanel==='notifications')renderNotifications();}
    finally {notificationBusy=false;}
  }
  setInterval(()=>void pollNotifications(),10000);
  window.addEventListener('focus',()=>void pollNotifications());
  document.addEventListener('visibilitychange',()=>void pollNotifications());
  window.addEventListener('storage',event=>{if(event.key===ARROW_AUTH_STORAGE_KEY)void pollNotifications();});


  // Escape works even when focus is on the page rather than inside the tray.
  // Use one document handler, not one listener per center instance.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || state.activePanel) return;
    const openInstance = [...state.instances].find(instance => instance.root.dataset.open === 'true');
    if (!openInstance) return;
    event.preventDefault();
    openInstance.pinned = false;
    openInstance.root.dataset.pinned = 'false';
    setOpen(openInstance, false);
    openInstance.trigger.focus({ preventScroll:true });
  });

  const startMounting = () => {
    requestAnimationFrame(() => {
      mountAll();
      const panel = new URLSearchParams(location.search).get('panel');
      if ((location.pathname.startsWith('/orbit') || BETA_BASE && location.pathname.startsWith(BETA_BASE+'/orbit/')) && ['support','moderation'].includes(panel)) openPanel(panel,'orbit');
    });
    // Ignore panel rendering, chat tokens, counters and other unrelated DOM updates.
    let mountFrame = 0;
    const isMount = node => node.nodeType === 1 &&
      (node.matches('[data-arrow-os-shell]') || node.querySelector('[data-arrow-os-shell]'));
    const observer = new MutationObserver(records => {
      if (!records.some(record => [...record.addedNodes, ...record.removedNodes].some(isMount))) return;
      if (mountFrame) return;
      mountFrame = requestAnimationFrame(() => { mountFrame = 0; mountAll(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMounting, { once: true });
  } else {
    startMounting();
  }

  void refreshStaffPreviewBar();
  window.addEventListener('focus',refreshStaffPreviewBar);
  setInterval(()=>{if(!document.hidden && state.activePanel==='moderation')void refreshStaffPreviewBar();},30000);
  window.addEventListener('relay-role-preview-change',()=>{if(state.activePanel==='moderation')void renderModeration();void refreshStaffPreviewBar();});
  window.addEventListener('storage',event=>{if(event.key===STAFF_PREVIEW_KEY){if(state.activePanel==='moderation')void renderModeration();void refreshStaffPreviewBar();}});

  window.ArrowOS = {
    mountAll,
    openPanel,
    closePanel,
    closeOverlays: closeSharedOverlays,
    applyTheme,
    applyMotion,
    applyAccent,
    applyExperienceChoice,
    applyAdapt,
    getAdaptChoice,
    launchToOrbit,
    resolveHref,
    previewPlan,
    navigate: (href, module = 'orbit') => launchToOrbit(module, null, 'enabled', href),
    data: arrowData,
    staffRole,
    loadCalendarSources,
    nextMove,
  };
})();





