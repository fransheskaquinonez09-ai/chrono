/**
 * Chrono - Gestión de Tiempo y Objetivos
 * Persistencia integrada sin dependencias externas
 */

const STORAGE_KEY = 'chrono_tasks_v1';
const OBJECTIVES_STORAGE_KEY = 'chrono_objectives_v1';

const FALLBACK_DATA = {
  tasks: [
    {
      id: 'task-101',
      title: 'Revisar calendario de contenido y metas semanales',
      category: 'trabajo',
      date: '',
      time: '09:00',
      endTime: '10:00',
      completed: true,
      rescheduledCount: 0
    },
    {
      id: 'task-102',
      title: 'Preparar piezas y copys para campaña de Lanzamiento',
      category: 'estudio',
      date: '',
      time: '11:30',
      endTime: '13:00',
      completed: false,
      rescheduledCount: 0
    }
  ],
  objectives: [
    {
      id: 'obj-01',
      title: 'Campaña de Fidelización MARVELLOUS',
      category: 'trabajo',
      description: 'Publicar piezas semanales y coordinar entregas locales en Valencia.',
      progress: 75
    },
    {
      id: 'obj-02',
      title: 'Entrega Final Bases de Programación',
      category: 'estudio',
      description: 'Completar arquitectura web, pruebas y documentación técnica.',
      progress: 85
    },
    {
      id: 'obj-03',
      title: 'Rutina de Bienestar y Enfoque',
      category: 'personal',
      description: 'Mantener bloques de descanso y revisión diaria sin saturación.',
      progress: 60
    }
  ]
};

const state = {
  tasks: [],
  objectives: [],
  currentView: 'day',
  referenceDate: new Date()
};

const CATEGORY_LABELS = {
  trabajo: 'Trabajo / Negocio',
  estudio: 'Estudio / Universidad',
  personal: 'Personal / Bienestar',
  salud: 'Salud / Deporte',
  urgente: 'Urgente / Prioritario'
};

const dom = {
  taskForm: document.getElementById('taskForm'),
  taskTitle: document.getElementById('taskTitle'),
  taskCategory: document.getElementById('taskCategory'),
  taskDate: document.getElementById('taskDate'),
  taskTime: document.getElementById('taskTime'),
  taskEndTime: document.getElementById('taskEndTime'),

  prevPeriodBtn: document.getElementById('prevPeriodBtn'),
  nextPeriodBtn: document.getElementById('nextPeriodBtn'),
  todayBtn: document.getElementById('todayBtn'),
  currentPeriodLabel: document.getElementById('currentPeriodLabel'),
  viewButtons: document.querySelectorAll('.view-btn'),

  progressTitle: document.getElementById('progressTitle'),
  completedCountBadge: document.getElementById('completedCountBadge'),
  pendingCountBadge: document.getElementById('pendingCountBadge'),
  progressPercentage: document.getElementById('progressPercentage'),
  progressBarFill: document.getElementById('progressBarFill'),

  calendarContainer: document.getElementById('calendarContainer'),
  objectivesGrid: document.getElementById('objectivesGrid'),
  resetDataBtn: document.getElementById('resetDataBtn'),

  rescheduleModal: document.getElementById('rescheduleModal'),
  rescheduleForm: document.getElementById('rescheduleForm'),
  rescheduleTaskId: document.getElementById('rescheduleTaskId'),
  modalTaskCategoryBadge: document.getElementById('modalTaskCategoryBadge'),
  modalTaskTitle: document.getElementById('modalTaskTitle'),
  modalOldDateTime: document.getElementById('modalOldDateTime'),
  newTaskDate: document.getElementById('newTaskDate'),
  newTaskTime: document.getElementById('newTaskTime'),
  cancelRescheduleBtn: document.getElementById('cancelRescheduleBtn'),
  quickChips: document.querySelectorAll('.chip-btn'),

  toastNotification: document.getElementById('toastNotification'),
  toastMessage: document.getElementById('toastMessage'),
  toastIcon: document.getElementById('toastIcon')
};

