import type { DisplayEvent, DisplayRule, RuleAction, RuleCondition } from '../../../shared/schemas/models';

const getPath = (value: unknown, path?: string): unknown => {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, value);
};

const valueFor = (event: DisplayEvent, condition: RuleCondition, now: Date): unknown => {
  if (condition.field === 'source') return event.source;
  if (condition.field === 'type') return event.type;
  if (condition.field === 'priority') return event.priority;
  if (condition.field === 'profile') return event.profileId;
  if (condition.field === 'time') return now.toTimeString().slice(0, 5);
  return getPath(event.payload, condition.path);
};

export function matchesCondition(event: DisplayEvent, condition: RuleCondition, now = new Date()): boolean {
  const actual = valueFor(event, condition, now);
  const expected = condition.value;
  if (condition.operator === 'contains') {
    if (Array.isArray(actual)) return actual.map(String).includes(String(expected));
    return String(actual ?? '').toLowerCase().includes(String(expected).toLowerCase());
  }
  if (condition.operator === 'greater_than') return Number(actual) > Number(expected);
  if (condition.operator === 'less_than') return Number(actual) < Number(expected);
  if (condition.operator === 'between') {
    return String(actual ?? '') >= String(expected) && String(actual ?? '') <= String(condition.secondValue ?? expected);
  }
  return String(actual ?? '') === String(expected);
}

export function matchesRule(event: DisplayEvent, rule: DisplayRule, now = new Date()): boolean {
  return rule.enabled && rule.conditions.every((condition) => matchesCondition(event, condition, now));
}

const applyAction = (event: DisplayEvent, action: RuleAction): DisplayEvent | null => {
  if (action.type === 'ignore') return null;
  if (action.type === 'select_layout' && typeof action.value === 'string') return { ...event, layoutId: action.value };
  if (action.type === 'override_priority') return { ...event, priority: Math.max(0, Math.min(100, Number(action.value))) };
  if (action.type === 'override_duration') {
    const duration = Math.max(1, Number(action.value));
    return { ...event, duration, expiresAt: new Date(Date.parse(event.createdAt) + duration * 1000).toISOString() };
  }
  if (action.type === 'brightness_override') return { ...event, brightnessOverride: Math.max(0, Math.min(100, Number(action.value))) };
  if (action.type === 'select_profile' && typeof action.value === 'string') return { ...event, profileId: action.value as DisplayEvent['profileId'] };
  return event;
};

export interface RuleEvaluation {
  event: DisplayEvent | null;
  matchedRuleIds: string[];
}

export function evaluateRules(event: DisplayEvent, rules: DisplayRule[] = [], now = new Date()): RuleEvaluation {
  let current: DisplayEvent | null = event;
  const matchedRuleIds: string[] = [];
  [...rules].sort((a, b) => a.order - b.order).forEach((rule) => {
    if (!current || !matchesRule(current, rule, now)) return;
    matchedRuleIds.push(rule.id);
    rule.actions.forEach((action) => { if (current) current = applyAction(current, action); });
  });
  return { event: current, matchedRuleIds };
}
