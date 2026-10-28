# Sonification: numeric data → MIDI composition

Лабораторна робота №2, варіант 2: **соніфікація даних**. Застосунок перетворює числові показники з CSV у MIDI-композицію, показує зв’язок «дані → ноти» на графіку та piano roll, відтворює результат через Web Audio і експортує стандартний `.mid`-файл.

## Що вміє

- Імпорт CSV з drag & drop, валідація та два вбудовані демо-набори.
- **2–4 числові показники**, кожен мапиться на окремий MIDI-параметр:
  - Pitch — висота ноти;
  - Velocity — динаміка;
  - Duration — тривалість;
  - Pan — стереопозиція (MIDI CC 10).
- Пресет `Everything` та ручний мапінг через UI (`Custom`).
- Фіксовані музичні налаштування за замовчуванням: C major, дві октави, 108 BPM, soft piano.
- Нормалізація min–max з коректною обробкою константних колонок і пропусків.
- Графік нормалізованих показників, інтерактивний piano roll, таблиця мапінгу.
- Відтворення через власний мінімальний Web Audio-синтезатор.
- Експорт **Standard MIDI File (SMF format 0)**, написаний вручну: `MThd`/`MTrk`, VLQ delta-time, tempo, program change, CC 10, note on/off.
- Гарячі клавіші: `Space` — play/stop, `E` — експорт `.mid`.

## Стек

- **Vite + React 19 + TypeScript** — SPA без бекенду.
- **Web Audio API** — власний синтезатор, без аудіо-бібліотек.
- **PapaParse** — розбір CSV.
- **Lucide React** — іконки.
- **Vitest** — unit-тести доменної логіки.
- **@tonejs/midi** — тільки в тестах, щоб незалежно розібрати згенерований `.mid` і перевірити його структуру.

## Запуск

```bash
npm install
npm run dev
# http://localhost:5173
```

Збірка та перевірки:

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

## Структура проєкту

```text
src/
  audio/
    player.ts               # Web Audio-синтезатор, планування нот, playhead
    types.ts                # типи playback-колбеків
  components/
    controls/
      MappingInfo.tsx       # формули мапінгу для звіту та захисту
      Transport.tsx         # play/stop, прогрес, гучність
    feedback/
      NoticeToast.tsx       # toast-повідомлення
      WarningStrip.tsx      # попередження валідації
    layout/
      Header.tsx
    panels/
      DataPanel.tsx         # імпорт CSV, приклади, статистика даних
      MappingPanel.tsx      # UI-мапінг показників на MIDI-параметри
    ui/
      Panel.tsx             # спільний контейнер панелі
    visualizations/
      DataChart.tsx         # нормалізовані ряди + активний рядок
      PianoRoll.tsx         # SVG piano roll + playhead
      DataTable.tsx         # повна таблиця «дані → ноти»
  data/
    samples.ts              # вбудовані CSV-приклади
  domain/
    config.ts               # створення конфігурації для датасету
    csv.ts                  # CSV-парсинг
    instruments.ts          # профілі синтезатора + GM program
    mapping.ts              # дані → NoteEvent[], пресети
    midiWriter.ts           # власний SMF-writer
    normalize.ts            # min–max нормалізація
    scales.ts               # гами, тоніки, MIDI-ноти
    types/
      data.ts               # Dataset, NumericColumn
      mapping.ts            # MappingConfig, NoteEvent, MappingResult
      index.ts              # barrel-експорт
  hooks/
    useKeyboardShortcuts.ts # Space / E
    useNotice.ts            # toast-стан
    usePlayback.ts          # Web Audio playback
    useSonification.ts      # CSV → нормалізація → ноти → звук/експорт
  lib/
    download.ts             # завантаження файлів
    filename.ts             # slug для імені .mid
  types/
    ui.ts                   # Notice
  App.tsx                   # тільки композиція UI
  main.tsx
  styles.css
tests/
  domain.test.ts            # 24 unit-тести
docs/
  REPORT.md                 # повний текст звіту
  REPORT_TEMPLATE.md        # каркас звіту
  examples/                 # експортовані .mid та CSV-приклади
```

## Потік даних

```text
CSV
 → NumericColumn[]
 → min–max нормалізація (0..1)
 → MappingConfig
 → NoteEvent[]  ──────────────┬──────────────┬──────────────┐
                              │              │              │
                        PianoRoll       WebAudio       MidiWriter
                                                          │
                                                       .mid file
```

