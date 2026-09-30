import { Injectable, computed, effect, signal } from '@angular/core';
import {
  FiberOccupancy, OpticalCable, PassiveDevice, Side, Splice,
} from '../models/splice.models';
import { fiberKey, parseFiberKey, range } from '../utils/fiber-utils';

interface PendingEnd { key: string; side: Side; }
interface HistoryEntry { deviceId: string; splices: Splice[]; }
interface PersistedState {
  deviceId: string | null;
  leftId: string | null;
  rightId: string | null;
  splicesByDevice: Record<string, Splice[]>;
  collapsed: Record<string, boolean>;
  pairOnly: boolean;
}

const STORAGE_KEY = 'szalkotes:angular:v1';
const HISTORY_LIMIT = 60;

/**
 * A szálkötés képernyő teljes állapota signalokban.
 * A komponensek csak olvassák a signalokat és a metódusokon keresztül módosítanak.
 */
@Injectable({ providedIn: 'root' })
export class SpliceStore {
  // ---- alapállapot ----
  readonly devices = signal<PassiveDevice[]>([]);
  readonly deviceId = signal<string | null>(null);
  readonly leftId = signal<string | null>(null);
  readonly rightId = signal<string | null>(null);
  readonly splicesByDevice = signal<Record<string, Splice[]>>({});
  readonly collapsed = signal<Record<string, boolean>>({});
  readonly pairOnly = signal(false);

