'use client';

import { PageLoading } from '@/components/page-loading';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single(); setName(data?.display_name?.split(' ')[0] ?? null); }
    setLoaded(true);
  })(); }, []);
  if (!loaded) return <PageLoading />;
  return <div className="mx-auto max-w-2xl px-4 py-10 md:px-6"><h1 className="font-display text-2xl font-medium tracking-tight text-ink">{name ? `Hey, ${name}.` : 'Hey.'}</h1><p className="mt-2 text-sm text-ink-muted">Chats, Planner, Calendar, Email, and Obsidian are all in the navigation. Add your friends in Contacts so Relay has someone to coordinate with.</p></div>;
}
