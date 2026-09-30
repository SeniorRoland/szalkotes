import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpliceBoard } from './components/splice-board/splice-board';
import { SpliceTable } from './components/splice-table/splice-table';
import { DeviceService } from './services/device.service';
import { SpliceStore } from './services/splice-store';
import { cableLabel } from './utils/fiber-utils';

@Component({
  selector: 'app-root',
  imports: [SpliceBoard, SpliceTable],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class App {
  protected readonly store = inject(SpliceStore);
  protected readonly cableLabel = cableLabel;

  protected readonly deviceMeta = computed(() => {
    const d = this.store.device();
    return d ? `${d.type}, ${d.location} (${d.cables.length} kábel)` : '';
  });

  protected readonly canAuto = computed(() => {
    const l = this.store.leftCable(), r = this.store.rightCable();
    return !!l && !!r && this.store.freeFiberKeys(l).length > 0 && this.store.freeFiberKeys(r).length > 0;
  });

  constructor() {
    inject(DeviceService).getDevices()
      .pipe(takeUntilDestroyed())
      .subscribe(devices => this.store.setDevices(devices));
  }

  protected onDevice(event: Event): void {
    this.store.selectDevice((event.target as HTMLSelectElement).value || null);
  }

  protected onLeft(event: Event): void {
    this.store.selectLeft((event.target as HTMLSelectElement).value || null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.store.pending()) {
      this.store.pending.set(null);
      return;
    }
    const tag = (event.target as HTMLElement | null)?.tagName ?? '';
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z'
        && !['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
      event.preventDefault();
      this.store.undo();
    }
  }
}
