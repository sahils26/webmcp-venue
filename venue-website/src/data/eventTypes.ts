/**
 * Canonical, language-independent event types a venue can be suitable for.
 *
 * This is the single source of truth shared by the venue catalog, the gallery
 * filter, the venue cards/detail page, and the assistant recommendation tool.
 */
export interface EventTypeOption {
  /** Stable id stored on each venue's `event_types` list. */
  id: string

  /** Human-readable label shown in the UI. */
  label: string
}

/** Ordered list of supported event types, used for filter options and tool enums. */
export const EVENT_TYPES: EventTypeOption[] = [
  { id: 'conference', label: 'Conference' },
  { id: 'corporate', label: 'Corporate Event' },
  { id: 'seminar', label: 'Seminar & Training' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'networking', label: 'Networking & Gala' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'celebration', label: 'Celebration & Party' },
  { id: 'dinner', label: 'Dinner & Reception' },
]

const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((eventType) => [eventType.id, eventType.label]),
)

const EVENT_TYPE_IDS = new Set(EVENT_TYPES.map((eventType) => eventType.id))

/**
 * Free-text synonyms mapped onto canonical event type ids. Keeps the assistant
 * tool and any future free-text input forgiving without widening the catalog.
 */
const EVENT_TYPE_ALIASES: Record<string, string> = {
  conference: 'conference',
  conferences: 'conference',
  summit: 'conference',
  convention: 'conference',
  corporate: 'corporate',
  business: 'corporate',
  offsite: 'corporate',
  'team building': 'corporate',
  meeting: 'corporate',
  launch: 'corporate',
  'product launch': 'corporate',
  seminar: 'seminar',
  training: 'seminar',
  lecture: 'seminar',
  workshop: 'workshop',
  'design sprint': 'workshop',
  briefing: 'workshop',
  networking: 'networking',
  gala: 'networking',
  mixer: 'networking',
  wedding: 'wedding',
  marriage: 'wedding',
  celebration: 'celebration',
  party: 'celebration',
  birthday: 'celebration',
  birthdays: 'celebration',
  'birthday party': 'celebration',
  anniversary: 'celebration',
  dinner: 'dinner',
  reception: 'dinner',
  banquet: 'dinner',
  hospitality: 'dinner',
}

function normalizeEventTypeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-\s]+/g, ' ')
    .trim()
}

function hasEventTypePhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(text)
}

/**
 * Resolves arbitrary user/model text to a canonical event type id.
 *
 * @param rawEventType - Event type id, label, or synonym.
 * @returns The matching canonical id, or null when nothing maps cleanly.
 */
export function resolveEventTypeId(rawEventType: unknown): string | null {
  if (typeof rawEventType !== 'string') {
    return null
  }

  const normalized = normalizeEventTypeText(rawEventType)
  if (!normalized) {
    return null
  }

  if (EVENT_TYPE_IDS.has(normalized)) {
    return normalized
  }

  if (EVENT_TYPE_ALIASES[normalized]) {
    return EVENT_TYPE_ALIASES[normalized]
  }

  // Fall back to a label match (e.g. "Dinner & Reception").
  const byLabel = EVENT_TYPES.find(
    (eventType) => normalizeEventTypeText(eventType.label) === normalized,
  )
  if (byLabel) {
    return byLabel.id
  }

  for (const [alias, eventTypeId] of Object.entries(EVENT_TYPE_ALIASES)) {
    if (hasEventTypePhrase(normalized, normalizeEventTypeText(alias))) {
      return eventTypeId
    }
  }

  const byContainedLabel = EVENT_TYPES.find((eventType) =>
    hasEventTypePhrase(normalized, normalizeEventTypeText(eventType.label)),
  )
  return byContainedLabel?.id ?? null
}

/**
 * Returns the display label for an event type id, falling back to the raw id.
 */
export function getEventTypeLabel(eventTypeId: string): string {
  return EVENT_TYPE_LABELS[eventTypeId] ?? eventTypeId
}
