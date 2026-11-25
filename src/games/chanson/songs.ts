/**
 * Comptines et airs traditionnels du domaine public.
 * Les mélodies sont jouées par un petit synthétiseur (aucun enregistrement) :
 * pas de droits d'interprétation ni de fichier audio à télécharger.
 */
export interface Song {
  id: string;
  title: string;
  /** Indice que le parent peut donner à l'enfant. */
  hint: string;
  bpm: number;
  melody: string;
}

export const EXTRACT_SECONDS = 10;

export const SONGS: Song[] = [
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    hint: 'On demande à quelqu’un s’il dort encore',
    bpm: 120,
    melody:
      'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 | G4:.5 A4:.5 G4:.5 F4:.5 E4 C4',
  },
  {
    id: 'au-clair-de-la-lune',
    title: 'Au clair de la lune',
    hint: 'Pierrot prête sa plume à son ami',
    bpm: 120,
    melody:
      'C4 C4 C4 D4 | E4:2 D4:2 | C4 E4 D4 D4 | C4:4 | C4 C4 C4 D4 | E4:2 D4:2 | C4 E4 D4 D4 | C4:4',
  },
  {
    id: 'ah-vous-dirai-je-maman',
    title: 'Ah ! vous dirai-je, maman',
    hint: 'Même air que « Brille, brille, petite étoile »',
    bpm: 110,
    melody: 'C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | G4 G4 F4 F4 | E4 E4 D4:2',
  },
  {
    id: 'joyeux-anniversaire',
    title: 'Joyeux anniversaire',
    hint: 'On la chante devant un gâteau avec des bougies',
    bpm: 130,
    melody:
      'G4:.75 G4:.25 A4 G4 C5 B4:2 | G4:.75 G4:.25 A4 G4 D5 C5:2 | G4:.75 G4:.25 G5 E5 C5 B4 A4:2 | F5:.75 F5:.25 E5 C5 D5 C5:2',
  },
  {
    id: 'vive-le-vent',
    title: 'Vive le vent',
    hint: 'Une chanson de Noël, avec de la neige',
    bpm: 150,
    melody:
      'E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:.5 | E4:4 | F4 F4 F4:1.5 F4:.5 | F4 E4 E4 E4:.5 E4:.5 | E4 D4 D4 E4 | D4:2 G4:2',
  },
  {
    id: 'douce-nuit',
    title: 'Douce nuit',
    hint: 'Une chanson de Noël très douce',
    bpm: 160,
    melody: 'G4:1.5 A4:.5 G4 E4:3 | G4:1.5 A4:.5 G4 E4:3 | D5:2 D5 B4:3 | C5:2 C5 G4:3',
  },
  {
    id: 'mon-beau-sapin',
    title: 'Mon beau sapin',
    hint: 'On la chante devant l’arbre de Noël',
    bpm: 100,
    melody:
      'D4 | G4:.75 G4:.25 G4:1.5 A4:.5 | B4:.75 B4:.25 B4:1.5 B4:.5 | A4:.5 B4:.5 C5:1.5 F#4 | A4 G4:2',
  },
  {
    id: 'ode-a-la-joie',
    title: 'L’Ode à la joie',
    hint: 'Une musique de Beethoven, l’hymne de l’Europe',
    bpm: 130,
    melody:
      'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:.5 C4:2',
  },
  {
    id: 'berceuse-de-brahms',
    title: 'La berceuse de Brahms',
    hint: 'Un air pour s’endormir, comme dans les boîtes à musique',
    bpm: 120,
    melody:
      'E4:.5 E4:.5 G4:2 | E4:.5 E4:.5 G4:2 | E4:.5 G4:.5 C5 B4:1.5 A4:.5 A4 G4 | D4:.5 E4:.5 F4 D4 | D4:.5 E4:.5 F4:2 | D4:.5 F4:.5 B4:.5 A4:.5 G4 B4 C5:3',
  },
  {
    id: 'alouette',
    title: 'Alouette',
    hint: 'Un petit oiseau… qu’on va plumer !',
    bpm: 130,
    melody: 'C4 D4 E4 E4:2 | D4 C4 D4 E4 C4 G3:2 | C4 D4 E4 E4:2 | D4 C4 D4 E4 C4:2',
  },
  {
    id: 'lettre-a-elise',
    title: 'La Lettre à Élise',
    hint: 'Un air de piano de Beethoven, très connu',
    bpm: 130,
    melody:
      'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 | A4:1.5 C4:.5 E4:.5 A4:.5 | B4:1.5 E4:.5 G#4:.5 B4:.5 | C5:1.5 E4:.5 | E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 | A4:2',
  },
];
