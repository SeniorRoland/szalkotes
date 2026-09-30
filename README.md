# Szálkötés (Angular)

Passzív optikai berendezés kábelszálainak grafikus összekötése.

## Indítás

```bash
npm install
npm start        # http://localhost:4200
npm run build    # éles build a dist/ mappába
```

Angular 20-szal készült (standalone komponensek, signalok, új `@if` / `@for` szintaxis).

## Felépítés

```
src/app/
  models/splice.models.ts        Típusok: PassiveDevice, OpticalCable, FiberRef, Splice
  data/color-codes.ts            Színkódok és színsorok (TIA-598, DIN VDE 0888, számláló–irány)
  data/mock-devices.ts           Teszt berendezések és kábelek
  utils/fiber-utils.ts           Színsor-feloldás, gyűrűs jelölés, szálsorszám
  services/device.service.ts     Adatforrás (most mock, később HttpClient)
  services/splice-store.ts       Teljes képernyőállapot signalokban, visszavonás, localStorage
  components/cable-panel/        Egy kábel pászmái és szálai (bal / jobb, tükrözött)
  components/splice-board/       Két panel + SVG kötésvonalak, húzás, automatikus görgetés
  components/splice-table/       Kötések táblázata
  app.ts                         Berendezés- és kiinduló kábel választó, eszköztár
```

## Valós adatra váltás

A `DeviceService.getDevices()` metódust kell `HttpClient` hívásra cserélni
(és az `app.config.ts`-ben `provideHttpClient()`-et felvenni). A kötések mentéséhez
a `SpliceStore.mutate()` a természetes pont, ahol a változást a backend felé is el lehet küldeni.
