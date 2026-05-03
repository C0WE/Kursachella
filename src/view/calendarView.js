/**
 * calendarView.js — Модуль отрисовки календаря
 * Полные сутки (0:00–24:00). Ночные смены, пересекающие полночь,
 * отображаются двумя блоками: до 24:00 и продолжение с 00:00 следующего дня.
 */

const HOURS_START = 0;
const HOURS_END   = 24;
const HOUR_HEIGHT = 60; // px на 1 час → итого 1440px

const DAY_NAMES  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                     'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// ── Утилиты дат ───────────────────────────────────────────────
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dateStr(date) {
  return date.toISOString().split('T')[0];
}

function prevDateStr(ds) {
  const d = new Date(ds);
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
         date.getMonth()    === t.getMonth()    &&
         date.getDate()     === t.getDate();
}

// ── Работа со временем ────────────────────────────────────────
/** Переводит строку "HH:MM" (или "24:00") в px от верха сетки */
function timePx(timeStr) {
  if (timeStr === '24:00') return HOURS_END * HOUR_HEIGHT;
  const [h, m] = timeStr.split(':').map(Number);
  return (h + m / 60) * HOUR_HEIGHT;
}

/** Смена пересекает полночь, если конец ≤ начало по минутам */
function crossesMidnight(shift) {
  const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  return toMin(shift.endTime) <= toMin(shift.startTime);
}

// ── Аватары ───────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarHtml(emp) {
  return `<div class="shift-mini-avatar" style="background:${emp.color}" title="${emp.name}">${initials(emp.name)}</div>`;
}

// ── Карточка смены ────────────────────────────────────────────
/**
 * @param {Object} shift
 * @param {Array}  employees
 * @param {string} displayStart  — время начала блока ("HH:MM")
 * @param {string} displayEnd    — время конца блока ("HH:MM" или "24:00")
 * @param {boolean} isContinuation — true если это продолжение с 00:00
 */
function shiftCardHtml(shift, employees, displayStart, displayEnd, isContinuation = false) {
  const top    = timePx(displayStart);
  const bottom = timePx(displayEnd);
  const height = Math.max(bottom - top, 28);

  const emps    = shift.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
  const avatars = emps.slice(0, 4).map(avatarHtml).join('');
  const extra   = emps.length > 4 ? `<span style="font-size:9px;color:var(--text-3)">+${emps.length - 4}</span>` : '';

  // Подпись времени в карточке
  const timeLabel = isContinuation
    ? `↑ ${shift.startTime} – ${shift.endTime}`
    : crossesMidnight(shift)
      ? `${shift.startTime} – 00:00 ↓`
      : `${shift.startTime} – ${shift.endTime}`;

  return `
    <div class="shift-card type-${shift.type}${isContinuation ? ' is-continuation' : ''}"
         data-shift-id="${shift.id}"
         style="top:${top}px; height:${height}px;"
         title="${shift.title}&#10;${shift.startTime} – ${shift.endTime}">
      <div class="shift-card-time">${timeLabel}</div>
      ${height > 42 ? `<div class="shift-card-title">${shift.title}</div>` : ''}
      ${height > 64 ? `<div class="shift-card-avatars">${avatars}${extra}</div>` : ''}
    </div>`;
}

