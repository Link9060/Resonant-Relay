import { IS_BETA } from '@/lib/config';
import { PageLoading } from '@/components/page-loading';

export function BetaRouteLoading({ children, label }: { children: React.ReactNode; label?: string }) {
  return IS_BETA ? <PageLoading label={label} /> : children;
}
