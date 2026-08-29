import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Dock />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader profile={profile} currentUserId={user.id} notifications={notifications ?? []} />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
