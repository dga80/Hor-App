// OFFICIAL HOLIDAYS (BARCELONA CIUDAD 2026)
const BARCELONA_HOLIDAYS_2026 = {
  "2026-01-01": "Año Nuevo",
  "2026-01-06": "Día de Reyes",
  "2026-04-03": "Viernes Santo",
  "2026-04-06": "Lunes de Pascua",
  "2026-05-01": "Día del Trabajo",
  "2026-05-25": "Segunda Pascua",
  "2026-06-24": "San Juan",
  "2026-08-15": "La Asunción",
  "2026-09-11": "Diada de Cataluña",
  "2026-09-24": "La Mercè",
  "2026-10-12": "Fiesta Nacional de España",
  "2026-11-01": "Todos los Santos",
  "2026-12-06": "Día de la Constitución",
  "2026-12-08": "Inmaculada Concepción",
  "2026-12-25": "Navidad",
  "2026-12-26": "San Esteban"
};

// PRICING MATRIX (BARCELONA METAL CONVENIO 2026)
const RATES = {
  workday: { rate: 18.00, label: "Laborable" },
  saturday: { rate: 19.00, label: "Sábado" },
  holiday: { rate: 23.00, label: "Festivo / Domingo" }
};

// INITIAL APPLICATION STATE
let state = {
  overtimeEntries: {}, // key: "YYYY-MM-DD", value: { hours: 2.5, note: "Tarea" }
  settings: {
    irpf: 15.29,
    safety: 6.50
  },
  currentMonth: 4, // May 2026 (0-indexed, so 4 is May)
  selectedDate: null // YYYY-MM-DD
};

// GENERAL CONSTANTS
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DAY_NAMES_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// LOCAL STORAGE KEY
const STORAGE_KEY = "horapp_overtime_data_2026";

// DOM ELEMENTS CACHE
const DOM = {
  // Navigation & Views
  tabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".app-view"),
  
  // Header Info
  headerMonthlyTotal: document.getElementById("header-monthly-total"),

  // Calendar Elements
  prevMonthBtn: document.getElementById("prev-month"),
  nextMonthBtn: document.getElementById("next-month"),
  calendarMonthYear: document.getElementById("calendar-month-year"),
  calendarDaysGrid: document.getElementById("calendar-days-grid"),

  // Analytics Elements
  resumenMonthSelect: document.getElementById("resumen-month-select"),
  metricTotalHours: document.getElementById("metric-total-hours"),
  metricTotalGross: document.getElementById("metric-total-gross"),
  metricTotalNet: document.getElementById("metric-total-net"),
  metricNetRateText: document.getElementById("metric-net-retention-rate"),
  bdWorkdayHours: document.getElementById("bd-workday-hours"),
  bdWorkdayGross: document.getElementById("bd-workday-gross"),
  bdWorkdayProgress: document.getElementById("bd-workday-progress"),
  bdSaturdayHours: document.getElementById("bd-saturday-hours"),
  bdSaturdayGross: document.getElementById("bd-saturday-gross"),
  bdSaturdayProgress: document.getElementById("bd-saturday-progress"),
  bdHolidayHours: document.getElementById("bd-holiday-hours"),
  bdHolidayGross: document.getElementById("bd-holiday-gross"),
  bdHolidayProgress: document.getElementById("bd-holiday-progress"),
  monthlyLogList: document.getElementById("monthly-log-list"),
  logListCounter: document.getElementById("log-list-counter"),

  // Settings Elements
  irpfSlider: document.getElementById("settings-irpf"),
  safetySlider: document.getElementById("settings-safety"),
  irpfDisplay: document.getElementById("irpf-value-display"),
  safetyDisplay: document.getElementById("safety-value-display"),
  totalDeductionDisplay: document.getElementById("total-deduction-display"),
  btnLoadDemo: document.getElementById("btn-load-demo"),
  btnExport: document.getElementById("btn-export"),
  btnImportTrigger: document.getElementById("btn-import-trigger"),
  btnImportFile: document.getElementById("btn-import-file"),
  btnResetData: document.getElementById("btn-reset-data"),

  // Editor Modal / Sheet
  loggerModal: document.getElementById("logger-modal"),
  btnCloseLogger: document.getElementById("btn-close-logger"),
  loggerDateDisplay: document.getElementById("logger-date-display"),
  loggerRateBadge: document.getElementById("logger-rate-badge"),
  loggerHoursText: document.getElementById("logger-hours-text"),
  loggerHoursRange: document.getElementById("logger-hours-range"),
  btnHourMinus: document.getElementById("btn-hour-minus"),
  btnHourPlus: document.getElementById("btn-hour-plus"),
  btnPresetReset: document.getElementById("btn-preset-reset"),
  fortnight1Hours: document.getElementById("fortnight-1-hours"),
  fortnight1Net: document.getElementById("fortnight-1-net"),
  fortnight2Hours: document.getElementById("fortnight-2-hours"),
  fortnight2Net: document.getElementById("fortnight-2-net"),
  projGross: document.getElementById("proj-gross"),
  projDeductionLbl: document.getElementById("proj-deduction-lbl"),
  projDeductions: document.getElementById("proj-deductions"),
  projNet: document.getElementById("proj-net"),
  btnDeleteEntry: document.getElementById("btn-delete-entry"),
  btnSaveEntry: document.getElementById("btn-save-entry"),

  // Toast
  toast: document.getElementById("app-toast")
};

