/** Színnevek, amelyekből a pászma- és szálszínsorok felépülnek. */
export type ColorName =
  | 'piros' | 'zöld' | 'kék' | 'sárga' | 'fehér' | 'szürke' | 'barna'
  | 'lila' | 'türkiz' | 'fekete' | 'narancs' | 'rózsaszín' | 'natúr';

/** Egy optikai kábel a passzív berendezésben. */
export interface OpticalCable {
  id: string;
  route: string;
  tubes: number;
  fibersPerTube: number;
  /** A pászmák színsora. Ha rövidebb a pászmák számánál, gyűrűs jelöléssel ismétlődik. */
  tubeColorScheme: readonly ColorName[];
  /** A pászmán belüli szálak színsora. Ha rövidebb, gyűrűs jelöléssel ismétlődik. */
  fiberColorScheme: readonly ColorName[];
  standard: string;
}

/** Passzív berendezés (kötődoboz, ODF, osztószekrény) a hozzá rendelt kábelekkel. */
export interface PassiveDevice {
  id: string;
  type: string;
  location: string;
  cables: OpticalCable[];
}

/** Egy szál azonosítása: kábel, pászma (1-től), pászmán belüli szál (1-től). */
export interface FiberRef {
  cableId: string;
  tube: number;
  fiber: number;
}

/** Két szál összekötése. Az "a" oldal a létrehozáskor bal oldalon lévő kábel. */
export interface Splice {
  id: string;
  a: FiberRef;
  b: FiberRef;
}

export type Side = 'left' | 'right';

export interface ResolvedColor {
  name: ColorName;
  hex: string;
  /** 0 = nincs gyűrű, 1 = egy gyűrű (pl. 13–24. szál), 2 = két gyűrű … */
  ring: number;
  label: string;
}

export interface FiberOccupancy {
  splice: Splice;
  other: FiberRef;
}
