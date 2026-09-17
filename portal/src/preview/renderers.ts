import type { ClockConfig, DeviceStatus, DisplayEvent, LayoutElement, LayoutModel, Message, WeatherSnapshot } from '../../../shared/schemas/models';
import { createDefaultClockElements } from '../../../shared/schemas/models';
import { faultColor } from '../status/health';
import { resolveVariables } from '../engine/variables';

export const MATRIX_WIDTH = 128;
export const MATRIX_HEIGHT = 64;

const FONT: Record<string, string[]> = {
  '0': ['11111', '10001', '10011', '10101', '11001', '10001', '11111'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['11110', '00001', '00001', '01110', '10000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  '°': ['01110', '10001', '10001', '01110', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '·': ['00000', '00110', '00110', '00000', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const textWidth = (text: string, scale: number) => Math.max(0, text.length * (6 * scale) - scale);

const drawText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string) => {
  ctx.fillStyle = color;
  [...text.toUpperCase()].forEach((character, characterIndex) => {
    const glyph = FONT[character] ?? FONT[' '];
    [...glyph].forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel === '1') ctx.fillRect(x + characterIndex * 6 * scale + columnIndex * scale, y + rowIndex * scale, scale, scale);
      });
    });
  });
};

const centeredX = (text: string, scale: number) => Math.round((MATRIX_WIDTH - textWidth(text, scale)) / 2);

const formatTime = (date: Date, config: ClockConfig) => {
  const time = new Intl.DateTimeFormat('nl-NL', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: config.showSeconds ? '2-digit' : undefined,
    hour12: !config.use24Hour,
  }).format(date);
  return time.replace(/\./g, ':');
};

const formatDate = (date: Date) => new Intl.DateTimeFormat('nl-NL', {
  timeZone: 'Europe/Amsterdam', weekday: 'short', day: 'numeric', month: 'long',
}).format(date).replace(',', '').toUpperCase();

const drawHealthOverlay = (ctx: CanvasRenderingContext2D, config: ClockConfig, status: DeviceStatus) => {
  const primaryFault = status.faults?.[0];
  if (config.showStatusIndicator) {
    ctx.fillStyle = faultColor(primaryFault?.code);
    ctx.fillRect(122, 2, 4, 4);
  }
  if (status.faults?.length) {
    const faultText = status.faults.map((item) => item.shortLabel).join(' · ').slice(0, 21);
    drawText(ctx, faultText, centeredX(faultText, 1), 57, 1, faultColor(primaryFault?.code));
  }
};

const drawBuilderClock = (ctx: CanvasRenderingContext2D, config: ClockConfig, status: DeviceStatus, now: Date) => {
  const elements = config.elements?.length ? config.elements : createDefaultClockElements();
  const time = formatTime(now, config);
  const date = formatDate(now);
  elements.filter((element) => element.enabled).forEach((element) => {
    if (element.id === 'status') {
      if (config.showStatusIndicator) {
        ctx.fillStyle = faultColor(status.faults?.[0]?.code);
        ctx.fillRect(element.x, element.y, 4, 4);
      }
      return;
    }
    if (element.id === 'fault') {
      if (status.faults?.length) drawText(ctx, status.faults.map((item) => item.shortLabel).join(' · ').slice(0, 21), element.x, element.y, element.scale, faultColor(status.faults[0]?.code));
      return;
    }
    const value = element.id === 'time' ? time
      : element.id === 'date' ? date
      : element.id === 'temperature' ? (Number.isFinite(status.weather?.temperatureC) ? `${status.weather!.temperatureC.toFixed(1)}°C` : '--°C')
      : (Number.isFinite(status.weather?.windSpeedKph) ? `${(status.weather!.windSpeedKph! / 3.6).toFixed(1)}M/S` : '--.-M/S');
    const color = element.id === 'time' ? config.timeColor : config.dateColor;
    drawText(ctx, value, element.x, element.y, element.scale, color);
  });
};

