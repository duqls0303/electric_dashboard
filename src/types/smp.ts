export interface SmpHourPoint {
  hour: number; // 1..24
  label: string; // "01시".."24시"
  shortLabel: string; // "01".."24"
  price: number;
  isPeak: boolean;
  isMin: boolean;
  isMax: boolean;
  tag: string;
}

export interface SmpDayRecord {
  dateRaw: string; // "2026/11/06"
  dateIso: string; // "2026-11-06"
  dateDisplay: string; // "2026. 11. 06 (금)"
  shortDate: string; // "11.06"
  weekdayIndex: number; // 0..6 (Sun..Sat)
  weekdayKo: string; // "일".."토"
  isWeekend: boolean;
  hours: SmpHourPoint[];
  max: number;
  min: number;
  weightedAvg: number;
  maxHour: number; // 1..24
  minHour: number; // 1..24
}

export interface SmpBriefingPoint {
  title: string;
  body: string;
}

export interface SmpBriefingData {
  summary: string;
  highlights: SmpBriefingPoint[];
  generatedAt: string;
  source: 'gemini' | 'csv-analytics';
}

export type FilterMode = 'today' | 'yesterday' | 'week';
export type NavTab = 'smp-dashboard' | 'smp-forecast' | 'beginner-guide';

export interface SmpNotificationItem {
  id: string;
  dateIso: string;
  dateDisplay: string;
  type: 'spike' | 'dip' | 'zero';
  title: string;
  detail: string;
  price: number;
}

export interface RealtimePowerItem {
  date: string;
  hour: number;
  areaName: string;
  smp: number | null;
  forecastDemand: number | null;
  mainlandDemand: number | null;
  jejuDemand: number | null;
  raw: Record<string, unknown>;
}

export interface RealtimePowerApiResult {
  ok: boolean;
  endpoint: string;
  queryDate: string;
  fetchedAt: string;
  currentHour: number;
  currentItem: RealtimePowerItem | null;
  items: RealtimePowerItem[];
  error?: string;
  errorDetail?: string;
  statusCode?: number;
}

