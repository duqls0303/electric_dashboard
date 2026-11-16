import React, { useMemo, useState, useEffect } from 'react';
import type {
  FilterMode,
  SmpBriefingData,
  SmpDayRecord,
} from '../types/smp';
import { RealtimePowerSection } from './RealtimePowerSection';

interface DashboardViewProps {
  records: SmpDayRecord[];
  selectedDay: SmpDayRecord;
  prevDay?: SmpDayRecord;
  filterMode: FilterMode;
  onChangeFilterMode: (mode: FilterMode) => void;
  onOpenDatePicker: () => void;
  onSelectDateIso: (dateIso: string) => void;
  briefing: SmpBriefingData;
  isBriefingLoading: boolean;
  onRegenerateBriefing: () => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function highlightSummaryText(text: string): React.ReactNode {
  // Highlight numbers with units or percentages in bold primary/dark
  const regex = /(\d+(?:\.\d+)?(?:원\/kWh|원|%|\s*상승|\s*하락))/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (regex.test(part)) {
      const isHighlight = part.includes('원/kWh') || part.includes('%') || part.includes('상승') || part.includes('하락');
      return (
        <strong
          key={idx}
          className={isHighlight ? 'text-primary font-bold' : 'text-on-surface font-bold'}
        >
          {part}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  selectedDay,
  prevDay,
  filterMode,
  onChangeFilterMode,
  onOpenDatePicker,
  onSelectDateIso,
  briefing,
  isBriefingLoading,
  onRegenerateBriefing,
}) => {
  // Selected bar index in daily mode (hour 1..24) or week mode (0..6)
  const [selectedHour, setSelectedHour] = useState<number>(selectedDay.maxHour);

  const weekRecords = useMemo(() => {
    const idx = records.findIndex((r) => r.dateIso === selectedDay.dateIso);
    const slice = idx >= 0 ? records.slice(idx, idx + 7) : records.slice(0, 7);
    return [...slice].reverse(); // chronological left->right
  }, [records, selectedDay.dateIso]);

  const prevWeekRecords = useMemo(() => {
    const idx = records.findIndex((r) => r.dateIso === selectedDay.dateIso);
    if (idx < 0) return [];
    return records.slice(idx + 7, idx + 14);
  }, [records, selectedDay.dateIso]);

  const [selectedWeekDateIso, setSelectedWeekDateIso] = useState<string>(
    selectedDay.dateIso
  );

  // Reset active bar when selectedDay changes
  useEffect(() => {
    setSelectedHour(selectedDay.maxHour);
    setSelectedWeekDateIso(selectedDay.dateIso);
  }, [selectedDay.dateIso, selectedDay.maxHour]);

  // Compute main metric card values depending on daily vs 1-week mode
  const metricSummary = useMemo(() => {
    if (filterMode === 'week' && weekRecords.length > 0) {
      const avg =
        weekRecords.reduce((s, r) => s + r.weightedAvg, 0) / weekRecords.length;
      const prevAvg =
        prevWeekRecords.length > 0
          ? prevWeekRecords.reduce((s, r) => s + r.weightedAvg, 0) /
            prevWeekRecords.length
          : null;
      const diff = prevAvg !== null ? avg - prevAvg : 0;
      const pct = prevAvg && prevAvg > 0 ? (diff / prevAvg) * 100 : 0;

      const maxDay = weekRecords.reduce((a, b) =>
        b.weightedAvg > a.weightedAvg ? b : a
      );
      const minDay = weekRecords.reduce((a, b) =>
        b.weightedAvg < a.weightedAvg ? b : a
      );

      return {
        badgeLabel: '최근 7일 평균 SMP',
        avgValue: avg,
        hasPrev: prevAvg !== null,
        diff,
        pct,
        highLabel: `최고 (${maxDay.shortDate})`,
        highValue: maxDay.weightedAvg,
        lowLabel: `최저 (${minDay.shortDate})`,
        lowValue: minDay.weightedAvg,
      };
    }

    const latestIso = records[0]?.dateIso;
    const yesterdayIso = records[1]?.dateIso;
    const badgeLabel =
      selectedDay.dateIso === latestIso
        ? '오늘의 평균 SMP'
        : selectedDay.dateIso === yesterdayIso
        ? '어제의 평균 SMP'
        : '선택일 평균 SMP';

    const diff = prevDay ? selectedDay.weightedAvg - prevDay.weightedAvg : 0;
    const pct =
      prevDay && prevDay.weightedAvg > 0
        ? (diff / prevDay.weightedAvg) * 100
        : 0;

    return {
      badgeLabel,
      avgValue: selectedDay.weightedAvg,
      hasPrev: Boolean(prevDay),
      diff,
      pct,
      highLabel: `최고 (${pad2(selectedDay.maxHour)}시)`,
      highValue: selectedDay.max,
      lowLabel: `최저 (${pad2(selectedDay.minHour)}시)`,
      lowValue: selectedDay.min,
    };
  }, [filterMode, weekRecords, prevWeekRecords, records, selectedDay, prevDay]);

  const activeHourPoint = useMemo(() => {
    return (
      selectedDay.hours.find((h) => h.hour === selectedHour) ??
      selectedDay.hours[selectedDay.maxHour - 1] ??
      selectedDay.hours[0]
    );
  }, [selectedDay, selectedHour]);

  const activeWeekPoint = useMemo(() => {
    return (
      weekRecords.find((r) => r.dateIso === selectedWeekDateIso) ??
      weekRecords[weekRecords.length - 1]
    );
  }, [weekRecords, selectedWeekDateIso]);

  const isUp = metricSummary.diff >= 0;

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* 상단 헤더 보조 및 필터 영역 */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-label-data text-on-surface-variant flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse shrink-0" />
              <span className="truncate">KPX 실시간 계통한계가격 (육지)</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant text-body-sm bg-surface-container px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
            <span className="material-symbols-outlined text-[15px] text-primary">update</span>
            <span className="text-label-data font-medium">{selectedDay.shortDate} CSV</span>
          </div>
        </div>

        {/* 날짜 선택 바 & 빠른 필터 */}
        <div className="flex flex-wrap items-center justify-between gap-space-xs bg-surface-container-lowest p-2.5 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={onOpenDatePicker}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors text-on-surface cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              calendar_today
            </span>
            <span className="text-title-sm text-[15px]">{selectedDay.dateDisplay}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          <div
            className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg"
            role="tablist"
            aria-label="기간 필터"
          >
            {(
              [
                { id: 'today', label: '오늘' },
                { id: 'yesterday', label: '어제' },
                { id: 'week', label: '1주일' },
              ] as { id: FilterMode; label: string }[]
            ).map((chip) => {
              const active = filterMode === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onChangeFilterMode(chip.id)}
                  className={`px-2.5 py-1 rounded-md text-label-ui transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 초보자 친화적 도움말 안내 배너 */}
        <div className="relative overflow-hidden bg-primary-fixed/40 p-3 rounded-xl flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[15px]">tips_and_updates</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-ui text-on-primary-container font-bold flex items-center gap-1">
              SMP(계통한계가격)란?
            </p>
            <p className="text-body-sm text-on-surface-variant mt-0.5 leading-snug">
              한국전력이 발전사업자(태양광·화력 등)로부터 전기를 사오는{' '}
              <span className="font-semibold text-primary">도매 기준 단가</span>예요!
            </p>
          </div>
        </div>
      </section>

      {/* 중앙 메인 지표 카드 (평균 SMP) */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-primary/5 pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-label-ui">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {metricSummary.badgeLabel}
            </span>
          </div>
          <span className="text-label-data text-on-surface-variant">원 / kWh</span>
        </div>

        <div className="flex items-baseline gap-3 my-1 flex-wrap">
          <h2 className="text-display-lg-mobile text-on-surface tracking-tight">
            {metricSummary.avgValue.toFixed(2)}
          </h2>
          {metricSummary.hasPrev ? (
            <div
              className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-label-data font-bold ${
                isUp
                  ? 'bg-primary-container/15 text-primary'
                  : 'bg-secondary/10 text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                {isUp ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
              <span>
                {Math.abs(metricSummary.diff).toFixed(2)}원 ({isUp ? '+' : '-'}
                {Math.abs(metricSummary.pct).toFixed(1)}%)
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-data">
              최초 기록일
            </div>
          )}
        </div>

        {/* 최고/최저 요약 스트립 */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 bg-surface-container-low p-2.5 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[17px]">
                trending_up
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-data text-on-surface-variant truncate">
                {metricSummary.highLabel}
              </span>
              <span className="text-label-ui text-on-surface font-bold truncate">
                {metricSummary.highValue.toFixed(2)}원
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[17px]">
                trending_down
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-data text-on-surface-variant truncate">
                {metricSummary.lowLabel}
              </span>
              <span className="text-label-ui text-on-surface font-bold truncate">
                {metricSummary.lowValue.toFixed(2)}원
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 현재 실시간 전력수급 API 연동 섹션 */}
      <RealtimePowerSection />

      {/* 24시간 시간대별 (또는 최근 7일) 시세 추이 막대 차트 */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-title-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">
                bar_chart
              </span>
              {filterMode === 'week'
                ? '최근 7일 일별 평균 시세 추이'
                : '24시간 시간대별 시세 추이'}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {filterMode === 'week'
                ? '막대를 누르면 해당 날짜의 상세 데이터를 볼 수 있어요'
                : '주황색 바는 전력 수요가 높은 피크 구간'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary-container" />
              <span className="text-label-data text-on-surface-variant">피크</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-surface-container-highest" />
              <span className="text-label-data text-on-surface-variant">일반</span>
            </div>
          </div>
        </div>

        {/* 선택된 시간/날짜 툴팁 디스플레이 박스 */}
        {filterMode === 'week' && activeWeekPoint ? (
          <div className="bg-surface-container p-2.5 rounded-xl flex items-center justify-between transition-all gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-label-data px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-bold shrink-0">
                {activeWeekPoint.shortDate} ({activeWeekPoint.weekdayKo})
              </span>
              <span className="text-body-sm text-on-surface-variant truncate">
                최고 {activeWeekPoint.max.toFixed(1)} · 최저 {activeWeekPoint.min.toFixed(1)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-data-metric text-[20px] text-on-surface">
                {activeWeekPoint.weightedAvg.toFixed(2)}
              </span>{' '}
              <span className="text-label-data text-on-surface-variant">원/kWh</span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container p-2.5 rounded-xl flex items-center justify-between transition-all gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-label-data px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-bold shrink-0">
                {activeHourPoint.label}
              </span>
              <span className="text-body-sm text-on-surface-variant truncate">
                {activeHourPoint.tag}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-data-metric text-[20px] text-on-surface">
                {activeHourPoint.price.toFixed(2)}
              </span>{' '}
              <span className="text-label-data text-on-surface-variant">원/kWh</span>
            </div>
          </div>
        )}

        {/* 막대 차트 컨테이너 */}
        {filterMode === 'week' ? (
          <div className="w-full pt-3 pb-1">
            <div className="grid grid-cols-7 gap-2 h-36 items-end px-1">
              {weekRecords.map((rec) => {
                const weekMax = Math.max(...weekRecords.map((w) => w.weightedAvg), 1);
                const weekMin = Math.min(...weekRecords.map((w) => w.weightedAvg));
                const heightPct = Math.max(
                  16,
                  Math.round(18 + (rec.weightedAvg / weekMax) * 76)
                );
                const isHighest = rec.weightedAvg === weekMax;
                const isLowest = rec.weightedAvg === weekMin;
                const isSelected = rec.dateIso === activeWeekPoint?.dateIso;

                return (
                  <button
                    key={rec.dateIso}
                    type="button"
                    onClick={() => setSelectedWeekDateIso(rec.dateIso)}
                    onDoubleClick={() => {
                      onSelectDateIso(rec.dateIso);
                      onChangeFilterMode('today');
                    }}
                    className="h-full flex flex-col justify-end items-center group focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`text-label-data text-[10px] mb-1 ${
                        isHighest
                          ? 'text-primary font-extrabold'
                          : isLowest
                          ? 'text-secondary font-bold'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {Math.round(rec.weightedAvg)}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isHighest
                          ? 'bg-primary shadow-[0_0_12px_rgba(255,107,0,0.45)]'
                          : isLowest
                          ? 'bg-secondary/35'
                          : rec.weightedAvg >= weekMax * 0.94
                          ? 'bg-primary-container'
                          : 'bg-surface-container-highest group-hover:bg-primary-fixed'
                      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span
                      className={`text-label-data text-[10px] mt-1.5 ${
                        isSelected ? 'text-primary font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {rec.shortDate.slice(3)}({rec.weekdayKo})
                    </span>
                  </button>
                );
              })}
            </div>
            {activeWeekPoint && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSelectDateIso(activeWeekPoint.dateIso);
                    onChangeFilterMode('today');
                  }}
                  className="text-label-ui text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{activeWeekPoint.shortDate} 시간별 상세 보기</span>
                  <span className="material-symbols-outlined text-[15px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-2 pt-4 no-scrollbar">
            <div className="inline-flex items-end gap-1.5 min-w-[580px] h-36 px-1">
              {selectedDay.hours.map((h) => {
                const maxVal = Math.max(selectedDay.max, 1);
                const heightPct = Math.max(
                  8,
                  Math.round(14 + (h.price / maxVal) * 82)
                );
                const isSelected = h.hour === activeHourPoint.hour;

                let barColorClass =
                  'bg-surface-container-highest group-hover:bg-primary-fixed';
                if (h.isMax) {
                  barColorClass =
                    'bg-primary shadow-[0_0_12px_rgba(255,107,0,0.45)]';
                } else if (h.isPeak) {
                  barColorClass =
                    'bg-primary-container opacity-95 group-hover:opacity-100 shadow-[0_0_8px_rgba(255,107,0,0.28)]';
                } else if (h.isMin) {
                  barColorClass =
                    'bg-secondary/35 group-hover:bg-secondary-fixed-dim';
                }

                return (
                  <button
                    key={h.hour}
                    type="button"
                    onClick={() => setSelectedHour(h.hour)}
                    className="flex-1 h-full flex flex-col justify-end items-center group focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`text-label-data text-[10px] mb-1 ${
                        h.isMax
                          ? 'text-primary font-extrabold'
                          : h.isPeak
                          ? 'text-primary font-bold'
                          : h.isMin
                          ? 'text-secondary font-bold'
                          : 'text-on-surface-variant group-hover:text-primary'
                      }`}
                    >
                      {h.price < 10 && h.price > 0
                        ? h.price.toFixed(1)
                        : Math.round(h.price)}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${barColorClass} ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span
                      className={`text-label-data text-[11px] mt-1.5 ${
                        h.isMax || isSelected
                          ? 'text-primary font-black'
                          : h.isPeak
                          ? 'text-primary font-bold'
                          : h.isMin
                          ? 'text-on-surface font-bold'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {h.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 하단 AI 해설 카드 */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm relative overflow-hidden">
        <div className="w-full h-1 bg-gradient-to-r from-primary-container via-primary to-secondary-container rounded-full mb-3" />
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-title-sm text-on-surface truncate">
                  AI 시장 분석 브리핑
                </h3>
                <span className="text-label-data text-[10px] px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary font-bold shrink-0">
                  {briefing.source === 'gemini' ? 'Gemini 실시간 분석' : '실시간 분석'}
                </span>
              </div>
              <span className="text-label-data text-on-surface-variant">
                생성 {briefing.generatedAt}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRegenerateBriefing}
            disabled={isBriefingLoading}
            className={`flex items-center gap-1 text-primary hover:text-on-primary-container text-label-ui px-2.5 py-1.5 rounded-lg bg-surface-container-low transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              isBriefingLoading ? 'opacity-60' : ''
            }`}
          >
            <span
              className={`material-symbols-outlined text-[16px] transition-transform duration-500 ${
                isBriefingLoading ? 'animate-spin' : ''
              }`}
            >
              cached
            </span>
            <span>{isBriefingLoading ? '생성 중' : '다시 생성'}</span>
          </button>
        </div>

        {/* AI 요약 문단 */}
        <div className="p-3 bg-surface-container-low rounded-xl mb-3">
          <p className="text-body-md text-on-surface leading-relaxed">
            {highlightSummaryText(briefing.summary)}
          </p>
        </div>

        {/* 초보자를 위한 3줄 요약 카드 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-on-surface-variant text-label-ui mb-1">
            <span className="material-symbols-outlined text-primary text-[16px]">bolt</span>
            <span className="font-semibold text-on-surface">
              입문자를 위한 3줄 핵심 포인트
            </span>
          </div>

          {briefing.highlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-label-data text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-body-sm text-on-surface">
                <strong>{item.title}</strong> {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 데이터 출처 및 공공데이터 신뢰 캡션 영역 */}
      <section className="flex flex-col items-center justify-center text-center p-space-sm mb-4 gap-1.5">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-[17px] text-tertiary">
            verified
          </span>
          <span className="text-label-ui font-medium">
            전력거래소(KPX) EPSIS 공공데이터 연계
          </span>
        </div>
        <p className="text-label-data text-on-surface-variant/80 leading-relaxed">
          데이터 출처: 전력거래소 전력정보시스템 · CSV 실측 데이터 연계 ({records.length}일)
          <br />
          선택 기준일: {selectedDay.dateDisplay}
        </p>
      </section>
    </div>
  );
};
