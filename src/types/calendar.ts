export type EventType = 'prazo' | 'reuniao' | 'audiencia' | 'lembrete' | 'outro';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  event_type: EventType;
  process_deadline_id?: string | null;
  google_event_id?: string | null;
  sync_to_google: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInsert {
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  event_type?: EventType;
  process_deadline_id?: string | null;
  google_event_id?: string | null;
  sync_to_google?: boolean;
}

export interface CalendarEventUpdate extends Partial<CalendarEventInsert> {
  id: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bgColor: string }> = {
  prazo: { label: 'Prazo', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  reuniao: { label: 'Reunião', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  audiencia: { label: 'Audiência', color: 'text-red-700', bgColor: 'bg-red-100' },
  lembrete: { label: 'Lembrete', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  outro: { label: 'Outro', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};