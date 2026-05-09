/**
 * controller.js — Модуль контроллера и событий
 * Связывает Store ↔ View ↔ API. Слушает пользовательские действия.
 */

import { store } from './store.js';
import { api } from './api.js';
import { modalView } from './view/modalView.js';
import { staffView } from './view/staffView.js';
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
  staffView.render(container, store.employees, store.filters.employeeId, handleOpenEditEmployee);
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
  store.addEventListener('shifts:updated', renderCalendar);
  store.addEventListener('filters:changed', () => { renderCalendar(); renderStaff(); });
  store.addEventListener('date:changed', renderCalendar);
  store.addEventListener('view:changed', renderCalendar);
  store.addEventListener('employees:updated', () => { renderStaff(); renderCalendar(); });

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

  // ── Кнопка "Добавить сотрудника" ──────────────────────────
  document.getElementById('btn-add-employee').addEventListener('click', () => {
    modalView.showCreateEmployee(handleSaveCreateEmployee);
  });

  // ── Сворачивание сайдбара (десктоп) ───────────────────────
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
  });

  // ── Мобильное меню (боковая панель) ───────────────────────
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const btnMenu = document.getElementById('btn-menu');

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('active');
  }
  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  }

  btnMenu?.addEventListener('click', () => {
    if (sidebar.classList.contains('mobile-open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  backdrop?.addEventListener('click', closeMobileSidebar);

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
    // Клик на кнопку редактирования
    const editBtn = e.target.closest('.staff-edit-btn');
    if (editBtn) {
      e.stopPropagation();
      const empId = Number(editBtn.dataset.editId);
      const emp = store.getEmployeeById(empId);
      if (emp) modalView.showEditEmployee(emp, handleSaveEditEmployee, handleDeleteEmployee);
      return;
    }
    // Клик на карточке — фильтр
    const card = e.target.closest('.staff-card');
    if (!card) return;
    const empId = Number(card.dataset.employeeId);
    const current = store.filters.employeeId;
    store.setFilters({ employeeId: current === empId ? null : empId });
    const filterSel = document.getElementById('filter-employee');
    filterSel.value = current === empId ? '' : empId;
  });

  // ── Делегирование кликов по календарю ─────────────────────
  document.getElementById('calendar-section').addEventListener('click', e => {
    // ── Недельный вид: геометрическое определение смены ──────
    // Не доверяем DOM/z-index стеку. Вместо этого: вычисляем время клика по
    // Y-координате и ищем все смены за этот день, перекрывающие этот момент.
    // Среди них выбираем с наименьшей длительностью (самую "вложенную").
    const dayCol = e.target.closest('.day-column');
    if (dayCol) {
      const date = dayCol.dataset.date;
      const HOUR_HEIGHT = 60; // px на час — должно совпадать с calendarView.js
      const weekBody = dayCol.closest('.week-body');
      const colRect = dayCol.getBoundingClientRect();
      // Учитываем прокрутку week-body
      const scrollTop = weekBody ? weekBody.scrollTop : 0;
      const relY = e.clientY - colRect.top + scrollTop;
      const clickedMinutes = Math.round((relY / HOUR_HEIGHT) * 60);

      const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

      // Все видимые смены этого дня (учитываем filteredShifts)
      const candidates = store.filteredShifts.filter(s => {
        if (s.date !== date) return false;
        const start = toMin(s.startTime);
        const end   = toMin(s.endTime);
        // Обычная смена: start..end; ночная: start..1440 (до конца дня)
        const effectiveEnd = end <= start ? 1440 : end;
        return clickedMinutes >= start && clickedMinutes < effectiveEnd;
      });

      if (candidates.length > 0) {
        // Берём смену с наименьшей длительностью — она "вложена" в более длинную
        candidates.sort((a, b) => {
          const durA = toMin(a.endTime) - toMin(a.startTime);
          const durB = toMin(b.endTime) - toMin(b.startTime);
          return durA - durB;
        });
        const shift = store.getShiftById(candidates[0].id);
        if (shift) {
          // Убеждаемся, что клик не пришёл от drop-zone (пустая зона)
          if (!e.target.closest('.drop-zone') || candidates.length > 0) {
            modalView.showEdit(shift, store.employees, handleSaveEdit, handleDelete);
            return;
          }
        }
      }

      // Клик на пустой зоне дня — создать смену
      const dropZone = e.target.closest('.drop-zone');
      if (dropZone) {
        modalView.showCreate(dropZone.dataset.date, store.employees, handleSaveCreate);
        return;
      }
      return;
    }

    // ── Месячный вид ─────────────────────────────────────────
    const monthChip = e.target.closest('.month-shift-chip');
    if (monthChip) {
      const shiftId = Number(monthChip.dataset.shiftId);
      const shift = store.getShiftById(shiftId);
      if (shift) { modalView.showEdit(shift, store.employees, handleSaveEdit, handleDelete); return; }
    }

    const monthCell = e.target.closest('.month-cell');
    if (monthCell && !e.target.closest('.month-shift-chip')) {
      modalView.showCreate(monthCell.dataset.date, store.employees, handleSaveCreate);
    }
  });

  // ── Первичный рендер (store уже заполнен до вызова initController) ──
  renderCalendar();
  renderStaff();
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

// ── CRUD сотрудников ────────────────────────────────────

function handleOpenEditEmployee(emp) {
  modalView.showEditEmployee(emp, handleSaveEditEmployee, handleDeleteEmployee);
}

async function handleSaveCreateEmployee(data) {
  try {
    const emp = await api.createEmployee(data);
    store.addEmployee(emp);
    toast('Сотрудник добавлен', 'success');
  } catch (err) {
    toast('Ошибка при добавлении', 'error');
    console.error(err);
  }
}

async function handleSaveEditEmployee(data) {
  try {
    const updated = await api.updateEmployee(data.id, data);
    store.updateEmployee(updated);
    toast('Данные сотрудника обновлены', 'success');
  } catch (err) {
    toast('Ошибка при сохранении', 'error');
    console.error(err);
  }
}

async function handleDeleteEmployee(empId) {
  try {
    await api.deleteEmployee(empId);
    store.deleteEmployee(empId);
    toast('Сотрудник удалён', 'info');
  } catch (err) {
    toast('Ошибка при удалении', 'error');
    console.error(err);
  }
}
