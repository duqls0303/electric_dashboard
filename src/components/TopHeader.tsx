import React from 'react';
import type { SmpDayRecord, SmpNotificationItem } from '../types/smp';

interface TopHeaderProps {
  notifications: SmpNotificationItem[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  showProfile: boolean;
  onToggleProfile: () => void;
  onSelectNotificationDate: (dateIso: string) => void;
  recordsCount: number;
  latestDateDisplay: string;
  oldestDateDisplay: string;
  sourceFileName: string;
  onUploadCsv: (file: File) => void;
  onResetCsv: () => void;
  isCustomCsv: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  notifications,
  showNotifications,
  onToggleNotifications,
  showProfile,
  onToggleProfile,
  onSelectNotificationDate,
  recordsCount,
  latestDateDisplay,
  oldestDateDisplay,
  sourceFileName,
  onUploadCsv,
  onResetCsv,
  isCustomCsv,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <header className="fixed top-0 w-full max-w-[480px] z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-14 px-margin flex items-center justify-between">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-ui text-on-surface-variant leading-none truncate">
                오늘의 전기 시세
              </span>
              <h1 className="text-title-sm text-on-surface tracking-tight leading-tight truncate">
                Smp Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-space-xs shrink-0">
            <button
              type="button"
              aria-label="시세 변동 알림"
              onClick={onToggleNotifications}
              className={`relative w-11 h-11 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                showNotifications
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {notifications.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary-container ring-2 ring-surface" />
              )}
            </button>

            <button
              type="button"
              aria-label="데이터 출처 및 CSV 설정"
              onClick={onToggleProfile}
              className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] ring-2 shrink-0 transition-colors ${
                  showProfile
                    ? 'bg-primary-container text-on-primary ring-primary'
                    : 'bg-primary/10 text-primary ring-primary-fixed'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Popover */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40 bg-on-surface/20 backdrop-blur-[1px] flex justify-center"
          onClick={onToggleNotifications}
        >
          <div
            className="w-full max-w-[480px] px-margin pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_20px_30px_-10px_rgba(15,23,42,0.18)] border border-surface-container">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    notifications_active
                  </span>
                  <h2 className="text-title-sm text-on-surface">CSV 주요 시세 알림</h2>
                </div>
                <button
                  type="button"
                  onClick={onToggleNotifications}
                  className="text-label-ui text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-lg"
                >
                  닫기
                </button>
              </div>

              <div className="space-y-2">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectNotificationDate(item.dateIso);
                      onToggleNotifications();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'spike'
                          ? 'bg-primary/10 text-primary'
                          : item.type === 'zero'
                          ? 'bg-tertiary/10 text-tertiary'
                          : 'bg-secondary/10 text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {item.type === 'spike'
                          ? 'trending_up'
                          : item.type === 'zero'
                          ? 'wb_sunny'
                          : 'trending_down'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-ui text-on-surface font-bold truncate">
                        {item.title}
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 self-center">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile / CSV Source Popover */}
      {showProfile && (
        <div
          className="fixed inset-0 z-40 bg-on-surface/20 backdrop-blur-[1px] flex justify-center"
          onClick={onToggleProfile}
        >
          <div
            className="w-full max-w-[480px] px-margin pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_20px_30px_-10px_rgba(15,23,42,0.18)] border border-surface-container">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    dataset
                  </span>
                  <h2 className="text-title-sm text-on-surface">연결된 CSV 데이터 정보</h2>
                </div>
                <button
                  type="button"
                  onClick={onToggleProfile}
                  className="text-label-ui text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-lg"
                >
                  닫기
                </button>
              </div>

              <div className="bg-surface-container-low rounded-xl p-3 space-y-2 text-body-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant">파일명</span>
                  <span className="text-label-data text-on-surface font-bold truncate max-w-[230px]">
                    {sourceFileName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant">수록 기간</span>
                  <span className="text-label-data text-on-surface">
                    {oldestDateDisplay} ~ {latestDateDisplay}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant">총 데이터 일수</span>
                  <span className="text-label-data text-primary font-bold">
                    {recordsCount.toLocaleString()}일 (24시간 × {recordsCount}행)
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadCsv(file);
                      e.target.value = '';
                      onToggleProfile();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-10 rounded-xl bg-primary-container text-on-primary text-label-ui flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">upload_file</span>
                  <span>다른 CSV 불러오기</span>
                </button>
                {isCustomCsv && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetCsv();
                      onToggleProfile();
                    }}
                    className="h-10 px-3 rounded-xl bg-surface-container text-on-surface text-label-ui hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    기본 CSV 복원
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
