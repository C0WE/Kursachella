/**
 * api.js — Модуль интеграции (Mock API)
 * Имитирует HTTP-запросы к серверу.
 * Когда появится реальный бэкенд — достаточно заменить тела функций на fetch().
 */

const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

// ── Генерация дат относительно текущей недели ────────────────
function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function getMondayOffset() {
  const day = new Date().getDay();
  return day === 0 ? -6 : 1 - day;
}

// ── Эталонные данные ─────────────────────────────────────────
const MOCK_EMPLOYEES = [
  { id: 1,  name: 'Анна Сидорова',    position: 'Администратор', status: 'active',   color: '#6366f1' },
  { id: 2,  name: 'Иван Петров',      position: 'Менеджер',      status: 'active',   color: '#3b82f6' },
  { id: 3,  name: 'Мария Козлова',    position: 'Кассир',        status: 'active',   color: '#10b981' },
  { id: 4,  name: 'Алексей Новиков',  position: 'Охранник',      status: 'active',   color: '#f59e0b' },
  { id: 5,  name: 'Елена Морозова',   position: 'Бариста',       status: 'vacation', color: '#8b5cf6' },
  { id: 6,  name: 'Дмитрий Волков',   position: 'Повар',         status: 'active',   color: '#ec4899' },
  { id: 7,  name: 'Наталья Лебедева', position: 'Уборщица',      status: 'sick',     color: '#ef4444' },
  { id: 8,  name: 'Сергей Попов',     position: 'Кассир',        status: 'active',   color: '#06b6d4' },
  { id: 9,  name: 'Ольга Смирнова',   position: 'Менеджер',      status: 'active',   color: '#84cc16' },
  { id: 10, name: 'Павел Козлов',     position: 'Охранник',      status: 'active',   color: '#f97316' },
];

// Генерируем смены динамически от текущего понедельника
let shiftIdCounter = 100;
function makeShift(offset, startH, endH, type, title, empIds) {
  return {
    id: shiftIdCounter++,
    date: getDateStr(getMondayOffset() + offset),
    startTime: `${String(startH).padStart(2,'0')}:00`,
    endTime:   `${String(endH).padStart(2,'0')}:00`,
    type,
    title,
    employeeIds: empIds,
    notes: '',
  };
}

let MOCK_SHIFTS = [
  makeShift(0, 8,  20, 'day',     'Дневная смена А',   [1, 2, 3]),
  makeShift(0, 20, 8,  'night',   'Ночная смена',      [4, 10]),
  makeShift(1, 8,  14, 'day',     'Утренняя смена',    [3, 8]),
  makeShift(1, 14, 22, 'evening', 'Вечерняя смена',    [1, 9]),
  makeShift(2, 8,  20, 'day',     'Дневная смена Б',   [2, 6]),
  makeShift(2, 20, 8,  'night',   'Ночная охрана',     [4]),
  makeShift(3, 9,  18, 'day',     'Смена выходного дня',[1, 3, 8]),
  makeShift(4, 8,  16, 'day',     'Пятничная смена',   [2, 9, 6]),
  makeShift(4, 16, 24, 'evening', 'Вечер пятницы',     [4, 10]),
  makeShift(5, 10, 18, 'day',     'Суббота (день)',     [1, 6]),
  makeShift(6, 12, 22, 'evening', 'Воскресная смена',  [3, 8, 9]),
  // Следующая неделя
  makeShift(7,  8, 20, 'day',     'Смена пн (след.)',  [1, 2]),
  makeShift(8,  8, 14, 'day',     'Утро вт (след.)',   [3, 8]),
  makeShift(9,  20, 8, 'night',   'Ночь ср (след.)',   [4, 10]),
];

// ── API функции ──────────────────────────────────────────────

export const api = {
  async fetchEmployees() {
    await delay();
    return structuredClone(MOCK_EMPLOYEES);
  },

  async fetchShifts() {
    await delay();
    return structuredClone(MOCK_SHIFTS);
  },

  async createShift(data) {
    await delay(200);
    const newShift = { ...data, id: ++shiftIdCounter };
    MOCK_SHIFTS.push(newShift);
    return structuredClone(newShift);
  },

  async updateShift(id, data) {
    await delay(200);
    const idx = MOCK_SHIFTS.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Смена не найдена');
    MOCK_SHIFTS[idx] = { ...MOCK_SHIFTS[idx], ...data };
    return structuredClone(MOCK_SHIFTS[idx]);
  },

  async deleteShift(id) {
    await delay(150);
    MOCK_SHIFTS = MOCK_SHIFTS.filter(s => s.id !== id);
    return { success: true };
  },
};