// ── Недельный вид ─────────────────────────────────────────────
export function renderWeek(container, shifts, employees, currentDate) {
  const monday = getMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Метки часов: каждые 2 часа (0, 2, 4, ..., 22)
  const timeLabels = Array.from({ length: HOURS_END }, (_, i) =>
    `<div class="time-label">${String(i).padStart(2,'0')}:00</div>`
  ).join('');

  // Заголовки дней
  const dayHeaders = days.map(d => `
    <div class="week-header-cell">
      <span class="day-name">${DAY_NAMES[d.getDay()]}</span>
      <span class="day-num${isToday(d) ? ' today' : ''}">${d.getDate()}</span>
    </div>`).join('');

  // Линии часов (фон)
  const hourLines = Array.from({ length: HOURS_END }, (_, i) =>
    `<div class="hour-line" style="top:${i * HOUR_HEIGHT}px"></div>`
  ).join('');

  // Текущее время
  const todayDate = new Date();
  const todayStr  = dateStr(todayDate);
  const nowPx     = (todayDate.getHours() + todayDate.getMinutes() / 60) * HOUR_HEIGHT;

  // Колонки дней
  const dayColumns = days.map(d => {
    const ds       = dateStr(d);
    const prevDs   = prevDateStr(ds);
    const todayCls = ds === todayStr ? ' today-col' : '';

    // Смены, начинающиеся в этот день
    const dayShifts = shifts.filter(s => s.date === ds);

    // Продолжения: смены предыдущего дня, пересекающие полночь
    const continuations = shifts.filter(s => s.date === prevDs && crossesMidnight(s));

    let cards = '';

    // Рисуем смены этого дня
    for (const s of dayShifts) {
      if (crossesMidnight(s)) {
        // Первая часть: от начала до 24:00
        cards += shiftCardHtml(s, employees, s.startTime, '24:00', false);
      } else {
        cards += shiftCardHtml(s, employees, s.startTime, s.endTime, false);
      }
    }

    // Рисуем продолжения с 00:00
    for (const s of continuations) {
      cards += shiftCardHtml(s, employees, '00:00', s.endTime, true);
    }

    const timeLine = ds === todayStr
      ? `<div class="current-time-line" style="top:${nowPx}px"></div>` : '';

    return `
      <div class="day-column${todayCls}" data-date="${ds}">
        ${hourLines}
        ${timeLine}
        <div class="drop-zone" data-date="${ds}"></div>
        ${cards}
      </div>`;
  }).join('');

  const totalHeight = HOURS_END * HOUR_HEIGHT;

  container.innerHTML = `
    <div class="week-grid">
      <div class="week-header">
        <div class="week-header-inner">
          <div class="week-header-cell"></div>
          ${dayHeaders}
        </div>
      </div>
      <div class="week-body" style="min-height:${totalHeight}px">
        <div class="time-gutter">${timeLabels}</div>
        ${dayColumns}
      </div>
    </div>`;
}

// ── Месячный вид ──────────────────────────────────────────────
export function renderMonth(container, shifts, employees, currentDate) {
  const year     = currentDate.getFullYear();
  const month    = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);

  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const startDate   = new Date(firstDay);
  startDate.setDate(1 - startOffset);

  const todayStr = dateStr(new Date());

  const headerDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
    .map(n => `<div class="month-header-day">${n}</div>`).join('');

  let cells = '';
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + row * 7 + col);
      const ds = dateStr(cellDate);

      const isCurrentMonth = cellDate.getMonth() === month;
      const isTodayCell    = ds === todayStr;

      // Смены начинающиеся в этот день + продолжения
      const dayShifts = shifts.filter(s => s.date === ds);
      const prevDs    = prevDateStr(ds);
      const contShifts = shifts.filter(s => s.date === prevDs && crossesMidnight(s));
      const allShifts = [...dayShifts, ...contShifts];

      const chips = allShifts.slice(0, 3).map(s => {
        const isCont = contShifts.includes(s);
        const label  = isCont ? `↑ ${s.title}` : `${s.startTime} ${s.title}`;
        return `<div class="month-shift-chip type-${s.type}" data-shift-id="${s.id}" title="${s.title}">${label}</div>`;
      }).join('');

      const moreLabel = allShifts.length > 3
        ? `<div class="month-more">+${allShifts.length - 3} ещё</div>` : '';

      cells += `
        <div class="month-cell${isCurrentMonth ? '' : ' other-month'}${isTodayCell ? ' today-cell' : ''}"
             data-date="${ds}">
          <div class="month-day-num${isTodayCell ? ' today' : ''}">${cellDate.getDate()}</div>
          ${chips}${moreLabel}
        </div>`;
    }
  }

  container.innerHTML = `
    <div class="month-grid">
      <div class="month-header-row">${headerDays}</div>
      <div class="month-body">${cells}</div>
    </div>`;
}

// ── Заголовок периода ──────────────────────────────────────────
export function getPeriodLabel(view, currentDate) {
  if (view === 'week') {
    const monday = getMonday(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const m1 = MONTH_NAMES[monday.getMonth()];
    const m2 = MONTH_NAMES[sunday.getMonth()];
    return monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()} – ${sunday.getDate()} ${m1} ${monday.getFullYear()}`
      : `${monday.getDate()} ${m1} – ${sunday.getDate()} ${m2} ${monday.getFullYear()}`;
  }
  return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}
