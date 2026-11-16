import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { DatePickerModal } from './components/DatePickerModal';
import { ForecastView } from './components/ForecastView';
import { GuideView } from './components/GuideView';
import { TopHeader } from './components/TopHeader';
import type {
  FilterMode,
  NavTab,
  SmpBriefingData,
  SmpDayRecord,
} from './types/smp';
import {
  buildDeterministicBriefing,
  buildNotificationsFromCsv,
  parseSmpCsv,
} from './utils/smpAnalytics';

const DEFAULT_CSV_FILE = 'HOME________________SMP_21e352c4.csv';
const DEFAULT_CSV_URL = `/assets/aistudio/${DEFAULT_CSV_FILE}`;

export default function App() {
  const [records, setRecords] = useState<SmpDayRecord[]>([]);
  const [sourceFileName, setSourceFileName] = useState<string>(DEFAULT_CSV_FILE);
  const [isCustomCsv, setIsCustomCsv] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedDateIso, setSelectedDateIso] = useState<string>('');
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [activeTab, setActiveTab] = useState<NavTab>('smp-dashboard');

  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  const [briefing, setBriefing] = useState<SmpBriefingData | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(false);

  const loadDefaultData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let loadedRecords: SmpDayRecord[] = [];
      let loadedName = DEFAULT_CSV_FILE;

      const apiRes = await fetch('/api/smp').catch(() => null);
      if (apiRes && apiRes.ok) {
        const json = await apiRes.json();
        if (Array.isArray(json.records) && json.records.length > 0) {
          loadedRecords = json.records;
          loadedName = json.sourceFile || DEFAULT_CSV_FILE;
        }
      }

      if (loadedRecords.length === 0) {
        const csvRes = await fetch(DEFAULT_CSV_URL);
        if (!csvRes.ok) {
          throw new Error('CSV 파일을 불러올 수 없습니다.');
        }
        const text = await csvRes.text();
        loadedRecords = parseSmpCsv(text);
      }

      if (loadedRecords.length === 0) {
        throw new Error('파싱된 SMP 데이터가 없습니다.');
      }

      setRecords(loadedRecords);
      setSourceFileName(loadedName);
      setIsCustomCsv(false);
      setSelectedDateIso(loadedRecords[0].dateIso);
      setFilterMode('today');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultData();
  }, [loadDefaultData]);

  const selectedIndex = useMemo(() => {
    if (records.length === 0) return -1;
    const idx = records.findIndex((r) => r.dateIso === selectedDateIso);
    return idx >= 0 ? idx : 0;
  }, [records, selectedDateIso]);

  const selectedDay = selectedIndex >= 0 ? records[selectedIndex] : undefined;
  const prevDay = selectedIndex >= 0 ? records[selectedIndex + 1] : undefined;

  const weekRecords = useMemo(() => {
    if (selectedIndex < 0) return [];
    return records.slice(selectedIndex, selectedIndex + 7);
  }, [records, selectedIndex]);

  const notifications = useMemo(
    () => buildNotificationsFromCsv(records),
    [records]
  );

  // Immediately compute deterministic briefing when day or filter changes
  useEffect(() => {
    if (!selectedDay) return;
    setBriefing(
      buildDeterministicBriefing(selectedDay, prevDay, filterMode, weekRecords)
    );
  }, [selectedDay, prevDay, filterMode, weekRecords]);

  const handleRegenerateBriefing = useCallback(async () => {
    if (!selectedDay) return;
    setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateIso: selectedDay.dateIso,
          filterMode,
          dayData: selectedDay,
          prevDayData: prevDay,
          weekData: weekRecords,
        }),
      });
      if (res.ok) {
        const data: SmpBriefingData = await res.json();
        setBriefing(data);
      } else {
        setBriefing(
          buildDeterministicBriefing(selectedDay, prevDay, filterMode, weekRecords)
        );
      }
    } catch {
      setBriefing(
        buildDeterministicBriefing(selectedDay, prevDay, filterMode, weekRecords)
      );
    } finally {
      setIsBriefingLoading(false);
    }
  }, [selectedDay, prevDay, filterMode, weekRecords]);

  const handleChangeFilterMode = (mode: FilterMode) => {
    setFilterMode(mode);
    if (records.length === 0) return;
    if (mode === 'today') {
      setSelectedDateIso(records[0].dateIso);
    } else if (mode === 'yesterday') {
      setSelectedDateIso(records[1]?.dateIso ?? records[0].dateIso);
    }
  };

  const handleSelectDate = (dateIso: string) => {
    setSelectedDateIso(dateIso);
    if (filterMode === 'week') {
      return;
    }
    if (dateIso === records[0]?.dateIso) {
      setFilterMode('today');
    } else if (dateIso === records[1]?.dateIso) {
      setFilterMode('yesterday');
    } else {
      // Keep daily view without forcing 'today'/'yesterday' highlight mismatch
      setFilterMode('today');
    }
  };

  const handleSelectDateAndOpenDashboard = (dateIso: string) => {
    setSelectedDateIso(dateIso);
    setFilterMode(dateIso === records[1]?.dateIso ? 'yesterday' : 'today');
    setActiveTab('smp-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadCsv = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseSmpCsv(text);
      if (parsed.length === 0) {
        setErrorMsg('CSV 형식을 인식할 수 없습니다. KPX SMP 일자별 시간대 CSV인지 확인해주세요.');
        return;
      }
      setErrorMsg(null);
      setRecords(parsed);
      setSourceFileName(file.name);
      setIsCustomCsv(true);
      setSelectedDateIso(parsed[0].dateIso);
      setFilterMode('today');
    } catch {
      setErrorMsg('업로드한 CSV 파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  const latestDateDisplay = records[0]?.dateRaw ?? '-';
  const oldestDateDisplay = records[records.length - 1]?.dateRaw ?? '-';

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen">
      <div className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col relative bg-surface">
        <TopHeader
          notifications={notifications}
          showNotifications={showNotifications}
          onToggleNotifications={() => {
            setShowProfile(false);
            setShowNotifications((v) => !v);
          }}
          showProfile={showProfile}
          onToggleProfile={() => {
            setShowNotifications(false);
            setShowProfile((v) => !v);
          }}
          onSelectNotificationDate={handleSelectDateAndOpenDashboard}
          recordsCount={records.length}
          latestDateDisplay={latestDateDisplay}
          oldestDateDisplay={oldestDateDisplay}
          sourceFileName={sourceFileName}
          onUploadCsv={handleUploadCsv}
          onResetCsv={loadDefaultData}
          isCustomCsv={isCustomCsv}
        />

        <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 px-margin bg-surface">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-primary-fixed border-t-primary-container animate-spin" />
              <p className="text-body-sm text-on-surface-variant">
                CSV 전력 시세 데이터를 불러오는 중입니다...
              </p>
            </div>
          ) : errorMsg || !selectedDay ? (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center my-8">
              <span className="material-symbols-outlined text-error text-[32px] mb-2">
                error_outline
              </span>
              <p className="text-title-sm text-on-surface mb-1">
                데이터를 표시할 수 없습니다
              </p>
              <p className="text-body-sm text-on-surface-variant mb-4">
                {errorMsg ?? 'CSV 데이터가 비어 있습니다.'}
              </p>
              <button
                type="button"
                onClick={loadDefaultData}
                className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-label-ui cursor-pointer"
              >
                다시 불러오기
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'smp-dashboard' && briefing && (
                <DashboardView
                  records={records}
                  selectedDay={selectedDay}
                  prevDay={prevDay}
                  filterMode={filterMode}
                  onChangeFilterMode={handleChangeFilterMode}
                  onOpenDatePicker={() => setIsDatePickerOpen(true)}
                  onSelectDateIso={handleSelectDate}
                  briefing={briefing}
                  isBriefingLoading={isBriefingLoading}
                  onRegenerateBriefing={handleRegenerateBriefing}
                />
              )}

              {activeTab === 'smp-forecast' && (
                <ForecastView
                  records={records}
                  onSelectDateAndOpenDashboard={handleSelectDateAndOpenDashboard}
                />
              )}

              {activeTab === 'beginner-guide' && (
                <GuideView
                  selectedDay={selectedDay}
                  records={records}
                  onSelectDateAndOpenDashboard={handleSelectDateAndOpenDashboard}
                />
              )}
            </>
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <DatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          records={records}
          selectedDateIso={selectedDateIso}
          onSelectDate={handleSelectDate}
        />
      </div>
    </div>
  );
}
