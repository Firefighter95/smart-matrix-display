import type { LayoutElement, LayoutModel, LayoutCategory } from '../../../shared/schemas/models';
import { MATRIX_HEIGHT, MATRIX_WIDTH } from '../../../shared/schemas/models';

const nowIso = () => new Date().toISOString();

const element = (partial: Partial<LayoutElement> & Pick<LayoutElement, 'id' | 'type'>): LayoutElement => ({
  ...partial,
  id: partial.id,
  type: partial.type,
  x: partial.x ?? 0,
  y: partial.y ?? 0,
  width: partial.width ?? 128,
  height: partial.height ?? 8,
  zIndex: partial.zIndex ?? 0,
  visible: partial.visible ?? true,
  color: partial.color ?? '#F4F7FF',
  scale: partial.scale ?? 1,
  align: partial.align ?? 'left',
  verticalAlign: partial.verticalAlign ?? 'top',
});

const layout = (id: string, name: string, category: LayoutCategory, elements: LayoutElement[], description: string): LayoutModel => ({
  schemaVersion: 1,
  id,
  name,
  category,
  width: MATRIX_WIDTH,
  height: MATRIX_HEIGHT,
  elements,
  metadata: { description, source: 'smart-matrix-defaults', createdAt: nowIso(), updatedAt: nowIso() },
});

