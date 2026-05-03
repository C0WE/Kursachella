/**
 * store.js — Модуль состояния (Store)
 * Хранит все данные приложения и уведомляет подписчиков об изменениях.
 * Использует нативный EventTarget как шину событий.
 */

class Store extends EventTarget {
  #employees = [];
  #shifts    = [];
  #currentView = 'week';         // 'week' | 'month'
  #currentDate = new Date();     // опорная дата (начало видимого периода)
  #filters = { employeeId: null, shiftType: null };

  // ── Геттеры ────────────────────────────────────────────────
  get employees()    { return this.#employees; }
  get shifts()       { return this.#shifts; }
  get currentView()  { return this.#currentView; }
  get currentDate()  { return new Date(this.#currentDate); }
  get filters()      { return { ...this.#filters }; }

  /** Смены с учётом активных фильтров */
  get filteredShifts() {
    return this.#shifts.filter(s => {
      if (this.#filters.employeeId && !s.employeeIds.includes(this.#filters.employeeId)) return false;
      if (this.#filters.shiftType  && s.type !== this.#filters.shiftType) return false;
      return true;
    });
  }

  // ── Сеттеры + события ──────────────────────────────────────
  setEmployees(list) {
    this.#employees = list;
    this.#emit('employees:updated');
  }

  setShifts(list) {
    this.#shifts = list;
    this.#emit('shifts:updated');
  }

  addShift(shift) {
    this.#shifts.push(shift);
    this.#emit('shifts:updated');
  }

  updateShift(updated) {
    const idx = this.#shifts.findIndex(s => s.id === updated.id);
    if (idx !== -1) this.#shifts[idx] = updated;
    this.#emit('shifts:updated');
  }

  deleteShift(id) {
    this.#shifts = this.#shifts.filter(s => s.id !== id);
    this.#emit('shifts:updated');
  }

  setView(view) {
    this.#currentView = view;
    this.#emit('view:changed');
  }

  setCurrentDate(date) {
    this.#currentDate = new Date(date);
    this.#emit('date:changed');
  }

  setFilters(filters) {
    this.#filters = { ...this.#filters, ...filters };
    this.#emit('filters:changed');
  }

  clearFilters() {
    this.#filters = { employeeId: null, shiftType: null };
    this.#emit('filters:changed');
  }

  // ── Навигация ──────────────────────────────────────────────
  navigate(direction) {
    const d = new Date(this.#currentDate);
    if (this.#currentView === 'week') {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    this.#currentDate = d;
    this.#emit('date:changed');
  }

  goToToday() {
    this.#currentDate = new Date();
    this.#emit('date:changed');
  }

  // ── Хелперы ────────────────────────────────────────────────
  getEmployeeById(id) {
    return this.#employees.find(e => e.id === id);
  }

  getShiftById(id) {
    return this.#shifts.find(s => s.id === id);
  }

  #emit(event) {
    this.dispatchEvent(new CustomEvent(event));
  }
}

// Singleton — единственный экземпляр стора
export const store = new Store();
