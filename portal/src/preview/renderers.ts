import type { ClockConfig, DeviceStatus, Message } from '../../../shared/schemas/models';
import { createDefaultClockElements } from '../../../shared/schemas/models';
import { faultColor } from '../status/health';

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
    const scale = config.showSeconds ? 2 : 3;
    const timeY = config.showSeconds ? 4 : 1;
    drawText(ctx, time, centeredX(time, scale), timeY, scale, config.timeColor);
    const date = formatDate(now);
    const dateY = config.showSeconds ? 25 : 28;
    const dividerY = config.showSeconds ? 38 : 40;
    if (config.showDate) drawText(ctx, date, centeredX(date, 1), dateY, 1, config.dateColor);
    ctx.fillStyle = config.dividerColor;
    ctx.fillRect(8, dividerY, 112, 1);
    const temperature = Number.isFinite(status.weather?.temperatureC) ? `${status.weather!.temperatureC.toFixed(1)}°C` : '--°C';
    const windMs = Number.isFinite(status.weather?.windSpeedKph) ? (status.weather!.windSpeedKph! / 3.6).toFixed(1) : '--.-';
    const weatherLine = `${temperature} ${windMs}M/S`;
    drawText(ctx, weatherLine, centeredX(weatherLine, 1), dividerY + 5, 1, config.dateColor);
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

export const drawMatrix = (
  canvas: HTMLCanvasElement,
  config: ClockConfig,
  status: DeviceStatus,
  message?: Message,
  now = new Date(),
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  if (!status.displayEnabled || status.mode === 'OFF') {
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, MATRIX_WIDTH, MATRIX_HEIGHT);
  } else if (status.mode === 'MESSAGE' && message) {
    drawMessage(ctx, message, config.backgroundColor);
    drawHealthOverlay(ctx, config, status);
  } else {
    drawClock(ctx, config, status, now);
  }
};
