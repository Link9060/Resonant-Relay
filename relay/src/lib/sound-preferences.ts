export const SOUND_PREFERENCE_KEY = 'relay-sounds-enabled-v1';
export const SOUND_PREFERENCE_EVENT = 'relay:sound-preference';

export function readSoundPreference() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSoundPreference(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? '1' : '0');
  } catch {
    // Local storage is optional; keep the live preference working for this page.
  }
  window.dispatchEvent(new CustomEvent<boolean>(SOUND_PREFERENCE_EVENT, { detail: enabled }));
}
