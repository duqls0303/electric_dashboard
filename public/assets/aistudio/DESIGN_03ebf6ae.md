---
name: K-Power Pulse
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5a4136'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#8e7164'
  outline-variant: '#e2bfb0'
  surface-tint: '#a04100'
  primary: '#a04100'
  on-primary: '#ffffff'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#ffb693'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00ae78'
  on-tertiary-container: '#003925'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-metric:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  label-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-ui:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
This design system powers a beginner-friendly mobile web dashboard for tracking electricity market metrics and the System Marginal Price (SMP). 

### Personality & Tone
- **Accessible & Empowering:** Translates complex wholesale electricity market jargon into human-readable insights.
- **Dynamic & Energetic:** Captures the real-time, pulsing nature of the power grid without feeling overwhelming or volatile.
- **Trustworthy & Objective:** Balances utility-grade data reliability with financial clarity.

### Visual Style
The aesthetic is Modern Clean Utility with a friendly, high-clarity data personality. It utilizes pristine white cards elevated above a soft cool-gray surface (`#F8FAFC`), crisp high-contrast dark slate typography, vibrant high-energy orange accents symbolizing active electricity flow, and generous pill/rounded corners (`rounded-2xl`) to soften technical barriers.

## Colors
The palette is calibrated for high sunlight readability on mobile devices and clear categorical data visualization.

### Palette Architecture
- **Primary (`#FF6B00` / `#F97316`):** The signature electric kinetic color. Used for real-time peak price highlights, active states, key interactive buttons, and upward price trend alerts.
- **Secondary (`#0284C7`):** Electric blue. Used for base-load indicators, off-peak pricing, and comparative reference metrics (e.g., previous day or historical averages).
- **Tertiary (`#10B981`):** Eco-green. Represents renewable generation shares, eco-impact, and stable low-price zones.
- **Neutral & Typography (`#1E293B`):** Deep slate gray providing superior contrast over pure black, avoiding eye fatigue during prolonged chart inspection.
- **Muted Neutral (`#64748B`):** Secondary labels, metadata timestamps, unit values (KRW/kWh), and axes guides.
- **Backgrounds:** Canvas uses `#F8FAFC`, card surfaces use `#FFFFFF`, and interactive sub-wells use `#F1F5F9`.

## Typography
The system combines the soft, friendly geometry of **Plus Jakarta Sans** for interfaces and narrative reading with **JetBrains Mono** for numerical accuracy in SMP pricing tables, kilowatt units, and delta percentages.

- Large pricing figures (`data-metric`) are rendered in tabular figures (`tnum`) via monospaced numbers to eliminate layout shift during live updates.
- Micro-labels, market status tags, and time codes use `label-data` for technical legibility.
- AI commentary and insight copy leverage `body-md` with relaxed line-height (1.47) to maximize conversational readability.

## Layout & Spacing
A mobile-first layout prioritizing one-hand thumb zone interactions.

### Layout Rules
- **Mobile Web Viewport:** Maximum container width is pinned to `480px` centered on wide viewports to preserve native app-like ergonomics.
- **Vertical Rhythm:** Strict 4px/8px base scale. Card modules stack vertically separated by `space-md` (16px).
- **Horizontal Bleed & Margins:** Page margin is `1.25rem` (20px). Interactive horizontal carousels (e.g., hourly SMP cards) negative-margin bleed to canvas edges with scroll-snap padding matching page margins.
- **Sticky Status Bar:** Fixed top bar with 56px height displaying current market status, latest sync time, and quick-filter pills.

## Elevation & Depth
Depth is built using soft atmospheric ambient shadows rather than harsh drop shadows, ensuring the UI feels luminous and non-intrusive.

