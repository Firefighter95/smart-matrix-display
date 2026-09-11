import type { DisplayEvent, EventHistoryEntry, EventInput, EventResult, DisplayRule } from '../../../shared/schemas/models';
import { evaluateRules } from './rules';

export interface EventEngineSnapshot {
  current?: DisplayEvent;
  queue: DisplayEvent[];
  history: EventHistoryEntry[];
  suspended: DisplayEvent[];
}

const clone = <T,>(value: T): T => structuredClone(value);

export class EventEngine {
  private current?: DisplayEvent;
  private queue: DisplayEvent[] = [];
  private suspended: DisplayEvent[] = [];
  private history: EventHistoryEntry[] = [];
  private readonly maxQueue: number;
  private readonly maxHistory: number;
  private readonly rules: DisplayRule[];
  private clock: () => Date;

  constructor(options: { maxQueue?: number; maxHistory?: number; rules?: DisplayRule[]; now?: () => Date } = {}) {
    this.maxQueue = Math.max(1, options.maxQueue ?? 32);
    this.maxHistory = Math.max(1, options.maxHistory ?? 100);
    this.rules = options.rules ?? [];
    this.clock = options.now ?? (() => new Date());
  }

  private record(event: DisplayEvent, result: EventResult, detail?: string) {
    this.history = [{ event: clone(event), result, timestamp: this.clock().toISOString(), detail }, ...this.history].slice(0, this.maxHistory);
  }

  private normalize(input: EventInput): DisplayEvent {
    const createdAt = input.createdAt ?? this.clock().toISOString();
    const duration = Math.max(1, Math.min(86400, input.duration ?? 20));
    return {
      id: input.id ?? `${input.source}-${Date.parse(createdAt)}-${Math.random().toString(16).slice(2, 8)}`,
      source: input.source,
      type: input.type,
      priority: Math.max(0, Math.min(100, input.priority ?? 50)),
      layoutId: input.layoutId,
      duration,
      createdAt,
      expiresAt: input.expiresAt ?? new Date(Date.parse(createdAt) + duration * 1000).toISOString(),
      interruptible: input.interruptible ?? true,
      resumeAllowed: input.resumeAllowed ?? true,
      brightnessOverride: input.brightnessOverride,
      payload: input.payload ?? {},
    };
  }

  private isExpired(event: DisplayEvent, now = this.clock()): boolean {
    return Date.parse(event.expiresAt) <= now.getTime();
  }

  private activate(event: DisplayEvent, result: EventResult = 'DISPLAYED') {
    this.current = event;
    this.record(event, result);
  }

  private selectNext(now: Date) {
    while (this.queue.length) {
      const candidate = this.queue.shift()!;
      if (this.isExpired(candidate, now)) {
        this.record(candidate, 'EXPIRED', 'Event verlopen voordat het getoond kon worden');
        continue;
      }
      this.activate(candidate);
      return;
    }
    this.current = undefined;
  }

  receive(input: EventInput): { event?: DisplayEvent; result: EventResult; matchedRuleIds: string[] } {
    const normalized = this.normalize(input);
    const evaluation = evaluateRules(normalized, this.rules, this.clock());
    if (!evaluation.event) {
      this.record(normalized, 'IGNORED', 'Rule heeft event genegeerd');
      return { result: 'IGNORED', matchedRuleIds: evaluation.matchedRuleIds };
    }
    const event = evaluation.event;
    const now = this.clock();
    if (this.isExpired(event, now)) {
      this.record(event, 'EXPIRED', 'Event was al verlopen');
      return { event, result: 'EXPIRED', matchedRuleIds: evaluation.matchedRuleIds };
    }
    if (!this.current) {
      this.activate(event);
      return { event, result: 'DISPLAYED', matchedRuleIds: evaluation.matchedRuleIds };
    }
    if (event.priority > this.current.priority && this.current.interruptible) {
      const previous = this.current;
      this.record(previous, 'INTERRUPTED', `Onderbroken door ${event.id}`);
      if (previous.resumeAllowed && !this.isExpired(previous, now)) this.suspended.push(previous);
      this.activate(event);
      return { event, result: 'DISPLAYED', matchedRuleIds: evaluation.matchedRuleIds };
    }
    if (this.queue.length >= this.maxQueue) {
      const lowestIndex = this.queue.reduce((lowest, item, index, items) => item.priority < items[lowest].priority ? index : lowest, 0);
      if (this.queue[lowestIndex].priority > event.priority) {
        this.record(event, 'FAILED', 'Queue vol; event heeft lagere prioriteit');
        return { event, result: 'FAILED', matchedRuleIds: evaluation.matchedRuleIds };
      }
      const removed = this.queue.splice(lowestIndex, 1)[0];
      this.record(removed, 'FAILED', 'Queue vol; vervangen door hogere prioriteit');
    }
    this.queue.push(event);
    this.queue.sort((a, b) => b.priority - a.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt));
    this.record(event, 'QUEUED');
    return { event, result: 'QUEUED', matchedRuleIds: evaluation.matchedRuleIds };
  }

  tick(now = this.clock()): void {
    if (this.current && this.isExpired(this.current, now)) {
      const expired = this.current;
      this.record(expired, 'EXPIRED');
      this.current = undefined;
      while (this.suspended.length) {
        const resume = this.suspended.pop()!;
        if (this.isExpired(resume, now)) {
          this.record(resume, 'EXPIRED', 'Onderbroken event is verlopen');
          continue;
        }
        this.activate(resume, 'RESUMED');
        return;
      }
      this.selectNext(now);
    }
    this.queue = this.queue.filter((event) => {
      if (!this.isExpired(event, now)) return true;
      this.record(event, 'EXPIRED');
      return false;
    });
  }

  clear(): void {
    if (this.current) this.record(this.current, 'EXPIRED', 'Queue gewist');
    this.queue.forEach((event) => this.record(event, 'EXPIRED', 'Queue gewist'));
    this.suspended.forEach((event) => this.record(event, 'EXPIRED', 'Queue gewist'));
    this.current = undefined;
    this.queue = [];
    this.suspended = [];
  }

  skip(): void {
    if (this.current) this.record(this.current, 'INTERRUPTED', 'Handmatig overgeslagen');
    this.current = undefined;
    this.selectNext(this.clock());
  }

  snapshot(): EventEngineSnapshot {
    return clone({ current: this.current, queue: this.queue, history: this.history, suspended: this.suspended });
  }

  get currentEvent(): DisplayEvent | undefined { return this.current ? clone(this.current) : undefined; }
  get queueLength(): number { return this.queue.length; }
  get eventHistory(): EventHistoryEntry[] { return clone(this.history); }
}
