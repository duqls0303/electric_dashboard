import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { parseSmpCsv, buildDeterministicBriefing } from './src/utils/smpAnalytics';
import type { FilterMode, SmpDayRecord } from './src/types/smp';

dotenv.config();

const PORT = 3000;
const CSV_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/HOME________________SMP_21e352c4.csv'
);

let cachedRecords: SmpDayRecord[] | null = null;

function loadCsvRecords(): SmpDayRecord[] {
  if (cachedRecords) return cachedRecords;
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  cachedRecords = parseSmpCsv(csvContent);
  return cachedRecords;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/smp', (_req, res) => {
    try {
      const records = loadCsvRecords();
      res.json({
        sourceFile: 'HOME________________SMP_21e352c4.csv',
        count: records.length,
        latestDate: records[0]?.dateIso ?? null,
        oldestDate: records[records.length - 1]?.dateIso ?? null,
        records,
      });
    } catch (err) {
      console.error('Failed to load SMP CSV:', err);
      res.status(500).json({ error: 'CSV 데이터를 불러오는 데 실패했습니다.' });
    }
  });

  app.get('/api/realtime-power', async (req, res) => {
    dotenv.config({ override: true });

    const nowKst = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    );
    const yyyy = nowKst.getFullYear();
    const mm = String(nowKst.getMonth() + 1).padStart(2, '0');
    const dd = String(nowKst.getDate()).padStart(2, '0');
    const currentHour = nowKst.getHours() + 1; // 1..24 거래시간 기준
    const fetchedAt = `${String(nowKst.getHours()).padStart(2, '0')}:${String(
      nowKst.getMinutes()
    ).padStart(2, '0')}:${String(nowKst.getSeconds()).padStart(2, '0')}`;

    const requestedDate =
      typeof req.query.date === 'string' && /^\d{8}$/.test(req.query.date)
        ? req.query.date
        : `${yyyy}${mm}${dd}`;

    const endpoint =
      'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand';

    const rawKey = (
      process.env.KPX_API_KEY ||
      process.env.DATA_GO_KR_API_KEY ||
      ''
    ).trim();

    if (!rawKey || rawKey === 'YOUR_KPX_DATA_GO_KR_API_KEY') {
      res.status(400).json({
        ok: false,
        endpoint,
        queryDate: requestedDate,
        fetchedAt,
        currentHour,
        currentItem: null,
        items: [],
        statusCode: 400,
        error: 'API 인증키가 설정되지 않았습니다.',
        errorDetail:
          '프로젝트 루트의 .env 파일에 KPX_API_KEY(공공데이터포털 인증키)를 입력한 뒤 다시 시도해주세요.',
      });
      return;
    }

    const encodedKey = rawKey.includes('%')
      ? rawKey
      : encodeURIComponent(rawKey);
    const requestUrl = `${endpoint}?serviceKey=${encodedKey}&pageNo=1&numOfRows=48&dataType=JSON&date=${requestedDate}`;

    try {
      const apiRes = await fetch(requestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, text/xml, */*' },
        signal: AbortSignal.timeout(10000),
      });

      const rawText = await apiRes.text();

      if (!apiRes.ok) {
        res.status(apiRes.status).json({
          ok: false,
          endpoint,
          queryDate: requestedDate,
          fetchedAt,
          currentHour,
          currentItem: null,
          items: [],
          statusCode: apiRes.status,
          error: `공공데이터 API HTTP ${apiRes.status} 오류`,
          errorDetail: rawText.slice(0, 240) || apiRes.statusText,
        });
        return;
      }

      // Detect XML error payload from data.go.kr gateway
      if (rawText.trim().startsWith('<')) {
        const authMsg =
          rawText.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/)?.[1] ?? '';
        const errMsg = rawText.match(/<errMsg>([^<]+)<\/errMsg>/)?.[1] ?? '';
        const reasonCode =
          rawText.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/)?.[1] ??
          '';
        const resultMsg =
          rawText.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? '';

        res.status(502).json({
          ok: false,
          endpoint,
          queryDate: requestedDate,
          fetchedAt,
          currentHour,
          currentItem: null,
          items: [],
          statusCode: 502,
          error: errMsg || resultMsg || '공공데이터포털 인증/응답 오류',
          errorDetail:
            [authMsg, reasonCode ? `코드 ${reasonCode}` : '']
              .filter(Boolean)
              .join(' · ') || rawText.slice(0, 240),
        });
        return;
      }

      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          ok: false,
          endpoint,
          queryDate: requestedDate,
          fetchedAt,
          currentHour,
          currentItem: null,
          items: [],
          statusCode: 502,
          error: 'API 응답 JSON 파싱 실패',
          errorDetail: rawText.slice(0, 240),
        });
        return;
      }

      const header = parsed?.response?.header ?? parsed?.header;
      const body = parsed?.response?.body ?? parsed?.body;
      const resultCode = String(header?.resultCode ?? '');
      const resultMsg = String(header?.resultMsg ?? '');

      if (resultCode && resultCode !== '00' && resultCode !== '0') {
        res.status(502).json({
          ok: false,
          endpoint,
          queryDate: requestedDate,
          fetchedAt,
          currentHour,
          currentItem: null,
          items: [],
          statusCode: 502,
          error: `KPX API 오류 (코드 ${resultCode})`,
          errorDetail: resultMsg || '응답 헤더에 오류가 반환되었습니다.',
        });
        return;
      }

      const rawItemsContainer = body?.items?.item ?? body?.items ?? [];
      const rawItemsList: Record<string, unknown>[] = Array.isArray(
        rawItemsContainer
      )
        ? rawItemsContainer
        : rawItemsContainer && typeof rawItemsContainer === 'object'
        ? [rawItemsContainer]
        : [];

      const items = rawItemsList.map((item) => {
        const hourNum = Number(
          item.hour ?? item.tradeHour ?? item.time ?? item.hh ?? 0
        );
        const smpRaw =
          item.smp ??
          item.landSmp ??
          item.mlndSmp ??
          item.jejuSmp ??
          item.jlndSmp;
        const demandRaw =
          item.slfd ??
          item.mlfd ??
          item.forecastDemand ??
          item.forecastLoad ??
          item.landForecastLoad ??
          item.fcstLoad ??
          item.demand ??
          item.currPwrTot;
        const mainlandDemandRaw = item.mlfd ?? item.landForecastLoad;
        const jejuDemandRaw = item.jlfd ?? item.jejuForecastLoad;

        const smpNum =
          smpRaw !== undefined && smpRaw !== null && smpRaw !== ''
            ? Number(smpRaw)
            : null;
        const demandNum =
          demandRaw !== undefined && demandRaw !== null && demandRaw !== ''
            ? Number(demandRaw)
            : null;
        const mlfdNum =
          mainlandDemandRaw !== undefined &&
          mainlandDemandRaw !== null &&
          mainlandDemandRaw !== ''
            ? Number(mainlandDemandRaw)
            : null;
        const jlfdNum =
          jejuDemandRaw !== undefined &&
          jejuDemandRaw !== null &&
          jejuDemandRaw !== ''
            ? Number(jejuDemandRaw)
            : null;

        return {
          date: String(
            item.date ?? item.tradeDay ?? item.baseDate ?? requestedDate
          ),
          hour: Number.isFinite(hourNum) ? hourNum : 0,
          areaName: String(item.areaName ?? item.areaCd ?? '육지'),
          smp: smpNum !== null && Number.isFinite(smpNum) ? smpNum : null,
          forecastDemand:
            demandNum !== null && Number.isFinite(demandNum) ? demandNum : null,
          mainlandDemand:
            mlfdNum !== null && Number.isFinite(mlfdNum) ? mlfdNum : null,
          jejuDemand:
            jlfdNum !== null && Number.isFinite(jlfdNum) ? jlfdNum : null,
          raw: item,
        };
      });

      if (items.length === 0) {
        res.status(404).json({
          ok: false,
          endpoint,
          queryDate: requestedDate,
          fetchedAt,
          currentHour,
          currentItem: null,
          items: [],
          statusCode: 404,
          error: '조회된 실시간 전력수급 데이터가 없습니다.',
          errorDetail: `${requestedDate} 기준 API 응답 items가 비어 있습니다.`,
        });
        return;
      }

      const landItems = items.filter(
        (it) => it.areaName.includes('육지') || it.areaName === '1'
      );
      const candidateItems = landItems.length > 0 ? landItems : items;
      const currentItem =
        candidateItems.find((it) => it.hour === currentHour) ??
        candidateItems[candidateItems.length - 1] ??
        items[0];

      res.json({
        ok: true,
        endpoint,
        queryDate: requestedDate,
        fetchedAt,
        currentHour,
        currentItem,
        items,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 네트워크 오류';
      res.status(502).json({
        ok: false,
        endpoint,
        queryDate: requestedDate,
        fetchedAt,
        currentHour,
        currentItem: null,
        items: [],
        statusCode: 502,
        error: '전력거래소 API 요청에 실패했습니다.',
        errorDetail: message,
      });
    }
  });

  app.post('/api/briefing', async (req, res) => {
    const {
      dateIso,
      filterMode = 'today',
      dayData,
      prevDayData,
      weekData = [],
    }: {
      dateIso?: string;
      filterMode?: FilterMode;
      dayData?: SmpDayRecord;
      prevDayData?: SmpDayRecord;
      weekData?: SmpDayRecord[];
    } = req.body ?? {};

    const allRecords = loadCsvRecords();
    const targetDay =
      dayData ??
      allRecords.find((r) => r.dateIso === dateIso) ??
      allRecords[0];

    if (!targetDay) {
      res.status(400).json({ error: '분석할 날짜 데이터가 없습니다.' });
      return;
    }

    const idx = allRecords.findIndex((r) => r.dateIso === targetDay.dateIso);
    const prevDay =
      prevDayData ?? (idx >= 0 ? allRecords[idx + 1] : undefined);
    const weekRecords =
      weekData.length > 0
        ? weekData
        : idx >= 0
        ? allRecords.slice(idx, idx + 7)
        : allRecords.slice(0, 7);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json(
        buildDeterministicBriefing(targetDay, prevDay, filterMode, weekRecords)
      );
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const hourlySnapshot = targetDay.hours
        .map((h) => `${h.label}:${h.price.toFixed(2)}`)
        .join(', ');

      const weekSnapshot = weekRecords
        .map(
          (w) =>
            `${w.dateDisplay} 평균 ${w.weightedAvg.toFixed(2)} (최고 ${w.max.toFixed(2)}, 최저 ${w.min.toFixed(2)})`
        )
        .join(' | ');

      const prompt =
        filterMode === 'week'
          ? `당신은 한국 전력시장(KPX) SMP(계통한계가격) 입문자용 데이터 해설가입니다.
아래 7일간 실측 CSV 데이터를 바탕으로 한국어로 쉽고 명확한 시장 분석 브리핑을 작성하세요.
숫자는 반드시 제공된 데이터와 정확히 일치해야 합니다.

[7일간 데이터]
${weekSnapshot}

요청:
1. summary: 3~4문장으로 최근 7일 평균 추이, 최고일/최저일, 변동 원인을 자연스럽게 설명.
2. highlights: 입문자를 위한 3줄 핵심 포인트 (각 항목은 title(굵은 짧은 제목)과 body(1문장 설명)로 구성).`
          : `당신은 한국 전력시장(KPX) SMP(계통한계가격) 입문자용 데이터 해설가입니다.
아래 선택일과 전일 실측 CSV 데이터를 바탕으로 한국어로 쉽고 명확한 시장 분석 브리핑을 작성하세요.
숫자는 반드시 제공된 데이터와 정확히 일치해야 합니다.

[선택일] ${targetDay.dateDisplay}
- 가중평균 SMP: ${targetDay.weightedAvg.toFixed(2)} 원/kWh
- 최고가: ${targetDay.max.toFixed(2)} 원/kWh (${String(targetDay.maxHour).padStart(2, '0')}시)
- 최저가: ${targetDay.min.toFixed(2)} 원/kWh (${String(targetDay.minHour).padStart(2, '0')}시)
- 24시간 시세: ${hourlySnapshot}
${
  prevDay
    ? `[전일] ${prevDay.dateDisplay} 가중평균: ${prevDay.weightedAvg.toFixed(2)} 원/kWh (최고 ${prevDay.max.toFixed(2)}, 최저 ${prevDay.min.toFixed(2)})`
    : ''
}

요청:
1. summary: 3~4문장으로 평균 SMP, 전일 대비 변화, 피크 시간대 원인, 최저가 시간대 특성을 쉽게 설명.
2. highlights: 입문자를 위한 3줄 핵심 포인트 (각 항목은 title(콜론 포함 짧은 핵심 요약)과 body(초보자용 1문장 해설)로 구성).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: '3~4문장의 시장 분석 브리핑 요약문',
              },
              highlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    body: { type: Type.STRING },
                  },
                  required: ['title', 'body'],
                },
              },
            },
            required: ['summary', 'highlights'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (
        typeof parsed.summary === 'string' &&
        Array.isArray(parsed.highlights) &&
        parsed.highlights.length >= 3
      ) {
        const nowStr = new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        res.json({
          summary: parsed.summary,
          highlights: parsed.highlights.slice(0, 3),
          generatedAt: nowStr,
          source: 'gemini',
        });
        return;
      }

      res.json(
        buildDeterministicBriefing(targetDay, prevDay, filterMode, weekRecords)
      );
    } catch (err) {
      console.error('Gemini briefing fallback due to error:', err);
      res.json(
        buildDeterministicBriefing(targetDay, prevDay, filterMode, weekRecords)
      );
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
