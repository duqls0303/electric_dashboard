import React, { useMemo, useState } from 'react';
import type { SmpDayRecord } from '../types/smp';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SmpDayRecord[];
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  records,
  selectedDateIso,
  onSelectDate,
}) => {
  const months = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.dateIso.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const [activeMonth, setActiveMonth] = useState<string>(() =>
    selectedDateIso.slice(0, 7)
  );

  React.useEffect(() => {
    if (isOpen && selectedDateIso) {
      setActiveMonth(selectedDateIso.slice(0, 7));
    }
  }, [isOpen, selectedDateIso]);

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => r.dateIso.startsWith(activeMonth));

  return (
    <div
      className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              calendar_month
            </span>
            <h2 className="text-title-sm text-on-surface">조회 날짜 선택</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-label-ui text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded-lg bg-surface-container-low cursor-pointer"
          >
            닫기
          </button>
        </div>

        {/* Month pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          {months.map((m) => {
            const isSelected = m === activeMonth;
            const [y, mm] = m.split('-');
            return (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMonth(m)}
                className={`px-3 py-1.5 rounded-full text-label-ui whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-on-surface text-surface-container-lowest'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {y.slice(2)}.{Number(mm)}월
              </button>
            );
          })}
        </div>

        {/* Date rows */}
        <div className="overflow-y-auto flex-1 space-y-1.5 pr-0.5">
          {filteredRecords.map((rec) => {
            const isSelected = rec.dateIso === selectedDateIso;
            return (
              <button
                key={rec.dateIso}
                type="button"
                onClick={() => {
                  onSelectDate(rec.dateIso);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary-fixed/60 ring-1 ring-primary-container'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-label-data font-bold ${
                      isSelected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {rec.dateDisplay}
                  </span>
                  {rec.isWeekend && (
                    <span className="text-[11px] font-medium text-secondary">
                      주말
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className="text-label-data text-on-surface-variant text-[11px]">
                    {rec.min.toFixed(1)}~{rec.max.toFixed(1)}
                  </div>
                  <div
                    className={`text-label-data font-bold ${
                      isSelected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {rec.weightedAvg.toFixed(2)}원
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
