(() => {
  'use strict';

  const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const SESSION_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';
  const COOKIE_MAX_AGE = 34_560_000;
  const $ = (id) => document.getElementById(id);

  function base64UrlDecode(value) {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function base64UrlEncode(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  function cookieMap() {
    const map = new Map();
    document.cookie.split(';').forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const separator = trimmed.indexOf('=');
      const name = separator === -1 ? trimmed : trimmed.slice(0, separator);
      const rawValue = separator === -1 ? '' : trimmed.slice(separator + 1);
      try {
        map.set(name, decodeURIComponent(rawValue));
      } catch (_) {
        map.set(name, rawValue);
      }
    });
    return map;
  }

  function readCookieSession() {
    const cookies = cookieMap();
    let stored = cookies.get(SESSION_KEY) || '';
    if (!stored) {
      for (let index = 0; index < 12; index += 1) {
        const chunk = cookies.get(`${SESSION_KEY}.${index}`);
        if (chunk === undefined) break;
        stored += chunk;
      }
    }
    if (!stored) return null;

    try {
      const raw = stored.startsWith('base64-') ? base64UrlDecode(stored.slice(7)) : stored;
      const parsed = JSON.parse(raw);
      return parsed?.access_token ? parsed : parsed?.currentSession?.access_token ? parsed.currentSession : null;
    } catch (_) {
      return null;
    }
  }

  function clearCookieChunks() {
    for (let index = 0; index < 12; index += 1) {
      document.cookie = `${SESSION_KEY}.${index}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    }
  }

  function writeSessionCookie(session) {
    const encoded = `base64-${base64UrlEncode(JSON.stringify(session))}`;
    const chunkSize = 3000;
    clearCookieChunks();

    if (encoded.length <= chunkSize) {
      document.cookie = `${SESSION_KEY}=${encodeURIComponent(encoded)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
      return;
    }

    document.cookie = `${SESSION_KEY}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    for (let index = 0, offset = 0; offset < encoded.length; index += 1, offset += chunkSize) {
      const value = encoded.slice(offset, offset + chunkSize);
      document.cookie = `${SESSION_KEY}.${index}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
    }
  }

  function writeSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (_) {}
    try {
      writeSessionCookie(session);
    } catch (_) {}
  }

  function hasLocalSession() {
    try {
      const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return Boolean(value?.access_token || value?.currentSession?.access_token);
    } catch (_) {
      return false;
    }
  }

  function promoteRelayCookieSession() {
    if (hasLocalSession()) return false;
    const session = readCookieSession();
    if (!session?.access_token) return false;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function verifyEmergencyLink() {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    if (!tokenHash || !type) return false;

    const validTypes = new Set(['email', 'magiclink', 'invite', 'recovery', 'email_change']);
    if (!validTypes.has(type)) return false;

    const errorNode = $('loginError');
    const statusNode = $('loginStatus');
    if (statusNode) statusNode.textContent = 'Finishing secure sign in…';

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_hash: tokenHash, type }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.msg || payload?.message || payload?.error_description || 'This emergency sign-in link is no longer usable.');
      }

      writeSession(payload);
      window.history.replaceState(null, '', window.location.pathname);
      window.location.reload();
      return true;
    } catch (error) {
      if (statusNode) statusNode.textContent = '';
      if (errorNode) errorNode.textContent = error instanceof Error ? error.message : 'Emergency sign in could not be completed.';
      return false;
    }
  }

  async function requestEmergencyEmail(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = $('loginEmail')?.value.trim() || '';
    const errorNode = $('loginError');
    const statusNode = $('loginStatus');
    const button = $('loginButton');
    if (!email) return;

    if (errorNode) errorNode.textContent = '';
    if (statusNode) statusNode.textContent = 'Sending secure emergency link…';
    if (button) button.disabled = true;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-email`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, emergency: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Relay could not send the emergency sign-in link.');
      if (statusNode) statusNode.textContent = 'Emergency sign-in link sent. Open the newest Relay email on this device.';
    } catch (error) {
      if (statusNode) statusNode.textContent = '';
      if (errorNode) errorNode.textContent = error instanceof Error ? error.message : 'Relay could not send the emergency sign-in link.';
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bindAuthOverride() {
    const form = $('loginForm');
    if (form) form.addEventListener('submit', requestEmergencyEmail, true);
  }

  function bindLongerStartup() {
    const dot = $('bootDot');
    if (!dot) return;
    dot.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      $('boot')?.classList.add('engaged');
      $('app')?.classList.remove('hidden');
      window.setTimeout(() => $('boot')?.classList.add('hidden'), 3500);
    }, true);
  }

  bindAuthOverride();
  bindLongerStartup();

  void (async () => {
    if (await verifyEmergencyLink()) return;
    if (promoteRelayCookieSession()) window.location.reload();
  })();
})();
