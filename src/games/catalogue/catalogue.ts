import type { Deck } from '../deck/types';

export interface CatalogueGame extends Deck {
  desc: string;
}

/**
 * Jeux du catalogue (maquette Ajouter). Contenu écrit pour l'appli :
 * pas d'enregistrement ni d'image téléchargée, donc pas de droits à vérifier.
 */
export const CATALOGUE: CatalogueGame[] = [
  {
    id: 'animal',
    name: 'Quel animal ?',
    category: 'Animaux',
    desc: 'Le parent imite le cri, l’enfant devine',
    mark: 'Cri',
    tint: 'meadow',
    kind: 'sound',
    items: [
      { answer: 'La vache', emoji: '🐄', text: 'Meuh !', hint: 'Elle donne du lait.' },
      { answer: 'Le chat', emoji: '🐈', text: 'Miaou !', hint: 'Il ronronne quand on le caresse.' },
      { answer: 'Le chien', emoji: '🐕', text: 'Ouaf ouaf !', hint: 'Il remue la queue.' },
      { answer: 'Le mouton', emoji: '🐑', text: 'Bêê !', hint: 'Sa laine tient chaud.' },
      {
        answer: 'Le cochon',
        emoji: '🐖',
        text: 'Groin groin !',
        hint: 'Il est rose et aime la boue.',
      },
      { answer: 'Le canard', emoji: '🦆', text: 'Coin coin !', hint: 'Il nage sur la mare.' },
      { answer: 'Le coq', emoji: '🐓', text: 'Cocorico !', hint: 'Il chante le matin.' },
      { answer: 'L’âne', emoji: '🫏', text: 'Hi-han !', hint: 'Il a de grandes oreilles.' },
      {
        answer: 'Le cheval',
        emoji: '🐎',
        text: 'Hiiiii ! (il hennit)',
        hint: 'On peut monter dessus.',
      },
      { answer: 'La poule', emoji: '🐔', text: 'Cot cot codet !', hint: 'Elle pond des œufs.' },
      { answer: 'Le lion', emoji: '🦁', text: 'Roaaar !', hint: 'C’est le roi des animaux.' },
      { answer: 'Le hibou', emoji: '🦉', text: 'Hou hou !', hint: 'Il ne dort pas la nuit.' },
      {
        answer: 'La grenouille',
        emoji: '🐸',
        text: 'Croâ croâ !',
        hint: 'Elle saute dans l’étang.',
      },
      { answer: 'Le loup', emoji: '🐺', text: 'Aouuuuh !', hint: 'Il hurle à la lune.' },
      { answer: 'L’abeille', emoji: '🐝', text: 'Bzzzz !', hint: 'Elle fait du miel.' },
      { answer: 'Le serpent', emoji: '🐍', text: 'Sssss !', hint: 'Il n’a pas de pattes.' },
      { answer: 'La souris', emoji: '🐁', text: 'Couic couic !', hint: 'Elle aime le fromage.' },
      { answer: 'L’oiseau', emoji: '🐦', text: 'Cui-cui !', hint: 'Il vole et fait son nid.' },
    ],
  },
  {
    id: 'couleur',
    name: 'Quelle couleur ?',
    category: 'Couleurs',
    desc: 'Nomme la couleur montrée',
    mark: 'Aa',
    tint: 'dawn',
    kind: 'image',
    items: [
      { answer: 'Rouge', color: '#d7263d', hint: 'Comme une fraise.' },
      { answer: 'Bleu', color: '#1e5fbf', hint: 'Comme le ciel.' },
      { answer: 'Jaune', color: '#f5d000', hint: 'Comme le soleil.' },
      { answer: 'Vert', color: '#2e9e44', hint: 'Comme l’herbe.' },
      { answer: 'Orange', color: '#f28c1b', hint: 'Comme une carotte.' },
      { answer: 'Violet', color: '#7b3fa0', hint: 'Comme une aubergine.' },
      { answer: 'Rose', color: '#f48fb1', hint: 'Comme un cochon.' },
      { answer: 'Marron', color: '#7a4a24', hint: 'Comme le chocolat.' },
      { answer: 'Noir', color: '#111111', hint: 'Comme la nuit.' },
      { answer: 'Blanc', color: '#ffffff', hint: 'Comme la neige.' },
      { answer: 'Gris', color: '#8c8c8c', hint: 'Comme un éléphant.' },
    ],
  },
  {
    id: 'mime',
    name: 'Mime ça',
    category: 'Mime',
    desc: 'L’enfant mime, le parent devine',
    mark: 'Mi',
    tint: 'sky',
    kind: 'image',
    items: [
      { answer: 'Le lapin', emoji: '🐇', text: 'Saute comme un lapin' },
      { answer: 'L’éléphant', emoji: '🐘', text: 'Fais l’éléphant' },
      { answer: 'Le singe', emoji: '🐒', text: 'Fais le singe' },
      { answer: 'Le serpent', emoji: '🐍', text: 'Rampe comme un serpent' },
      { answer: 'Le poisson', emoji: '🐟', text: 'Nage comme un poisson' },
      { answer: 'Le kangourou', emoji: '🦘', text: 'Saute comme un kangourou' },
      { answer: 'Dormir', emoji: '😴', text: 'Fais semblant de dormir' },
      { answer: 'Avoir froid', emoji: '🥶', text: 'Montre que tu as très froid' },
      { answer: 'Rire', emoji: '😂', text: 'Rigole sans faire de bruit' },
      { answer: 'Se brosser les dents', emoji: '🪥', text: 'Brosse-toi les dents' },
      { answer: 'Se laver les mains', emoji: '🧼', text: 'Lave-toi les mains' },
      { answer: 'Manger une glace', emoji: '🍦', text: 'Mange une glace' },
      { answer: 'Conduire une voiture', emoji: '🚗', text: 'Conduis une voiture' },
      { answer: 'L’avion', emoji: '✈️', text: 'Vole comme un avion' },
      { answer: 'Faire du vélo', emoji: '🚲', text: 'Pédale sur un vélo' },
      { answer: 'Jouer de la guitare', emoji: '🎸', text: 'Joue de la guitare' },
      { answer: 'Téléphoner', emoji: '📞', text: 'Téléphone à quelqu’un' },
      { answer: 'Ouvrir un cadeau', emoji: '🎁', text: 'Ouvre un cadeau' },
      { answer: 'Le robot', emoji: '🤖', text: 'Marche comme un robot' },
      { answer: 'Nager', emoji: '🏊', text: 'Nage dans la piscine' },
    ],
  },
  {
    id: 'devinette',
    name: 'Devinettes',
    category: 'Devinettes',
    desc: 'Des énigmes à lire à voix haute',
    mark: '?',
    tint: 'meadow',
    kind: 'question',
    items: [
      {
        text: 'Je suis jaune, je brille dans le ciel et je chauffe. Qui suis-je ?',
        answer: 'Le soleil',
        hint: 'On me voit le jour.',
      },
      {
        text: 'J’ai de longues oreilles et j’adore les carottes. Qui suis-je ?',
        answer: 'Le lapin',
        hint: 'Je fais des bonds.',
      },
      {
        text: 'Je suis blanche et froide, je tombe du ciel en hiver. Qui suis-je ?',
        answer: 'La neige',
        hint: 'On fait des bonshommes avec moi.',
      },
      {
        text: 'On me met aux pieds avant de sortir. Qui suis-je ?',
        answer: 'Les chaussures',
        hint: 'J’ai souvent des lacets.',
      },
      {
        text: 'J’ai quatre roues et un volant. Qui suis-je ?',
        answer: 'La voiture',
        hint: 'Je roule sur la route.',
      },
      {
        text: 'Je fais « meuh » et je donne du lait. Qui suis-je ?',
        answer: 'La vache',
        hint: 'Je vis dans un pré.',
      },
      {
        text: 'On me souffle le jour de ton anniversaire. Qui suis-je ?',
        answer: 'Les bougies',
        hint: 'Je suis sur le gâteau.',
      },
      {
        text: 'J’ai des aiguilles mais je ne pique pas, je donne l’heure. Qui suis-je ?',
        answer: 'L’horloge',
        hint: 'Je fais tic-tac.',
      },
      {
        text: 'Je suis rond, on me lance et on court après. Qui suis-je ?',
        answer: 'Le ballon',
        hint: 'On joue au foot avec moi.',
      },
      {
        text: 'On dort dedans toute la nuit. Qui suis-je ?',
        answer: 'Le lit',
        hint: 'J’ai un oreiller et une couette.',
      },
      {
        text: 'Je suis orange et longue, le lapin m’adore. Qui suis-je ?',
        answer: 'La carotte',
        hint: 'Je pousse dans la terre.',
      },
      {
        text: 'J’ai un très long cou et des taches. Qui suis-je ?',
        answer: 'La girafe',
        hint: 'Je mange les feuilles en haut des arbres.',
      },
      {
        text: 'Je brille la nuit et je change de forme. Qui suis-je ?',
        answer: 'La lune',
        hint: 'Parfois je suis ronde, parfois en croissant.',
      },
      {
        text: 'On m’ouvre quand il pleut. Qui suis-je ?',
        answer: 'Le parapluie',
        hint: 'Je te garde au sec.',
      },
      {
        text: 'J’ai une trompe et de grandes oreilles. Qui suis-je ?',
        answer: 'L’éléphant',
        hint: 'Je suis très lourd.',
      },
      {
        text: 'Je fais des bulles et je sens bon, on se lave avec moi. Qui suis-je ?',
        answer: 'Le savon',
        hint: 'Je glisse des mains.',
      },
      {
        text: 'Je suis froide et sucrée, je fonds au soleil. Qui suis-je ?',
        answer: 'La glace',
        hint: 'On me mange en cornet.',
      },
      {
        text: 'J’ai des pages et je raconte des histoires. Qui suis-je ?',
        answer: 'Le livre',
        hint: 'On me lit le soir.',
      },
      {
        text: 'Je vis dans l’eau, je n’ai pas de pattes mais des nageoires. Qui suis-je ?',
        answer: 'Le poisson',
        hint: 'Je fais des bulles.',
      },
      {
        text: 'Je pique, je suis vert, et l’hiver on me décore. Qui suis-je ?',
        answer: 'Le sapin',
        hint: 'On met des cadeaux à mes pieds.',
      },
    ],
  },
];

export function findCatalogueGame(id: string): CatalogueGame | undefined {
  return CATALOGUE.find((g) => g.id === id);
}
