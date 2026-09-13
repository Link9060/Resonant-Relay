(() => {
  'use strict';

  const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const PROJECT_REF = 'cnorozrjugxpanpfmssa';
  const CANONICAL_SESSION_KEY = `sb-${PROJECT_REF}-auth-token`;

  const state = {
    session: null,
    sessionKey: CANONICAL_SESSION_KEY,
    user: null,
    profile: null,
    conversations: [],
    contacts: [],
    selectedConversationId: null,
  };

  const $ = (id) => document.getElementById(id);

  function setConnection(text) {
    $('connectionState').textContent = text;
  }

  function show(id, visible) {
    const node = $(id);
    if (node) node.classList.toggle('hidden', !visible);
  }

  function readStoredSession() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) keys.push(key);
    }
    if (!keys.includes(CANONICAL_SESSION_KEY)) keys.unshift(CANONICAL_SESSION_KEY);

    for (const key of keys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        const session = parsed?.access_token ? parsed : parsed?.currentSession?.access_token ? parsed.currentSession : null;
        if (session?.access_token) return { session, key };
      } catch (_) {}
    }
    return null;
  }

  function storeSession(session, key = state.sessionKey || CANONICAL_SESSION_KEY) {
    state.session = session;
    state.sessionKey = key;
    try {
      localStorage.setItem(key, JSON.stringify(session));
    } catch (_) {}
  }

  async function refreshSession() {
    if (!state.session?.refresh_token) return false;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: state.session.refresh_token }),
      });
      if (!response.ok) return false;
      const session = await response.json();
      if (!session?.access_token) return false;
      storeSession(session);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function request(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    headers.set('apikey', SUPABASE_KEY);
    if (state.session?.access_token) headers.set('Authorization', `Bearer ${state.session.access_token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    let response;
    try {
      response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
    } catch (error) {
      setConnection('Network unavailable');
      throw error;
    }

    if (response.status === 401 && retry && await refreshSession()) {
      return request(path, options, false);
    }
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        detail = body?.message || body?.error_description || body?.hint || body?.details || detail;
      } catch (_) {}
      throw new Error(detail);
    }
    setConnection('Connected');
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function queryString(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    return search.toString();
  }

  async function rest(table, params = {}) {
    return request(`/rest/v1/${table}?${queryString(params)}`);
  }

  async function insert(table, row) {
    return request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
  }

  async function rpc(name, body) {
    return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body || {}) });
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function displayName(profile) {
    return profile?.display_name || (profile?.username ? `@${profile.username}` : 'Relay user');
  }

  async function getCurrentUser() {
    return request('/auth/v1/user');
  }

  async function loadProfile() {
    const rows = await rest('profiles', {
      select: 'id,display_name,first_name,last_name,username,username_changed_at,avatar_url,relay_number,school,graduation_year,bio,role',
      id: `eq.${state.user.id}`,
      limit: 1,
    });
    state.profile = rows?.[0] || null;
    if (!state.profile) throw new Error('Relay profile could not be loaded.');
    renderProfile();
  }

  async function loadContacts() {
    $('contactList').textContent = 'Loading contacts…';
    const [asA, asB] = await Promise.all([
      rest('connections', { select: 'user_a,user_b', user_a: `eq.${state.user.id}` }),
      rest('connections', { select: 'user_a,user_b', user_b: `eq.${state.user.id}` }),
    ]);
    const ids = [...new Set([
      ...(asA || []).map((row) => row.user_b),
      ...(asB || []).map((row) => row.user_a),
    ].filter(Boolean))];

    if (!ids.length) {
      state.contacts = [];
      renderContacts();
      return;
    }

    state.contacts = await rest('profiles', {
      select: 'id,display_name,username,avatar_url,relay_number',
      id: `in.(${ids.join(',')})`,
      order: 'display_name.asc',
    }) || [];
    renderContacts();
  }

  async function loadChats() {
    $('conversationList').textContent = 'Loading chats…';
    const membership = await rest('conversation_participants', {
      select: 'conversation_id,conversation:conversations(id,type,last_message_at,group:groups(id,name))',
      user_id: `eq.${state.user.id}`,
    });

    const conversations = (membership || []).map((row) => row.conversation).filter(Boolean);
    const ids = conversations.map((item) => item.id);
    if (!ids.length) {
      state.conversations = [];
      renderConversations();
      return;
    }

    const [participants, previews] = await Promise.all([
      rest('conversation_participants', {
        select: 'conversation_id,user_id,profile:profiles(id,display_name,username,avatar_url)',
        conversation_id: `in.(${ids.join(',')})`,
      }),
      rest('messages', {
        select: 'conversation_id,body,created_at',
        conversation_id: `in.(${ids.join(',')})`,
        order: 'created_at.desc',
        limit: 500,
      }),
    ]);

    const participantMap = new Map();
    (participants || []).forEach((row) => {
      if (!participantMap.has(row.conversation_id)) participantMap.set(row.conversation_id, []);
      participantMap.get(row.conversation_id).push(row);
    });
    const previewMap = new Map();
    (previews || []).forEach((row) => {
      if (!previewMap.has(row.conversation_id)) previewMap.set(row.conversation_id, row.body || 'Message');
    });

    state.conversations = conversations.map((conversation) => {
      const rows = participantMap.get(conversation.id) || [];
      const other = rows.find((row) => row.user_id !== state.user.id)?.profile;
      return {
        ...conversation,
        title: conversation.type === 'group' ? (conversation.group?.name || 'Group') : displayName(other),
        preview: previewMap.get(conversation.id) || 'No messages yet',
      };
    }).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));

    renderConversations();
  }

  function renderConversations() {
    const root = $('conversationList');
    root.replaceChildren();
    if (!state.conversations.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.minHeight = '180px';
      empty.textContent = 'No conversations yet.';
      root.appendChild(empty);
      return;
    }

    state.conversations.forEach((conversation) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `conversation-item${state.selectedConversationId === conversation.id ? ' active' : ''}`;
      const title = document.createElement('strong');
      title.textContent = conversation.title;
      const preview = document.createElement('span');
      preview.textContent = conversation.preview;
      button.append(title, preview);
      button.addEventListener('click', () => openConversation(conversation.id));
      root.appendChild(button);
    });
  }

  async function openConversation(conversationId) {
    state.selectedConversationId = conversationId;
    renderConversations();
    show('threadEmpty', false);
    show('thread', true);
    $('messageList').textContent = 'Loading messages…';
    $('messageError').textContent = '';
    const current = state.conversations.find((item) => item.id === conversationId);
    $('threadTitle').textContent = current?.title || 'Conversation';

    try {
      const messages = await rest('messages', {
        select: 'id,conversation_id,sender_id,body,created_at',
        conversation_id: `eq.${conversationId}`,
        order: 'created_at.asc',
        limit: 150,
      }) || [];
      const senderIds = [...new Set(messages.map((message) => message.sender_id).filter(Boolean))];
      let profiles = [];
      if (senderIds.length) {
        profiles = await rest('profiles', { select: 'id,display_name,username', id: `in.(${senderIds.join(',')})` }) || [];
      }
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      renderMessages(messages, profileMap);
    } catch (error) {
      $('messageList').textContent = '';
      $('messageError').textContent = error.message || 'Messages could not load.';
    }
  }

  function renderMessages(messages, profileMap) {
    const root = $('messageList');
    root.replaceChildren();
    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.minHeight = '180px';
      empty.textContent = 'No messages yet.';
      root.appendChild(empty);
      return;
    }
    messages.forEach((message) => {
      const bubble = document.createElement('article');
      bubble.className = `message${message.sender_id === state.user.id ? ' mine' : ''}`;
      if (message.sender_id !== state.user.id) {
        const sender = document.createElement('div');
        sender.className = 'sender';
        sender.textContent = displayName(profileMap.get(message.sender_id));
        bubble.appendChild(sender);
      }
      const body = document.createElement('div');
      body.className = 'body';
      body.textContent = message.body || '';
      const time = document.createElement('div');
      time.className = 'time';
      time.textContent = formatTime(message.created_at);
      bubble.append(body, time);
      root.appendChild(bubble);
    });
    root.scrollTop = root.scrollHeight;
  }

  function renderContacts() {
    const root = $('contactList');
    root.replaceChildren();
    if (!state.contacts.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.minHeight = '220px';
      empty.textContent = 'No contacts found.';
      root.appendChild(empty);
      return;
    }

    state.contacts.forEach((contact) => {
      const card = document.createElement('article');
      card.className = 'contact-card';
      const row = document.createElement('div');
      row.className = 'row';
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = displayName(contact);
      const username = document.createElement('span');
      username.textContent = contact.username ? `@${contact.username}` : `Relay ${contact.relay_number || ''}`.trim();
      identity.append(name, username);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost-button';
      button.textContent = 'Message';
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Opening…';
        try {
          const conversationId = await rpc('get_or_create_direct_conversation', { p_other_user_id: contact.id });
          await loadChats();
          activateView('chats');
          await openConversation(conversationId);
        } catch (error) {
          button.textContent = 'Try again';
        } finally {
          button.disabled = false;
        }
      });
      row.append(identity, button);
      card.appendChild(row);
      root.appendChild(card);
    });
  }

  function renderProfile() {
    const profile = state.profile;
    if (!profile) return;
    const parts = String(profile.display_name || '').trim().split(/\s+/).filter(Boolean);
    $('firstName').value = profile.first_name || parts[0] || '';
    $('lastName').value = profile.last_name || parts.slice(1).join(' ');
    $('username').value = profile.username || '';
    $('bio').value = profile.bio || '';
    $('school').value = profile.school || '';
    $('graduationYear').value = profile.graduation_year || '';
    $('avatarUrl').value = profile.avatar_url || '';
    $('relayNumber').textContent = profile.relay_number || '—';
  }

  function normalizeUsername(value) {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const firstName = $('firstName').value.trim();
    const lastName = $('lastName').value.trim();
    const username = normalizeUsername($('username').value);
    const bio = $('bio').value.trim();
    const school = $('school').value.trim();
    const graduationYear = $('graduationYear').value.replace(/\D/g, '').slice(0, 4);
    const avatarUrl = $('avatarUrl').value.trim();
    const status = $('profileStatus');

    if (!firstName || !lastName) {
      status.textContent = 'First and last name are required.';
      return;
    }
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      status.textContent = 'Username must be 3–20 letters, numbers, or underscores.';
      return;
    }
    if (avatarUrl) {
      try {
        if (new URL(avatarUrl).protocol !== 'https:') throw new Error('bad');
      } catch (_) {
        status.textContent = 'Profile photo must be a full HTTPS URL.';
        return;
      }
    }

    status.textContent = 'Saving…';
    try {
      const saved = await rpc('save_profile_settings', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_username: username || '',
        p_bio: bio || null,
        p_school: school || null,
        p_graduation_year: graduationYear ? Number(graduationYear) : null,
        p_avatar_url: avatarUrl || null,
      });
      if (saved && typeof saved === 'object') state.profile = { ...state.profile, ...saved };
      $('username').value = username;
      status.textContent = 'Profile saved.';
    } catch (error) {
      status.textContent = error.message || 'Profile could not be saved.';
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = $('messageInput');
    const body = input.value.trim();
    if (!body || !state.selectedConversationId) return;
    $('messageError').textContent = '';
    const button = $('messageForm').querySelector('button');
    button.disabled = true;
    try {
      await insert('messages', {
        conversation_id: state.selectedConversationId,
        sender_id: state.user.id,
        body,
        attachments: [],
        reply_to_id: null,
      });
      input.value = '';
      await openConversation(state.selectedConversationId);
      await loadChats();
    } catch (error) {
      $('messageError').textContent = error.message || 'Message could not be sent.';
    } finally {
      button.disabled = false;
    }
  }

  function activateView(name) {
    document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active-view'));
    $(`view-${name}`).classList.add('active-view');
  }

  async function signIn(event) {
    event.preventDefault();
    $('loginError').textContent = '';
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.access_token) throw new Error(payload?.error_description || payload?.message || 'Sign in failed.');
      storeSession(payload, CANONICAL_SESSION_KEY);
      await bootstrap();
    } catch (error) {
      $('loginError').textContent = error.message || 'Sign in failed.';
    }
  }

  async function bootstrap() {
    setConnection('Connecting…');
    const found = readStoredSession();
    if (found) {
      state.session = found.session;
      state.sessionKey = found.key;
    }
    if (!state.session?.access_token) {
      show('workspace', false);
      show('signedOut', true);
      setConnection('Sign in required');
      return;
    }

    try {
      state.user = await getCurrentUser();
      show('signedOut', false);
      show('workspace', true);
      await loadProfile();
      await Promise.all([loadChats(), loadContacts()]);
      setConnection('Connected');
    } catch (error) {
      console.error('Emergency Relay bootstrap failed', error);
      show('workspace', false);
      show('signedOut', true);
      $('loginError').textContent = 'Your saved Relay session could not be opened. Sign in again.';
      setConnection('Session unavailable');
    }
  }

  function bindEvents() {
    $('bootDot').addEventListener('click', () => {
      $('boot').classList.add('engaged');
      show('app', true);
      window.setTimeout(() => show('boot', false), 1750);
    });
    document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => activateView(button.dataset.view)));
    $('loginForm').addEventListener('submit', signIn);
    $('messageForm').addEventListener('submit', sendMessage);
    $('profileForm').addEventListener('submit', saveProfile);
    $('refreshChats').addEventListener('click', loadChats);
    $('refreshContacts').addEventListener('click', loadContacts);
    $('username').addEventListener('input', (event) => { event.target.value = normalizeUsername(event.target.value); });
  }

  bindEvents();
  bootstrap();
})();
