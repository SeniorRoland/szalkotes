import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FiberRef, OpticalCable, Splice } from '../../models/splice.models';
import { SpliceStore } from '../../services/splice-store';
import { dotBackground, fiberColor, fiberNumber, tubeColor } from '../../utils/fiber-utils';

interface EndVm {
  cableId: string;
  tube: number;
  fiber: number;
  tubeLabel: string;
  tubeDot: string;
  fiberLabel: string;
  fiberDot: string;
  number: number | null;
}

interface RowVm {
  id: string;
  current: boolean;
  a: EndVm;
  b: EndVm;
}

@Component({
  selector: 'app-splice-table',
  imports: [NgTemplateOutlet],
  templateUrl: './splice-table.html',
  styleUrl: './splice-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpliceTable {
  protected readonly store = inject(SpliceStore);

  protected readonly rows = computed<RowVm[]>(() => {
    const source = this.store.pairOnly() && this.store.hasPair() ? this.store.pairSplices() : this.store.splices();
    return [...source]
      .sort((x, y) => x.a.cableId.localeCompare(y.a.cableId) || x.a.tube - y.a.tube || x.a.fiber - y.a.fiber)
      .map((s: Splice) => ({
        id: s.id,
        current: this.store.isPairSplice(s),
        a: this.end(this.store.cableById(s.a.cableId), s.a),
        b: this.end(this.store.cableById(s.b.cableId), s.b),
      }));
  });

  protected readonly summary = computed(() => {
    if (!this.store.device()) return '';
    const total = this.store.splices().length;
    return this.store.hasPair()
      ? `${total} kötés a berendezésben, ebből ${this.store.pairSplices().length} a kiválasztott kábelpár között`
      : `${total} kötés a berendezésben`;
  });

  protected onPairOnly(event: Event): void {
    this.store.togglePairOnly((event.target as HTMLInputElement).checked);
  }

  protected onDelete(event: Event, id: string): void {
    event.stopPropagation();
    this.store.remove(id);
  }

  private end(cable: OpticalCable | null, r: FiberRef): EndVm {
    if (!cable) {
      return { ...r, tubeLabel: '', tubeDot: 'transparent', fiberLabel: '', fiberDot: 'transparent', number: null };
    }
    const tc = tubeColor(cable, r.tube), fc = fiberColor(cable, r.tube, r.fiber);
    return {
      ...r,
      tubeLabel: tc.label, tubeDot: dotBackground(tc),
      fiberLabel: fc.label, fiberDot: dotBackground(fc),
      number: fiberNumber(cable, r.tube, r.fiber),
    };
  }
}
