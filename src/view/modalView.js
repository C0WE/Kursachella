/**
 * modalView.js — Модуль модальных окон
 * Генерирует форму создания/редактирования смены.
 */

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const TYPE_OPTIONS = [
  { value: 'day',     icon: '🌤', label: 'Дневная' },
  { value: 'evening', icon: '🌆', label: 'Вечерняя' },
  { value: 'night',   icon: '🌙', label: 'Ночная' },
];

function typeSelector(selected = 'day') {
  return TYPE_OPTIONS.map(t => `
    <input type="radio" name="shift-type" id="type-${t.value}" value="${t.value}"
           class="type-option" ${selected === t.value ? 'checked' : ''}>
    <label for="type-${t.value}" class="type-label">
      <span style="font-size:20px">${t.icon}</span>
      ${t.label}
    </label>`).join('');
}

function employeeMultiselect(employees, selectedIds = []) {
  return employees.map(emp => `
    <label class="employee-option">
      <input type="checkbox" name="employees" value="${emp.id}"
             ${selectedIds.includes(emp.id) ? 'checked' : ''}>
      <div class="staff-avatar" style="background:${emp.color};width:28px;height:28px;font-size:11px;flex-shrink:0">${initials(emp.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="employee-option-name">${emp.name}</div>
        <div class="employee-option-pos">${emp.position}</div>
      </div>
    </label>`).join('');
}

export const modalView = {
  overlay: null,
  box: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    this.box     = document.getElementById('modal-box');
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  },

  /** Форма создания смены */
  showCreate(defaultDate, employees, onSave) {
    const dateVal = defaultDate || new Date().toISOString().split('T')[0];
    this.box.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Новая смена</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="shift-title">Название смены</label>
          <input id="shift-title" class="form-input" type="text" placeholder="Например: Дневная смена А" maxlength="60">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="shift-date">Дата</label>
            <input id="shift-date" class="form-input" type="date" value="${dateVal}">
          </div>
          <div class="form-group">
            <label class="form-label">Тип смены</label>
            <div class="type-selector">${typeSelector('day')}</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="shift-start">Начало</label>
            <input id="shift-start" class="form-input" type="time" value="08:00">
          </div>
          <div class="form-group">
            <label class="form-label" for="shift-end">Конец</label>
            <input id="shift-end" class="form-input" type="time" value="20:00">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Сотрудники</label>
          <div class="employee-multiselect">${employeeMultiselect(employees)}</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="shift-notes">Примечания</label>
          <textarea id="shift-notes" class="form-input" rows="2" placeholder="Необязательно..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel-btn">Отмена</button>
        <button class="btn-primary" id="modal-save-btn">Сохранить смену</button>
      </div>`;

    this._bindClose();
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      const data = this._collectFormData();
      if (data) { onSave(data); this.close(); }
    });
    this._open();
  },

  /** Форма редактирования смены */
  showEdit(shift, employees, onSave, onDelete) {
    this.box.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Редактировать смену</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="shift-title">Название смены</label>
          <input id="shift-title" class="form-input" type="text" value="${shift.title}" maxlength="60">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="shift-date">Дата</label>
            <input id="shift-date" class="form-input" type="date" value="${shift.date}">
          </div>
          <div class="form-group">
            <label class="form-label">Тип смены</label>
            <div class="type-selector">${typeSelector(shift.type)}</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="shift-start">Начало</label>
            <input id="shift-start" class="form-input" type="time" value="${shift.startTime}">
          </div>
          <div class="form-group">
            <label class="form-label" for="shift-end">Конец</label>
            <input id="shift-end" class="form-input" type="time" value="${shift.endTime}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Сотрудники</label>
          <div class="employee-multiselect">${employeeMultiselect(employees, shift.employeeIds)}</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="shift-notes">Примечания</label>
          <textarea id="shift-notes" class="form-input" rows="2">${shift.notes || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <div class="modal-footer-left">
          <button class="btn-danger" id="modal-delete-btn">🗑 Удалить</button>
        </div>
        <button class="btn-ghost" id="modal-cancel-btn">Отмена</button>
        <button class="btn-primary" id="modal-save-btn">Сохранить</button>
      </div>`;

    this._bindClose();
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      const data = this._collectFormData();
      if (data) { onSave({ ...data, id: shift.id }); this.close(); }
    });
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить смену "${shift.title}"?`)) {
        onDelete(shift.id);
        this.close();
      }
    });
    this._open();
  },

  close() {
    this.overlay.classList.add('hidden');
  },

  _open() {
    this.overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('shift-title')?.focus(), 50);
  },

  _bindClose() {
    document.getElementById('modal-close-btn')?.addEventListener('click',  () => this.close());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.close());
  },

  _collectFormData() {
    const title     = document.getElementById('shift-title').value.trim();
    const date      = document.getElementById('shift-date').value;
    const startTime = document.getElementById('shift-start').value;
    const endTime   = document.getElementById('shift-end').value;
    const notes     = document.getElementById('shift-notes').value.trim();
    const type      = document.querySelector('input[name="shift-type"]:checked')?.value || 'day';
    const employeeIds = [...document.querySelectorAll('input[name="employees"]:checked')]
      .map(el => Number(el.value));

    if (!title) { alert('Введите название смены'); return null; }
    if (!date)  { alert('Выберите дату'); return null; }
    if (!startTime || !endTime) { alert('Укажите время смены'); return null; }
    if (employeeIds.length === 0) { alert('Назначьте хотя бы одного сотрудника'); return null; }

    return { title, date, startTime, endTime, type, employeeIds, notes };
  },
};
