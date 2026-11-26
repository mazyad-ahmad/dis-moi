import { parseHash } from './router';

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/etoiles', { name: 'stars' }],
    ['#/parent/', { name: 'parent' }],
    ['#/joueurs', { name: 'players' }],
    ['#/equipes', { name: 'teams' }],
    ['#/ajouter', { name: 'add-game' }],
    ['#/jeu/chanson', { name: 'game', id: 'chanson' }],
    ['#/jeu/perso-3', { name: 'game', id: 'perso-3' }],
    ['#/creer/3', { name: 'edit-game', id: 3 }],
    ['#/nimporte', { name: 'not-found', path: '/nimporte' }],
  ])('%s', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected);
  });
});