export const createDefaultLayouts = (): LayoutModel[] => [
  layout('clock-minimal', 'Clock Minimal', 'clock', [
    element({ id: 'time', type: 'clock', x: 0, y: 12, width: 128, height: 28, scale: 4, align: 'center', color: '#F4F7FF' }),
    element({ id: 'status', type: 'status_indicator', x: 122, y: 2, width: 4, height: 4, color: '#72E6A8' }),
  ], 'Grote rustige klokweergave.'),
  layout('clock-classic', 'Clock Classic', 'clock', [
    element({ id: 'time', type: 'clock', x: 0, y: 5, width: 128, height: 24, scale: 3, align: 'center', color: '#F4F7FF' }),
    element({ id: 'divider', type: 'line', x: 8, y: 38, width: 112, height: 1, color: '#43506F' }),
    element({ id: 'date', type: 'date', x: 0, y: 44, width: 128, height: 8, align: 'center', color: '#72E6A8' }),
    element({ id: 'status', type: 'status_indicator', x: 122, y: 2, width: 4, height: 4, color: '#72E6A8' }),
  ], 'Klok met scheidingslijn en datum.'),
  layout('clock-compact', 'Clock Compact', 'clock', [
    element({ id: 'time', type: 'clock', x: 0, y: 15, width: 128, height: 16, scale: 2, align: 'center', color: '#F4F7FF' }),
    element({ id: 'date', type: 'date', x: 0, y: 38, width: 128, height: 8, align: 'center', color: '#72E6A8' }),
  ], 'Compacte klok voor beperkte helderheid.'),
  layout('clock-weather', 'Weather Clock', 'weather', [
    element({ id: 'time', type: 'clock', x: 0, y: 1, width: 128, height: 22, scale: 3, align: 'center', color: '#F4F7FF' }),
    element({ id: 'date', type: 'date', x: 0, y: 27, width: 128, height: 8, align: 'center', color: '#72E6A8' }),
    element({ id: 'divider', type: 'line', x: 8, y: 40, width: 112, height: 1, color: '#43506F' }),
    element({ id: 'temperature', type: 'dynamic_text', x: 4, y: 47, width: 58, height: 8, text: '{{temperature}}°C', dataSource: { type: 'weather', path: 'temperatureC', fallback: '--' }, color: '#70D7F4' }),
    element({ id: 'wind', type: 'dynamic_text', x: 64, y: 47, width: 60, height: 8, text: '{{wind}}M/S', dataSource: { type: 'weather', path: 'windSpeedMs', fallback: '--.-' }, color: '#70D7F4', align: 'right' }),
  ], 'Klok met actuele temperatuur en windsnelheid.'),
  layout('generic-message', 'Generic Message', 'generic_message', [
    element({ id: 'title', type: 'message_title', x: 0, y: 6, width: 128, height: 14, scale: 2, align: 'center', color: '#72E6A8', dataSource: { type: 'event_payload', path: 'title' } }),
    element({ id: 'divider', type: 'line', x: 4, y: 25, width: 120, height: 1, color: '#43506F' }),
    element({ id: 'body', type: 'message_body', x: 3, y: 31, width: 122, height: 28, scale: 2, align: 'center', color: '#F4F7FF', dataSource: { type: 'event_payload', path: 'message' }, overflow: 'wrap' }),
  ], 'Algemeen bericht met titel en body.'),
  layout('doorbell', 'Doorbell', 'home_assistant', [
    element({ id: 'title', type: 'text', x: 0, y: 5, width: 128, height: 12, text: 'DEURBEL', scale: 2, align: 'center', color: '#70D7F4' }),
    element({ id: 'body', type: 'dynamic_text', x: 0, y: 28, width: 128, height: 12, text: '{{message}}', scale: 2, align: 'center', color: '#F4F7FF', dataSource: { type: 'event_payload', path: 'message', fallback: 'BEZOEKER' } }),
    element({ id: 'source', type: 'dynamic_text', x: 0, y: 50, width: 128, height: 8, text: '{{location}}', align: 'center', color: '#8490A5', dataSource: { type: 'event_payload', path: 'location', fallback: '' } }),
  ], 'Home Assistant deurbelmelding.'),
  layout('alert', 'Alert', 'alert', [
    element({ id: 'title', type: 'dynamic_text', x: 0, y: 5, width: 128, height: 14, text: '{{title}}', scale: 2, align: 'center', color: '#F47F8E', dataSource: { type: 'event_payload', path: 'title', fallback: 'ALERT' } }),
    element({ id: 'body', type: 'dynamic_text', x: 3, y: 29, width: 122, height: 24, text: '{{message}}', scale: 2, align: 'center', color: '#F4F7FF', dataSource: { type: 'event_payload', path: 'message', fallback: '' }, overflow: 'wrap' }),
  ], 'Urgente melding.'),
  layout('p2000-generic', 'P2000 Generic', 'p2000', [
    element({ id: 'priority', type: 'dynamic_text', x: 2, y: 2, width: 40, height: 8, text: '{{priority}}', color: '#F47F8E', dataSource: { type: 'p2000', path: 'priority' } }),
    element({ id: 'discipline', type: 'dynamic_text', x: 43, y: 2, width: 83, height: 8, text: '{{discipline}}', align: 'right', color: '#F2B866', dataSource: { type: 'p2000', path: 'discipline' } }),
    element({ id: 'place', type: 'dynamic_text', x: 3, y: 17, width: 122, height: 8, text: '{{place}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'place' } }),
    element({ id: 'description', type: 'dynamic_text', x: 3, y: 31, width: 122, height: 28, text: '{{description}}', scale: 1, align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'description' }, overflow: 'wrap' }),
  ], 'Algemene P2000-melding.'),
  layout('p2000-fire', 'P2000 Brandweer', 'p2000', [
    element({ id: 'title', type: 'text', x: 0, y: 3, width: 128, height: 12, text: 'BRANDWEER', scale: 2, align: 'center', color: '#F47F8E' }),
    element({ id: 'place', type: 'dynamic_text', x: 0, y: 23, width: 128, height: 9, text: '{{place}}', align: 'center', color: '#F2B866', dataSource: { type: 'p2000', path: 'place' } }),
    element({ id: 'description', type: 'dynamic_text', x: 3, y: 36, width: 122, height: 23, text: '{{description}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'description' }, overflow: 'wrap' }),
  ], 'P2000-brandweerweergave.'),
  layout('p2000-ambulance', 'P2000 Ambulance', 'p2000', [
    element({ id: 'title', type: 'text', x: 0, y: 3, width: 128, height: 12, text: 'AMBULANCE', scale: 2, align: 'center', color: '#F2B866' }),
    element({ id: 'place', type: 'dynamic_text', x: 0, y: 23, width: 128, height: 9, text: '{{place}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'place' } }),
    element({ id: 'description', type: 'dynamic_text', x: 3, y: 36, width: 122, height: 23, text: '{{description}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'description' }, overflow: 'wrap' }),
  ], 'P2000-ambulanceweergave.'),
  layout('p2000-police', 'P2000 Politie', 'p2000', [
    element({ id: 'title', type: 'text', x: 0, y: 3, width: 128, height: 12, text: 'POLITIE', scale: 2, align: 'center', color: '#70D7F4' }),
    element({ id: 'place', type: 'dynamic_text', x: 0, y: 23, width: 128, height: 9, text: '{{place}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'place' } }),
    element({ id: 'description', type: 'dynamic_text', x: 3, y: 36, width: 122, height: 23, text: '{{description}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'description' }, overflow: 'wrap' }),
  ], 'P2000-politieweergave.'),
  layout('p2000-mmt', 'P2000 Lifeliner/MMT', 'p2000', [
    element({ id: 'title', type: 'text', x: 0, y: 3, width: 128, height: 12, text: 'LIFELINER', scale: 2, align: 'center', color: '#C39AFF' }),
    element({ id: 'place', type: 'dynamic_text', x: 0, y: 23, width: 128, height: 9, text: '{{place}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'place' } }),
    element({ id: 'description', type: 'dynamic_text', x: 3, y: 36, width: 122, height: 23, text: '{{description}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'p2000', path: 'description' }, overflow: 'wrap' }),
  ], 'P2000-lifelinerweergave.'),
  layout('timer', 'Timer', 'timer', [
    element({ id: 'title', type: 'dynamic_text', x: 0, y: 4, width: 128, height: 12, text: '{{title}}', scale: 2, align: 'center', color: '#70D7F4', dataSource: { type: 'event_payload', path: 'title', fallback: 'TIMER' } }),
    element({ id: 'timer', type: 'timer', x: 0, y: 25, width: 128, height: 24, scale: 3, align: 'center', color: '#F4F7FF', dataSource: { type: 'timer', path: 'remaining' } }),
  ], 'Timerweergave.'),
  layout('system-message', 'System message', 'system', [
    element({ id: 'title', type: 'dynamic_text', x: 0, y: 7, width: 128, height: 12, text: '{{title}}', scale: 2, align: 'center', color: '#F2B866', dataSource: { type: 'event_payload', path: 'title', fallback: 'SYSTEEM' } }),
    element({ id: 'body', type: 'dynamic_text', x: 3, y: 30, width: 122, height: 24, text: '{{message}}', align: 'center', color: '#F4F7FF', dataSource: { type: 'event_payload', path: 'message', fallback: '' }, overflow: 'wrap' }),
  ], 'Systeemmelding.'),
];

export function validateLayout(layoutModel: LayoutModel): string[] {
  const errors: string[] = [];
  if (layoutModel.schemaVersion !== 1) errors.push('Unsupported layout schema version');
  if (!layoutModel.id.trim()) errors.push('Layout id is required');
  if (!layoutModel.name.trim()) errors.push('Layout name is required');
  if (layoutModel.width !== MATRIX_WIDTH || layoutModel.height !== MATRIX_HEIGHT) errors.push('Only 128x64 layouts are supported in V1');
  layoutModel.elements.forEach((item) => {
    if (!item.id.trim()) errors.push('Every element needs an id');
    if (item.x < 0 || item.y < 0 || item.x >= MATRIX_WIDTH || item.y >= MATRIX_HEIGHT) errors.push(`Element ${item.id} starts outside the matrix`);
    if (item.width <= 0 || item.height <= 0) errors.push(`Element ${item.id} has invalid dimensions`);
    if (item.x + item.width > MATRIX_WIDTH || item.y + item.height > MATRIX_HEIGHT) errors.push(`Element ${item.id} exceeds matrix bounds`);
    if (item.opacity !== undefined && (item.opacity < 0 || item.opacity > 1)) errors.push(`Element ${item.id} has invalid opacity`);
  });
  return errors;
}

export function cloneLayout(layoutModel: LayoutModel): LayoutModel {
  return structuredClone(layoutModel);
}

export function normalizeLayout(layoutModel: LayoutModel): LayoutModel {
  const normalized = cloneLayout(layoutModel);
  normalized.width = MATRIX_WIDTH;
  normalized.height = MATRIX_HEIGHT;
  normalized.elements = normalized.elements.map((item) => ({
    ...item,
    x: Math.max(0, Math.min(MATRIX_WIDTH - 1, Math.round(item.x))),
    y: Math.max(0, Math.min(MATRIX_HEIGHT - 1, Math.round(item.y))),
    width: Math.max(1, Math.min(MATRIX_WIDTH, Math.round(item.width))),
    height: Math.max(1, Math.min(MATRIX_HEIGHT, Math.round(item.height))),
    zIndex: Math.round(item.zIndex ?? 0),
    visible: item.visible !== false,
  }));
  return normalized;
}
