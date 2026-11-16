import React, { useMemo, useState } from 'react';
import type { SmpDayRecord } from '../types/smp';
import { computeForecastAnalytics } from '../utils/smpAnalytics';

interface ForecastViewProps {
  records: SmpDayRecord[];
  onSelectDateAndOpenDashboard: (dateIso: string) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  records,
  onSelectDateAndOpenDashboard,
}) => {
  const analytics = useMemo(() => computeForecastAnalytics(records), [records]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const last = analytics.monthly[analytics.monthly.length - 1];
    return last?.monthKey ?? '';
  });

  const activeMonth = useMemo(() => {
    return (
      analytics.monthly.find((m) => m.monthKey === selectedMonthKey) ??
      analytics.monthly[analytics.monthly.length - 1]
    );
  }, [analytics.monthly, selectedMonthKey]);

  const maxMonthlyAvg = useMemo(
    () => Math.max(...analytics.monthly.map((m) => m.avg), 1),
    [analytics.monthly]
  );

  const maxHour24 = useMemo(
    () => Math.max(...analytics.hourlyAvg24, 1),
    [analytics.hourlyAvg24]
  );

  const latest = records[0];

  return (
    <div className="flex flex-col w-full gap-space-md pb-4">
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <span className="text-label-data text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            CSV 실측 데이터 기반 패턴 예측
          </span>
          <span className="text-label-data text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
            {records.length}일 학습
          </span>
        </div>

        {/* 익일 예상 SMP 밴드 카드 */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm relative overflow-hidden">
          <div className="w-full h-1 bg-gradient-to-r from-secondary-container via-primary-container to-primary rounded-full mb-3" />
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-label-ui">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {analytics.nextDayLabel} 예상 SMP
            </span>
            <span className="text-label-data text-on-surface-variant">원 / kWh</span>
          </div>

          <div className="flex items-baseline gap-3 my-1 flex-wrap">
            <h2 className="text-display-lg-mobile text-on-surface tracking-tight">
              {analytics.projectedNextDayAvg.toFixed(1)}
            </h2>
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-label-data font-bold">
              예상 밴드 {analytics.projectedNextDayRange[0].toFixed(1)} ~{' '}
              {analytics.projectedNextDayRange[1].toFixed(1)}원
            </span>
          </div>

          <p className="text-body-sm text-on-surface-variant mt-2 leading-snug">
            최근 7일 추세({latest ? `${latest.shortDate} 기준` : ''})와 동일 요일 최근 4주 평균을
            반영한 예상 범위예요.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 bg-surface-container-low p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[17px]">
                  work
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-data text-on-surface-variant">평일 평균</span>
                <span className="text-label-ui text-on-surface font-bold">
                  {analytics.weekdayAvg.toFixed(2)}원
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-[17px]">
                  weekend
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-data text-on-surface-variant">주말 평균</span>
                <span className="text-label-ui text-on-surface font-bold">
                  {analytics.weekendAvg.toFixed(2)}원
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 월별 평균 SMP 추이 (CSV 전체 기간) */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3">
        <div>
          <h3 className="text-title-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">
              calendar_view_month
            </span>
            2026년 월별 평균 SMP 추이
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            월 막대를 누르면 해당 월의 최고·최저 시세를 확인할 수 있어요
          </p>
        </div>

        {activeMonth && (
          <div className="bg-surface-container p-2.5 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-label-data px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-bold">
                2026년 {activeMonth.label}
              </span>
              <span className="text-body-sm text-on-surface-variant truncate">
                최고 {activeMonth.max.toFixed(1)} · 최저 {activeMonth.min.toFixed(1)}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-data-metric text-[20px] text-on-surface">
                {activeMonth.avg.toFixed(1)}
              </span>{' '}
              <span className="text-label-data text-on-surface-variant">원</span>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto no-scrollbar pt-3 pb-1">
          <div className="inline-flex items-end gap-2 min-w-[420px] w-full h-36 px-1">
            {analytics.monthly.map((m) => {
              const heightPct = Math.max(16, Math.round((m.avg / maxMonthlyAvg) * 90));
              const isMaxMonth = m.avg === maxMonthlyAvg;
              const isSelected = m.monthKey === activeMonth?.monthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
                >
                  <span
                    className={`text-label-data text-[10px] mb-1 ${
                      isMaxMonth ? 'text-primary font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    {Math.round(m.avg)}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isMaxMonth
                        ? 'bg-primary-container'
                        : 'bg-surface-container-highest group-hover:bg-primary-fixed'
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span
                    className={`text-label-data text-[11px] mt-1.5 ${
                      isSelected ? 'text-primary font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 최근 30일 시간대별 평균 패턴 */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3">
        <div>
          <h3 className="text-title-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              schedule
            </span>
            최근 30일 시간대별 평균 곡선
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            어느 시간대가 평균적으로 가장 비싸고 저렴한지 한눈에 확인해요
          </p>
        </div>

        <div className="w-full overflow-x-auto no-scrollbar pt-2 pb-1">
          <div className="inline-flex items-end gap-1 min-w-[540px] h-28 px-1">
            {analytics.hourlyAvg24.map((val, idx) => {
              const pct = Math.max(12, Math.round((val / maxHour24) * 92));
              const isPeak = val >= maxHour24 * 0.92;
              return (
                <div
                  key={idx}
                  className="flex-1 h-full flex flex-col justify-end items-center"
                >
                  <span className="text-label-data text-[9px] text-on-surface-variant mb-1">
                    {Math.round(val)}
                  </span>
                  <div
                    className={`w-full rounded-t-sm ${
                      isPeak ? 'bg-primary-container' : 'bg-secondary/30'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-label-data text-[10px] text-on-surface-variant mt-1">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 최근 14일 빠른 이동 리스트 */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-title-sm text-on-surface">최근 14일 시세 이력</h3>
          <span className="text-label-data text-on-surface-variant">탭하여 상세 보기</span>
        </div>
        <div className="space-y-1.5">
          {[...analytics.recent14].reverse().map((rec) => (
            <button
              key={rec.dateIso}
              type="button"
              onClick={() => onSelectDateAndOpenDashboard(rec.dateIso)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="text-label-data text-on-surface font-medium">
                {rec.dateDisplay}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-label-data text-[11px] text-on-surface-variant">
                  {rec.min.toFixed(1)}~{rec.max.toFixed(1)}
                </span>
                <span className="text-label-data font-bold text-primary">
                  {rec.weightedAvg.toFixed(2)}원
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
