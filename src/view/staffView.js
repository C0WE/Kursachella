/**
 * staffView.js — Модуль отрисовки справочника персонала
 */

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STATUS_LABEL = {
  active:   'Работает',
  vacation: 'Отпуск',
  sick:     'Больничный',
};

export const staffView = {
  /**
   * Отрисовывает список сотрудников в sidebar.
   * @param {HTMLElement} container
   * @param {Array} employees
   * @param {number|null} activeEmployeeId — активный фильтр
   * @param {Function} onEdit — callback при клике на карандаш
   */
  render(container, employees, activeEmployeeId = null, onEdit = null) {
    container.innerHTML = employees.map(emp => `
      <div class="staff-card${activeEmployeeId === emp.id ? ' active' : ''}"
           data-employee-id="${emp.id}"
           title="${emp.name} — ${emp.position} (${STATUS_LABEL[emp.status] || emp.status})">
        <div class="staff-avatar" style="background:${emp.color}">${initials(emp.name)}</div>
        <div style="flex:1;min-width:0;">
          <div class="staff-name">${emp.name}</div>
          <div class="staff-meta">${emp.position}</div>
        </div>
        <div class="staff-status status-${emp.status}" title="${STATUS_LABEL[emp.status]}"></div>
        ${onEdit ? `<button class="staff-edit-btn icon-btn" data-edit-id="${emp.id}" title="Редактировать">✎</button>` : ''}
      </div>`
    ).join('');
  },

  /**
   * Заполняет <select> сотрудниками для фильтра.
   */
  populateFilterSelect(selectEl, employees) {
    selectEl.innerHTML = `<option value="">Все сотрудники</option>` +
      employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  },
};