/* ==========================================================================
   1. CORE COMPUTATIONAL UTILITIES
   ========================================================================== */

/**
 * Returns pricing class and details for any given calendar date in 2026.
 * @param {string} dateStr YYYY-MM-DD
 */
function getDayTypeAndRate(dateStr) {
  // Check designated Barcelona Holidays
  if (BARCELONA_HOLIDAYS_2026[dateStr]) {
    return {
      type: "holiday",
      rate: RATES.holiday.rate,
      label: `Festivo: ${BARCELONA_HOLIDAYS_2026[dateStr]}`
    };
  }

  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0) {
    return {
      type: "holiday",
      rate: RATES.holiday.rate,
      label: "Domingo"
    };
  } else if (dayOfWeek === 6) {
    return {
      type: "saturday",
      rate: RATES.saturday.rate,
      label: "Sábado"
    };
  } else {
    return {
      type: "workday",
      rate: RATES.workday.rate,
      label: "Día Laborable"
    };
  }
}

/**
 * Computes calculations for custom hours, rate and tax rate.
 */
function calculateEarnings(hours, rate, irpf, safety) {
  const gross = hours * rate;
  const totalDeductionPercent = irpf + safety;
  const deductions = gross * (totalDeductionPercent / 100);
  const net = gross - deductions;

  return {
    gross: gross,
    deductions: deductions,
    net: net,
    totalDeductionPercent: totalDeductionPercent
  };
}

/**
 * Visual feedback alert
 */
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add("show");
  setTimeout(() => {
    DOM.toast.classList.remove("show");
  }, 2000);
}

/* ==========================================================================
   2. DATA PERSISTENCE
   ========================================================================== */

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    overtimeEntries: state.overtimeEntries,
    settings: state.settings,
    currentMonth: state.currentMonth
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.overtimeEntries) state.overtimeEntries = parsed.overtimeEntries;
      if (parsed.settings) state.settings = parsed.settings;
      if (typeof parsed.currentMonth === "number") state.currentMonth = parsed.currentMonth;
    } catch (e) {
      console.error("Error loading application state from localStorage", e);
    }
  }
}

/* ==========================================================================
   3. CALENDAR GENERATION ENGINE
   ========================================================================== */

