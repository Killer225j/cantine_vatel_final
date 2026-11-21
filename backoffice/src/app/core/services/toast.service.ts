import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts  = this._toasts.asReadonly();

  private counter = 0;

  success(message: string, duration = 1000): void {
    this._show(message, 'success', duration);
  }

  error(message: string, duration = 1000): void {
    this._show(message, 'error', duration);
  }

  private _show(message: string, type: 'success' | 'error', duration: number): void {
    const id = ++this.counter;
    this._toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this._toasts.update(t => t.filter(x => x.id !== id)), duration);
  }
}