### Depth Layers
- **Ground (Canvas):** `#F8FAFC` flat surface.
- **Layer 1 (Cards & Data Panels):** `#FFFFFF` with ambient shadow: `0 4px 20px -2px rgba(30, 41, 59, 0.05), 0 2px 6px -1px rgba(30, 41, 59, 0.02)`. Border: 1px solid `rgba(226, 232, 240, 0.8)`.
- **Layer 2 (Floating Action / Sticky Dock):** `#FFFFFF` with frosted glass blur (`backdrop-filter: blur(12px)`, background `rgba(255, 255, 255, 0.88)`), elevated by `0 10px 25px -5px rgba(30, 41, 59, 0.1)`.
- **Layer 3 (Modals / Tooltips):** `0 20px 30px -10px rgba(15, 23, 42, 0.15)`.
- **Active Glow:** Key highlighted metrics (e.g., peak price peak alert) receive a localized orange ambient backlight: `box-shadow: 0 4px 14px 0 rgba(255, 107, 0, 0.25)`.

## Shapes
The shape language uses prominent `rounded-2xl` (1rem / 16px) corners on dashboard cards, sheet overlays, and highlight containers to evoke an inviting, consumer-friendly product rather than a dry B2B utility.

- **Standard Cards:** `1rem` (16px) radius.
- **Pills / Status Chips / Buttons:** Full pill radius (`9999px`) to maintain contrast with rectangular data charts.
- **Chart Tooltips:** `0.5rem` (8px) radius.
- **Progress Bars & Range Tracks:** Full rounded ends (`9999px`).

## Components

### 1. Primary & Secondary Buttons
- **Primary:** Background `#FF6B00`, text `#FFFFFF`, font `label-ui` (bold), height 48px, radius `9999px`. Subtle shadow glow. Pressed state transitions to `#E05E00` with `scale(0.98)`.
- **Secondary / Ghost:** White background, 1px border `#E2E8F0`, text `#1E293B`, subtle hover/active background `#F1F5F9`.

### 2. Market Metric Cards (SMP & Price Summary)
- Pure white background, `rounded-2xl` border-radius, hairline border `rgba(226, 232, 240, 0.9)`.
- Features an icon badge (40x40px, rounded-full) with light orange tint (`#FFF7ED`) housing an orange electric icon.
- Displays metric name in `body-sm` (`#64748B`), the large numeric price in `data-metric` (`#1E293B`), followed by the dynamic delta tag (e.g., `+12.4% ▲` in `#EA580C` or `-5.2% ▼` in `#0284C7`).

### 3. SMP Price Chart Component
- Gradient area chart with a crisp 2px line in `#FF6B00`.
- Chart fill: Linear gradient from `rgba(255, 107, 0, 0.22)` at the peak down to `rgba(255, 107, 0, 0.0)` at the X-axis.
- Off-peak average represented as a horizontal dashed line in `#94A3B8`.
- Scrubbing touch indicator: Vertical orange hairline with a pulsing magnetic dot; pops up a pill tooltip showing `HH:mm` and `###.## 원/kWh`.

### 4. AI Explanation Section ("오늘의 전력 브리핑")
- Visual accent: Soft subtle gradient border or top border strip (3px) in `#FF6B00`.
- Background: `#FFFFFF` or very subtle warm tinted off-white (`#FFFDFB`).
- Header: Sparkle/AI icon next to "초보자를 위한 3줄 요약" (`title-sm`).
- Content: Bulleted insights formatted with highlighted keyphrases in bold `#FF6B00` or `#1E293B`.
- Action link: "자세한 시세 변동 이유 보기 >" in `label-ui` `#FF6B00`.

### 5. Chips & Filter Pills
- Filter states (e.g., 육지 / 제주, 실시간 / 1주일 / 1개월):
  - **Selected:** Background `#1E293B`, text `#FFFFFF`, weight 600.
  - **Unselected:** Background `#F1F5F9`, text `#64748B`, weight 500.

### 6. Power Grid Status Gauge / Badge
- Horizontal segmented bar or circular ring indicating reserve margin capacity (Normal, Caution, Warning) with smooth color transitions from `#10B981` to `#FF6B00`.