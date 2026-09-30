import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MOCK_DEVICES } from '../data/mock-devices';
import { PassiveDevice } from '../models/splice.models';

/**
 * Passzív berendezések és kábeleik lekérése.
 * Egyelőre mock adatokkal; később HttpClient-hívásra cserélhető, a felület változatlan marad.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  getDevices(): Observable<PassiveDevice[]> {
    return of(MOCK_DEVICES);
  }
}