export const drawClock = (ctx: CanvasRenderingContext2D, config: ClockConfig, status: DeviceStatus, now = new Date()) => {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  const time = formatTime(now, config);
  if (config.layout === 'builder') {
    drawBuilderClock(ctx, config, status, now);
    return;
  }
  if (config.layout === 'weather') {
    // Match the firmware weather renderer: two separate top columns avoid
    // overlapping values on the physical 128x64 matrix.
    const temperature = Number.isFinite(status.weather?.temperatureC) ? `${status.weather!.temperatureC.toFixed(1)}C` : '--.-C';
    const windMs = Number.isFinite(status.weather?.windSpeedKph) ? (status.weather!.windSpeedKph! / 3.6).toFixed(1) : '--.-';
    const condition = (status.weather?.condition || 'WEER').slice(0, 20);
    drawText(ctx, temperature, 4, 2, 2, config.timeColor);
    drawText(ctx, `${windMs}M/S`, 86, 6, 1, config.dateColor);
    ctx.fillStyle = config.dividerColor;
    ctx.fillRect(4, 26, 120, 1);
    drawText(ctx, condition, 4, 34, 1, config.dateColor);
    drawText(ctx, formatTime(now, { ...config, showSeconds: false }), 92, 34, 1, config.timeColor);
  } else {
    const scale = config.layout === 'minimal' ? 4 : config.layout === 'classic' ? 3 : 2;
    const timeY = config.layout === 'compact' ? 16 : 8;
    drawText(ctx, time, centeredX(time, scale), timeY, scale, config.timeColor);
  }
  if (config.layout !== 'compact' && config.layout !== 'weather' && config.showDate) {
    const dateY = status.faults?.length ? 43 : 53;
    const dividerY = status.faults?.length ? 39 : 47;
    ctx.fillStyle = config.dividerColor;
    ctx.fillRect(8, dividerY, 112, 1);
    const date = formatDate(now);
    drawText(ctx, date, centeredX(date, 1), dateY, 1, config.dateColor);
  }
  drawHealthOverlay(ctx, config, status);
};

export const drawMessage = (ctx: CanvasRenderingContext2D, message: Message, backgroundColor: string) => {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  const title = message.title.trim().toUpperCase();
  const body = message.message.trim().toUpperCase();
  const scale = title.length <= 10 ? 2 : 1;
  const titleX = message.alignment === 'left' ? 3 : message.alignment === 'right' ? 125 - textWidth(title, scale) : centeredX(title, scale);
  drawText(ctx, title, titleX, 7, scale, message.color);
  ctx.fillStyle = `${message.color}99`;
  ctx.fillRect(4, 25, 120, 1);
  const words = body.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, 2) > 118 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((lineText, index) => {
    const x = message.alignment === 'left' ? 3 : message.alignment === 'right' ? 125 - textWidth(lineText, 2) : centeredX(lineText, 2);
    drawText(ctx, lineText, x, 31 + index * 10, 2, message.color);
  });
};

const pathValue = (value: unknown, path?: string): unknown => {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, value);
};

export const weatherForecastSummary = (weather?: WeatherSnapshot): string => {
  const warning = weather?.warning?.trim();
  const warningIsSafe = !warning || ['veilig', 'safe', 'geen waarschuwing', 'geen waarschuwingen'].includes(warning.toLocaleLowerCase('nl-NL'));
  return (warningIsSafe ? weather?.forecast : warning)?.replace(/\s+/g, ' ').trim() ?? '';
};

export const weatherMetricsSummary = (weather?: WeatherSnapshot): string => {
  if (!weather) return '';
  const temperature = `${Math.round(weather.temperatureC)}C`;
  const windSpeedMs = weather.windSpeedKph === undefined ? undefined : (weather.windSpeedKph / 3.6).toFixed(1);
  const windDirection = weather.windDirection?.trim().toLocaleUpperCase('nl-NL');
  const wind = windSpeedMs === undefined ? undefined : [windDirection, `${windSpeedMs}m/s`].filter(Boolean).join(' ');
  const compose = (windValue = wind, includePercent = true) => [
    temperature,
    windValue,
    weather.precipitationTodayProbability === undefined ? undefined : `V${Math.round(weather.precipitationTodayProbability)}${includePercent ? '%' : ''}`,
    weather.precipitationTomorrowProbability === undefined ? undefined : `M${Math.round(weather.precipitationTomorrowProbability)}${includePercent ? '%' : ''}`,
  ].filter((part): part is string => Boolean(part)).join(' ');
  let summary = compose();
  if (summary.length > 20) summary = compose(wind, false);
  if (summary.length > 20 && windSpeedMs !== undefined) {
    const roundedSpeed = `${Math.round(Number(windSpeedMs))}m/s`;
    summary = compose([windDirection, roundedSpeed].filter(Boolean).join(' '), false);
  }
  return summary;
};

export const horizontalScrollWindow = (text: string, visibleCharacters: number, timeMs: number): string => {
  if (text.length <= visibleCharacters || visibleCharacters < 1) return text;
  const stream = `${text}  `;
  const start = Math.floor(timeMs / 250) % stream.length;
  return Array.from({ length: visibleCharacters }, (_, index) => stream[(start + index) % stream.length]).join('');
};

