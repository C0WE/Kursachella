/**
 * modalView.js — Модуль модальных окон
 * Генерирует форму создания/редактирования смены.
 */

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Кастомное окошко ошибок ──────────────────────────────────
function showError(message, title = 'Ошибка') {
  const overlay = document.getElementById('error-overlay');
  const msgEl = document.getElementById('error-message');
  const titleEl = document.getElementById('error-title');
  const okBtn = document.getElementById('error-ok-btn');
  if (!overlay) { alert(message); return; }
  titleEl.textContent = title;
  msgEl.innerHTML = message;
  overlay.classList.remove('hidden');
  const close = () => {
    overlay.classList.add('hidden');
    okBtn.removeEventListener('click', close);
    overlay.removeEventListener('click', backdropClose);
  };
  const backdropClose = (e) => { if (e.target === overlay) close(); };
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', backdropClose);
  setTimeout(() => okBtn.focus(), 50);
}

// ── Метки статусов сотрудников ───────────────────────────────
const STATUS_BADGE = {
  vacation: '<span class="emp-status-badge vacation">отпуск</span>',
  sick:     '<span class="emp-status-badge sick">больничный</span>',
};

const TYPE_OPTIONS = [
  { value: 'day', icon: '🌤', label: 'Дневная' },
  { value: 'evening', icon: '🌆', label: 'Вечерняя' },
  { value: 'night', icon: '🌙', label: 'Ночная' },
];

const PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#f97316', '#ec4899', '#8b5cf6', '#ef4444',
  '#14b8a6', '#a855f7',
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Работает', cls: 'status-active' },
  { value: 'vacation', label: 'Отпуск', cls: 'status-vacation' },
  { value: 'sick', label: 'Больничный', cls: 'status-sick' },
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
  return employees.map(emp => {
    const isUnavailable = emp.status === 'vacation' || emp.status === 'sick';
    const badge = STATUS_BADGE[emp.status] || '';
    const disabledAttr = isUnavailable ? 'data-unavailable="true"' : '';
    return `
    <label class="employee-option${isUnavailable ? ' unavailable' : ''}">
      <input type="checkbox" name="employees" value="${emp.id}"
             ${selectedIds.includes(emp.id) ? 'checked' : ''}
             ${disabledAttr}>
      <div class="staff-avatar" style="background:${emp.color};width:28px;height:28px;font-size:11px;flex-shrink:0${isUnavailable ? ';opacity:0.5' : ''}">${initials(emp.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="employee-option-name">${emp.name} ${badge}</div>
        <div class="employee-option-pos">${emp.position}</div>
      </div>
    </label>`;
  }).join('');
}

