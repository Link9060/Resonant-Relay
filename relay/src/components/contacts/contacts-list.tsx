type Contact = {
  id: string;
  other: { id: string; display_name: string; avatar_url: string | null; school: string | null };
};

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-10 text-center">
        <p className="text-sm text-ink-muted">Nobody here yet.</p>
        <p className="mt-1 text-xs text-ink-faint">Add someone with their Relay Number to get started.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {contacts.map(({ id, other }) => (
        <li key={id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink">
            {other.display_name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{other.display_name}</p>
            {other.school && <p className="text-xs text-ink-faint">{other.school}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
