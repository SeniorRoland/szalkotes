import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FiberRef, OpticalCable, ResolvedColor, Side } from '../../models/splice.models';
import { SpliceStore } from '../../services/splice-store';
import {
  cableLabel, dotBackground, fiberColor, fiberKey, fiberNumber, range, strandBackground, totalFibers, tubeColor,
} from '../../utils/fiber-utils';

export interface HandleDownEvent {
  event: PointerEvent;
  key: string;
  side: Side;
  element: HTMLElement;
}

type FiberStatus = 'free' | 'linked' | 'busy';

interface FiberVm {
  key: string;
  fiber: number;
  number: number;
  color: ResolvedColor;
  dot: string;
  strand: string;
  status: FiberStatus;
  other: FiberRef | null;
  aria: string;
}

interface TubeVm {
  tube: number;
  color: ResolvedColor;
  bar: string;
  collapsed: boolean;
  linkedCount: number;
  pairCount: number;
  fibers: FiberVm[];
}

let nextId = 0;

@Component({
  selector: 'app-cable-panel',
  templateUrl: './cable-panel.html',
  styleUrl: './cable-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.side-left]': "side() === 'left'",
    '[class.side-right]': "side() === 'right'",
  },
})
export class CablePanel {
  protected readonly store = inject(SpliceStore);

  readonly side = input.required<Side>();
  readonly cable = input<OpticalCable | null>(null);
  /** A másik oldalon lévő kábel azonosítója: az ehhez kötött szálak számítanak "a párban kötve" állapotúnak. */
  readonly otherCableId = input<string | null>(null);
  /** Ha meg van adva, a fejlécben kábelválasztó jelenik meg. */
  readonly options = input<OpticalCable[] | null>(null);
  readonly emptyText = input('');

  readonly cableChange = output<string | null>();
  readonly handleDown = output<HandleDownEvent>();

  protected readonly selectId = `cable-select-${++nextId}`;
  protected readonly cableLabel = cableLabel;

  protected readonly tubes = computed<TubeVm[]>(() => {
    const c = this.cable();
    if (!c) return [];
    const occ = this.store.occupancy();
    const other = this.otherCableId();
    const collapsed = this.store.collapsed();

    return range(c.tubes).map(tube => {
      let linkedCount = 0, pairCount = 0;
      const fibers = range(c.fibersPerTube).map<FiberVm>(fiber => {
        const key = fiberKey({ cableId: c.id, tube, fiber });
        const color = fiberColor(c, tube, fiber);
        const o = occ.get(key);
        let status: FiberStatus = 'free';
        let stateText = 'szabad';
        if (o) {
          linkedCount++;
          const where = `${o.other.cableId} ${o.other.tube}/${o.other.fiber}`;
          if (other && o.other.cableId === other) { status = 'linked'; pairCount++; stateText = `kötve: ${where}`; }
          else { status = 'busy'; stateText = `másik kábelhez kötve: ${where}`; }
        }
        return {
          key, fiber, number: fiberNumber(c, tube, fiber), color,
          dot: dotBackground(color), strand: strandBackground(color),
          status, other: o?.other ?? null,
          aria: `${c.id}, ${tube}. pászma, ${fiber}. szál (${color.label}), ${stateText}`,
        };
      });
      const color = tubeColor(c, tube);
      return {
        tube, color, bar: strandBackground(color),
        collapsed: !!collapsed[`${c.id}|${tube}`],
        linkedCount, pairCount, fibers,
      };
    });
  });

  protected readonly meta = computed(() => {
    const c = this.cable();
    if (!c) return null;
    return `${totalFibers(c)} szál, ${c.tubes} pászma × ${c.fibersPerTube} szál, ${c.standard}`;
  });

  protected readonly statText = computed(() => {
    const c = this.cable();
    if (!c) return '';
    let pair = 0, busy = 0;
    for (const t of this.tubes()) {
      pair += t.pairCount;
      busy += t.linkedCount - t.pairCount;
    }
    const parts: string[] = [];
    if (this.otherCableId()) parts.push(`${pair} szál kötve a párhoz`);
    if (busy) parts.push(`${busy} szál más kábelhez kötve`);
    return parts.join(', ');
  });

  protected onSelect(event: Event): void {
    this.cableChange.emit((event.target as HTMLSelectElement).value || null);
  }

  protected onToggle(tube: number): void {
    const c = this.cable();
    if (c) this.store.toggleTube(c.id, tube);
  }

  protected onPointerDown(event: PointerEvent, key: string): void {
    this.handleDown.emit({ event, key, side: this.side(), element: event.currentTarget as HTMLElement });
  }

  protected onKey(event: Event, key: string): void {
    event.preventDefault();
    this.store.tapFiber(key, this.side());
  }
}
