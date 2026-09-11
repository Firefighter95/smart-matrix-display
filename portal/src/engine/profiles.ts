import type { DisplayConfig, DisplayEvent, DisplayProfile, ProfileId } from '../../../shared/schemas/models';

export const createDefaultProfiles = (): DisplayProfile[] => [
  { id: 'normal', name: 'Normal', idleLayoutId: 'clock-classic', brightness: 25, maxBrightness: 45, allowedSources: ['portal', 'home_assistant', 'p2000', 'system', 'timer', 'weather', 'api'], idleRotation: [], allowWake: true },
  { id: 'night', name: 'Night', idleLayoutId: 'clock-compact', brightness: 8, maxBrightness: 12, allowedSources: ['home_assistant', 'p2000', 'system', 'api'], idleRotation: [], allowWake: true, maxEventDuration: 60, nightBrightness: 8 },
  { id: 'away', name: 'Away', idleLayoutId: 'clock-compact', brightness: 0, maxBrightness: 8, allowedSources: ['p2000', 'system'], idleRotation: [], allowWake: true },
  { id: 'demo', name: 'Demo', idleLayoutId: 'clock-weather', brightness: 35, maxBrightness: 60, allowedSources: ['portal', 'home_assistant', 'p2000', 'system', 'timer', 'weather', 'api'], idleRotation: [{ id: 'demo-weather', layoutId: 'clock-weather', enabled: true, duration: 8, order: 0 }, { id: 'demo-clock', layoutId: 'clock-classic', enabled: true, duration: 8, order: 1 }], allowWake: true },
  { id: 'fire', name: 'Fire', idleLayoutId: 'p2000-fire', brightness: 30, maxBrightness: 50, allowedSources: ['p2000', 'system'], idleRotation: [], allowWake: true, maxEventDuration: 120 },
];

const minutes = (value: string): number => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };

export function resolveProfile(profiles: DisplayProfile[] | undefined, id: ProfileId = 'normal'): DisplayProfile {
  return profiles?.find((profile) => profile.id === id) ?? createDefaultProfiles()[0];
}

export function isEventAllowed(event: DisplayEvent, profile: DisplayProfile): boolean {
  return profile.allowedSources.includes(event.source) && (!profile.allowedTypes?.length || profile.allowedTypes.includes(event.type));
}

export function resolveBrightness(display: DisplayConfig, profile: DisplayProfile, now = new Date(), event?: DisplayEvent): number {
  let value = display.brightness;
  if (display.brightnessMode === 'schedule' || display.scheduleEnabled) {
    const current = now.getHours() * 60 + now.getMinutes();
    const entries = [...display.brightnessSchedule].sort((a, b) => minutes(a.time) - minutes(b.time));
    const active = [...entries].reverse().find((entry) => minutes(entry.time) <= current) ?? entries[entries.length - 1];
    if (active) value = active.brightness;
  }
  value = Math.min(value, display.maxBrightness, profile.maxBrightness);
  if (profile.id === 'night' && profile.nightBrightness !== undefined) value = Math.min(value, profile.nightBrightness);
  if (event?.brightnessOverride !== undefined) value = Math.min(value, event.brightnessOverride);
  if (display.temporaryBrightness !== undefined) value = display.temporaryBrightness;
  return Math.max(0, Math.round(value));
}

export function isSleepWindow(display: DisplayConfig, now = new Date()): boolean {
  if (display.displayMode !== 'schedule' || !display.sleepStart || !display.sleepEnd) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(display.sleepStart);
  const end = minutes(display.sleepEnd);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}
