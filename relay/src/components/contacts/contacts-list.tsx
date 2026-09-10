'use client';

import { blockContact, removeContact, updateContactPreference } from '@/lib/actions/contacts';
import { UserRoleBadge } from '@/components/user-role-badge';
import { CONTACT_COLORS, contactColor, contactDisplayName, type ContactColorKey } from '@/lib/contact-colors';
import type { AppRole } from '@/lib/role-preview';
import { Ban, Check, Loader2, Settings2, UserMinus, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type Preference = { nickname: string | null; color_key: ContactColorKey } | null;
type Contact = {
  id: string;
  other: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    school: string | null;
    bio: string | null;
    role: AppRole;
  };
  preference: Preference;
};

type Props = {
  contacts: Contact[];
  onRemoved?: (connectionId: string) => void;
  onPreferenceUpdated?: (connectionId: string, preference: NonNullable<Preference>) => void;
};

export function ContactsList({ contacts, onRemoved, onPreferenceUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [colorKey, setColorKey] = useState<ContactColorKey>('slate');
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-10 text-center">
        <p className="text-sm text-ink-muted">Nobody here yet.</p>
        <p className="mt-1 text-xs text-ink-faint">Add someone with their Relay Number or find them in Discover.</p>
      </div>
    );
  }

  function beginEdit(contact: Contact) {
    setEditingId(contact.id);
    setNickname(contact.preference?.nickname ?? '');
    setColorKey(contact.preference?.color_key ?? 'slate');
    setConfirmAction(null);
    setError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setConfirmAction(null);
    setError(null);
  }

  async function save(contact: Contact) {
    setSaving(true);
    setError(null);
    const result = await updateContactPreference(contact.other.id, nickname, colorKey);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onPreferenceUpdated?.(contact.id, result.data);
    closeEdit();
  }

  async function remove(contact: Contact) {
    setSaving(true);
    setError(null);
    const result = await removeContact(contact.other.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onRemoved?.(contact.id);
    closeEdit();
  }

  async function block(contact: Contact) {
    setSaving(true);
    setError(null);
    const result = await blockContact(contact.other.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onRemoved?.(contact.id);
    closeEdit();
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {contacts.map((contact) => {
        const { id, other, preference } = contact;
        const displayName = contactDisplayName(other, preference);
        const color = contactColor(preference?.color_key);
        const isEditing = editingId === id;

        return (
          <li key={id}>
            <div className="flex min-h-14 items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => beginEdit(contact)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left sm:pointer-events-none"
                aria-label={`Open ${displayName}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold" style={{ color, backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}45` }}>
                  {other.avatar_url ? <span className="relative h-full w-full"><Image src={other.avatar_url} alt="" fill sizes="44px" className="object-cover" unoptimized /></span> : displayName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5"><p className="truncate text-sm font-medium text-ink">{displayName}</p><UserRoleBadge role={other.role} /></div>
                  {preference?.nickname && <p className="truncate text-xs text-ink-faint">{other.display_name}</p>}
                  {!preference?.nickname && other.school && <p className="truncate text-xs text-ink-faint">{other.school}</p>}
                </div>
              </button>
              <button type="button" onClick={() => isEditing ? closeEdit() : beginEdit(contact)} aria-label={`Customize ${displayName}`} aria-expanded={isEditing} className="hidden h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink sm:flex">
                {isEditing ? <X size={17} /> : <Settings2 size={17} />}
              </button>
            </div>

            {isEditing && (
              <>
                <button type="button" aria-label="Close contact details" onClick={closeEdit} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:hidden" />
                <div className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-4 pt-3 shadow-2xl sm:static sm:max-h-none sm:rounded-none sm:border-t sm:px-3 sm:py-4 sm:shadow-none" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
                  <div className="mb-4 flex items-start justify-between gap-3 sm:hidden">
                    <div>
                      <div className="flex items-center gap-1.5"><p className="text-base font-semibold text-ink">{displayName}</p><UserRoleBadge role={other.role} /></div>
                      {preference?.nickname && <p className="mt-0.5 text-xs text-ink-faint">{other.display_name}</p>}
                    </div>
                    <button type="button" onClick={closeEdit} className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink-muted"><X size={18} /></button>
                  </div>

                  {other.bio && <p className="mb-4 text-sm leading-5 text-ink-muted">{other.bio}</p>}
                  <label className="block text-xs font-medium text-ink-muted" htmlFor={`nickname-${id}`}>Your nickname for them</label>
                  <input id={`nickname-${id}`} value={nickname} maxLength={32} onChange={(event) => setNickname(event.target.value)} placeholder={other.display_name} className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-canvas px-3 py-2 text-base text-ink outline-none focus:border-ink-muted sm:min-h-0 sm:text-sm" />

                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-ink-muted">Message color</legend>
                    <div className="mt-2 flex flex-wrap gap-3 sm:gap-2">
                      {(Object.entries(CONTACT_COLORS) as Array<[ContactColorKey, string]>).map(([key, value]) => (
                        <button key={key} type="button" onClick={() => setColorKey(key)} aria-label={key} aria-pressed={colorKey === key} className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 sm:h-8 sm:w-8" style={{ backgroundColor: value, boxShadow: colorKey === key ? '0 0 0 2px rgb(var(--canvas)), 0 0 0 4px rgb(var(--ink))' : undefined }}>
                          {colorKey === key && <Check size={15} className="text-white" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

                  <div className="mt-5 grid gap-2 border-t border-border pt-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="grid gap-2 sm:flex sm:items-center">
                      <button type="button" onClick={() => setConfirmAction(confirmAction === 'remove' ? null : 'remove')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas sm:min-h-0 sm:py-2">
                        <UserMinus size={15} />Remove contact
                      </button>
                      <button type="button" onClick={() => setConfirmAction(confirmAction === 'block' ? null : 'block')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 sm:min-h-0 sm:py-2">
                        <Ban size={15} />Block
                      </button>
                    </div>
                    <button type="button" disabled={saving} onClick={() => save(contact)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50 sm:min-h-0 sm:py-2">
                      {saving && <Loader2 size={15} className="animate-spin" />}Save
                    </button>
                  </div>

                  {confirmAction && (
                    <div className={`mt-3 rounded-xl border p-3 ${confirmAction === 'block' ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-canvas'}`}>
                      <p className={`text-sm font-medium ${confirmAction === 'block' ? 'text-red-600' : 'text-ink'}`}>
                        {confirmAction === 'block' ? `Block ${other.display_name}?` : `Remove ${other.display_name} from your contacts?`}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        {confirmAction === 'block'
                          ? 'They will be removed from your contacts, cannot message or request you, and will disappear from Discover.'
                          : 'Your old direct-message history and shared groups stay. The conversation becomes read-only until you reconnect.'}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => confirmAction === 'block' ? void block(contact) : void remove(contact)} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-medium disabled:opacity-50 ${confirmAction === 'block' ? 'bg-red-600 text-white' : 'bg-ink text-canvas'}`}>
                          {saving ? 'Working…' : confirmAction === 'block' ? 'Block' : 'Remove'}
                        </button>
                        <button type="button" disabled={saving} onClick={() => setConfirmAction(null)} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm font-medium text-ink-muted">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
