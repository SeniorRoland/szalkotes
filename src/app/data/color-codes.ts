import { ColorName } from '../models/splice.models';

export const COLOR_HEX: Record<ColorName, string> = {
  'piros': '#D7262B', 'zöld': '#2F9A3E', 'kék': '#1F5FBF', 'sárga': '#F2D20F', 'fehér': '#F4F4F2',
  'szürke': '#9AA0A6', 'barna': '#7A4E2D', 'lila': '#7D3C98', 'türkiz': '#17A3B0', 'fekete': '#1A1A1A',
  'narancs': '#F07F13', 'rózsaszín': '#F29BB9', 'natúr': '#E6DCC3',
};

export const TIA_598: readonly ColorName[] = [
  'kék', 'narancs', 'zöld', 'barna', 'szürke', 'fehér', 'piros', 'fekete', 'sárga', 'lila', 'rózsaszín', 'türkiz',
];

export const DIN_VDE_0888: readonly ColorName[] = [
  'piros', 'zöld', 'kék', 'sárga', 'fehér', 'szürke', 'barna', 'lila', 'türkiz', 'fekete', 'narancs', 'rózsaszín',
];

/** Számláló–irány pászmaszínezés: 1. piros, 2. zöld, a többi natúr. */
export function counterDirection(tubes: number): ColorName[] {
  return Array.from({ length: tubes }, (_, i) => (i === 0 ? 'piros' : i === 1 ? 'zöld' : 'natúr'));
}
