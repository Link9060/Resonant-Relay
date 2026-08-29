import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    : { data: null };

  const firstName = profile?.display_name?.split(' ')[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        {firstName ? `Hey, ${firstName}.` : 'Hey.'}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Chats, Planner, Calendar, Email, and Obsidian will show up here as they&apos;re built. For now, add your
        friends in Contacts so Relay has someone to coordinate with.
      </p>
    </div>
  );
}
