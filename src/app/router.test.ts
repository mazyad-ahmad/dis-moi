import { parseHash } from './router';

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/etoiles', { name: 'stars' }],
    ['#/parent/', { name: 'parent' }],
    ['#/joueurs', { name: 'players' }],
    ['#/ajouter', { name: 'add-game' }],
    ['#/jeu/chanson', { name: 'game', id: 'chanson' }],
    ['#/nimporte', { name: 'not-found', path: '/nimporte' }],
  ])('%s', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected);
  });
});