function formatDateISO(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatReadableDate(isoStr) {
  const date = parseISODate(isoStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function getStartOfWeek(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimeRange(startTime, endTime) {
  const start = startTime || '';
  const end = endTime ? endTime.trim() : '';
  if (!end) return start;
  return `${start} - ${end}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function loadInitialData() {
  const todayISO = formatDateISO(new Date());
  const savedTasks = localStorage.getItem(STORAGE_KEY);
  const savedObjectives = localStorage.getItem(OBJECTIVES_STORAGE_KEY);

  if (savedTasks && savedObjectives) {
    try {
      state.tasks = JSON.parse(savedTasks);
      state.objectives = JSON.parse(savedObjectives);
      return;
    } catch (e) {
      console.error('Error al leer localStorage', e);
    }
  }

  state.tasks = FALLBACK_DATA.tasks.map((task, idx) => ({
    ...task,
    id: `task-${Date.now()}-${idx}`,
    date: task.date || todayISO
  }));
  state.objectives = [...FALLBACK_DATA.objectives];
  saveTasks();
  saveObjectives();
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function saveObjectives() {
  localStorage.setItem(OBJECTIVES_STORAGE_KEY, JSON.stringify(state.objectives));
}

function showToast(message, type = 'success') {
  dom.toastMessage.textContent = message;
  dom.toastIcon.className = type === 'warning' ? 'ph-fill ph-clock-counter-clockwise' : 'ph-fill ph-check-circle';
  dom.toastIcon.style.color = type === 'warning' ? '#fbbf24' : '#34d399';
  dom.toastNotification.classList.remove('hidden');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => dom.toastNotification.classList.add('hidden'), 3200);
}

function validateScheduleRange(startTime, endTime) {
  if (!endTime || !endTime.trim()) return { valid: true };
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin !== null && endMin !== null && endMin <= startMin) {
    return { valid: false, message: 'La hora de fin debe ser posterior a la de inicio.' };
  }
  return { valid: true };
}

function addTask(title, category, date, time, endTime = '') {
  const newTask = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: title.trim(),
    category,
    date,
    time,
    endTime: endTime.trim(),
    completed: false,
    rescheduledCount: 0
  };
  state.tasks.push(newTask);
  saveTasks();
  renderApp();
  showToast('Actividad agendada correctamente');
}

function toggleTaskComplete(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderApp();
  showToast(task.completed ? '¡Excelente! Actividad completada' : 'Actividad marcada como pendiente');
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  saveTasks();
  renderApp();
  showToast('Actividad eliminada', 'warning');
}

function openRescheduleModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  dom.rescheduleTaskId.value = task.id;
  dom.modalTaskTitle.textContent = task.title;
  dom.modalTaskCategoryBadge.textContent = CATEGORY_LABELS[task.category] || task.category;
  dom.modalTaskCategoryBadge.className = `badge badge-${task.category}`;
  dom.modalOldDateTime.textContent = `Anteriormente: ${formatReadableDate(task.date)} a las ${formatTimeRange(task.time, task.endTime)}`;
  dom.newTaskDate.value = task.date;
  dom.newTaskTime.value = task.time;
  dom.rescheduleModal.classList.remove('hidden');
}

function closeRescheduleModal() {
  dom.rescheduleModal.classList.add('hidden');
}

function confirmReschedule(e) {
  e.preventDefault();
  const taskId = dom.rescheduleTaskId.value;
  const newDate = dom.newTaskDate.value;
  const newTime = dom.newTaskTime.value;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !newDate || !newTime) return;
  task.date = newDate;
  task.time = newTime;
  task.completed = false;
  task.rescheduledCount = (task.rescheduledCount || 0) + 1;
  saveTasks();
  closeRescheduleModal();
  renderApp();
  showToast(`Reprogramada para el ${formatReadableDate(newDate)}`, 'warning');
}

function updateProgressUI(filteredTasks, periodText) {
  const total = filteredTasks.length;
  const completed = filteredTasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  dom.progressTitle.textContent = `Progreso ${periodText}`;
  dom.completedCountBadge.textContent = `${completed} Completadas`;
  dom.pendingCountBadge.textContent = `${total - completed} Pendientes`;
  dom.progressPercentage.textContent = `${percentage}%`;
  dom.progressBarFill.style.width = `${percentage}%`;
}

function getTasksForDate(isoDate) {
  return state.tasks.filter(t => t.date === isoDate).sort((a, b) => a.time.localeCompare(b.time));
}

function renderObjectivesSection() {
  if (!dom.objectivesGrid) return;
  dom.objectivesGrid.innerHTML = state.objectives.map(obj => {
    const p = Math.max(0, Math.min(100, Number(obj.progress) || 0));
    return `
      <article class="objective-card">
        <div class="objective-card-top">
          <span class="badge badge-${obj.category}">${CATEGORY_LABELS[obj.category]}</span>
          <strong>${p}%</strong>
        </div>
        <h4>${escapeHTML(obj.title)}</h4>
        <p>${escapeHTML(obj.description)}</p>
        <div class="objective-progress-bar"><div class="objective-progress-fill" style="width: ${p}%;"></div></div>
      </article>
    `;
  }).join('');
}

function renderDayView() {
  const isoDate = formatDateISO(state.referenceDate);
  const dayTasks = getTasksForDate(isoDate);
  dom.currentPeriodLabel.textContent = state.referenceDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  updateProgressUI(dayTasks, 'del día');
  if (dayTasks.length === 0) {
    dom.calendarContainer.innerHTML = `<div class="empty-state"><h3>Sin actividades</h3><p>Usa el formulario para agregar una.</p></div>`;
    return;
  }
  dom.calendarContainer.innerHTML = `<div class="day-timeline">` + dayTasks.map(task => `
    <article class="task-card ${task.completed ? 'completed' : ''}" data-category="${task.category}">
      <div class="task-info">
        <div class="task-time-box">${formatTimeRange(task.time, task.endTime)}</div>
        <div class="task-details">
          <h4 class="task-title">${escapeHTML(task.title)}</h4>
          <div class="task-meta"><span>${CATEGORY_LABELS[task.category]}</span></div>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn btn-complete" onclick="toggleTaskComplete('${task.id}')">✓</button>
        <button class="action-btn btn-missed" onclick="openRescheduleModal('${task.id}')">↻</button>
        <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')">✕</button>
      </div>
    </article>
  `).join('') + `</div>`;
}

function renderWeekView() {
  const startOfWeek = getStartOfWeek(state.referenceDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  dom.currentPeriodLabel.textContent = `Semana`;
  const todayISO = formatDateISO(new Date());
  const weekTasksAll = [];
  let columnsHTML = '';
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dayISO = formatDateISO(dayDate);
    const dayTasks = getTasksForDate(dayISO);
    weekTasksAll.push(...dayTasks);
    columnsHTML += `
      <div class="week-column ${dayISO === todayISO ? 'is-today' :''}">
        <div class="week-col-header"><div>${dayDate.toLocaleDateString('es-ES',{weekday:'short'})}</div><div>${dayDate.getDate()}</div></div>
        ${dayTasks.map(t => `<div class="mini-task ${t.completed?'completed':''}"><div>${t.title}</div></div>`).join('')}
      </div>`;
  }
  updateProgressUI(weekTasksAll, 'de la semana');
  dom.calendarContainer.innerHTML = `<div class="week-grid">${columnsHTML}</div>`;
}

function renderMonthView() {
  const year = state.referenceDate.getFullYear();
  const month = state.referenceDate.getMonth();
  dom.currentPeriodLabel.textContent = state.referenceDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay === 0 ? 6 : firstDay - 1;
  let cellsHTML = '';
  for (let i = 0; i < startWeekday; i++) cellsHTML += `<div class="month-cell other-month"></div>`;
  for (let day = 1; day <= lastDay; day++) {
    const cellISO = formatDateISO(new Date(year, month, day));
    const dayTasks = getTasksForDate(cellISO);
    cellsHTML += `<div class="month-cell" onclick="jumpToDay('${cellISO}')"><div>${day}</div>${dayTasks.map(t=>`<div class="month-pill">${t.title}</div>`).join('')}</div>`;
  }
  dom.calendarContainer.innerHTML = `<div class="month-grid">${cellsHTML}</div>`;
}

window.jumpToDay = function(isoDate) {
  state.referenceDate = parseISODate(isoDate);
  setActiveView('day');
};

function renderApp() {
  if (state.currentView === 'day') renderDayView();
  else if (state.currentView === 'week') renderWeekView();
  else if (state.currentView === 'month') renderMonthView();
  renderObjectivesSection();
}

function setActiveView(view) {
  state.currentView = view;
  dom.viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  renderApp();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function initEventListeners() {
  dom.taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const validation = validateScheduleRange(dom.taskTime.value, dom.taskEndTime.value);
    if (!validation.valid) { showToast(validation.message, 'warning'); return; }
    addTask(dom.taskTitle.value, dom.taskCategory.value, dom.taskDate.value, dom.taskTime.value, dom.taskEndTime.value);
    dom.taskTitle.value = '';
    if (dom.taskEndTime) dom.taskEndTime.value = '';
    state.referenceDate = parseISODate(dom.taskDate.value);
    renderApp();
  });
  dom.viewButtons.forEach(btn => btn.addEventListener('click', () => setActiveView(btn.dataset.view)));
  dom.prevPeriodBtn.addEventListener('click', () => {
    const d = new Date(state.referenceDate);
    if (state.currentView === 'day') d.setDate(d.getDate() - 1);
    else if (state.currentView === 'week') d.setDate(d.getDate() - 7);
    else if (state.currentView === 'month') d.setMonth(d.getMonth() - 1);
    state.referenceDate = d;
    renderApp();
  });
  dom.nextPeriodBtn.addEventListener('click', () => {
    const d = new Date(state.referenceDate);
    if (state.currentView === 'day') d.setDate(d.getDate() + 1);
    else if (state.currentView === 'week') d.setDate(d.getDate() + 7);
    else if (state.currentView === 'month') d.setMonth(d.getMonth() + 1);
    state.referenceDate = d;
    renderApp();
  });
  dom.todayBtn.addEventListener('click', () => { state.referenceDate = new Date(); renderApp(); });
  dom.resetDataBtn && dom.resetDataBtn.addEventListener('click', () => {
    localStorage.clear();
    loadInitialData();
    renderApp();
    showToast('Base restaurada');
  });
  dom.rescheduleForm.addEventListener('submit', confirmReschedule);
  dom.cancelRescheduleBtn.addEventListener('click', closeRescheduleModal);
  dom.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const offset = chip.dataset.offset;
      if (offset === '1') {
        const [h, m] = dom.newTaskTime.value.split(':').map(Number);
        dom.newTaskTime.value = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      } else if (offset === 'tomorrow') {
        const c = parseISODate(dom.newTaskDate.value);
        c.setDate(c.getDate() + 1);
        dom.newTaskDate.value = formatDateISO(c);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  dom.taskDate.value = formatDateISO(now);
  dom.taskTime.value = `${String(now.getHours()).padStart(2, '0')}:00`;
  loadInitialData();
  initEventListeners();
  renderApp();
});