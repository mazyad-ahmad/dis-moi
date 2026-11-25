export function Logo() {
  return (
    <span className="logo">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        strokeLinecap="round"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M29 9a14 14 0 1 0 0 18" stroke="var(--forest)" />
        <circle cx="18" cy="17" r="4.5" fill="var(--sun)" />
        <path d="M12 25l5-5 4 3 4-4" stroke="var(--river)" />
      </svg>
      <span className="logo__text">Dis-moi</span>
    </span>
  );
}
