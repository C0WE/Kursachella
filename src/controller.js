/**
 * controller.js — Модуль контроллера и событий
 * Связывает Store ↔ View ↔ API. Слушает пользовательские действия.
 */

import { store }       from './store.js';
import { api }         from './api.js';
import { modalView }   from './view/modalView.js';
import { staffView }   from './view/staffView.js';
import { renderWeek, renderMonth, getPeriodLabel } from './view/calendarView.js';

// ── Toast-уведомления ─────────────────────────────────────────
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span style="font-size:16px">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut 0.25s ease forwards';
    setTimeout(() => el.remove(), 260);
  }, 3000);
}

// ── Перерисовка ───────────────────────────────────────────────
function renderCalendar() {
  const section = document.getElementById('calendar-section');
  const { currentView, currentDate, filteredShifts, employees } = store;
  document.getElementById('period-label').textContent = getPeriodLabel(currentView, currentDate);

  if (currentView === 'week') {
    renderWeek(section, filteredShifts, employees, currentDate);
  } else {
    renderMonth(section, filteredShifts, employees, currentDate);
  }
}

function renderStaff() {
  const container = document.getElementById('staff-list');
  staffView.render(container, store.employees, store.filters.employeeId);
  staffView.populateFilterSelect(
    document.getElementById('filter-employee'),
    store.employees
  );
  // Восстановить значение select после перерисовки
  const sel = document.getElementById('filter-employee');
  if (store.filters.employeeId) sel.value = store.filters.employeeId;
}

// ── Инициализация ─────────────────────────────────────────────
export function initController() {
  modalView.init();

  // Подписка на события стора
  store.addEventListener('shifts:updated',   renderCalendar);
  store.addEventListener('filters:changed',  () => { renderCalendar(); renderStaff(); });
  store.addEventListener('date:changed',     renderCalendar);
  store.addEventListener('view:changed',     renderCalendar);
  store.addEventListener('employees:updated', renderStaff);

  // ── Навигация по периодам ──────────────────────────────────
  document.getElementById('btn-prev').addEventListener('click', () => store.navigate(-1));
  document.getElementById('btn-next').addEventListener('click', () => store.navigate(1));
  document.getElementById('btn-today').addEventListener('click', () => store.goToToday());

  // ── Переключение вида ──────────────────────────────────────
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      store.setView(btn.dataset.view);
    });
  });

  // ── Кнопка "Добавить смену" ────────────────────────────────
  document.getElementById('btn-add-shift').addEventListener('click', () => {
    modalView.showCreate(null, store.employees, handleSaveCreate);
  });

  // ── Сворачивание сайдбара ──────────────────────────────────
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
  });

  // ── Фильтры ───────────────────────────────────────────────
  document.getElementById('filter-employee').addEventListener('change', e => {
    store.setFilters({ employeeId: e.target.value ? Number(e.target.value) : null });
  });
  document.getElementById('filter-type').addEventListener('change', e => {
    store.setFilters({ shiftType: e.target.value || null });
  });
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    store.clearFilters();
    document.getElementById('filter-employee').value = '';
    document.getElementById('filter-type').value = '';
  });

  // ── Фильтр по клику на сотрудника в сайдбаре ──────────────
  document.getElementById('staff-list').addEventListener('click', e => {
    const card = e.target.closest('.staff-card');
    if (!card) return;
    const empId = Number(card.dataset.employeeId);
    const current = store.filters.employeeId;
    // Второй клик — сброс
    store.setFilters({ employeeId: current === empId ? null : empId });
    const filterSel = document.getElementById('filter-employee');
    filterSel.value = current === empId ? '' : empId;
  });

  // ── Делегирование кликов по календарю ─────────────────────
  document.getElementById('calendar-section').addEventListener('click', e => {
    // Клик на карточке смены
    const shiftCard = e.target.closest('.shift-card, .month-shift-chip');
    if (shiftCard) {
      const shiftId = Number(shiftCard.dataset.shiftId);
      const shift = store.getShiftById(shiftId);
      if (shift) modalView.showEdit(shift, store.employees, handleSaveEdit, handleDelete);
      return;
    }

    // Клик на пустую зону дня (неделя) или ячейку месяца
    const dropZone = e.target.closest('.drop-zone');
    if (dropZone) {
      modalView.showCreate(dropZone.dataset.date, store.employees, handleSaveCreate);
      return;
    }
    const monthCell = e.target.closest('.month-cell');
    if (monthCell && !e.target.closest('.month-shift-chip')) {
      modalView.showCreate(monthCell.dataset.date, store.employees, handleSaveCreate);
    }
  });
}

// ── Обработчики CRUD ──────────────────────────────────────────

async function handleSaveCreate(data) {
  try {
    const newShift = await api.createShift(data);
    store.addShift(newShift);
    toast('Смена успешно создана', 'success');
  } catch (err) {
    toast('Ошибка при создании смены', 'error');
    console.error(err);
  }
}

async function handleSaveEdit(data) {
  try {
    const updated = await api.updateShift(data.id, data);
    store.updateShift(updated);
    toast('Смена обновлена', 'success');
  } catch (err) {
    toast('Ошибка при сохранении', 'error');
    console.error(err);
  }
}

async function handleDelete(shiftId) {
  try {
    await api.deleteShift(shiftId);
    store.deleteShift(shiftId);
    toast('Смена удалена', 'info');
  } catch (err) {
    toast('Ошибка при удалении', 'error');
    console.error(err);
  }
}
