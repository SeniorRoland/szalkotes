import { OpticalCable, PassiveDevice } from '../models/splice.models';
import { DIN_VDE_0888 as DIN, TIA_598 as TIA, counterDirection } from './color-codes';

function cable(
  id: string, route: string, tubes: number, fibersPerTube: number,
  tubeColorScheme: OpticalCable['tubeColorScheme'], fiberColorScheme: OpticalCable['fiberColorScheme'],
  standard: string,
): OpticalCable {
  return { id, route, tubes, fibersPerTube, tubeColorScheme, fiberColorScheme, standard };
}

export const MOCK_DEVICES: PassiveDevice[] = [
  {
    id: 'OK-PCS-0142', type: 'Kötődoboz', location: 'Pécs, Rákóczi út 58.',
    cables: [
      cable('K-1021', 'Központ felől', 4, 12, TIA, TIA, 'TIA-598'),
      cable('K-1022', 'Rákóczi út, páros oldal', 2, 12, TIA, TIA, 'TIA-598'),
      cable('K-1023', 'Bajcsy-Zsilinszky utcai leágazás', 3, 4, TIA, TIA, 'TIA-598'),
      cable('K-1024', 'Gerinc, Siklós irány', 8, 12, DIN, DIN, 'DIN VDE 0888'),
    ],
  },
  {
    id: 'ODF-PCS-KP01', type: 'Optikai rendező (ODF)', location: 'Pécs, központi épület, 2. szint',
    cables: [
      cable('K-2001', 'Gerinc, Kaposvár irány', 12, 12, DIN, DIN, 'DIN VDE 0888'),
      cable('K-2002', 'Belvárosi gyűrű', 2, 24, DIN, DIN, 'DIN VDE 0888, gyűrűs jelöléssel'),
      cable('K-2003', 'Uránvárosi elosztó', 4, 6, counterDirection(4), DIN, 'Számláló–irány pászmák'),
      cable('P-2010', 'Patch kábel, A sor', 1, 24, ['natúr'], TIA, 'TIA-598, gyűrűs jelöléssel'),
    ],
  },
  {
    id: 'OSZT-PCS-0317', type: 'Utcai osztószekrény', location: 'Pécs, Megyeri út 12.',
    cables: [
      cable('K-3101', 'Megyeri út, gerinc', 2, 12, TIA, TIA, 'TIA-598'),
      cable('K-3102', 'Társasház, Megyeri út 14.', 2, 6, TIA, TIA, 'TIA-598'),
      cable('K-3103', 'Családi házak, Dobó István utca', 1, 8, DIN, DIN, 'DIN VDE 0888'),
      cable('K-3104', 'Irodaház, Megyeri út 20.', 1, 8, DIN, DIN, 'DIN VDE 0888'),
      cable('K-3105', 'Tartalék', 1, 4, TIA, TIA, 'TIA-598'),
    ],
  },
];
