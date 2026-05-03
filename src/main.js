/**
 * main.js — Точка входа
 * Инициализирует приложение: загружает данные → заполняет Store → запускает Controller.
 */

import './styles/main.css';
import { api }            from './api.js';
import { store }          from './store.js';
import { initController } from './controller.js';

async function init() {
  // Показываем индикатор загрузки
  const section = document.getElementById('calendar-section');
  section.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <span>Загрузка данных...</span>
    </div>`;

  try {
    // Параллельная загрузка данных
    const [employees, shifts] = await Promise.all([
      api.fetchEmployees(),
      api.fetchShifts(),
    ]);

    // Заполняем Store (каждый set вызовет событие, но контроллер ещё не подписан)
    store.setEmployees(employees);
    store.setShifts(shifts);

    // Инициализируем контроллер — он подпишется на события и выполнит первичный рендер
    initController();

  } catch (err) {
    section.innerHTML = `
      <div class="loading-overlay" style="flex-direction:column;gap:8px">
        <span style="font-size:32px">⚠️</span>
        <span>Не удалось загрузить данные</span>
        <button class="btn-ghost" onclick="location.reload()">Повторить</button>
      </div>`;
    console.error('Init error:', err);
  }
}

init();
