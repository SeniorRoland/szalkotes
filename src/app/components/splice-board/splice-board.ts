import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterEveryRender, effect, inject, signal, viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FiberRef, Side } from '../../models/splice.models';
import { SpliceStore } from '../../services/splice-store';
import { fiberColor, fiberKey } from '../../utils/fiber-utils';
import { CablePanel, HandleDownEvent } from '../cable-panel/cable-panel';

interface Point { x: number; y: number; }

interface Wire {
  id: string;
  d: string;
  from: Point;
  to: Point;
  fromColor: string;
  toColor: string;
  title: string;
}

interface DragState {
  key: string;
  side: Side;
  element: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
}

@Component({
  selector: 'app-splice-board',
  imports: [CablePanel],
  templateUrl: './splice-board.html',
  styleUrl: './splice-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'onPointerMove($event)',
    '(window:pointerup)': 'onPointerUp(false)',
    '(window:pointercancel)': 'onPointerUp(true)',
  },
})
export class SpliceBoard {
  protected readonly store = inject(SpliceStore);
  private readonly document = inject(DOCUMENT);

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly wires = signal<Wire[]>([]);
  protected readonly size = signal({ w: 0, h: 0 });
  protected readonly tempPath = signal('');

  private drag: DragState | null = null;
  private lastPointer: Point | null = null;
  private scrollRaf = 0;
  private lastSignature = '';
  private readonly resizeObserver = new ResizeObserver(() => this.measure());

  constructor() {
    // Minden renderelés után újramérjük a szálvégek helyét; csak változás esetén frissítünk.
    afterEveryRender(() => this.measure());

    effect(() => {
      const el = this.stage()?.nativeElement;
      this.resizeObserver.disconnect();
      if (el) this.resizeObserver.observe(el);
    });

    // Táblázatból kért görgetés a kötés szálához
    effect(() => {
      const key = this.store.scrollRequest();
      if (!key) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.stage()?.nativeElement
          .querySelector(`app-cable-panel .fiber[data-key="${key}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        this.store.scrollRequest.set(null);
      }));
    });

    inject(DestroyRef).onDestroy(() => this.resizeObserver.disconnect());
  }

  /** SVG gradienshivatkozás teljes URL-lel, mert a <base href> miatt a sima url(#id) egyes böngészőkben nem oldódik fel. */
  protected gradientRef(id: string): string {
    const base = this.document.location.href.split('#')[0];
    return `url(${base}#g_${id})`;
  }

  // ---------------- mérés és vonalak ----------------
  private measure(): void {
    const stageEl = this.stage()?.nativeElement;
    const left = this.store.leftCable(), right = this.store.rightCable();
    if (!stageEl || !left || !right) {
      if (this.lastSignature !== '') { this.lastSignature = ''; this.wires.set([]); }
      return;
    }
    const sr = stageEl.getBoundingClientRect();
    const wires: Wire[] = [];
    for (const s of this.store.pairSplices()) {
      const [l, r] = s.a.cableId === left.id ? [s.a, s.b] : [s.b, s.a];
      const p1 = this.anchorPoint(stageEl, 'left', l, sr);
      const p2 = this.anchorPoint(stageEl, 'right', r, sr);
      if (!p1 || !p2) continue;
      const lc = fiberColor(left, l.tube, l.fiber), rc = fiberColor(right, r.tube, r.fiber);
      wires.push({
        id: s.id, d: curve(p1, p2), from: p1, to: p2, fromColor: lc.hex, toColor: rc.hex,
        title: `${left.id} ${l.tube}/${l.fiber} (${lc.label}) és ${right.id} ${r.tube}/${r.fiber} (${rc.label}). Kattints a bontáshoz.`,
      });
    }
    const signature = JSON.stringify([Math.round(sr.width), Math.round(sr.height), wires.map(w => [w.id, w.d])]);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.size.set({ w: sr.width, h: sr.height });
    this.wires.set(wires);
  }

  private anchorPoint(stageEl: HTMLElement, side: Side, ref: FiberRef, sr: DOMRect): Point | null {
    const panel = `app-cable-panel.side-${side}`;
    const el =
      stageEl.querySelector<HTMLElement>(`${panel} .handle[data-key="${fiberKey(ref)}"]`) ??
      stageEl.querySelector<HTMLElement>(`${panel} .tube-anchor[data-anchor="${ref.cableId}|${ref.tube}"]`);
    return el ? this.center(el, sr) : null;
  }

  private center(el: HTMLElement, sr: DOMRect): Point {
    const r = el.getBoundingClientRect();
    return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
  }

  // ---------------- húzás ----------------
  protected onHandleDown({ event, key, side, element }: HandleDownEvent): void {
    if (event.button > 0) return;
    event.preventDefault();
    const occ = this.store.occupancy().get(key);
    if (occ) { this.store.flash(occ.splice.id); return; }
    this.drag = { key, side, element, startX: event.clientX, startY: event.clientY, moved: false };
    try { element.setPointerCapture(event.pointerId); } catch { /* nem támogatott */ }
  }

  protected onPointerMove(event: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 5) d.moved = true;
    if (!d.moved) return;
    this.updateDrag();
    if (!this.scrollRaf) this.scrollRaf = requestAnimationFrame(this.autoScroll);
  }

  /** Húzás közben az ablak szélénél automatikusan görget, így a képernyőn kívüli szálak is elérhetők. */
  private readonly autoScroll = (): void => {
    const p = this.lastPointer;
    if (!this.drag || !p) { this.scrollRaf = 0; return; }
    const edge = 60, vh = this.document.defaultView?.innerHeight ?? 0;
    let dy = 0;
    if (p.y > vh - edge) dy = Math.ceil((p.y - (vh - edge)) / 3);
    else if (p.y < edge) dy = -Math.ceil((edge - p.y) / 3);
    if (dy) {
      this.document.defaultView?.scrollBy(0, dy);
      this.updateDrag();
    }
    this.scrollRaf = requestAnimationFrame(this.autoScroll);
  };

  private updateDrag(): void {
    const d = this.drag, p = this.lastPointer;
    const stageEl = this.stage()?.nativeElement;
    if (!d || !p || !stageEl) return;
    const target = this.validTargetAt(p.x, p.y, d);
    this.store.dropTarget.set(target?.dataset['key'] ?? null);
    const sr = stageEl.getBoundingClientRect();
    const p1 = this.center(d.element, sr);
    const p2 = target ? this.center(target, sr) : { x: p.x - sr.left, y: p.y - sr.top };
    this.tempPath.set(d.side === 'left' ? curve(p1, p2) : curve(p2, p1));
  }

  protected onPointerUp(cancelled: boolean): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.lastPointer = null;
    cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = 0;
    const target = this.store.dropTarget();
    this.store.dropTarget.set(null);
    this.tempPath.set('');
    if (cancelled) return;
    if (d.moved) {
      if (target) this.store.connect(d.key, d.side, target);
    } else {
      this.store.tapFiber(d.key, d.side);
    }
  }

  private validTargetAt(x: number, y: number, d: DragState): HTMLElement | null {
    const el = this.document.elementFromPoint(x, y)?.closest<HTMLElement>('.handle');
    if (!el) return null;
    const key = el.dataset['key'];
    if (!key || el.dataset['side'] === d.side || this.store.occupancy().has(key)) return null;
    return el;
  }
}

function curve(p1: Point, p2: Point): string {
  const dx = Math.max(40, (p2.x - p1.x) * 0.5);
  return `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;
}
