// ====== DATA LOAD ======
let balance = Number(localStorage.getItem('balance')) || 0;
let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
let subs = JSON.parse(localStorage.getItem('subscriptions') || '[]');
let balanceHistory = JSON.parse(localStorage.getItem('balanceHistory') || '[]');
let goals = JSON.parse(localStorage.getItem('goals') || '[]');
let incomes = JSON.parse(localStorage.getItem('incomes') || '[]');

// Seed history if empty
if (!Array.isArray(balanceHistory) || balanceHistory.length === 0) {
  balanceHistory = [{ time: Date.now(), balance }];
}

// ====== UI REFS ======
const balanceEl = document.getElementById('balance');
const expenseListEl = document.getElementById('expenseList');
const subListEl = document.getElementById('subList');
const chartNoteEl = document.getElementById('chartNote');
const subsChartNoteEl = document.getElementById('subsChartNote');
const balanceChartNoteEl = document.getElementById('balanceChartNote');
const balanceTooltipEl = document.getElementById('balanceTooltip');
const goalListEl = document.getElementById('goalList');
const statIncomeEl = document.getElementById('statIncome');
const statExpensesEl = document.getElementById('statExpenses');
const statNetEl = document.getElementById('statNet');
const streakTextEl = document.getElementById('streakText');
const achievementsTextEl = document.getElementById('achievementsText');
const expenseLogBodyEl = document.getElementById('expenseLogBody');
const themeToggleBtn = document.getElementById('themeToggle');

const addIncomeBtn = document.getElementById('addIncomeBtn');
const addExpenseBtn = document.getElementById('addExpenseBtn');
const addSubBtn = document.getElementById('addSubBtn');
const exportBtn = document.getElementById('exportBtn');
const importFileInput = document.getElementById('importFile');
const updateBalanceBtn = document.getElementById('updateBalanceBtn');
const addGoalBtn = document.getElementById('addGoalBtn');
const rangeButtons = document.querySelectorAll('.range-btn');
const filterTimeSel = document.getElementById('filterTime');
const filterCategorySel = document.getElementById('filterCategory');

// ====== THEME STATE ======
let theme = localStorage.getItem('theme') || 'dark';

// Apply theme on load (default = dark; light uses a class)
if (theme === 'light') {
  document.body.classList.add('light');
  if (themeToggleBtn) themeToggleBtn.textContent = '🌙 Dark';
} else {
  if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light';
}

// ====== STATE ======
const fallbackColors = [
  "#6366f1", "#ec4899", "#22c55e", "#f59e0b",
  "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6"
];
function getDefaultColor(i) { return fallbackColors[i % fallbackColors.length]; }

let currentRange = 'all'; // 'all' | '30' | '7'
let filterTime = 'all';
let filterCategory = 'all';

// ====== EVENT LISTENERS ======
if (addIncomeBtn) addIncomeBtn.addEventListener('click', addIncome);
if (addExpenseBtn) addExpenseBtn.addEventListener('click', addExpense);
if (addSubBtn) addSubBtn.addEventListener('click', addSubscription);
if (exportBtn) exportBtn.addEventListener('click', exportData);
if (importFileInput) importFileInput.addEventListener('change', importData);
if (updateBalanceBtn) updateBalanceBtn.addEventListener('click', updateBalance);
if (addGoalBtn) addGoalBtn.addEventListener('click', addGoal);
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

if (filterTimeSel) {
  filterTimeSel.addEventListener('change', () => {
    filterTime = filterTimeSel.value;
    renderExpenses();
    renderExpenseLog();
  });
}
if (filterCategorySel) {
  filterCategorySel.addEventListener('change', () => {
    filterCategory = filterCategorySel.value;
    renderExpenses();
    renderExpenseLog();
  });
}

rangeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRange = btn.dataset.range || 'all';
    drawBalanceChart();
  });
});

// ====== SAVE / HISTORY ======
function recordBalanceChange() {
  balanceHistory.push({ time: Date.now(), balance });
  if (balanceHistory.length > 1000) {
    balanceHistory = balanceHistory.slice(balanceHistory.length - 1000);
  }
}

