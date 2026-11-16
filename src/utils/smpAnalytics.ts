import type {
  FilterMode,
  SmpBriefingData,
  SmpDayRecord,
  SmpHourPoint,
  SmpNotificationItem,
} from '../types/smp';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildHourTag(
  hour: number,
  price: number,
  maxHour: number,
  minHour: number,
  isPeak: boolean
): string {
  if (hour === maxHour) {
    if (hour >= 17 && hour <= 20) return '저녁 피크타임 (최고가)';
    if (hour >= 9 && hour <= 11) return '오전 피크타임 (최고가)';
    return '선택일 최고가 기록 시간대';
  }
  if (hour === minHour) {
    if (price <= 10) return '태양광 출력과잉 초저가 (최저가)';
    return '선택일 최저가 구간';
  }
  if (price <= 10) return '재생에너지 발전 과잉 저가 구간';
  if (hour >= 1 && hour <= 4) return '심야 경부하';
  if (hour === 5) return '새벽 부하 증가';
  if (hour === 6) return '출근 시간대 준비';
  if (hour === 7) return '산업용 수요 상승';
  if (hour === 8) return '오전 가동률 진입';
  if (hour >= 9 && hour <= 11) return isPeak ? '오전 전력 수요 피크' : '오전 산업·상업 가동';
  if (hour >= 12 && hour <= 15) return '낮 태양광 발전 활발 구간';
  if (hour === 16) return '일사량 감소 시작';
  if (hour >= 17 && hour <= 20) return isPeak ? '저녁 수요 급증 피크' : '저녁 생활 전력 구간';
  if (hour === 21) return '심야 진입 감축';
  if (hour === 22) return '야간 부하 전환';
  if (hour === 23) return '취침 시간 안정권';
  return '자정 기준 단가 마감';
}

export function parseSmpCsv(csvText: string): SmpDayRecord[] {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const records: SmpDayRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 28) continue;

    const dateRaw = cols[0];
    const dateParts = dateRaw.split(/[/-]/);
    if (dateParts.length !== 3) continue;

    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    if (!year || !month || !day) continue;

    const jsDate = new Date(year, month - 1, day);
    const weekdayIndex = jsDate.getDay();
    const weekdayKo = WEEKDAYS_KO[weekdayIndex] ?? '';
    const dateIso = `${year}-${pad2(month)}-${pad2(day)}`;
    const dateDisplay = `${year}. ${pad2(month)}. ${pad2(day)} (${weekdayKo})`;
    const shortDate = `${pad2(month)}.${pad2(day)}`;

    const rawPrices: number[] = [];
    for (let h = 1; h <= 24; h++) {
      const val = Number(cols[h]);
      rawPrices.push(Number.isFinite(val) ? val : 0);
    }

    const csvMax = Number(cols[25]);
    const csvMin = Number(cols[26]);
    const csvAvg = Number(cols[27]);

    const maxPrice = Number.isFinite(csvMax) ? csvMax : Math.max(...rawPrices);
    const minPrice = Number.isFinite(csvMin) ? csvMin : Math.min(...rawPrices);
    const weightedAvg = Number.isFinite(csvAvg)
      ? csvAvg
      : rawPrices.reduce((sum, v) => sum + v, 0) / 24;

    let maxHour = 1;
    let minHour = 1;
    let bestMax = -Infinity;
    let bestMin = Infinity;

    rawPrices.forEach((p, idx) => {
      if (p > bestMax) {
        bestMax = p;
        maxHour = idx + 1;
      }
      if (p < bestMin) {
        bestMin = p;
        minHour = idx + 1;
      }
    });

    const peakThreshold = Math.max(weightedAvg * 1.12, maxPrice * 0.91);

    const hours: SmpHourPoint[] = rawPrices.map((price, idx) => {
      const hour = idx + 1;
      const isMax = hour === maxHour;
      const isMin = hour === minHour;
      const isPeak = !isMin && price >= peakThreshold && price > weightedAvg + 5;
      return {
        hour,
        label: `${pad2(hour)}시`,
        shortLabel: pad2(hour),
        price,
        isPeak,
        isMin,
        isMax,
        tag: buildHourTag(hour, price, maxHour, minHour, isPeak),
      };
    });

    records.push({
      dateRaw,
      dateIso,
      dateDisplay,
      shortDate,
      weekdayIndex,
      weekdayKo,
      isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
      hours,
      max: maxPrice,
      min: minPrice,
      weightedAvg,
      maxHour,
      minHour,
    });
  }

  // Sort descending by ISO date (newest first)
  records.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  return records;
}

