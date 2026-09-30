import { COLOR_HEX } from '../data/color-codes';
import { ColorName, FiberRef, OpticalCable, ResolvedColor } from '../models/splice.models';

export const fiberKey = (r: FiberRef): string => `${r.cableId}|${r.tube}|${r.fiber}`;

export function parseFiberKey(key: string): FiberRef {
  const [cableId, tube, fiber] = key.split('|');
  return { cableId, tube: Number(tube), fiber: Number(fiber) };
}

export function colorAt(scheme: readonly ColorName[], index: number): ResolvedColor {
  const name = scheme[index % scheme.length];
  const ring = Math.floor(index / scheme.length);
  const label = ring === 0 ? name : ring === 1 ? `${name}, gyűrűs` : `${name}, ${ring}× gyűrűs`;
  return { name, hex: COLOR_HEX[name] ?? '#888888', ring, label };
}

export const tubeColor = (c: OpticalCable, tube: number) => colorAt(c.tubeColorScheme, tube - 1);
export const fiberColor = (c: OpticalCable, _tube: number, fiber: number) => colorAt(c.fiberColorScheme, fiber - 1);
export const fiberNumber = (c: OpticalCable, tube: number, fiber: number) => (tube - 1) * c.fibersPerTube + fiber;
export const totalFibers = (c: OpticalCable) => c.tubes * c.fibersPerTube;
export const cableLabel = (c: OpticalCable) =>
  `${c.id} – ${totalFibers(c)} szál (${c.tubes}×${c.fibersPerTube}), ${c.route}`;

const ringColor = (c: ResolvedColor) => (c.name === 'fekete' ? '#F4F4F2' : '#1A1A1A');

/** Kerek szálvég / színminta háttere, gyűrűs jelöléssel. */
export function dotBackground(c: ResolvedColor): string {
  return c.ring
    ? `radial-gradient(circle, ${c.hex} 0 32%, ${ringColor(c)} 33% 58%, ${c.hex} 59%)`
    : c.hex;
}

/** Vízszintes szál- vagy pászmasáv háttere, gyűrűs jelöléssel. */
export function strandBackground(c: ResolvedColor): string {
  return c.ring
    ? `repeating-linear-gradient(90deg, ${c.hex} 0 12px, ${ringColor(c)} 12px 15px)`
    : c.hex;
}

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
