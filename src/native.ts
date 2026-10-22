import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useUI } from './ui';

/** Android-only wiring: hardware back button and a dark status bar. No-op in the browser. */
export function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  StatusBar.setBackgroundColor({ color: '#07080b' }).catch(() => undefined);

  App.addListener('backButton', () => {
    // close an open sheet first, then walk back through screens, then leave the app from the HUD
    if (document.querySelector('.sheet-backdrop')) {
      (document.querySelector('.sheet-backdrop') as HTMLElement).click();
      useUI.getState().close();
      return;
    }
    const route = window.location.hash.replace(/^#/, '') || '/';
    if (route !== '/') window.history.length > 1 ? window.history.back() : (window.location.hash = '/');
    else App.exitApp();
  });
}
