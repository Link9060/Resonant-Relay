/** Notify this tab and other ARROW tabs after a successful planning write. */
export function broadcastArrowPlanningChange() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem('arrow_shared_data_ping_v1', `${Date.now()}-${Math.random()}`); } catch { /* Local refresh still works if storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent('arrow:planning-changed'));
}