function renderCalendar() {
  const month = state.currentMonth;
  DOM.calendarMonthYear.textContent = `${MONTH_NAMES[month]} 2026`;
  DOM.resumenMonthSelect.value = month;

  // Clear previous grid
  DOM.calendarDaysGrid.innerHTML = "";

  // Helper date metrics
  const firstDayIndex = new Date(2026, month, 1).getDay(); // JS Day: 0 Sunday, 1 Monday...
  // Spain calendar starts on Monday, adjust day index accordingly
  // 0 Sunday -> 6
  // 1 Mon -> 0, 2 Tue -> 1, 3 Wed -> 2, 4 Thu -> 3, 5 Fri -> 4, 6 Sat -> 5
  const adjustedStartIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysInMonth = new Date(2026, month + 1, 0).getDate();

  // Create starting empty padding days
  for (let i = 0; i < adjustedStartIndex; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty";
    DOM.calendarDaysGrid.appendChild(emptyCell);
  }

  // Populate days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const paddedMonth = String(month + 1).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");
    const dateStr = `2026-${paddedMonth}-${paddedDay}`;
    
    const dayType = getDayTypeAndRate(dateStr);
    const dayCell = document.createElement("div");
    
    dayCell.className = `day-cell ${dayType.type}`;
    dayCell.textContent = day;
    dayCell.dataset.date = dateStr;

    // Is it a registered official Barcelona holiday? Add a dot indicator
    if (BARCELONA_HOLIDAYS_2026[dateStr]) {
      dayCell.classList.add("official-holiday");
      dayCell.title = BARCELONA_HOLIDAYS_2026[dateStr];
    }

    // Is there registered overtime hours? Add badge or dot
    const entry = state.overtimeEntries[dateStr];
    if (entry && entry.hours > 0) {
      dayCell.classList.add("has-hours");
      
      const miniBadge = document.createElement("span");
      miniBadge.className = "mini-hours";
      miniBadge.textContent = `${entry.hours}h`;
      dayCell.appendChild(miniBadge);
    }

    // Toggle active selection state visually
    if (state.selectedDate === dateStr) {
      dayCell.classList.add("active-selection");
    }

    // Click handler to launch editor drawer
    dayCell.addEventListener("click", () => {
      selectAndLogDate(dateStr);
    });

    DOM.calendarDaysGrid.appendChild(dayCell);
  }

  // Quick total hour indicator update on header
  updateHeaderTotalHours();
}

function updateHeaderTotalHours() {
  const monthStr = String(state.currentMonth + 1).padStart(2, "0");
  let totalHours = 0;
  
  Object.keys(state.overtimeEntries).forEach(dateStr => {
    if (dateStr.startsWith(`2026-${monthStr}`)) {
      totalHours += state.overtimeEntries[dateStr].hours;
    }
  });

  DOM.headerMonthlyTotal.textContent = totalHours > 0 ? `${totalHours.toFixed(1)}h` : "0h";
}

/* ==========================================================================
   4. LOGGER DRAWER / SHEET COMPONENT
   ========================================================================== */

