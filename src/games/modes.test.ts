import { CATALOGUE } from './catalogue/catalogue';
import { DAILY_SOURCES } from './defi/daily';
import {
  EXPRESS_ROUNDS,
  GAME_MODES,
  KIND_NEEDS,
  isGameMode,
  modeDrawSeconds,
  modeRounds,
  suitsMode,
  type GameMode,
} from './modes';
import { GAMES } from './registry';

const ALL = [...GAMES, ...CATALOGUE];
const suited = (mode: GameMode) => ALL.filter((g) => suitsMode(g.needs, mode)).map((g) => g.id);

describe('façons de jouer', () => {
  it('Normal et Express proposent tous les jeux', () => {
    expect(suited('normal')).toEqual(ALL.map((g) => g.id));
    expect(suited('express')).toEqual(ALL.map((g) => g.id));
  });

  it('Voiture : seulement des jeux oraux, rien à regarder', () => {
    expect(suited('voiture')).toEqual([
      'chanson',
      'raconte',
      'animal',
      'devinette',
      'tresor',
      'vrai-faux',
      'rime',
      'contraire',
    ]);
    for (const g of ALL.filter((g) => suitsMode(g.needs, 'voiture')))
      expect(g.needs!.looks).toBe(false);
  });

  it('Coucher : ni mime, ni jeu qui fait bouger', () => {
    expect(suited('coucher')).not.toContain('mime');
    expect(suited('coucher')).toEqual([
      'chanson',
      'lettres',
      'dessin',
      'raconte',
      'animal',
      'couleur',
      'devinette',
      'emotion',
      'tresor',
      'vrai-faux',
      'rime',
      'contraire',
      'ombre',
      'intrus',
      'disparu',
      'compte',
    ]);
  });

  it('un jeu qui ne déclare rien ne va ni au coucher ni en voiture', () => {
    expect(suitsMode(undefined, 'normal')).toBe(true);
    expect(suitsMode(undefined, 'coucher')).toBe(false);
    expect(suitsMode(undefined, 'voiture')).toBe(false);
  });

  it('les types de carte à regarder sont écartés en voiture', () => {
    const oral = (Object.keys(KIND_NEEDS) as (keyof typeof KIND_NEEDS)[]).filter((k) =>
      suitsMode(KIND_NEEDS[k], 'voiture'),
    );
    expect(oral.sort()).toEqual(['chat', 'melody', 'question', 'sound']);
  });

  it('le défi du jour déclare aussi ses besoins', () => {
    const car = DAILY_SOURCES.filter((s) => suitsMode(s.needs, 'voiture')).map((s) => s.game);
    expect(car).toEqual([
      'chanson',
      'animal',
      'devinette',
      'tresor',
      'vrai-faux',
      'rime',
      'contraire',
    ]);
  });

  it('Express : 3 manches ; Coucher : pas de minuteur', () => {
    expect(modeRounds(10, 'express')).toBe(EXPRESS_ROUNDS);
    expect(modeRounds(10, 'voiture')).toBe(10);
    expect(modeDrawSeconds(60, 'coucher')).toBe(0);
    expect(modeDrawSeconds(60, 'normal')).toBe(60);
  });

  it('reconnaît les modes', () => {
    expect(GAME_MODES.map((m) => m.value)).toEqual(['normal', 'express', 'coucher', 'voiture']);
    expect(isGameMode('voiture')).toBe(true);
    expect(isGameMode('avion')).toBe(false);
  });
});