const dataValue = (element: LayoutElement, status: DeviceStatus, event: DisplayEvent | undefined): unknown => {
  const source = element.dataSource;
  if (!source) return undefined;
  if (source.type === 'event_payload' || source.type === 'p2000' || source.type === 'home_assistant') return pathValue(event?.payload, source.path);
  if (source.type === 'weather') {
    const weather = status.weather;
    const windSpeedMs = weather?.windSpeedKph === undefined ? undefined : (weather.windSpeedKph / 3.6).toFixed(1);
    const temperature = weather?.temperatureC.toFixed(1);
    const derived = {
      ...weather,
      summary: [weather?.weatherCode, weather?.description].filter(Boolean).join(' '),
      windSpeedMs,
      temperatureWindSummary: [temperature === undefined ? undefined : `${temperature}C`, windSpeedMs === undefined ? undefined : `${windSpeedMs}M/S`].filter(Boolean).join(' '),
      rainSummary: [weather?.precipitationTodayProbability === undefined ? undefined : `V${weather.precipitationTodayProbability}%`, weather?.precipitationTomorrowProbability === undefined ? undefined : `M${weather.precipitationTomorrowProbability}%`].filter(Boolean).join(' '),
      forecastSummary: weatherForecastSummary(weather),
      metricsSummary: weatherMetricsSummary(weather),
    };
    return pathValue(derived, source.path);
  }
  if (source.type === 'system') return pathValue(status, source.path);
  if (source.type === 'timer') return pathValue(event?.payload, source.path);
  return element.text;
};

const wrapPixelText = (text: string, scale: number, width: number): string[] => {
  const maxChars = Math.max(1, Math.floor(width / (6 * scale)));
  const lines: string[] = [];
  let current = '';
  text.split(/\s+/).filter(Boolean).forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) { lines.push(current); current = word; } else current = next;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const elementText = (element: LayoutElement, status: DeviceStatus, event: DisplayEvent | undefined, now: Date): string => {
  const context = { event, status, weather: status.weather, now, system: { faults: status.faults?.map((fault) => fault.shortLabel).join(' · ') ?? '' } };
  const template = element.text ?? (element.type === 'message_title' ? '{{title}}' : element.type === 'message_body' ? '{{message}}' : '');
  const resolved = resolveVariables(template, context, String(dataValue(element, status, event) ?? element.dataSource?.fallback ?? ''));
  if (resolved) return `${element.prefix ?? ''}${resolved}${element.suffix ?? ''}`;
  const value = dataValue(element, status, event);
  return value === undefined || value === null ? element.dataSource?.fallback ?? '' : `${element.prefix ?? ''}${String(value)}${element.suffix ?? ''}`;
};

const drawLayoutText = (ctx: CanvasRenderingContext2D, element: LayoutElement, text: string, now: Date) => {
  const scale = Math.max(1, Math.min(4, Math.round(element.scale ?? element.fontSize ?? 1)));
  const normalizedText = text.toUpperCase();
  const visibleCharacters = Math.max(1, Math.floor(element.width / (6 * scale)));
  const displayedText = element.overflow === 'horizontal_scroll'
    ? horizontalScrollWindow(normalizedText, visibleCharacters, now.getTime())
    : normalizedText;
  const lines = element.overflow === 'wrap' ? wrapPixelText(displayedText, scale, element.width) : [displayedText];
  const lineHeight = 8 * scale + 1;
  lines.slice(0, Math.max(1, Math.floor(element.height / lineHeight))).forEach((line, index) => {
    const width = textWidth(line, scale);
    const x = element.align === 'center' ? element.x + Math.round((element.width - width) / 2) : element.align === 'right' ? element.x + element.width - width : element.x;
    const y = element.y + index * lineHeight;
    drawText(ctx, line.slice(0, Math.max(1, Math.floor(element.width / (6 * scale)))), x, y, scale, element.color ?? '#F4F7FF');
  });
};

export const weatherCodeColor = (weather?: DeviceStatus['weather']): string => {
  const code = `${weather?.weatherCode ?? ''} ${weather?.condition ?? ''}`.toLocaleLowerCase('nl-NL');
  if (code.includes('rood') || code.includes('red')) return '#FF4055';
  if (code.includes('oranje') || code.includes('orange')) return '#FF8C00';
  if (code.includes('geel') || code.includes('yellow')) return '#FFD34F';
  if (code.includes('groen') || code.includes('green')) return '#72E6A8';
  if (code.includes('sunny') || code.includes('clear')) return '#FFD34F';
  if (code.includes('cloud') || code.includes('rain') || code.includes('snow') || code.includes('fog')) return '#70D7F4';
  return '#F4F7FF';
};

export interface LayoutRenderContext {
  status: DeviceStatus;
  event?: DisplayEvent;
  now?: Date;
  backgroundColor?: string;
}

