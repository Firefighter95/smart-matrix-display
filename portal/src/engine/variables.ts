import type { DisplayEvent, DeviceStatus, WeatherSnapshot } from '../../../shared/schemas/models';

export interface VariableContext {
  event?: DisplayEvent;
  status?: DeviceStatus;
  weather?: WeatherSnapshot;
  system?: Record<string, unknown>;
  now?: Date;
}

const getPath = (value: unknown, path?: string): unknown => {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, value);
};

export const resolveVariable = (path: string, context: VariableContext): unknown => {
  const [root, ...rest] = path.split('.');
  const relative = rest.join('.');
  const payload = context.event?.payload ?? {};
  const builtIns: Record<string, unknown> = {
    title: payload.title,
    message: payload.message,
    time: context.now?.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    date: context.now?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' }),
    priority: context.event?.priority,
    source: context.event?.source,
    location: payload.location,
    street: payload.street,
    place: payload.place,
    discipline: payload.discipline,
    units: Array.isArray(payload.units) ? payload.units.join(', ') : payload.units,
    temperature: context.weather?.temperatureC ?? context.status?.weather?.temperatureC,
    wind: context.weather?.windSpeedKph === undefined ? undefined : (context.weather.windSpeedKph / 3.6).toFixed(1),
    entity_state: payload.entity_state,
    system: context.system,
    payload,
  };
  if (root in builtIns) return rest.length ? getPath(builtIns[root], relative) : builtIns[root];
  return getPath(payload, path);
};

export function resolveVariables(template: string, context: VariableContext, fallback = ''): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, path: string) => {
    const value = resolveVariable(path, context);
    return value === undefined || value === null ? fallback : String(value);
  });
}
