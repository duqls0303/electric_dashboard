import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { RealtimePowerApiResult } from '../types/smp';

type RegionTab = '육지' | '제주';

function getTodayKstIso(): string {
  const nowKst = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  );
  const yyyy = nowKst.getFullYear();
  const mm = String(nowKst.getMonth() + 1).padStart(2, '0');
  const dd = String(nowKst.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const RealtimePowerSection: React.FC = () => {
  const [region, setRegion] = useState<RegionTab>('육지');
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() =>
    getTodayKstIso()
  );
  const [data, setData] = useState<RealtimePowerApiResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBarHour, setSelectedBarHour] = useState<number | null>(null);

  const fetchRealtimePower = useCallback(async (dateIso: string) => {
    setLoading(true);
    const yyyymmdd = dateIso.replace(/-/g, '');
    try {
      const res = await fetch(
        `/api/realtime-power?date=${encodeURIComponent(yyyymmdd)}`
      );
      const json: RealtimePowerApiResult = await res.json();
      setData(json);
      setSelectedBarHour(null);
    } catch (err) {
      setData({
        ok: false,
        endpoint:
          'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand',
        queryDate: yyyymmdd,
        fetchedAt: new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        currentHour: new Date().getHours() + 1,
        currentItem: null,
        items: [],
        error: '서버 연결에 실패했습니다.',
        errorDetail:
          err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealtimePower(selectedDateIso);
  }, [fetchRealtimePower, selectedDateIso]);

  const regionStats = useMemo(() => {
    if (!data || !data.ok || data.items.length === 0) return null;

    const filtered = data.items.filter((it) =>
      region === '육지'
        ? it.areaName.includes('육지') || it.areaName === '1'
        : it.areaName.includes('제주') || it.areaName === '2'
    );
    const sourceItems = filtered.length > 0 ? filtered : data.items;

    const hourlyPoints = Array.from({ length: 24 }, (_, idx) => {
      const hour = idx + 1;
      const matched = sourceItems.find((it) => it.hour === hour);
      const demand =
        region === '육지'
          ? matched?.mainlandDemand ?? matched?.forecastDemand ?? 0
          : matched?.jejuDemand ?? matched?.forecastDemand ?? 0;
      const smp = matched?.smp ?? 0;
      const totalDemand = matched?.forecastDemand ?? demand;
      return {
        hour,
        demand,
        smp,
        totalDemand,
        hasData: Boolean(matched),
      };
    });

    const validPoints = hourlyPoints.filter((p) => p.hasData);
    if (validPoints.length === 0) return null;

    const maxPoint = validPoints.reduce((a, b) =>
      b.demand > a.demand ? b : a
    );
    const minPoint = validPoints.reduce((a, b) =>
      b.demand < a.demand ? b : a
    );

    const avgDemand = Math.round(
      validPoints.reduce((s, p) => s + p.demand, 0) / validPoints.length
    );
    const avgSmp =
      validPoints.reduce((s, p) => s + p.smp, 0) / validPoints.length;

    const nationalMaxDemand = Math.max(
      ...data.items.map((it) => it.forecastDemand ?? 0),
      0
    );

    return {
      hourlyPoints,
      maxPoint,
      minPoint,
      avgDemand,
      avgSmp,
      nationalMaxDemand,
    };
  }, [data, region]);

  const activeBarPoint = useMemo(() => {
    if (!regionStats || selectedBarHour === null) return null;
    return regionStats.hourlyPoints.find((p) => p.hour === selectedBarHour) ?? null;
  }, [regionStats, selectedBarHour]);

  return (
    <section
      aria-label="실시간 전력 수급"
      className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3"
    >
      {/* 상단 타이틀 + KPX API 배지 + 새로고침 버튼 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-headline-md text-[18px] leading-[24px] text-on-surface font-bold">
              실시간 전력 수급
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed/50 text-primary text-label-data text-[10px] font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              KPX API
            </span>
          </div>
          <p className="text-body-sm text-[12px] text-on-surface-variant mt-0.5 truncate">
            공공데이터포털 계통한계가격 및 수요예측 연동 현황
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRealtimePower(selectedDateIso)}
          disabled={loading}
          className={`flex items-center gap-1 text-on-surface hover:bg-surface-container text-label-ui px-3 py-1.5 rounded-xl bg-surface-container-low transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
            loading ? 'opacity-60' : ''
          }`}
        >
          <span
            className={`material-symbols-outlined text-[16px] text-on-surface-variant ${
              loading ? 'animate-spin' : ''
            }`}
          >
            refresh
          </span>
          <span>{loading ? '조회 중' : '새로고침'}</span>
        </button>
      </div>

      {/* 지역 토글 (육지 / 제주) & 날짜 선택 컨트롤 바 */}
      <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="지역 선택"
        >
          {(['육지', '제주'] as RegionTab[]).map((tab) => {
            const active = region === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setRegion(tab);
                  setSelectedBarHour(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-label-ui transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <label className="relative flex items-center bg-surface-container-lowest rounded-lg px-2.5 py-1 border border-surface-container shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer">
          <input
            type="date"
            value={selectedDateIso}
            onChange={(e) => {
              if (e.target.value) setSelectedDateIso(e.target.value);
            }}
            aria-label="실시간 전력수급 조회 날짜"
            className="text-label-data text-[12px] font-bold text-on-surface bg-transparent focus:outline-none cursor-pointer"
          />
        </label>
      </div>

      {/* 상태 분기: 로딩 / 오류 / 정상 데이터 */}
      {loading && !data ? (
        <div className="p-4 rounded-xl bg-surface-container-low flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-primary-fixed border-t-primary-container animate-spin shrink-0" />
          <span className="text-body-sm text-on-surface-variant">
            전력거래소 실시간 전력수급 API를 조회하는 중입니다...
          </span>
        </div>
      ) : data && !data.ok ? (
        <div className="p-3.5 rounded-xl bg-error-container/60 border border-error/20 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-on-error-container">
              <span className="material-symbols-outlined text-[18px] shrink-0">
                error
              </span>
              <span className="text-label-ui font-bold">
                {data.error || '실시간 전력수급 API 요청 실패'}
              </span>
            </div>
            {data.statusCode && (
              <span className="text-label-data text-[11px] px-2 py-0.5 rounded bg-surface-container-lowest text-error font-bold shrink-0">
                HTTP {data.statusCode}
              </span>
            )}
          </div>

          {data.errorDetail && (
            <p className="text-body-sm text-on-error-container/90 break-words leading-snug">
              {data.errorDetail}
            </p>
          )}

          <div className="text-label-data text-[11px] text-on-error-container/75 pt-1 flex items-center justify-between gap-2 flex-wrap">
            <span>기준일: {data.queryDate}</span>
            <span>확인시각: {data.fetchedAt}</span>
          </div>
        </div>
      ) : regionStats && data ? (
        <>
          {/* 3열 요약 지표 카드 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <span className="text-label-ui text-[11px] text-on-surface-variant truncate">
                최대 예측수요
              </span>
              <span className="text-data-metric text-[19px] leading-[24px] text-on-surface font-bold mt-1 truncate">
                {regionStats.maxPoint.demand.toLocaleString()}
              </span>
              <span className="text-label-data text-[11px] text-on-surface-variant mt-0.5 truncate">
                MW ({String(regionStats.maxPoint.hour).padStart(2, '0')}시)
              </span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <span className="text-label-ui text-[11px] text-on-surface-variant truncate">
                평균 예측수요
              </span>
              <span className="text-data-metric text-[19px] leading-[24px] text-on-surface font-bold mt-1 truncate">
                {regionStats.avgDemand.toLocaleString()}
              </span>
              <span className="text-label-data text-[11px] text-on-surface-variant mt-0.5 truncate">
                MW
              </span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <span className="text-label-ui text-[11px] text-on-surface-variant truncate">
                예측 평균 SMP
              </span>
              <span className="text-data-metric text-[19px] leading-[24px] text-primary font-bold mt-1 truncate">
                {regionStats.avgSmp.toFixed(2)}
              </span>
              <span className="text-label-data text-[11px] text-on-surface-variant mt-0.5 truncate">
                원/kWh
              </span>
            </div>
          </div>

          {/* 시간별 예측 전력수요 24시간 막대 차트 */}
          <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-ui text-[12px] font-bold text-on-surface truncate">
                시간별 예측 전력수요 ({region} · MW)
              </span>
              <span className="text-label-data text-[11px] text-on-surface-variant shrink-0">
                최소 {regionStats.minPoint.demand.toLocaleString()} MW
              </span>
            </div>

            {activeBarPoint && (
              <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded-lg flex items-center justify-between text-label-data text-[11px]">
                <span className="font-bold text-primary">
                  {String(activeBarPoint.hour).padStart(2, '0')}시 ({region})
                </span>
                <span className="text-on-surface font-medium">
                  수요 {activeBarPoint.demand.toLocaleString()} MW · SMP{' '}
                  {activeBarPoint.smp.toFixed(2)}원
                </span>
              </div>
            )}

            <div className="w-full pt-5">
              <div className="flex items-end gap-[3px] w-full h-28">
                {regionStats.hourlyPoints.map((pt) => {
                  const maxD = Math.max(regionStats.maxPoint.demand, 1);
                  const minD = regionStats.minPoint.demand;
                  const spread = Math.max(maxD - minD, 1);
                  const ratio = pt.hasData ? (pt.demand - minD) / spread : 0;
                  const heightPct = pt.hasData
                    ? Math.round(24 + ratio * 76)
                    : 10;

                  const isMax = pt.hour === regionStats.maxPoint.hour;
                  const isSelected = pt.hour === selectedBarHour;

                  return (
                    <button
                      key={pt.hour}
                      type="button"
                      onClick={() =>
                        setSelectedBarHour((prev) =>
                          prev === pt.hour ? null : pt.hour
                        )
                      }
                      title={`${String(pt.hour).padStart(2, '0')}시: ${pt.demand.toLocaleString()} MW / ${pt.smp.toFixed(2)}원`}
                      className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer focus:outline-none"
                    >
                      <div
                        className={`w-full relative rounded-t-[3px] transition-all shrink-0 ${
                          isMax
                            ? 'bg-primary-container'
                            : 'bg-surface-container-highest group-hover:bg-primary-fixed-dim'
                        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {isMax && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-label-data text-[8px] font-bold text-primary-container leading-none tracking-tighter whitespace-nowrap pointer-events-none">
                            MAX
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* X축 시간 눈금 (01시, 06시, 12시, 18시, 24시) */}
              <div className="flex items-center justify-between text-label-data text-[10px] text-on-surface-variant mt-1.5 px-0.5">
                <span>01시</span>
                <span>06시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
            </div>
          </div>

          {/* 하단 전국 계통 최대 & 기준일 */}
          <div className="flex items-center justify-between text-label-data text-[11px] text-on-surface-variant px-0.5">
            <span>
              전국 계통 최대: {regionStats.nationalMaxDemand.toLocaleString()} MW
            </span>
            <span>기준일: {data.queryDate}</span>
          </div>
        </>
      ) : null}
    </section>
  );
};