function selectAndLogDate(dateStr) {
  state.selectedDate = dateStr;
  
  // Highlight selection in calendar grid
  document.querySelectorAll(".day-cell").forEach(cell => {
    if (cell.dataset.date === dateStr) {
      cell.classList.add("active-selection");
    } else {
      cell.classList.remove("active-selection");
    }
  });

  // Extract date values
  const dateObj = new Date(dateStr);
  const dayName = DAY_NAMES_LONG[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = MONTH_NAMES[dateObj.getMonth()];
  
  DOM.loggerDateDisplay.textContent = `${dayName}, ${dayNum} de ${monthName}, 2026`;

  // Get Rate details
  const pricing = getDayTypeAndRate(dateStr);
  DOM.loggerRateBadge.textContent = `${pricing.label} (${pricing.rate.toFixed(2).replace(".", ",")} €/h)`;
  DOM.loggerRateBadge.className = `badge-rate ${pricing.type}-type`;

  // Load existing data
  const entry = state.overtimeEntries[dateStr] || { hours: 0 };
  
  // Update inputs
  DOM.loggerHoursRange.value = entry.hours;
  DOM.loggerHoursText.textContent = entry.hours.toFixed(1);

  // Toggle presets active states
  updatePresetButtonsState(entry.hours);

  // Toggle delete button display
  if (entry.hours > 0) {
    DOM.btnDeleteEntry.style.display = "inline-flex";
  } else {
    DOM.btnDeleteEntry.style.display = "none";
  }

  // Update live earnings numbers
  updateLiveProjections(entry.hours, pricing.rate);

  // Show modal
  DOM.loggerModal.classList.add("open");
}

function updatePresetButtonsState(value) {
  document.querySelectorAll(".btn-preset").forEach(btn => {
    if (btn.id === "btn-preset-reset") return;
    const btnVal = parseFloat(btn.dataset.value);
    if (btnVal === value) {
      btn.classList.add("active-preset");
    } else {
      btn.classList.remove("active-preset");
    }
  });
}

function updateLiveProjections(hours, rate) {
  const irpf = parseFloat(state.settings.irpf);
  const safety = parseFloat(state.settings.safety);
  
  const calc = calculateEarnings(hours, rate, irpf, safety);

  DOM.projGross.textContent = `${calc.gross.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  DOM.projDeductionLbl.textContent = `Retención (${calc.totalDeductionPercent.toFixed(2)}%):`;
  DOM.projDeductions.textContent = `-${calc.deductions.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  DOM.projNet.textContent = `${calc.net.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function closeLogger() {
  DOM.loggerModal.classList.remove("open");
  state.selectedDate = null;
  
  // Clean up selected border in calendar
  document.querySelectorAll(".day-cell").forEach(cell => {
    cell.classList.remove("active-selection");
  });
}

/* ==========================================================================
   5. SETTINGS PANEL INTERACTIVE ARITHMETIC
   ========================================================================== */

function updateTaxSettings() {
  const irpf = parseFloat(DOM.irpfSlider.value);
  const safety = parseFloat(DOM.safetySlider.value);

  state.settings.irpf = irpf;
  state.settings.safety = safety;

  DOM.irpfDisplay.textContent = `${irpf.toFixed(2)}%`;
  DOM.safetyDisplay.textContent = `${safety.toFixed(2)}%`;
  
  const totalDeduction = irpf + safety;
  DOM.totalDeductionDisplay.textContent = `${totalDeduction.toFixed(2)}%`;

  saveState();
  
  // Real time re-projection of the active modal sheet if currently open
  if (state.selectedDate) {
    const pricing = getDayTypeAndRate(state.selectedDate);
    const hours = parseFloat(DOM.loggerHoursRange.value);
    updateLiveProjections(hours, pricing.rate);
  }
}

/* ==========================================================================
   6. SUMMARY AND STATISTICS GENERATION ENGINE
   ========================================================================== */

function renderSummary() {
  const selectedMonth = parseInt(DOM.resumenMonthSelect.value);
  const paddedMonth = String(selectedMonth + 1).padStart(2, "0");

  let totalHours = 0;
  let totalGross = 0;
  let totalNet = 0;

  // Hourly rate subdivisions
  let hoursWorkday = 0;
  let grossWorkday = 0;
  
  let hoursSaturday = 0;
  let grossSaturday = 0;

  let hoursHoliday = 0;
  let grossHoliday = 0;

  // Fortnight subdivisions
  let hoursFortnight1 = 0;
  let netFortnight1 = 0;

  let hoursFortnight2 = 0;
  let netFortnight2 = 0;

  const monthlyActiveEntries = [];

  // Parse entries belonging to selected month
  Object.keys(state.overtimeEntries).forEach(dateStr => {
    if (dateStr.startsWith(`2026-${paddedMonth}-`)) {
      const entry = state.overtimeEntries[dateStr];
      if (entry.hours > 0) {
        const pricing = getDayTypeAndRate(dateStr);
        const calc = calculateEarnings(entry.hours, pricing.rate, state.settings.irpf, state.settings.safety);
        
        totalHours += entry.hours;
        totalGross += calc.gross;
        totalNet += calc.net;

        // Categorize logs
        if (pricing.type === "workday") {
          hoursWorkday += entry.hours;
          grossWorkday += calc.gross;
        } else if (pricing.type === "saturday") {
          hoursSaturday += entry.hours;
          grossSaturday += calc.gross;
        } else if (pricing.type === "holiday") {
          hoursHoliday += entry.hours;
          grossHoliday += calc.gross;
        }

        // Fortnight division (day 1-15 vs 16+)
        const dayOfMonth = parseInt(dateStr.split("-")[2]);
        if (dayOfMonth <= 15) {
          hoursFortnight1 += entry.hours;
          netFortnight1 += calc.net;
        } else {
          hoursFortnight2 += entry.hours;
          netFortnight2 += calc.net;
        }

        // Add to active log list
        monthlyActiveEntries.push({
          dateStr: dateStr,
          hours: entry.hours,
          gross: calc.gross,
          net: calc.net,
          pricing: pricing
        });
      }
    }
  });

  // Calculate dynamic retention rate
  const totalDeductionPercent = state.settings.irpf + state.settings.safety;

  // Render KPI Metrics
  DOM.metricTotalHours.textContent = totalHours.toFixed(1);
  DOM.metricTotalGross.textContent = totalGross.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  DOM.metricTotalNet.textContent = totalNet.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  DOM.metricNetRateText.textContent = `Retención combinada: ${totalDeductionPercent.toFixed(2)}%`;

  // Render Hour Type Desglose Progress Bars
  DOM.bdWorkdayHours.textContent = `${hoursWorkday.toFixed(1)}h`;
  DOM.bdWorkdayGross.textContent = `${grossWorkday.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  
  DOM.bdSaturdayHours.textContent = `${hoursSaturday.toFixed(1)}h`;
  DOM.bdSaturdayGross.textContent = `${grossSaturday.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  DOM.bdHolidayHours.textContent = `${hoursHoliday.toFixed(1)}h`;
  DOM.bdHolidayGross.textContent = `${grossHoliday.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  // Render Fortnights Summary Cards
  DOM.fortnight1Hours.textContent = `${hoursFortnight1.toFixed(1)}h`;
  DOM.fortnight1Net.textContent = `${netFortnight1.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  DOM.fortnight2Hours.textContent = `${hoursFortnight2.toFixed(1)}h`;
  DOM.fortnight2Net.textContent = `${netFortnight2.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  // Set progressive widths (cap at maximum category logged or target of 30 hours)
  const maxHoursBase = Math.max(hoursWorkday, hoursSaturday, hoursHoliday, 10);
  DOM.bdWorkdayProgress.style.width = `${(hoursWorkday / maxHoursBase) * 100}%`;
  DOM.bdSaturdayProgress.style.width = `${(hoursSaturday / maxHoursBase) * 100}%`;
  DOM.bdHolidayProgress.style.width = `${(hoursHoliday / maxHoursBase) * 100}%`;

  // Sort monthly entries chronologically (newest first)
  monthlyActiveEntries.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Render monthly list
  DOM.logListCounter.textContent = `${monthlyActiveEntries.length} ${monthlyActiveEntries.length === 1 ? 'día' : 'días'}`;
  DOM.monthlyLogList.innerHTML = "";

  if (monthlyActiveEntries.length === 0) {
    DOM.monthlyLogList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <p>No hay horas extras registradas en este mes.</p>
      </div>
    `;
    return;
  }

  monthlyActiveEntries.forEach(item => {
    const d = new Date(item.dateStr);
    const dayOfWeekShort = DAY_NAMES_LONG[d.getDay()].substring(0, 3);
    const formattedDate = `${dayOfWeekShort} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;

    const logItem = document.createElement("div");
    logItem.className = "log-item";
    
    // Tag formatting
    let tagClass = "workday-tag";
    let tagLabel = "Laborable";
    if (item.pricing.type === "saturday") {
      tagClass = "saturday-tag";
      tagLabel = "Sábado";
    } else if (item.pricing.type === "holiday") {
      tagClass = "holiday-tag";
      tagLabel = "Festivo";
    }

    logItem.innerHTML = `
      <div class="log-item-left">
        <span class="log-date">${formattedDate}</span>
      </div>
      <div class="log-item-right">
        <span class="log-rate-tag ${tagClass}">${tagLabel}</span>
        <div class="log-item-metrics">
          <span class="log-hours">${item.hours.toFixed(1)}h</span>
          <span class="log-income">+${item.net.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        </div>
      </div>
    `;

    // Click list item to trigger editor bottom sheet instantly
    logItem.addEventListener("click", () => {
      // Switch view to calendar tab to edit contextually
      switchView("view-calendar");
      state.currentMonth = d.getMonth();
      renderCalendar();
      selectAndLogDate(item.dateStr);
    });

    DOM.monthlyLogList.appendChild(logItem);
  });
}

function switchView(targetViewId) {
  DOM.views.forEach(view => {
    if (view.id === targetViewId) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });

  DOM.tabs.forEach(tab => {
    if (tab.dataset.view === targetViewId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Specific view load integrations
  if (targetViewId === "view-resumen") {
    // Sync month selection
    DOM.resumenMonthSelect.value = state.currentMonth;
    renderSummary();
  } else if (targetViewId === "view-calendar") {
    renderCalendar();
  }
}

/* ==========================================================================
   7. BACKUP DATA & DEMO INJECTOR
   ========================================================================== */

function loadDemoData() {
  // Inject mock hours for May 2026 and June 2026
  const demoEntries = {
    // MAYO 2026 OVERTIME ENTRIES
    "2026-05-04": { hours: 2.0 },
    "2026-05-06": { hours: 1.5 },
    "2026-05-09": { hours: 4.0 }, // Saturday
    "2026-05-12": { hours: 2.5 },
    "2026-05-18": { hours: 3.0 },
    "2026-05-23": { hours: 5.0 }, // Saturday
    "2026-05-25": { hours: 4.0 }, // Holiday! (Monday 25th May 2026)
    "2026-05-28": { hours: 1.0 },
    
    // JUNIO 2026 OVERTIME ENTRIES
    "2026-06-02": { hours: 2.0 },
    "2026-06-06": { hours: 4.5 }, // Saturday
    "2026-06-11": { hours: 1.5 },
    "2026-06-19": { hours: 3.5 },
    "2026-06-24": { hours: 8.0 } // Holiday! (Wednesday 24th June 2026)
  };

  state.overtimeEntries = demoEntries;
  state.currentMonth = 4; // Reset view to May 2026
  
  saveState();
  renderCalendar();
  showToast("Datos de demostración cargados");
}

function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Control_Horas_Extras_Metal_2026.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Copia de seguridad descargada");
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      
      // Basic validations
      if (importedState.overtimeEntries && importedState.settings) {
        state.overtimeEntries = importedState.overtimeEntries;
        state.settings = importedState.settings;
        if (typeof importedState.currentMonth === "number") {
          state.currentMonth = importedState.currentMonth;
        }
        
        saveState();
        renderCalendar();
        showToast("Copia de seguridad restaurada");
      } else {
        alert("Formato de archivo inválido.");
      }
    } catch (err) {
      alert("Error al leer el archivo de copia de seguridad.");
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm("¿Estás seguro de que quieres restablecer todos los datos? Esta acción es irreversible.")) {
    state.overtimeEntries = {};
    state.settings = { irpf: 15.29, safety: 6.50 };
    state.currentMonth = 4; // May 2026
    
    // Reset inputs
    DOM.irpfSlider.value = 15.29;
    DOM.safetySlider.value = 6.50;
    updateTaxSettings();

    saveState();
    renderCalendar();
    showToast("Aplicación restablecida con éxito");
  }
}

/* ==========================================================================
   8. INTERACTION EVENT LISTENERS & INITS
   ========================================================================== */

function initializeEventListeners() {
  // Navigation Tabs binding
  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetView = tab.dataset.view;
      switchView(targetView);
    });
  });

  // Calendar month buttons
  DOM.prevMonthBtn.addEventListener("click", () => {
    if (state.currentMonth > 0) {
      state.currentMonth--;
      saveState();
      renderCalendar();
    }
  });

  DOM.nextMonthBtn.addEventListener("click", () => {
    if (state.currentMonth < 11) {
      state.currentMonth++;
      saveState();
      renderCalendar();
    }
  });

  // Summary Month Selector dropdown
  DOM.resumenMonthSelect.addEventListener("change", () => {
    state.currentMonth = parseInt(DOM.resumenMonthSelect.value);
    saveState();
    renderSummary();
  });

  // Settings Sliders
  DOM.irpfSlider.addEventListener("input", updateTaxSettings);
  DOM.safetySlider.addEventListener("input", updateTaxSettings);

  // Backup handlers
  DOM.btnLoadDemo.addEventListener("click", loadDemoData);
  DOM.btnExport.addEventListener("click", exportBackup);
  DOM.btnImportTrigger.addEventListener("click", () => DOM.btnImportFile.click());
  DOM.btnImportFile.addEventListener("change", importBackup);
  DOM.btnResetData.addEventListener("click", resetAllData);

  // Drawer modal controls
  DOM.btnCloseLogger.addEventListener("click", closeLogger);
  
  // Close when tapping backdrop area
  DOM.loggerModal.addEventListener("click", (e) => {
    if (e.target === DOM.loggerModal) closeLogger();
  });

  // Slider change updates numbers in real time
  DOM.loggerHoursRange.addEventListener("input", () => {
    const hours = parseFloat(DOM.loggerHoursRange.value);
    DOM.loggerHoursText.textContent = hours.toFixed(1);
    
    const pricing = getDayTypeAndRate(state.selectedDate);
    updateLiveProjections(hours, pricing.rate);
    updatePresetButtonsState(hours);
  });

  // Increment and Decrement button clicks (+-0.5)
  DOM.btnHourMinus.addEventListener("click", () => {
    let val = parseFloat(DOM.loggerHoursRange.value);
    if (val > 0) {
      val = Math.max(0, val - 0.5);
      DOM.loggerHoursRange.value = val;
      DOM.loggerHoursText.textContent = val.toFixed(1);
      
      const pricing = getDayTypeAndRate(state.selectedDate);
      updateLiveProjections(val, pricing.rate);
      updatePresetButtonsState(val);
    }
  });

  DOM.btnHourPlus.addEventListener("click", () => {
    let val = parseFloat(DOM.loggerHoursRange.value);
    if (val < 16) {
      val = Math.min(16, val + 0.5);
      DOM.loggerHoursRange.value = val;
      DOM.loggerHoursText.textContent = val.toFixed(1);
      
      const pricing = getDayTypeAndRate(state.selectedDate);
      updateLiveProjections(val, pricing.rate);
      updatePresetButtonsState(val);
    }
  });

  // Preset quick selections binding
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const pricing = getDayTypeAndRate(state.selectedDate);
      
      if (btn.id === "btn-preset-reset") {
        DOM.loggerHoursRange.value = 0;
        DOM.loggerHoursText.textContent = "0.0";
        updateLiveProjections(0, pricing.rate);
        updatePresetButtonsState(0);
      } else {
        const val = parseFloat(btn.dataset.value);
        DOM.loggerHoursRange.value = val;
        DOM.loggerHoursText.textContent = val.toFixed(1);
        updateLiveProjections(val, pricing.rate);
        updatePresetButtonsState(val);
      }
    });
  });

  // Save changes handler
  DOM.btnSaveEntry.addEventListener("click", () => {
    const hours = parseFloat(DOM.loggerHoursRange.value);

    if (hours > 0) {
      state.overtimeEntries[state.selectedDate] = {
        hours: hours
      };
    } else {
      // If hours is 0, treat it as deleted/empty
      delete state.overtimeEntries[state.selectedDate];
    }

    saveState();
    closeLogger();
    renderCalendar();
    showToast("Registro guardado con éxito");
  });

  // Delete change handler
  DOM.btnDeleteEntry.addEventListener("click", () => {
    delete state.overtimeEntries[state.selectedDate];
    saveState();
    closeLogger();
    renderCalendar();
    showToast("Registro eliminado con éxito");
  });
}

// MAIN BOOTSTRAP INITIALIZATION
function init() {
  // Load local database
  loadState();

  // Sync sliders to state
  DOM.irpfSlider.value = state.settings.irpf;
  DOM.safetySlider.value = state.settings.safety;
  
  DOM.irpfDisplay.textContent = `${state.settings.irpf.toFixed(2)}%`;
  DOM.safetyDisplay.textContent = `${state.settings.safety.toFixed(2)}%`;
  
  const totalDeduction = state.settings.irpf + state.settings.safety;
  DOM.totalDeductionDisplay.textContent = `${totalDeduction.toFixed(2)}%`;

  // Bind all interactive events
  initializeEventListeners();

  // Load calendar view
  renderCalendar();
}

// Start app on document ready
document.addEventListener("DOMContentLoaded", init);

// Register Service Worker for PWA (offline mode and installable launcher)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("Service Worker registrado con éxito", reg))
      .catch(err => console.error("Error al registrar Service Worker", err));
  });
}
