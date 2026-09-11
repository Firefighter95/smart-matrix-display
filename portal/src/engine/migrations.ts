import type { ClockConfig, DeviceConfig, LayoutElement, LayoutModel, ProfileId } from '../../../shared/schemas/models';
import { createDefaultLayouts } from './layouts';
import { createDefaultProfiles } from './profiles';

const clockElementToLayoutElement = (item: NonNullable<ClockConfig['elements']>[number]): LayoutElement => ({
  id: item.id,
  type: item.id === 'status' ? 'status_indicator' : item.id === 'fault' ? 'dynamic_text' : item.id === 'time' ? 'clock' : item.id === 'date' ? 'date' : 'dynamic_text',
  name: item.id,
  x: item.x,
  y: item.y,
  width: Math.max(1, Math.min(128 - item.x, item.id === 'status' ? 4 : item.id === 'time' ? 64 : item.id === 'fault' ? 122 : 128)),
  height: Math.max(1, Math.min(64 - item.y, item.id === 'status' ? 4 : item.scale * 8)),
  zIndex: 0,
  visible: item.enabled,
  scale: item.scale,
  color: '#F4F7FF',
  dataSource: item.id === 'temperature' ? { type: 'weather', path: 'temperatureC', fallback: '--' } : item.id === 'wind' ? { type: 'weather', path: 'windSpeedMs', fallback: '--.-' } : item.id === 'fault' ? { type: 'system', path: 'faults', fallback: '' } : undefined,
  text: item.id === 'temperature' ? '{{temperature}}°C' : item.id === 'wind' ? '{{wind}}M/S' : item.id === 'fault' ? '{{faults}}' : undefined,
});

export function migrateClockToLayout(clock: ClockConfig, id = 'clock-main', name = 'Hoofdklok'): LayoutModel {
  return {
    schemaVersion: 1,
    id,
    name,
    category: 'clock',
    width: 128,
    height: 64,
    elements: (clock.elements ?? []).map(clockElementToLayoutElement),
    metadata: { source: 'clock-config-migration', updatedAt: new Date().toISOString() },
  };
}

export function migrateConfigToV2(config: DeviceConfig): DeviceConfig {
  if (config.schemaVersion === 2 && config.layouts?.length && config.profiles?.length) return structuredClone(config);
  const defaults = createDefaultLayouts();
  const migratedClock = migrateClockToLayout(config.clock);
  const layouts = [migratedClock, ...defaults.filter((item) => item.id !== migratedClock.id)];
  const profiles = config.profiles?.length ? config.profiles : createDefaultProfiles();
  return {
    ...structuredClone(config),
    schemaVersion: 2,
    layouts,
    profiles,
    rules: config.rules ?? [],
    activeLayoutId: config.activeLayoutId ?? migratedClock.id,
    activeProfileId: config.activeProfileId ?? ('normal' as ProfileId),
    idleRotation: config.idleRotation ?? [],
  };
}