  // ---- átmeneti UI-állapot ----
  readonly pending = signal<PendingEnd | null>(null);
  readonly dropTarget = signal<string | null>(null);
  readonly hoverId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);
  /** Egy szál kulcsa, amelyhez a kötési felületnek görgetnie kell. */
  readonly scrollRequest = signal<string | null>(null);

  private readonly history = signal<HistoryEntry[]>([]);
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- származtatott állapot ----
  readonly device = computed(() => this.devices().find(d => d.id === this.deviceId()) ?? null);
  readonly leftCable = computed(() => this.cableById(this.leftId()));
  readonly rightCable = computed(() => this.cableById(this.rightId()));
  readonly rightOptions = computed(() => (this.device()?.cables ?? []).filter(c => c.id !== this.leftId()));
  readonly hasPair = computed(() => !!this.leftCable() && !!this.rightCable());

  readonly splices = computed(() => {
    const id = this.deviceId();
    return id ? this.splicesByDevice()[id] ?? [] : [];
  });

  readonly pairSplices = computed(() => this.splices().filter(s => this.isPairSplice(s)));

  readonly occupancy = computed(() => {
    const map = new Map<string, FiberOccupancy>();
    for (const s of this.splices()) {
      map.set(fiberKey(s.a), { splice: s, other: s.b });
      map.set(fiberKey(s.b), { splice: s, other: s.a });
    }
    return map;
  });

  readonly highlightId = computed(() => this.hoverId() ?? this.flashId());
  readonly highlightedKeys = computed(() => {
    const id = this.highlightId();
    const s = id ? this.splices().find(x => x.id === id) : undefined;
    return new Set(s ? [fiberKey(s.a), fiberKey(s.b)] : []);
  });

  readonly canUndo = computed(() => this.history().some(h => h.deviceId === this.deviceId()));

  constructor() {
    this.restore();
    effect(() => this.persist({
      deviceId: this.deviceId(), leftId: this.leftId(), rightId: this.rightId(),
      splicesByDevice: this.splicesByDevice(), collapsed: this.collapsed(), pairOnly: this.pairOnly(),
    }));
  }

  // ---- lekérdezők ----
  cableById(id: string | null): OpticalCable | null {
    if (!id) return null;
    return this.device()?.cables.find(c => c.id === id) ?? null;
  }

  isPairSplice(s: Splice): boolean {
    const l = this.leftId(), r = this.rightId();
    if (!l || !r) return false;
    return (s.a.cableId === l && s.b.cableId === r) || (s.a.cableId === r && s.b.cableId === l);
  }

  freeFiberKeys(cable: OpticalCable): string[] {
    const occ = this.occupancy();
    const keys: string[] = [];
    for (const tube of range(cable.tubes)) {
      for (const fiber of range(cable.fibersPerTube)) {
        const k = fiberKey({ cableId: cable.id, tube, fiber });
        if (!occ.has(k)) keys.push(k);
      }
    }
    return keys;
  }

  isCollapsed(cableId: string, tube: number): boolean {
    return !!this.collapsed()[`${cableId}|${tube}`];
  }

  // ---- kiválasztás ----
  setDevices(devices: PassiveDevice[]): void {
    this.devices.set(devices);
    if (!this.device()) {
      this.deviceId.set(null);
      this.leftId.set(null);
      this.rightId.set(null);
      return;
    }
    if (!this.leftCable()) this.leftId.set(null);
    if (!this.rightCable() || this.rightId() === this.leftId()) this.rightId.set(null);
  }

  selectDevice(id: string | null): void {
    this.deviceId.set(id || null);
    this.leftId.set(null);
    this.rightId.set(null);
    this.pending.set(null);
  }

  selectLeft(id: string | null): void {
    this.leftId.set(id || null);
    if (this.rightId() === this.leftId()) this.rightId.set(null);
    this.pending.set(null);
  }

  selectRight(id: string | null): void {
    this.rightId.set(id || null);
    this.pending.set(null);
  }

  swapSides(): void {
    const l = this.leftId(), r = this.rightId();
    if (!l || !r) return;
    this.leftId.set(r);
    this.rightId.set(l);
    this.pending.set(null);
  }

  togglePairOnly(value: boolean): void {
    this.pairOnly.set(value);
  }

  toggleTube(cableId: string, tube: number): void {
    const k = `${cableId}|${tube}`;
    this.collapsed.update(c => {
      const next = { ...c };
      if (next[k]) delete next[k]; else next[k] = true;
      return next;
    });
  }

  // ---- kötések ----
  /** Szálvégre kattintás: első kattintás kijelöl, a másik oldalon a második köt. */
  tapFiber(key: string, side: Side): void {
    const occ = this.occupancy().get(key);
    if (occ) { this.flash(occ.splice.id); return; }
    const p = this.pending();
    if (p && p.side !== side) { this.connect(p.key, p.side, key); return; }
    this.pending.set(p && p.key === key ? null : { key, side });
  }

  connect(fromKey: string, fromSide: Side, toKey: string): void {
    const leftKey = fromSide === 'left' ? fromKey : toKey;
    const rightKey = fromSide === 'left' ? toKey : fromKey;
    const occ = this.occupancy();
    if (occ.has(leftKey) || occ.has(rightKey)) return;
    this.mutate(list => [...list, { id: newId(), a: parseFiberKey(leftKey), b: parseFiberKey(rightKey) }]);
    this.pending.set(null);
  }

  remove(spliceId: string): void {
    if (this.hoverId() === spliceId) this.hoverId.set(null);
    this.mutate(list => list.filter(s => s.id !== spliceId));
  }

  /** A pár szabad szálainak sorszám szerinti 1:1 összekötése. */
  autoConnect(): void {
    const l = this.leftCable(), r = this.rightCable();
    if (!l || !r) return;
    const lf = this.freeFiberKeys(l), rf = this.freeFiberKeys(r);
    const n = Math.min(lf.length, rf.length);
    if (!n) return;
    const added: Splice[] = range(n).map(i => ({ id: newId(), a: parseFiberKey(lf[i - 1]), b: parseFiberKey(rf[i - 1]) }));
    this.mutate(list => [...list, ...added]);
  }

  clearPair(): void {
    const ids = new Set(this.pairSplices().map(s => s.id));
    if (!ids.size) return;
    this.hoverId.set(null);
    this.mutate(list => list.filter(s => !ids.has(s.id)));
  }

  undo(): void {
    const devId = this.deviceId();
    const hist = this.history();
    const idx = hist.map(h => h.deviceId).lastIndexOf(devId ?? '');
    if (!devId || idx < 0) return;
    this.splicesByDevice.update(all => ({ ...all, [devId]: hist[idx].splices }));
    this.history.set(hist.filter((_, i) => i !== idx));
    this.pending.set(null);
  }

  /** Táblázatból: a kötés kábelpárjának megnyitása, a szál felgörgetése és kiemelése. */
  reveal(spliceId: string): void {
    const s = this.splices().find(x => x.id === spliceId);
    if (!s) return;
    if (!this.isPairSplice(s)) {
      this.leftId.set(s.a.cableId);
      this.rightId.set(s.b.cableId);
      this.pending.set(null);
    }
    for (const end of [s.a, s.b]) {
      if (this.isCollapsed(end.cableId, end.tube)) this.toggleTube(end.cableId, end.tube);
    }
    this.scrollRequest.set(fiberKey(s.a));
    this.flash(spliceId);
  }

  flash(spliceId: string): void {
    clearTimeout(this.flashTimer);
    this.flashId.set(spliceId);
    this.flashTimer = setTimeout(() => this.flashId.set(null), 1200);
  }

  // ---- belső ----
  private mutate(fn: (list: Splice[]) => Splice[]): void {
    const devId = this.deviceId();
    if (!devId) return;
    const current = this.splices();
    this.history.update(h => [...h, { deviceId: devId, splices: current }].slice(-HISTORY_LIMIT));
    this.splicesByDevice.update(all => ({ ...all, [devId]: fn(current) }));
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<PersistedState>;
      this.deviceId.set(s.deviceId ?? null);
      this.leftId.set(s.leftId ?? null);
      this.rightId.set(s.rightId ?? null);
      this.splicesByDevice.set(s.splicesByDevice ?? {});
      this.collapsed.set(s.collapsed ?? {});
      this.pairOnly.set(!!s.pairOnly);
    } catch {
      /* sérült vagy nem elérhető tároló: üres állapottal indulunk */
    }
  }

  private persist(state: PersistedState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* tárolás nem elérhető */
    }
  }
}

function newId(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