export function formatPrice(val: number, decimals = 2): string {
  return val.toFixed(decimals);
}

export function buildDeterministicBriefing(
  day: SmpDayRecord,
  prevDay: SmpDayRecord | undefined,
  filterMode: FilterMode,
  weekRecords: SmpDayRecord[]
): SmpBriefingData {
  const nowStr = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (filterMode === 'week' && weekRecords.length > 0) {
    const avg =
      weekRecords.reduce((sum, r) => sum + r.weightedAvg, 0) / weekRecords.length;
    const highestDay = weekRecords.reduce((a, b) =>
      b.weightedAvg > a.weightedAvg ? b : a
    );
    const lowestDay = weekRecords.reduce((a, b) =>
      b.weightedAvg < a.weightedAvg ? b : a
    );
    const maxPeakDay = weekRecords.reduce((a, b) => (b.max > a.max ? b : a));

    return {
      source: 'csv-analytics',
      generatedAt: nowStr,
      summary: `${weekRecords[weekRecords.length - 1].shortDate}~${weekRecords[0].shortDate} 최근 7일간 평균 SMP는 ${avg.toFixed(2)}원/kWh를 기록했습니다. 주간 일평균 최고치는 ${highestDay.dateDisplay} (${highestDay.weightedAvg.toFixed(2)}원), 최저치는 ${lowestDay.dateDisplay} (${lowestDay.weightedAvg.toFixed(2)}원)로 주중 산업 수요와 주말 경부하에 따른 뚜렷한 등락이 나타났습니다.`,
      highlights: [
        {
          title: `주간 순간 최고가 ${maxPeakDay.max.toFixed(2)}원:`,
          body: `${maxPeakDay.shortDate} (${maxPeakDay.weekdayKo}) ${pad2(maxPeakDay.maxHour)}시에 전력 수요가 몰리며 주간 최고 단가를 기록했습니다.`,
        },
        {
          title: `주말·평일 가격 차이 ${(highestDay.weightedAvg - lowestDay.weightedAvg).toFixed(1)}원:`,
          body: `공장·상업 시설 가동이 줄어드는 휴일에는 발전 단가가 낮은 기저 발전기 비중이 높아져 시세가 내려갑니다.`,
        },
        {
          title: '시간대별 변동폭 관리:',
          body: `주간 평균 변동폭이 큰 피크 시간대(09~11시, 17~20시)에 전력 효율을 높이면 비용 절감 효과가 큽니다.`,
        },
      ],
    };
  }

  const diff = prevDay ? day.weightedAvg - prevDay.weightedAvg : 0;
  const pct = prevDay && prevDay.weightedAvg > 0 ? (diff / prevDay.weightedAvg) * 100 : 0;
  const diffDir = diff >= 0 ? '상승' : '하락';
  const diffAbsStr = prevDay
    ? `전일(${prevDay.shortDate}) 대비 ${Math.abs(diff).toFixed(2)}원(${Math.abs(pct).toFixed(1)}%) ${diffDir}`
    : '기준일 데이터';

  const middayHours = day.hours.slice(11, 15); // 12시~15시
  const middayAvg =
    middayHours.reduce((s, h) => s + h.price, 0) / middayHours.length;
  const nightHours = day.hours.slice(0, 5); // 01시~05시
  const nightAvg =
    nightHours.reduce((s, h) => s + h.price, 0) / nightHours.length;

  const isMiddayDip = day.minHour >= 11 && day.minHour <= 15 && day.min < nightAvg;
  const isZeroPrice = day.min <= 10;

  return {
    source: 'csv-analytics',
    generatedAt: nowStr,
    summary: `${day.dateDisplay} 가중평균 SMP는 ${day.weightedAvg.toFixed(2)}원/kWh로 ${diffAbsStr}했습니다. ${pad2(day.maxHour)}시에 ${day.max.toFixed(2)}원/kWh로 당일 최고가를 기록했고, ${pad2(day.minHour)}시에는 ${day.min.toFixed(2)}원/kWh까지 내려가 일교차(최고-최저)가 ${(day.max - day.min).toFixed(2)}원 나타났습니다.`,
    highlights: [
      {
        title: `${pad2(day.maxHour)}시가 가장 비쌌어요 (${day.max.toFixed(2)}원):`,
        body:
          day.maxHour >= 17
            ? '해가 진 뒤 태양광 발전이 줄고 저녁 조명·가정 전력 수요가 겹쳐 LNG 발전기가 단가를 결정했습니다.'
            : '오전 산업·상업 활동이 본격 시작되며 전력 수요가 급증해 한계가격이 올라갔습니다.',
      },
      {
        title: isZeroPrice
          ? `낮 ${pad2(day.minHour)}시 초저가 ${day.min.toFixed(2)}원 기록:`
          : isMiddayDip
          ? `낮 12~15시 평균 ${middayAvg.toFixed(1)}원 안정세:`
          : `심야·새벽(01~05시) 평균 ${nightAvg.toFixed(1)}원 경부하:`,
        body: isZeroPrice
          ? '낮 시간대 태양광 등 재생에너지 공급이 전력 수요를 크게 웃돌아 도매 단가가 일시적으로 급락했습니다.'
          : isMiddayDip
          ? '한낮 태양광 발전 유입 덕분에 주간 시간대 전력 공급 여력이 늘어나 단가가 낮아졌습니다.'
          : '모두가 잠든 새벽 시간대에는 전기 사용량이 줄어 발전 단가가 저렴한 기저 발전기로만 충당됩니다.',
      },
      {
        title: `${day.isWeekend ? '주말·휴일' : '평일'} 전력 패턴 특징:`,
        body: day.isWeekend
          ? '주말에는 산업용 부하가 줄어 평일 대비 전반적으로 완만하고 낮은 SMP 흐름을 보입니다.'
          : `하루 평균(${day.weightedAvg.toFixed(1)}원) 대비 피크 시간대 단가가 ${(day.max - day.weightedAvg).toFixed(1)}원 높아 시간대별 편차가 큽니다.`,
      },
    ],
  };
}

