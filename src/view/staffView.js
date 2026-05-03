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
   */
  render(container, employees, activeEmployeeId = null) {
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
      </div>`
    ).join('');
  },

  /**
   * Заполняет <select> сотрудниками для фильтра.
   */
  populateFilterSelect(selectEl, employees) {
    const existing = selectEl.innerHTML.split('</option>')[0] + '</option>';
    selectEl.innerHTML = `<option value="">Все сотрудники</option>` +
      employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  },
};