export function drawLayout(ctx: CanvasRenderingContext2D, layout: LayoutModel, context: LayoutRenderContext) {
  ctx.fillStyle = context.backgroundColor ?? '#000000';
  ctx.fillRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  const now = context.now ?? new Date();
  [...layout.elements].filter((item) => item.visible !== false).sort((a, b) => a.zIndex - b.zIndex).forEach((item) => {
    const renderItem = item.properties?.colorFromWeatherCode ? { ...item, color: weatherCodeColor(context.status.weather) } : item;
    ctx.save();
    ctx.globalAlpha = item.opacity ?? 1;
    ctx.beginPath();
    ctx.rect(Math.max(0, item.x), Math.max(0, item.y), Math.max(1, item.width), Math.max(1, item.height));
    ctx.clip();
    if (item.type === 'rectangle') {
      ctx.fillStyle = item.color ?? '#F4F7FF';
      const requestedStroke = Number(item.properties?.strokeWidth ?? 1);
      const strokeWidth = Math.max(1, Math.min(Math.floor(requestedStroke) || 1, Math.floor(Math.min(item.width, item.height) / 2) || 1));
      ctx.fillRect(item.x, item.y, item.width, strokeWidth);
      ctx.fillRect(item.x, item.y + item.height - strokeWidth, item.width, strokeWidth);
      ctx.fillRect(item.x, item.y + strokeWidth, strokeWidth, Math.max(0, item.height - strokeWidth * 2));
      ctx.fillRect(item.x + item.width - strokeWidth, item.y + strokeWidth, strokeWidth, Math.max(0, item.height - strokeWidth * 2));
    } else if (item.type === 'filled_rectangle') {
      ctx.fillStyle = item.backgroundColor ?? item.color ?? '#F4F7FF';
      ctx.fillRect(item.x, item.y, item.width, item.height);
    } else if (item.type === 'line') {
      ctx.fillStyle = item.color ?? '#F4F7FF';
      ctx.fillRect(item.x, item.y, item.width, Math.max(1, item.height));
    } else if (item.type === 'status_indicator') {
      ctx.fillStyle = faultColor(context.status.faults?.[0]?.code);
      ctx.fillRect(item.x, item.y, Math.min(6, item.width), Math.min(6, item.height));
    } else if (item.type === 'icon' || item.type === 'pixel_icon') {
      drawText(ctx, item.icon ?? '◆', item.x, item.y, item.scale ?? 1, item.color ?? '#F4F7FF');
    } else if (item.type === 'timer') {
      const remaining = Number(dataValue(item, context.status, context.event) ?? context.event?.duration ?? 0);
      drawLayoutText(ctx, { ...renderItem, text: `${Math.max(0, Math.ceil(remaining))}S` }, `${Math.max(0, Math.ceil(remaining))}S`, now);
    } else if (item.type === 'progress') {
      const progress = Math.max(0, Math.min(1, Number(dataValue(item, context.status, context.event) ?? 0)));
      ctx.fillStyle = item.backgroundColor ?? '#1A2639';
      ctx.fillRect(item.x, item.y, item.width, item.height);
      ctx.fillStyle = item.color ?? '#72E6A8';
      ctx.fillRect(item.x, item.y, Math.round(item.width * progress), item.height);
    } else if (item.type === 'clock') {
      const config: ClockConfig = { layout: 'minimal', use24Hour: true, showSeconds: false, showDate: false, timeColor: item.color ?? '#F4F7FF', dateColor: '#72E6A8', dividerColor: '#43506F', backgroundColor: context.backgroundColor ?? '#000000', showStatusIndicator: false, timezone: 'Europe/Amsterdam' };
      const value = formatTime(now, config);
      drawLayoutText(ctx, { ...renderItem, text: value }, value, now);
    } else if (item.type === 'date') {
      const value = formatDate(now);
      drawLayoutText(ctx, { ...renderItem, text: value }, value, now);
    } else {
      drawLayoutText(ctx, renderItem, elementText(renderItem, context.status, context.event, now), now);
    }
    ctx.restore();
  });
}

export const drawMatrix = (
  canvas: HTMLCanvasElement,
  config: ClockConfig,
  status: DeviceStatus,
  message?: Message,
  now = new Date(),
  layout?: LayoutModel,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  if (!status.displayEnabled || status.mode === 'OFF') {
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  } else if (layout && status.mode !== 'MESSAGE') {
    drawLayout(ctx, layout, { status, event: status.currentEvent, now, backgroundColor: config.backgroundColor });
  } else if (status.mode === 'MESSAGE' && message) {
    drawMessage(ctx, message, config.backgroundColor);
    drawHealthOverlay(ctx, config, status);
  } else if (status.mode === 'WEATHER') {
    drawClock(ctx, { ...config, layout: 'weather' }, status, now);
  } else {
    drawClock(ctx, config, status, now);
  }
};
