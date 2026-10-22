import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications, type Channel } from '@capacitor/local-notifications';
import { useData } from '../data/store';
import { TONES } from '../features/calendar/tones';
import { go } from '../router';
import { buildPlan, idOf } from './plan';

// Native side of the notification shield: Android channels per tier, rolling 7-day schedule, tap routing.
// In the browser preview this is a no-op; the Settings screen still shows the plan.

export const native = () => Capacitor.isNativePlatform();

const CHANNELS: Channel[] = [
  ...TONES.map((t) => ({
    id: `alarm-${t.id}`, name: `Alarms · ${t.name}`, description: 'Meetings, payments and locked learning sessions',
    importance: 5 as const, visibility: 1 as const, sound: `tone_${t.id}.wav`, vibration: true, lights: true, lightColor: '#FF4A2B',
  })),
  { id: 'nudges', name: 'Nudges', description: 'Habits, project milestones and the nightly check-out', importance: 3, visibility: 1, vibration: true },
  { id: 'briefings', name: 'Briefings', description: 'Quiet morning and evening briefings', importance: 2, visibility: 1, vibration: false },
];

let timer = 0;
let syncing: Promise<void> | null = null;

/** Replace everything pending with the current plan. Safe to call often. */
export async function syncNotifications() {
  if (!native()) return;
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      const plan = buildPlan();
      if (!plan.length) return;
      await LocalNotifications.schedule({
        notifications: plan.map((p) => ({
          id: idOf(p.key),
          title: p.title,
          body: p.body,
          channelId: p.channel,
          schedule: { at: new Date(p.at), allowWhileIdle: true },
          extra: { route: p.route },
        })),
      });
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export async function notifyPermission(): Promise<'granted' | 'denied' | 'prompt' | 'web'> {
  if (!native()) return 'web';
  const p = await LocalNotifications.checkPermissions();
  return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
}

export async function requestNotifyPermission() {
  if (!native()) return 'web';
  const p = await LocalNotifications.requestPermissions();
  if (p.display === 'granted') await syncNotifications();
  return p.display;
}

/** Android 12+: exact alarms may need the user to allow them in system settings. */
export async function exactAlarms(): Promise<'granted' | 'denied' | 'web'> {
  if (!native()) return 'web';
  try { return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted' ? 'granted' : 'denied'; } catch { return 'granted'; }
}
export const openExactAlarmSettings = () => LocalNotifications.changeExactNotificationSetting().catch(() => undefined);

/** A test alarm a few seconds from now on the chosen tone. */
export async function testAlarm(tone = 'chime') {
  if (!native()) return;
  await LocalNotifications.schedule({
    notifications: [{ id: 7, title: 'Redemption · test alarm', body: 'This is how meetings, payments and learning sessions will sound.', channelId: `alarm-${tone}`, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, extra: { route: '/settings' } }],
  });
}

export async function initNotifications() {
  if (!native()) return;
  await Promise.all(CHANNELS.map((c) => LocalNotifications.createChannel(c).catch(() => undefined)));
  LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const route = a.notification.extra?.route;
    if (typeof route === 'string') go(route);
  });
  // ask once the first-run intro is out of the way
  const ask = async () => { if ((await notifyPermission()) === 'prompt') await requestNotifyPermission(); };
  if (useData.getState().onboarded) await ask();
  else { const off = useData.subscribe((s) => { if (s.onboarded) { off(); ask(); } }); }

  await syncNotifications();
  // data changes reschedule (debounced); coming back to the app rolls the 7-day window forward
  useData.subscribe(() => { clearTimeout(timer); timer = window.setTimeout(syncNotifications, 2500); });
  App.addListener('resume', () => { syncNotifications(); });
}