function save() {
  localStorage.setItem('balance', balance);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  localStorage.setItem('subscriptions', JSON.stringify(subs));
  localStorage.setItem('balanceHistory', JSON.stringify(balanceHistory));
  localStorage.setItem('goals', JSON.stringify(goals));
  localStorage.setItem('incomes', JSON.stringify(incomes));
  localStorage.setItem('theme', theme);
}

// ====== RENDER ROOT ======
function render() {
  balanceEl.textContent = balance;
  renderExpenses();
  renderSubs();
  renderGoals();
  renderQuickStats();
  renderStreaksAndAchievements();
  renderExpenseLog();
  drawExpensesChart();
  drawSubsChart();
  drawBalanceChart();
}

// ====== THEME ======
function toggleTheme() {
  if (theme === 'dark') {
    // switch to light
    theme = 'light';
    document.body.classList.add('light');
    if (themeToggleBtn) themeToggleBtn.textContent = '🌙 Dark';
  } else {
    // switch to dark
    theme = 'dark';
    document.body.classList.remove('light');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light';
  }
  save();
}

// ====== BALANCE + INCOME / EXPENSES ======
function updateBalance() {
  const input = document.getElementById('updateBalanceInput');
  if (!input) return;
  const newBal = Number(input.value);
  if (isNaN(newBal)) {
    alert("Enter a valid number.");
    return;
  }
  balance = newBal;
  input.value = "";
  recordBalanceChange();
  save();
  render();
}

function addIncome() {
  const val = Number(document.getElementById('incomeInput').value);
  if (!val || val <= 0) {
    alert("Enter a valid amount.");
    return;
  }
  balance += val;
  document.getElementById('incomeInput').value = "";

  incomes.push({ id: Date.now(), amount: val, date: new Date().toISOString() });
  recordBalanceChange();
  save();
  render();
}

function addExpense() {
  const name = document.getElementById('expenseName').value.trim();
  const amt = Number(document.getElementById('expenseAmt').value);
  const cat = document.getElementById('expenseCategory').value || "General";
  const note = document.getElementById('expenseNote').value.trim();
  if (!name || !amt || amt <= 0) {
    alert("Enter valid name and amount.");
    return;
  }
  const now = new Date();
  const expense = {
    id: Date.now(),
    name,
    amt,
    category: cat,
    note,
    date: now.toISOString(),
    color: null
  };
  expenses.unshift(expense);
  balance -= amt;
  document.getElementById('expenseName').value = "";
  document.getElementById('expenseAmt').value = "";
  document.getElementById('expenseNote').value = "";
  recordBalanceChange();
  save();
  render();
}

// Filter helper
function passesFilters(e) {
  const d = e.date ? new Date(e.date) : new Date();
  const now = new Date();

  if (filterTime === 'month') {
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
  } else if (filterTime === '7') {
    const diff = now - d;
    if (diff > 7 * 24 * 60 * 60 * 1000) return false;
  }

  if (filterCategory !== 'all' && (e.category || 'General') !== filterCategory) return false;

  return true;
}

