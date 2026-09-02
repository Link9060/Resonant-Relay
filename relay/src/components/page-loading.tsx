export function PageLoading({ label = 'Loading your space' }: { label?: string }) {
  return (
    <div className="relay-loading" role="status" aria-live="polite">
      <div className="relay-loading-signal" aria-hidden="true">
        <span className="relay-loading-ring relay-loading-ring-one" />
        <span className="relay-loading-ring relay-loading-ring-two" />
        <span className="relay-loading-core" />
        <span className="relay-loading-particle relay-loading-particle-one" />
        <span className="relay-loading-particle relay-loading-particle-two" />
        <span className="relay-loading-particle relay-loading-particle-three" />
      </div>
      <p>{label}</p>
      <span className="sr-only">Please wait.</span>
    </div>
  );
}
