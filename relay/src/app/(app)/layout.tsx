'use client';

import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { PageLoading } from '@/components/page-loading';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string; profile: any; notifications: any[] } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { router.replace('/login'); return; }
      const [{ data: profile }, { data: notifications }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (active) setState({ userId: user.id, profile, notifications: notifications ?? [] });
    })();
    return () => { active = false; };
  }, [router]);

  if (!state) return <PageLoading />;
  return <div className="flex min-h-screen bg-canvas"><Dock /><div className="flex min-h-screen flex-1 flex-col"><AppHeader profile={state.profile} currentUserId={state.userId} notifications={state.notifications} /><main className="flex-1 pb-16 md:pb-0">{children}</main></div></div>;
}