function renderExpenses() {
  expenseListEl.innerHTML = "";
  if (expenses.length === 0) {
    expenseListEl.innerHTML = "<div class='small'>No expenses yet</div>";
    return;
  }

  expenses.filter(passesFilters).forEach((e, index) => {
    const div = document.createElement('div');
    div.className = "list-item";

    const left = document.createElement('div');

    const nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.value = e.name;
    nameInput.className = "goal-label-input";
    nameInput.addEventListener('input', () => {
      e.name = nameInput.value;
      save();
      drawExpensesChart();
      renderExpenseLog();
    });

    const amtInput = document.createElement('input');
    amtInput.type = "number";
    amtInput.value = e.amt;
    amtInput.className = "goal-value-input";
    amtInput.addEventListener('change', () => {
      const newAmt = Number(amtInput.value);
      if (!newAmt || newAmt <= 0) {
        alert("Amount must be positive.");
        amtInput.value = e.amt;
        return;
      }
      const diff = newAmt - e.amt;
      e.amt = newAmt;
      balance -= diff;
      recordBalanceChange();
      save();
      render();
    });

    const catSelect = document.createElement('select');
    ["General","Food","Transport","Shopping","Bills","Fun","Other"].forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if ((e.category || "General") === c) opt.selected = true;
      catSelect.appendChild(opt);
    });
    catSelect.addEventListener('change', () => {
      e.category = catSelect.value;
      save();
      drawExpensesChart();
      renderExpenseLog();
    });

    const noteInput = document.createElement('input');
    noteInput.type = "text";
    noteInput.placeholder = "Note";
    noteInput.value = e.note || "";
    noteInput.className = "goal-label-input";
    noteInput.addEventListener('input', () => {
      e.note = noteInput.value;
      save();
      renderExpenseLog();
    });

    left.appendChild(nameInput);
    left.appendChild(amtInput);
    left.appendChild(catSelect);
    left.appendChild(noteInput);

    const controls = document.createElement('div');
    controls.className = 'list-item-controls';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    colorInput.value = e.color || getDefaultColor(index);
    colorInput.addEventListener('input', () => {
      e.color = colorInput.value;
      save();
      drawExpensesChart();
    });

    const btn = document.createElement("button");
    btn.textContent = "Delete";
    btn.classList.add("danger");
    btn.addEventListener('click', () => deleteExpense(e.id));

    controls.appendChild(colorInput);
    controls.appendChild(btn);

    div.appendChild(left);
    div.appendChild(controls);

    expenseListEl.appendChild(div);
  });
}

function deleteExpense(id) {
  const idx = expenses.findIndex(x => x.id === id);
  if (idx === -1) return;
  balance += expenses[idx].amt;
  expenses.splice(idx, 1);
  recordBalanceChange();
  save();
  render();
}

// ====== SUBSCRIPTIONS ======
function addSubscription() {
  const name = document.getElementById('subName').value.trim();
  const amt = Number(document.getElementById('subAmt').value);
  if (!name || !amt || amt <= 0) {
    alert("Enter valid subscription name and amount.");
    return;
  }
  const sub = { id: Date.now(), name, amt, color: null };
  subs.unshift(sub);
  document.getElementById('subName').value = "";
  document.getElementById('subAmt').value = "";
  save();
  render();
}

function renderSubs() {
  subListEl.innerHTML = "";
  if (subs.length === 0) {
    subListEl.innerHTML = "<div class='small'>No subscriptions</div>";
    return;
  }

  subs.forEach((s, index) => {
    const div = document.createElement('div');
    div.className = "list-item";

    const left = document.createElement('div');

    const nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.value = s.name;
    nameInput.className = "goal-label-input";
    nameInput.addEventListener('input', () => {
      s.name = nameInput.value;
      save();
      drawSubsChart();
    });

    const amtInput = document.createElement('input');
    amtInput.type = "number";
    amtInput.value = s.amt;
    amtInput.className = "goal-value-input";
    amtInput.addEventListener('change', () => {
      const newAmt = Number(amtInput.value);
      if (!newAmt || newAmt <= 0) {
        alert("Amount must be positive.");
        amtInput.value = s.amt;
        return;
      }
      s.amt = newAmt;
      save();
      drawSubsChart();
      renderSubs();
    });

    left.appendChild(nameInput);
    left.appendChild(amtInput);

    const controls = document.createElement('div');
    controls.className = 'list-item-controls';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    colorInput.value = s.color || getDefaultColor(index);
    colorInput.addEventListener('input', () => {
      s.color = colorInput.value;
      save();
      drawSubsChart();
    });

    const btn = document.createElement("button");
    btn.textContent = "Delete";
    btn.classList.add("danger");
    btn.addEventListener('click', () => deleteSub(s.id));

    controls.appendChild(colorInput);
    controls.appendChild(btn);

    div.appendChild(left);
    div.appendChild(controls);

    subListEl.appendChild(div);
  });
}

function deleteSub(id) {
  subs = subs.filter(s => s.id !== id);
  save();
  render();
}

