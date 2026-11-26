import { render, screen } from '@testing-library/react';
import { useLiveRead } from './live';

// Une lecture interrompue que Dexie abandonne sans rien dire (#143) : on relance.
it('relance une lecture restée sans réponse', async () => {
  let calls = 0;
  const querier = () => {
    calls += 1;
    // Première lecture : jamais de réponse ; la suivante répond.
    return calls === 1 ? new Promise<string>(() => {}) : Promise.resolve('prêt');
  };
  function Probe() {
    return <p>{useLiveRead(querier, [], 50) ?? 'lecture'}</p>;
  }
  render(<Probe />);
  expect(screen.getByText('lecture')).toBeInTheDocument();
  expect(await screen.findByText('prêt')).toBeInTheDocument();
  expect(calls).toBeGreaterThanOrEqual(2);
});