export function buildNotificationsFromCsv(records: SmpDayRecord[]): SmpNotificationItem[] {
  if (records.length === 0) return [];
  const items: SmpNotificationItem[] = [];

  const latest = records[0];
  const prev = records[1];
  if (latest && prev) {
    const diff = latest.weightedAvg - prev.weightedAvg;
    const pct = prev.weightedAvg > 0 ? (diff / prev.weightedAvg) * 100 : 0;
    items.push({
      id: `latest-${latest.dateIso}`,
      dateIso: latest.dateIso,
      dateDisplay: latest.dateDisplay,
      type: diff >= 0 ? 'spike' : 'dip',
      title: `최신일(${latest.shortDate}) 평균 SMP ${diff >= 0 ? '+' : ''}${pct.toFixed(1)}% 변동`,
      detail: `가중평균 ${latest.weightedAvg.toFixed(2)}원 (전일 ${prev.weightedAvg.toFixed(2)}원 대비 ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}원)`,
      price: latest.weightedAvg,
    });
  }

  // Annual peak day in dataset
  const annualMax = records.reduce((a, b) => (b.max > a.max ? b : a), records[0]);
  items.push({
    id: `annual-max-${annualMax.dateIso}`,
    dateIso: annualMax.dateIso,
    dateDisplay: annualMax.dateDisplay,
    type: 'spike',
    title: `연중 최고 피크 단가 경신 (${pad2(annualMax.maxHour)}시)`,
    detail: `${annualMax.dateDisplay} ${pad2(annualMax.maxHour)}시에 ${annualMax.max.toFixed(2)}원/kWh 기록`,
    price: annualMax.max,
  });

  // Recent zero/ultra-low price event
  const zeroDay = records.find((r) => r.min <= 10);
  if (zeroDay) {
    items.push({
      id: `zero-${zeroDay.dateIso}`,
      dateIso: zeroDay.dateIso,
      dateDisplay: zeroDay.dateDisplay,
      type: 'zero',
      title: `태양광 출력과잉 초저가 발생 (${pad2(zeroDay.minHour)}시)`,
      detail: `${zeroDay.dateDisplay} ${pad2(zeroDay.minHour)}시 최저 ${zeroDay.min.toFixed(2)}원/kWh 기록`,
      price: zeroDay.min,
    });
  }

  return items;
}