// ====== GOALS ======
function addGoal() {
  const labelInput = document.getElementById('goalLabel');
  const valueInput = document.getElementById('goalValue');
  const colorInput = document.getElementById('goalColor');
  const label = labelInput.value.trim() || "Goal";
  const val = Number(valueInput.value);
  if (!val || val <= 0) {
    alert("Enter a positive amount for the goal.");
    return;
  }
  const color = colorInput.value || "#10b981";
  const goal = { id: Date.now(), label, value: val, color };
  goals.push(goal);
  labelInput.value = "";
  valueInput.value = "";
  save();
  renderGoals();
  drawBalanceChart();
}

function renderGoals() {
  goalListEl.innerHTML = "";
  if (!goals.length) {
    goalListEl.innerHTML = "<div class='small'>No goals yet. Add one above.</div>";
    return;
  }

  goals.forEach((g, index) => {
    const item = document.createElement('div');
    item.className = 'goal-item';

    const main = document.createElement('div');
    main.className = 'goal-main';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = g.label;
    labelInput.className = 'goal-label-input';
    labelInput.addEventListener('input', () => {
      g.label = labelInput.value;
      save();
      drawBalanceChart();
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.value = g.value;
    valueInput.className = 'goal-value-input';
    valueInput.addEventListener('change', () => {
      const newVal = Number(valueInput.value);
      if (!newVal || newVal <= 0) {
        alert("Amount must be positive.");
        valueInput.value = g.value;
        return;
      }
      g.value = newVal;
      save();
      drawBalanceChart();
    });

    main.appendChild(labelInput);
    main.appendChild(valueInput);

    const controls = document.createElement('div');
    controls.className = 'goal-controls';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    colorInput.value = g.color || getDefaultColor(index);
    colorInput.addEventListener('input', () => {
      g.color = colorInput.value;
      save();
      drawBalanceChart();
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = "Delete";
    delBtn.classList.add("danger");
    delBtn.addEventListener('click', () => {
      goals = goals.filter(goal => goal.id !== g.id);
      save();
      renderGoals();
      drawBalanceChart();
    });

    controls.appendChild(colorInput);
    controls.appendChild(delBtn);

    item.appendChild(main);
    item.appendChild(controls);
    goalListEl.appendChild(item);
  });
}

// ====== QUICK STATS (THIS MONTH) ======
function renderQuickStats() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();

  const monthIncome = incomes
    .filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((sum, i) => sum + i.amount, 0);

  const monthExpenses = expenses
    .filter(e => {
      if (!e.date) return true;
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((sum, e) => sum + e.amt, 0);

  const net = monthIncome - monthExpenses;

  statIncomeEl.textContent = "₹" + monthIncome;
  statExpensesEl.textContent = "₹" + monthExpenses;
  statNetEl.textContent = "₹" + net;
}

// ====== STREAKS & ACHIEVEMENTS ======
function renderStreaksAndAchievements() {
  // Activity streak = consecutive days with at least one expense or income
  const daysWithActivity = new Set();
  incomes.forEach(i => {
    const d = new Date(i.date);
    daysWithActivity.add(d.toDateString());
  });
  expenses.forEach(e => {
    const d = new Date(e.date || Date.now());
    daysWithActivity.add(d.toDateString());
  });

  const sortedDays = Array.from(daysWithActivity)
    .map(s => new Date(s))
    .sort((a, b) => a - b);

  let currentStreak = 0;
  let maxStreak = 0;
  if (sortedDays.length > 0) {
    currentStreak = 1;
    maxStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  streakTextEl.textContent = `${currentStreak} day(s) • best ${maxStreak}`;

  // Simple achievements
  const achievements = [];
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amt, 0);
  const net = totalIncome - totalExpenses;

  if (net >= 10000) achievements.push("💰 Saved ₹10,000+");
  if (goals.length >= 3) achievements.push("🎯 3+ goals set");
  if (maxStreak >= 7) achievements.push("🔥 7-day streak");
  if (expenses.length >= 50) achievements.push("📊 50+ expenses tracked");

  achievementsTextEl.textContent = achievements.length ? achievements.join(" · ") : "None yet";
}

// ====== EXPENSE LOG (TIMELINE) ======
function renderExpenseLog() {
  expenseLogBodyEl.innerHTML = "";
  if (!expenses.length) {
    expenseLogBodyEl.innerHTML = `<tr><td colspan="5" class="small">No expenses yet</td></tr>`;
    return;
  }

  const sorted = [...expenses].sort((a, b) => {
    const da = new Date(a.date || Date.now());
    const db = new Date(b.date || Date.now());
    return db - da; // latest first
  });

  sorted.filter(passesFilters).forEach(e => {
    const tr = document.createElement('tr');
    const d = new Date(e.date || Date.now());
    const dateStr = d.toLocaleDateString();
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.category || "General")}</td>
      <td>₹${e.amt}</td>
      <td>${escapeHtml(e.note || "")}</td>
    `;
    expenseLogBodyEl.appendChild(tr);
  });
}

// ====== EXPORT / IMPORT ======
function exportData() {
  const data = {
    balance,
    expenses,
    subs,
    balanceHistory,
    goals,
    incomes,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "budget.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (
        typeof data.balance !== "number" ||
        !Array.isArray(data.expenses) ||
        !Array.isArray(data.subs)
      ) {
        alert("Invalid file format.");
        return;
      }
      balance = data.balance;
      expenses = data.expenses;
      subs = data.subs;
      balanceHistory = Array.isArray(data.balanceHistory) && data.balanceHistory.length
        ? data.balanceHistory
        : [{ time: Date.now(), balance }];
      goals = Array.isArray(data.goals) ? data.goals : [];
      incomes = Array.isArray(data.incomes) ? data.incomes : [];
      save();
      render();
      alert("Data imported successfully!");
    } catch (err) {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

// ====== EXPENSES DONUT ======
function getThisMonthsExpenses() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return expenses.filter(e => {
    if (!e.date) return true;
    const d = new Date(e.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

function drawExpensesChart() {
  const canvas = document.getElementById('expensesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const monthExpenses = getThisMonthsExpenses();
  const totalsByName = {};
  const colorByName = {};

  monthExpenses.forEach((e, index) => {
    totalsByName[e.name] = (totalsByName[e.name] || 0) + e.amt;
    if (!colorByName[e.name]) {
      colorByName[e.name] = e.color || getDefaultColor(index);
    }
  });

  const labels = Object.keys(totalsByName);
  const values = labels.map(l => totalsByName[l]);
  const total = values.reduce((a, b) => a + b, 0);

  if (chartNoteEl) {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    chartNoteEl.textContent =
      total === 0
        ? `No expenses added for ${monthName} yet.`
        : `Total ${monthName} expenses: ₹${total}`;
  }

  if (total === 0) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("No data", w / 2, h / 2);
    return;
  }

  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 2 - 10;
  let startAngle = -Math.PI / 2;

  values.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const label = labels[index];
    const color = colorByName[label] || getDefaultColor(index);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    startAngle = endAngle;
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("₹" + total, centerX, centerY + 4);
}

// ====== SUBSCRIPTIONS DONUT ======
function drawSubsChart() {
  const canvas = document.getElementById('subsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const totalsByName = {};
  const colorByName = {};

  subs.forEach((s, index) => {
    totalsByName[s.name] = (totalsByName[s.name] || 0) + s.amt;
    if (!colorByName[s.name]) {
      colorByName[s.name] = s.color || getDefaultColor(index);
    }
  });

  const labels = Object.keys(totalsByName);
  const values = labels.map(l => totalsByName[l]);
  const total = values.reduce((a, b) => a + b, 0);

  if (subsChartNoteEl) {
    subsChartNoteEl.textContent =
      total === 0
        ? "No subscriptions yet."
        : `Total monthly subscriptions: ₹${total}`;
  }

  if (total === 0) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("No data", w / 2, h / 2);
    return;
  }

  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 2 - 10;
  let startAngle = -Math.PI / 2;

  values.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const label = labels[index];
    const color = colorByName[label] || getDefaultColor(index);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    startAngle = endAngle;
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("₹" + total, centerX, centerY + 4);
}

// ====== BALANCE LINE CHART ======
function drawBalanceChart() {
  const canvas = document.getElementById('balanceChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!Array.isArray(balanceHistory) || balanceHistory.length < 2) {
    if (balanceChartNoteEl) {
      balanceChartNoteEl.textContent = "Not enough data yet. Add/update balance a few times.";
    }
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Not enough data", w / 2, h / 2);
    return;
  }

  const allPoints = [...balanceHistory].sort((a, b) => a.time - b.time);
  const now = Date.now();
  let minTimeFilter = allPoints[0].time;
  if (currentRange === '30') minTimeFilter = now - 30 * 24 * 60 * 60 * 1000;
  else if (currentRange === '7') minTimeFilter = now - 7 * 24 * 60 * 60 * 1000;

  const points = allPoints.filter(p => p.time >= minTimeFilter);
  if (points.length < 2) {
    if (balanceChartNoteEl) {
      balanceChartNoteEl.textContent = "Not enough data in this range.";
    }
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Not enough data", w / 2, h / 2);
    return;
  }

  const balances = points.map(p => p.balance);
  let minB = Math.min(...balances);
  let maxB = Math.max(...balances);
  goals.forEach(g => {
    if (typeof g.value === "number") {
      minB = Math.min(minB, g.value);
      maxB = Math.max(maxB, g.value);
    }
  });

  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;

  if (balanceChartNoteEl) {
    const startDate = new Date(minTime).toLocaleDateString();
    const endDate = new Date(maxTime).toLocaleDateString();
    const labelRange = currentRange === 'all' ? "All time" :
      currentRange === '30' ? "Last 30 days" : "Last 7 days";
    balanceChartNoteEl.textContent = `${labelRange}: ${startDate} → ${endDate}`;
  }

  const margin = 30;
  const innerW = w - margin * 2;
  const innerH = h - margin * 2;
  let rangeB = maxB - minB;
  if (rangeB === 0) rangeB = 1;

  // Axes
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, h - margin);
  ctx.lineTo(w - margin, h - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, h - margin);
  ctx.stroke();

  // Goals lines
  goals.forEach((g) => {
    if (typeof g.value !== "number") return;
    const y = margin + (1 - (g.value - minB) / rangeB) * innerH;
    ctx.strokeStyle = g.color || "#10b981";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = g.color || "#10b981";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`${g.label} (₹${g.value})`, w - margin - 2, y - 2);
  });

  // Line
  ctx.beginPath();
  points.forEach((p, index) => {
    const tNorm = (p.time - minTime) / (maxTime - minTime || 1);
    const x = margin + tNorm * innerW;
    const y = margin + (1 - (p.balance - minB) / rangeB) * innerH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Points
  ctx.fillStyle = "#2563eb";
  points.forEach((p) => {
    const tNorm = (p.time - minTime) / (maxTime - minTime || 1);
    const x = margin + tNorm * innerW;
    const y = margin + (1 - (p.balance - minB) / rangeB) * innerH;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tooltip
  canvas.onmousemove = (evt) => {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    let closest = null;
    let closestDist = Infinity;

    points.forEach((p) => {
      const tNorm = (p.time - minTime) / (maxTime - minTime || 1);
      const px = margin + tNorm * innerW;
      const py = margin + (1 - (p.balance - minB) / rangeB) * innerH;
      const dx = x - px;
      const dy = y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = { p, px, py };
      }
    });

    if (!closest || closestDist > 20) {
      balanceTooltipEl.style.display = "none";
      return;
    }

    const date = new Date(closest.p.time);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    balanceTooltipEl.innerHTML =
      `<div><strong>₹${closest.p.balance}</strong></div>` +
      `<div>${dateStr} • ${timeStr}</div>`;

    balanceTooltipEl.style.display = "block";
    balanceTooltipEl.style.left = evt.clientX + "px";
    balanceTooltipEl.style.top = evt.clientY + "px";
  };

  canvas.onmouseleave = () => {
    balanceTooltipEl.style.display = "none";
  };
}

// ====== UTIL ======
function escapeHtml(text = "") {
  return text.replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c] || c));
}

// Initial render
render();
