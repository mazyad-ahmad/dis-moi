import { Fragment, useState, type ReactNode } from 'react';

/** Remonte la partie à zéro quand on appuie sur « Rejouer ». */
export function Replayable({ children }: { children: (replay: () => void) => ReactNode }) {
  const [session, setSession] = useState(0);
  return <Fragment key={session}>{children(() => setSession((s) => s + 1))}</Fragment>;
}