export interface MonthlySummary {
  monthKey: string; // "2026-11"
  label: string; // "11월"
  avg: number;
  max: number;
  min: number;
  days: number;
}

export function computeForecastAnalytics(records: SmpDayRecord[]) {
  if (records.length === 0) {
    return {
      monthly: [] as MonthlySummary[],
      weekdayAvg: 0,
      weekendAvg: 0,
      hourlyAvg24: Array(24).fill(0) as number[],
      projectedNextDayAvg: 0,
      projectedNextDayRange: [0, 0] as [number, number],
      nextDayLabel: '',
      recent14: [] as SmpDayRecord[],
      zeroPriceDaysCount: 0,
    };
  }

  // Monthly grouping
  const monthMap = new Map<string, SmpDayRecord[]>();
  for (const r of records) {
    const key = r.dateIso.slice(0, 7); // YYYY-MM
    const arr = monthMap.get(key) ?? [];
    arr.push(r);
    monthMap.set(key, arr);
  }

  const monthly: MonthlySummary[] = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, list]) => {
      const avg = list.reduce((s, d) => s + d.weightedAvg, 0) / list.length;
      const max = Math.max(...list.map((d) => d.max));
      const min = Math.min(...list.map((d) => d.min));
      const mNum = Number(monthKey.split('-')[1]);
      return {
        monthKey,
        label: `${mNum}월`,
        avg,
        max,
        min,
        days: list.length,
      };
    });

  const weekdays = records.filter((r) => !r.isWeekend);
  const weekends = records.filter((r) => r.isWeekend);
  const weekdayAvg = weekdays.length
    ? weekdays.reduce((s, r) => s + r.weightedAvg, 0) / weekdays.length
    : 0;
  const weekendAvg = weekends.length
    ? weekends.reduce((s, r) => s + r.weightedAvg, 0) / weekends.length
    : 0;

  // 24-hour average across recent 30 days (or all if fewer)
  const sample = records.slice(0, 30);
  const hourlyAvg24 = Array.from({ length: 24 }, (_, idx) => {
    const sum = sample.reduce((acc, d) => acc + (d.hours[idx]?.price ?? 0), 0);
    return sum / sample.length;
  });

  // Next day projection based on latest date + 1 day, blending recent 7d & same-weekday 4-week avg
  const latest = records[0];
  const [y, m, d] = latest.dateIso.split('-').map(Number);
  const nextDate = new Date(y, m - 1, d + 1);
  const nextWeekday = nextDate.getDay();
  const nextDayLabel = `${nextDate.getFullYear()}. ${pad2(nextDate.getMonth() + 1)}. ${pad2(nextDate.getDate())} (${WEEKDAYS_KO[nextWeekday]})`;

  const recent7 = records.slice(0, 7);
  const recent7Avg = recent7.reduce((s, r) => s + r.weightedAvg, 0) / recent7.length;
  const sameWeekdayRecs = records.filter((r) => r.weekdayIndex === nextWeekday).slice(0, 4);
  const sameWeekdayAvg = sameWeekdayRecs.length
    ? sameWeekdayRecs.reduce((s, r) => s + r.weightedAvg, 0) / sameWeekdayRecs.length
    : recent7Avg;

  const projectedNextDayAvg = recent7Avg * 0.55 + sameWeekdayAvg * 0.45;
  const stdBand = Math.max(
    6,
    Math.min(
      18,
      recent7.reduce((s, r) => s + Math.abs(r.weightedAvg - recent7Avg), 0) / recent7.length
    )
  );

  const zeroPriceDaysCount = records.filter((r) => r.min <= 10).length;

  return {
    monthly,
    weekdayAvg,
    weekendAvg,
    hourlyAvg24,
    projectedNextDayAvg,
    projectedNextDayRange: [
      Math.max(0, projectedNextDayAvg - stdBand),
      projectedNextDayAvg + stdBand,
    ] as [number, number],
    nextDayLabel,
    recent14: records.slice(0, 14).reverse(),
    zeroPriceDaysCount,
  };
}