export const modalView = {
  overlay: null,
  box: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    this.box = document.getElementById('modal-box');
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
      this._showConfirm(`Удалить смену «${shift.title}»?`, () => {
        onDelete(shift.id);
        this.close();
      });
    });
    this._open();
  },

  close() {
    this.overlay.classList.add('hidden');
  },

  _open(focusSelector = '#shift-title') {
    this.overlay.classList.remove('hidden');
    setTimeout(() => document.querySelector(focusSelector)?.focus(), 50);
  },

  _bindClose() {
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.close());
  },

  _collectFormData() {
    const title = document.getElementById('shift-title').value.trim();
    const date = document.getElementById('shift-date').value;
    const startTime = document.getElementById('shift-start').value;
    const endTime = document.getElementById('shift-end').value;
    const notes = document.getElementById('shift-notes').value.trim();
    const type = document.querySelector('input[name="shift-type"]:checked')?.value || 'day';
    const checkedInputs = [...document.querySelectorAll('input[name="employees"]:checked')];
    const employeeIds = checkedInputs.map(el => Number(el.value));

    if (!title) { showError('Введите название смены'); return null; }
    if (!date) { showError('Выберите дату'); return null; }
    if (!startTime || !endTime) { showError('Укажите время смены'); return null; }
    if (employeeIds.length === 0) { showError('Назначьте хотя бы одного сотрудника'); return null; }

    // Проверка статуса: нельзя назначить сотрудника в отпуске или на больничном
    const unavailable = checkedInputs.filter(el => el.dataset.unavailable === 'true');
    if (unavailable.length > 0) {
      const names = unavailable.map(el => {
        const label = el.closest('label');
        const nameEl = label?.querySelector('.employee-option-name');
        return nameEl ? nameEl.textContent.trim() : 'Неизвестный';
      });
      showError(
        `Следующие сотрудники недоступны (отпуск или больничный):<br><br>` +
        names.map(n => `<strong>${n}</strong>`).join('<br>') +
        `<br><br>Снимите их галочки, чтобы продолжить.`,
        'Недоступные сотрудники'
      );
      return null;
    }

    return { title, date, startTime, endTime, type, employeeIds, notes };
  },

  // ── Форма сотрудника ──────────────────────────────────────
  _employeeFormBody(emp = null) {
    const name = emp?.name || '';
    const position = emp?.position || '';
    const status = emp?.status || 'active';
    const color = emp?.color || PALETTE[0];

    const colorSwatches = PALETTE.map(c => `
      <label class="color-swatch${c === color ? ' selected' : ''}" style="background:${c}" title="${c}">
        <input type="radio" name="emp-color" value="${c}" ${c === color ? 'checked' : ''} style="display:none">
        ${c === color ? '<span class="swatch-check">✓</span>' : ''}
      </label>`).join('');

    const statusOpts = STATUS_OPTIONS.map(s => `
      <label class="emp-status-option">
        <input type="radio" name="emp-status" value="${s.value}" ${s.value === status ? 'checked' : ''}>
        <span class="status-dot ${s.cls}"></span>
        <span>${s.label}</span>
      </label>`).join('');

    return `
      <div class="form-group">
        <label class="form-label" for="emp-name">Имя и фамилия</label>
        <input id="emp-name" class="form-input" type="text" value="${name}" placeholder="Например: Иван Петров" maxlength="60">
      </div>
      <div class="form-group">
        <label class="form-label" for="emp-position">Должность</label>
        <input id="emp-position" class="form-input" type="text" value="${position}" placeholder="Например: Менеджер" maxlength="40">
      </div>
      <div class="form-group">
        <label class="form-label">Цвет аватара</label>
        <div class="color-palette">${colorSwatches}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Статус</label>
        <div class="emp-status-selector">${statusOpts}</div>
      </div>`;
  },

  _collectEmployeeData() {
    const name = document.getElementById('emp-name').value.trim();
    const position = document.getElementById('emp-position').value.trim();
    const color = document.querySelector('input[name="emp-color"]:checked')?.value || PALETTE[0];
    const status = document.querySelector('input[name="emp-status"]:checked')?.value || 'active';

    if (!name) { showError('Введите имя сотрудника'); return null; }
    if (!position) { showError('Укажите должность'); return null; }
    return { name, position, color, status };
  },

  showCreateEmployee(onSave) {
    this.box.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Новый сотрудник</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${this._employeeFormBody()}</div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel-btn">Отмена</button>
        <button class="btn-primary" id="modal-save-btn">Добавить сотрудника</button>
      </div>`;
    this._bindClose();
    this._bindColorSwatches();
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      const data = this._collectEmployeeData();
      if (data) { onSave(data); this.close(); }
    });
    this._open('#emp-name');
  },

  showEditEmployee(emp, onSave, onDelete) {
    this.box.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Редактировать сотрудника</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${this._employeeFormBody(emp)}</div>
      <div class="modal-footer">
        <div class="modal-footer-left">
          <button class="btn-danger" id="modal-delete-btn">🗑 Удалить</button>
        </div>
        <button class="btn-ghost" id="modal-cancel-btn">Отмена</button>
        <button class="btn-primary" id="modal-save-btn">Сохранить</button>
      </div>`;
    this._bindClose();
    this._bindColorSwatches();
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      const data = this._collectEmployeeData();
      if (data) { onSave({ ...data, id: emp.id }); this.close(); }
    });
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
      this._showConfirm(`Удалить сотрудника «${emp.name}»? Смены с этим сотрудником останутся.`, () => {
        onDelete(emp.id);
        this.close();
      });
    });
    this._open('#emp-name');
  },

  _bindColorSwatches() {
    this.box.querySelectorAll('.color-swatch').forEach(label => {
      label.addEventListener('click', () => {
        this.box.querySelectorAll('.color-swatch').forEach(l => {
          l.classList.remove('selected');
          l.querySelector('.swatch-check')?.remove();
        });
        label.classList.add('selected');
        const check = document.createElement('span');
        check.className = 'swatch-check';
        check.textContent = '✓';
        label.appendChild(check);
      });
    });
  },

  _showConfirm(message, onConfirm) {
    const overlay = document.getElementById('error-overlay');
    const msgEl = document.getElementById('error-message');
    const titleEl = document.getElementById('error-title');
    const okBtn = document.getElementById('error-ok-btn');
    if (!overlay) { if (confirm(message)) onConfirm(); return; }
    titleEl.textContent = 'Подтверждение';
    msgEl.textContent = message;
    // swap button to confirm/cancel
    const footer = okBtn.parentElement;
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-ghost';
    cancelBtn.textContent = 'Отмена';
    okBtn.textContent = 'Удалить';
    okBtn.classList.add('btn-danger-confirm');
    footer.insertBefore(cancelBtn, okBtn);
    overlay.classList.remove('hidden');
    const close = (confirmed) => {
      overlay.classList.add('hidden');
      okBtn.removeEventListener('click', confirmCb);
      cancelBtn.removeEventListener('click', cancelCb);
      overlay.removeEventListener('click', backdropClose);
      okBtn.textContent = 'Понятно';
      okBtn.classList.remove('btn-danger-confirm');
      cancelBtn.remove();
      if (confirmed) onConfirm();
    };
    const confirmCb = () => close(true);
    const cancelCb = () => close(false);
    const backdropClose = (e) => { if (e.target === overlay) close(false); };
    okBtn.addEventListener('click', confirmCb);
    cancelBtn.addEventListener('click', cancelCb);
    overlay.addEventListener('click', backdropClose);
    setTimeout(() => cancelBtn.focus(), 50);
  },

  showStats(monthLabel, shiftsInMonth, employees) {
    // ── Вспомогательные функции ────────────────────────────
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const overlapMin = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
    const fmt = h => h === 0 ? '—' : (Number.isInteger(h * 10) ? `${h}ч` : `${h.toFixed(1)}ч`);

    // Дневной период: 07:00–22:00
    const DAY_S = 7 * 60, DAY_E = 22 * 60;

    function calcHours(startTime, endTime) {
      const s = toMin(startTime), e = toMin(endTime);
      let dayM = 0, nightM = 0;
      const addSegment = (from, to) => {
        dayM   += overlapMin(from, to, DAY_S, DAY_E);
        nightM += overlapMin(from, to, 0, DAY_S) + overlapMin(from, to, DAY_E, 1440);
      };
      if (e > s) { addSegment(s, e); }
      else        { addSegment(s, 1440); addSegment(0, e); } // ночная через полночь
      return { dayM, nightM };
    }

    // ── Агрегируем по сотрудникам ──────────────────────────
    const empStats = {};
    for (const shift of shiftsInMonth) {
      const { dayM, nightM } = calcHours(shift.startTime, shift.endTime);
      for (const id of shift.employeeIds) {
        if (!empStats[id]) empStats[id] = { dayM: 0, nightM: 0 };
        empStats[id].dayM   += dayM;
        empStats[id].nightM += nightM;
      }
    }

    const worked = employees.filter(e => empStats[e.id]);
    const totalDayH   = Object.values(empStats).reduce((s, v) => s + v.dayM,   0) / 60;
    const totalNightH = Object.values(empStats).reduce((s, v) => s + v.nightM, 0) / 60;

    const avatarHtml = emp => `
      <div class="staff-avatar" style="background:${emp.color};width:22px;height:22px;font-size:8px;flex-shrink:0">
        ${emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>`;

    const rows = worked.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-3)">Нет смен за этот период</td></tr>`
      : worked.map(emp => {
          const st  = empStats[emp.id];
          const dh  = st.dayM / 60, nh = st.nightM / 60;
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:8px">${avatarHtml(emp)}<span>${emp.name}</span></div></td>
            <td class="stat-day">${fmt(dh)}</td>
            <td class="stat-night">${fmt(nh)}</td>
            <td class="stat-total">${fmt(dh + nh)}</td>
          </tr>`;
        }).join('');

    const tfoot = worked.length > 0 ? `
      <tfoot><tr>
        <td><strong>Итого</strong></td>
        <td class="stat-day"><strong>${fmt(totalDayH)}</strong></td>
        <td class="stat-night"><strong>${fmt(totalNightH)}</strong></td>
        <td class="stat-total"><strong>${fmt(totalDayH + totalNightH)}</strong></td>
      </tr></tfoot>` : '';

    this.box.className = 'modal-box stats-modal';
    this.box.innerHTML = `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Статистика</h2>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">${monthLabel}</div>
        </div>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="stats-cards">
          <div class="stats-card">
            <div class="stats-card-value">${worked.length}</div>
            <div class="stats-card-label">Сотрудников работало</div>
          </div>
          <div class="stats-card day">
            <div class="stats-card-value">${fmt(totalDayH)}</div>
            <div class="stats-card-label">☀ Дневных часов</div>
          </div>
          <div class="stats-card night">
            <div class="stats-card-value">${fmt(totalNightH)}</div>
            <div class="stats-card-label">🌙 Ночных часов</div>
          </div>
        </div>
        <div class="stats-table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th>Сотрудник</th>
              <th>☀ Дневные</th>
              <th>🌙 Ночные</th>
              <th>Итого</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            ${tfoot}
          </table>
        </div>
        <div class="stats-note">
          <span>☀ Дневные: 07:00 – 22:00</span>
          <span>🌙 Ночные: 22:00 – 07:00</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" id="modal-close-btn-stats">Закрыть</button>
      </div>`;

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      this.box.className = 'modal-box'; this.close();
    });
    document.getElementById('modal-close-btn-stats')?.addEventListener('click', () => {
      this.box.className = 'modal-box'; this.close();
    });
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) { this.box.className = 'modal-box'; this.close(); }
    }, { once: true });
    this._open('#modal-close-btn-stats');
  },
};
