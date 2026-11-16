import React, { useMemo, useState } from 'react';
import type { SmpDayRecord } from '../types/smp';

interface GuideViewProps {
  selectedDay: SmpDayRecord;
  records: SmpDayRecord[];
  onSelectDateAndOpenDashboard: (dateIso: string) => void;
}

export const GuideView: React.FC<GuideViewProps> = ({
  selectedDay,
  records,
  onSelectDateAndOpenDashboard,
}) => {
  const [kwhAmount, setKwhAmount] = useState<number>(300);

  const zeroDayExamples = useMemo(
    () => records.filter((r) => r.min <= 10).slice(0, 3),
    [records]
  );

  const estimatedAvgRevenue = Math.round(kwhAmount * selectedDay.weightedAvg);
  const estimatedPeakRevenue = Math.round(kwhAmount * selectedDay.max);

  return (
    <div className="flex flex-col w-full gap-space-md pb-4">
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <h2 className="text-title-sm text-on-surface">전력시장 SMP 입문 가이드</h2>
            <p className="text-body-sm text-on-surface-variant">
              어려운 전기 도매 시세를 쉽게 이해해요
            </p>
          </div>
        </div>

        <div className="space-y-2.5 mt-3">
          <div className="p-3 rounded-xl bg-surface-container-low">
            <h3 className="text-label-ui text-primary font-bold mb-1">
              1. 계통한계가격(SMP)은 어떻게 정해지나요?
            </h3>
            <p className="text-body-sm text-on-surface leading-relaxed">
              매 시간 전력 수요를 맞추기 위해 발전 단가가 싼 발전기(원자력·석탄 등)부터 차례로
              가동한 뒤, <strong>가장 마지막에 투입된 발전기(주로 LNG)의 단가</strong>가 그 시간의
              SMP로 결정됩니다.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low">
            <h3 className="text-label-ui text-on-surface font-bold mb-1">
              2. 왜 오전(09~11시)과 저녁(17~20시)에 비싼가요?
            </h3>
            <p className="text-body-sm text-on-surface leading-relaxed">
              출근·공장 가동이 몰리는 오전과, 퇴근 후 가정 전력 사용이 늘고 태양광 발전이
              사라지는 저녁 시간대에는 발전 단가가 높은 LNG 발전기가 가동되어 주황색 피크
              구간이 형성됩니다.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low">
            <h3 className="text-label-ui text-tertiary font-bold mb-1">
              3. 왜 어떤 날 낮에는 SMP가 0원대까지 떨어지나요?
            </h3>
            <p className="text-body-sm text-on-surface leading-relaxed">
              봄·가을 주말처럼 전기 사용량은 적은데 햇빛이 강해 태양광 발전이 넘칠 때는
              출력제어 구간이 발생하며 시세가 급락합니다. 실제 연결된 CSV에서도 확인할 수
              있어요.
            </p>
            {zeroDayExamples.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {zeroDayExamples.map((ex) => (
                  <button
                    key={ex.dateIso}
                    type="button"
                    onClick={() => onSelectDateAndOpenDashboard(ex.dateIso)}
                    className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-label-data text-[11px] text-tertiary font-bold hover:bg-tertiary/10 transition-colors cursor-pointer"
                  >
                    {ex.shortDate} ({String(ex.minHour).padStart(2, '0')}시 {ex.min.toFixed(1)}원) →
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 실측 CSV 기준 간단 시뮬레이터 */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-title-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">
              calculate
            </span>
            내 발전량·전력량 시세 계산기
          </h3>
          <span className="text-label-data text-primary font-bold">
            {selectedDay.shortDate} 기준
          </span>
        </div>

        <p className="text-body-sm text-on-surface-variant mb-3">
          선택한 날짜({selectedDay.dateDisplay})의 평균 SMP(
          {selectedDay.weightedAvg.toFixed(2)}원)를 기준으로 도매 전력 가치를 계산해 보세요.
        </p>

        <div className="bg-surface-container-low p-3 rounded-xl mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-ui text-on-surface-variant">전력량 (kWh)</span>
            <span className="text-data-metric text-[20px] text-primary">
              {kwhAmount.toLocaleString()} kWh
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={kwhAmount}
            onChange={(e) => setKwhAmount(Number(e.target.value))}
            aria-label="전력량 kWh 슬라이더"
            className="w-full accent-[#ff6b00] cursor-pointer"
          />
          <div className="flex justify-between text-label-data text-[11px] text-on-surface-variant mt-1">
            <span>50 kWh</span>
            <span>소형 태양광 1일 ~ 가정 월간</span>
            <span>2,000 kWh</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-primary-fixed/40">
            <span className="text-label-data text-on-primary-container block">
              평균가 적용 시
            </span>
            <span className="text-headline-md text-primary font-bold mt-0.5 block">
              {estimatedAvgRevenue.toLocaleString()}원
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container">
            <span className="text-label-data text-on-surface-variant block">
              최고 피크가 적용 시
            </span>
            <span className="text-headline-md text-on-surface font-bold mt-0.5 block">
              {estimatedPeakRevenue.toLocaleString()}원
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
