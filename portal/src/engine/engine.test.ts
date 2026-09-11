import { describe, expect, it } from 'vitest';
import type { DeviceStatus, DisplayEvent } from '../../../shared/schemas/models';
import { EventEngine } from './eventEngine';
import { createDefaultLayouts, validateLayout } from './layouts';
import { migrateClockToLayout } from './migrations';
import { evaluateRules } from './rules';
import { resolveVariables } from './variables';

const status: DeviceStatus = {
  online: true, mode: 'CLOCK', brightness: 25, wifiRssi: -50, uptime: 1, timeSynced: true,
  firmware: 'test', resolution: '128x64', ip: '127.0.0.1', hostname: 'test', heapFree: 1, psramFree: 1, displayEnabled: true,
  weather: { source: 'home_assistant', condition: 'sunny', temperatureC: 17.8, windSpeedKph: 18, observedAt: '2026-09-11T10:00:00.000Z' },
};

describe('layout and variable contracts', () => {
  it('provides valid default 128x64 layouts', () => {
    expect(createDefaultLayouts().every((layout) => validateLayout(layout).length === 0)).toBe(true);
  });

  it('migrates clock blocks without leaving the matrix', () => {
    const migrated = migrateClockToLayout({ layout: 'builder', use24Hour: true, showSeconds: false, showDate: true, timeColor: '#fff', dateColor: '#fff', dividerColor: '#fff', backgroundColor: '#000', showStatusIndicator: true, timezone: 'Europe/Amsterdam', elements: [{ id: 'fault', enabled: true, x: 3, y: 57, scale: 1 }] });
    expect(validateLayout(migrated)).toEqual([]);
    expect(migrated.elements[0].type).toBe('dynamic_text');
  });

  it('resolves missing variables to a safe fallback', () => {
    const event: DisplayEvent = { id: 'e1', source: 'p2000', type: 'dispatch', priority: 90, duration: 20, createdAt: '2026-09-11T10:00:00.000Z', expiresAt: '2026-09-11T10:00:20.000Z', interruptible: true, resumeAllowed: true, payload: { place: 'Swifterbant' } };
    expect(resolveVariables('{{place}} {{missing}}', { event, status }, '--')).toBe('Swifterbant --');
  });
});

describe('rule engine', () => {
  it('matches P2000 capcodes and changes the event', () => {
    const event: DisplayEvent = { id: 'e1', source: 'p2000', type: 'dispatch', priority: 90, duration: 30, createdAt: '2026-09-11T10:00:00.000Z', expiresAt: '2026-09-11T10:00:30.000Z', interruptible: true, resumeAllowed: true, payload: { capcodes: ['0700370'] } };
    const result = evaluateRules(event, [{ id: 'fire', name: 'Brandweer', enabled: true, order: 0, conditions: [{ field: 'payload', operator: 'contains', path: 'capcodes', value: '0700370' }], actions: [{ type: 'select_layout', value: 'p2000-fire' }, { type: 'override_priority', value: 100 }] }]);
    expect(result.matchedRuleIds).toEqual(['fire']);
    expect(result.event?.layoutId).toBe('p2000-fire');
    expect(result.event?.priority).toBe(100);
  });
});

describe('event engine', () => {
  it('interrupts HA with P2000, resumes HA and returns to idle', () => {
    let time = Date.parse('2026-09-11T10:00:00.000Z');
    const engine = new EventEngine({ now: () => new Date(time) });
    engine.receive({ source: 'home_assistant', type: 'message', priority: 50, duration: 100, payload: { title: 'HA', message: 'KLAAR' } });
    const urgent = engine.receive({ source: 'p2000', type: 'dispatch', priority: 90, duration: 10, layoutId: 'p2000-fire', payload: { description: 'Brand' } });
    expect(urgent.result).toBe('DISPLAYED');
    expect(engine.currentEvent?.source).toBe('p2000');
    time += 11_000;
    engine.tick();
    expect(engine.currentEvent?.source).toBe('home_assistant');
    expect(engine.eventHistory.some((entry) => entry.result === 'RESUMED')).toBe(true);
    time += 100_000;
    engine.tick();
    expect(engine.currentEvent).toBeUndefined();
  });

  it('bounds a full queue and expires stale entries', () => {
    let time = Date.parse('2026-09-11T10:00:00.000Z');
    const engine = new EventEngine({ maxQueue: 2, now: () => new Date(time) });
    engine.receive({ source: 'portal', type: 'message', priority: 100, duration: 5, payload: {} });
    engine.receive({ source: 'portal', type: 'message', priority: 2, duration: 5, payload: {} });
    engine.receive({ source: 'portal', type: 'message', priority: 3, duration: 5, payload: {} });
    expect(engine.queueLength).toBe(2);
    time += 6_000;
    engine.tick();
    expect(engine.queueLength).toBe(0);
    expect(engine.eventHistory.some((entry) => entry.result === 'EXPIRED')).toBe(true);
  });
});
