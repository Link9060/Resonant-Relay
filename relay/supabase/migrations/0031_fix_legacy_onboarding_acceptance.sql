-- Existing users are grandfathered past the first-run tour, but that should not
-- be represented as an explicit acceptance of Terms or acknowledgement of the
-- Privacy Policy. New users receive those timestamps only through finish_onboarding.
-- The onboarding feature is not deployed yet, so profiles with no username are
-- the legacy accounts populated by migration 0029.

update public.profiles
set terms_accepted_at = null,
    privacy_acknowledged_at = null,
    updated_at = now()
where onboarding_completed_at is not null
  and username is null
  and terms_accepted_at is not null
  and privacy_acknowledged_at is not null;
