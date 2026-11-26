/**
 * Devine-tête (#67) : l'enfant tient le téléphone sur son front, écran tourné vers les autres.
 * Il penche la tête vers le bas quand il a trouvé, vers le haut pour passer.
 *
 * L'inclinaison est lue par l'événement `deviceorientation`, sur le téléphone seulement :
 * rien n'est enregistré ni envoyé. Elle reste facultative (les boutons marchent toujours) et
 * n'est demandée qu'après une explication, d'un appui du parent. Ce module ne contient que des
 * fonctions pures et de petits accès au navigateur, testables sans capteur.
 */
export const TETE_ID = 'devine-tete';

/** Geste reconnu : vers le bas (trouvé) ou vers le haut (passer). */
export type TiltGesture = 'down' | 'up';

/** Position du téléphone : debout (neutre), penché, ou entre les deux (on attend). */
export type TiltPose = TiltGesture | 'upright' | 'between';

/** Au-delà de ±0,55 (environ 33° depuis la verticale), le geste est reconnu. */
export const GESTURE_THRESHOLD = 0.55;
/** En deçà de ±0,35 (environ 20°), le téléphone est revenu debout. */
export const UPRIGHT_THRESHOLD = 0.35;
/** Temps debout avant d'accepter un geste : on pose le téléphone sur le front sans rien valider. */
export const ARM_MS = 400;
/** Temps sans mesure après lequel l'inclinaison est jugée absente (ordinateur, capteur coupé). */
export const NO_SENSOR_MS = 2000;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Où regarde l'écran, de 1 (vers le plafond) à −1 (vers le sol), 0 quand il est debout,
 * d'après les angles `beta` et `gamma` (degrés). C'est la composante verticale de l'axe qui
 * sort de l'écran : cos β · cos γ. Vaut dans tous les sens où l'on tient le téléphone
 * (portrait, paysage à gauche ou à droite) et sans sauts aux angles limites.
 */
export function screenFacing(beta: number, gamma: number): number {
  return Math.cos(rad(beta)) * Math.cos(rad(gamma));
}

export function poseOf(facing: number): TiltPose {
  if (facing <= -GESTURE_THRESHOLD) return 'down';
  if (facing >= GESTURE_THRESHOLD) return 'up';
  if (Math.abs(facing) <= UPRIGHT_THRESHOLD) return 'upright';
  return 'between';
}

/**
 * Suivi des gestes : un geste n'est compté qu'une fois, puis il faut revenir debout (et y
 * rester `ARM_MS`) avant le suivant. Au départ aussi : le parent tend le téléphone à plat,
 * l'enfant le pose sur son front, rien n'est validé tant qu'il n'est pas resté debout.
 */
export interface TiltState {
  /** Prêt à reconnaître un geste. */
  armed: boolean;
  /** Depuis quand le téléphone est debout (ms), si c'est le cas. */
  uprightSince?: number;
}

export const TILT_START: TiltState = { armed: false };

export function nextTilt(
  state: TiltState,
  pose: TiltPose,
  now: number,
): { state: TiltState; gesture?: TiltGesture } {
  if (pose === 'down' || pose === 'up')
    return state.armed ? { state: { armed: false }, gesture: pose } : { state: { armed: false } };
  if (pose === 'between') return { state: { armed: state.armed } };
  const since = state.uprightSince ?? now;
  return { state: { armed: state.armed || now - since >= ARM_MS, uprightSince: since } };
}

/**
 * Sens du téléphone tenu en paysage, d'après `gamma` : bord droit en bas (tourné vers la
 * droite) ou bord gauche en bas. Sert à tourner le mot quand l'écran reste en portrait.
 * `undefined` tant que le téléphone n'est pas franchement sur le côté.
 */
export function sideOf(gamma: number): 'left' | 'right' | undefined {
  if (gamma >= 45) return 'right';
  if (gamma <= -45) return 'left';
  return undefined;
}

type OrientationPermission = { requestPermission?: () => Promise<PermissionState | string> };

function orientationEvent(): (typeof DeviceOrientationEvent & OrientationPermission) | undefined {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
    ? (window.DeviceOrientationEvent as typeof DeviceOrientationEvent & OrientationPermission)
    : undefined;
}

/** Le navigateur connaît-il l'inclinaison ? (Elle peut encore manquer : ordinateur.) */
export function tiltAvailable(): boolean {
  return orientationEvent() !== undefined;
}

/** Le navigateur demande-t-il une autorisation (iPhone) ? Android ne demande rien. */
export function tiltAsks(): boolean {
  return typeof orientationEvent()?.requestPermission === 'function';
}

/**
 * Demande l'inclinaison, seulement après l'explication et d'un appui du parent (l'iPhone
 * l'exige). `true` si on peut l'écouter. Ne lève jamais d'erreur.
 */
export async function askTilt(): Promise<boolean> {
  const event = orientationEvent();
  if (!event) return false;
  if (typeof event.requestPermission !== 'function') return true;
  try {
    return (await event.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}