`NoteEvent` — єдине джерело істини. Piano roll, відтворення та експорт використовують один і той самий масив, тому вони не можуть розійтися.

## Де шукати логіку

- `src/hooks/useSonification.ts` — повний контролер: завантаження CSV, вибір семплу, мапінг, генерація нот, експорт і зв’язка з playback.
- `src/domain/mapping.ts` → `buildNotes()` — головне перетворення даних у `NoteEvent[]`.
- `src/domain/csv.ts` → `parseCsv()` / `parseNumeric()` — розбір CSV і чисел.
- `src/domain/normalize.ts` → `normalizeValues()` — min–max нормалізація.
- `src/domain/scales.ts` → `mapPitchToMidi()` — квантизація висоти ноти до гами.
- `src/domain/midiWriter.ts` → `writeMidi()` / `encodeVLQ()` — запис `.mid`.
- `src/audio/player.ts` → `WebAudioPlayer.play()` — перетворення `NoteEvent[]` у звук.
- `src/App.tsx` — лише компонує UI та передає дані з хука в компоненти.

## Правила мапінгу

Для кожної числової колонки:

```text
norm = (x − min) / (max − min)
```

Якщо колонка константна або значення пропущене, використовується `0.5`.

Далі, залежно від обраного target:

```text
Pitch:
  i    = round(norm × scaleLength × octaves)
  note = root + 12 × floor(i / scaleLength) + scale[i mod scaleLength]

Velocity:
  velocity = round(velocityMin + norm × (velocityMax − velocityMin))

Duration:
  gate = gateMin + norm × (gateMax − gateMin)
  ticks = round(ppq × stepBeats × gate)

Pan:
  preview pan = norm × 2 − 1
  MIDI CC10   = round(norm × 127)
```

Стартова позиція ноти: `rowIndex × stepBeats × ppq`. Один рядок CSV = одна нота.

## MIDI-writer

Файл формується вручну, без бібліотеки:

- header chunk `MThd`: format 0, один track, PPQ = 480;
- track chunk `MTrk`;
- `FF 03` — track name;
- `FF 51 03` — tempo (microseconds per quarter);
- `FF 58 04` — time signature 4/4;
- `C0` — program change (General MIDI);
- `B0 0A` — pan, якщо Pan призначено;
- `90` / `80` — note on / note off;
- `FF 2F 00` — end of track;
- delta-time кодується через **variable-length quantity**.

## Перевірки

- `npm run typecheck` — без помилок.
- `npm test` — **24/24** unit-тестів.
- `npm run build` — production build успішний.
- Browser smoke-test (Playwright): імпорт валідного/невалідного CSV, зміна пресетів, валідація «мінімум 2 показники», play/stop, playhead, hover-синхронізація графіка та piano roll, експорт `.mid`, мобільна верстка без горизонтального overflow.
- Експортований `.mid` незалежно розібрано через `@tonejs/midi`: 24 ноти, PPQ 480, tempo 108 BPM, коректні note ticks/durations; для Energy-набору — 24 CC10-події.

Артефакти перевірки лежать у [`docs/examples`](docs/examples): `weather.mid`, `energy.mid`, `weather.csv`.

## Обмеження

- До 4 активних MIDI-targets (pitch, velocity, duration, pan). Цього достатньо для вимоги «2+ показники» і захисту.
- До 256 рядків перетворюються в ноти; більші набори варто агрегувати.
- Відтворення — синтез у браузері, не рендер аудіофайлу. Основний результат — `.mid`.
- Гама, темп та інструмент зафіксовані в `DEFAULT_CONFIG`; UI керує лише мапінгом показників.

## Відповідність вимогам ЛР2

| Вимога | Реалізація |
|---|---|
| 2+ числові показники | CSV-колонки, мінімум дві, валідація |
| Кожен впливає на MIDI-параметр | UI-мапінг на Pitch / Velocity / Duration / Pan |
| Автоматичне формування MIDI | `writeMidi()` + кнопка Export `.mid` |
| Пояснення правил у звіті | панель Mapping rules + `docs/REPORT.md` |
| Додаткові можливості / UI/UX | playback, piano roll, live chart, presets, CSV import, keyboard shortcuts |

Повний текст звіту — у [`docs/REPORT.md`](docs/REPORT.md).
