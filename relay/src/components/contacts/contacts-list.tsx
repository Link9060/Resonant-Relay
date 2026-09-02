'use client';

import { blockContact, updateContactPreference } from '@/lib/actions/contacts';
import { CONTACT_COLORS, contactColor, contactDisplayName, type ContactColorKey } from '@/lib/contact-colors';
import { Ban, Check, Loader2, Settings2, X } from 'lucide-react';
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
  };
  preference: Preference;
};

export function ContactsList({ contacts: initialContacts }: { contacts: Contact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [colorKey, setColorKey] = useState<ContactColorKey>('slate');
  const [saving, setSaving] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-10 text-center">
        <p className="text-sm text-ink-muted">Nobody here yet.</p>
        <p className="mt-1 text-xs text-ink-faint">Add someone with their Relay Number to get started.</p>
      </div>
    );
  }

  function beginEdit(contact: Contact) {
    setEditingId(contact.id);
    setNickname(contact.preference?.nickname ?? '');
    setColorKey(contact.preference?.color_key ?? 'slate');
    setConfirmingBlock(false);
    setError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setConfirmingBlock(false);
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
    setContacts((current) => current.map((item) => item.id === contact.id ? { ...item, preference: result.data } : item));
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
    setContacts((current) => current.filter((item) => item.id !== contact.id));
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
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold" style={{ color, backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}45` }}>
                {other.avatar_url ? <span className="relative h-full w-full"><Image src={other.avatar_url} alt="" fill sizes="40px" className="object-cover" unoptimized /></span> : displayName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
                {preference?.nickname && <p className="truncate text-xs text-ink-faint">{other.display_name}</p>}
                {!preference?.nickname && other.school && <p className="truncate text-xs text-ink-faint">{other.school}</p>}
              </div>
              <button type="button" onClick={() => isEditing ? closeEdit() : beginEdit(contact)} aria-label={`Customize ${displayName}`} aria-expanded={isEditing} className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink">
                {isEditing ? <X size={17} /> : <Settings2 size={17} />}
              </button>
            </div>

            {isEditing && (
              <div className="border-t border-border bg-surface px-3 py-4">
                {other.bio && <p className="mb-4 text-sm leading-5 text-ink-muted">{other.bio}</p>}
                <label className="block text-xs font-medium text-ink-muted" htmlFor={`nickname-${id}`}>Your nickname for them</label>
                <input id={`nickname-${id}`} value={nickname} maxLength={32} onChange={(event) => setNickname(event.target.value)} placeholder={other.display_name} className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted" />

                <fieldset className="mt-4">
                  <legend className="text-xs font-medium text-ink-muted">Message color</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.entries(CONTACT_COLORS) as Array<[ContactColorKey, string]>).map(([key, value]) => (
                      <button key={key} type="button" onClick={() => setColorKey(key)} aria-label={key} aria-pressed={colorKey === key} className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110" style={{ backgroundColor: value, boxShadow: colorKey === key ? '0 0 0 2px rgb(var(--canvas)), 0 0 0 4px rgb(var(--ink))' : undefined }}>
                        {colorKey === key && <Check size={15} className="text-white" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {!confirmingBlock ? (
                    <button type="button" onClick={() => setConfirmingBlock(true)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10"><Ban size={15} />Block</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Remove and block?</span>
                      <button type="button" disabled={saving} onClick={() => block(contact)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Yes, block</button>
                      <button type="button" onClick={() => setConfirmingBlock(false)} className="px-2 py-1.5 text-xs text-ink-muted">Cancel</button>
                    </div>
                  )}
                  <button type="button" disabled={saving} onClick={() => save(contact)} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas disabled:opacity-50">
                    {saving && <Loader2 size={15} className="animate-spin" />}Save
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
