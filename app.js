const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "cg_finance_v1";

const defaultState = {
  incomeYou: 7200,
  incomeWife: 3000,
  incomeExtra: 0,
  fixedCosts: 5000,
  debtPay: 4000,
  reserveAdd: 1200,
  debtTotal: 60000,
  reserveTotal: 0,
  history: []
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch{
    return structuredClone(defaultState);
  }
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function moneyBRL(n){
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampPercent(p){
  if(!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

function calc(state){
  const incomeTotal = num(state.incomeYou) + num(state.incomeWife) + num(state.incomeExtra);
  const fixed = num(state.fixedCosts);
  const debtPay = num(state.debtPay);
  const reserveAdd = num(state.reserveAdd);

  const aports = debtPay + reserveAdd;
  const left = incomeTotal - fixed - aports;

  const debtAfter = Math.max(0, num(state.debtTotal) - debtPay);
  const reserveAfter = Math.max(0, num(state.reserveTotal) + reserveAdd);

  const monthsToPay = debtPay > 0 ? Math.ceil(num(state.debtTotal) / debtPay) : null;
  const reserveGoal = Math.max(0, fixed * 6);

  return {
    incomeTotal, fixed, debtPay, reserveAdd, aports, left,
    debtAfter, reserveAfter, monthsToPay, reserveGoal
  };
}

function updateUI(state){
  // Inputs
  $("incomeYou").value = state.incomeYou ?? "";
  $("incomeWife").value = state.incomeWife ?? "";
  $("incomeExtra").value = state.incomeExtra ?? "";
  $("fixedCosts").value = state.fixedCosts ?? "";
  $("debtPay").value = state.debtPay ?? "";
  $("reserveAdd").value = state.reserveAdd ?? "";
  $("debtTotal").value = state.debtTotal ?? "";
  $("reserveTotal").value = state.reserveTotal ?? "";

  // Summary
  const c = calc(state);

  $("sumIncome").textContent = moneyBRL(c.incomeTotal);
  $("sumFixed").textContent = moneyBRL(c.fixed);
  $("sumAports").textContent = moneyBRL(c.aports);

  const leftEl = $("sumLeft");
  leftEl.textContent = moneyBRL(c.left);
  leftEl.classList.toggle("good", c.left >= 0);
  leftEl.classList.toggle("bad", c.left < 0);

  $("sumDebtAfter").textContent = moneyBRL(c.debtAfter);
  $("sumReserveAfter").textContent = moneyBRL(c.reserveAfter);
  $("sumReserveGoal").textContent = moneyBRL(c.reserveGoal);
  $("sumMonths").textContent = (c.monthsToPay === null) ? "—" : `${c.monthsToPay} mês(es)`;

  // Allocation bar
  const total = c.incomeTotal > 0 ? c.incomeTotal : 0;
  const pFixed = total ? (c.fixed / total) * 100 : 0;
  const pDebt = total ? (c.debtPay / total) * 100 : 0;
  const pReserve = total ? (c.reserveAdd / total) * 100 : 0;
  const pLeft = total ? (Math.max(0, c.left) / total) * 100 : 0;

  $("barFixed").style.width = `${clampPercent(pFixed)}%`;
  $("barDebt").style.width = `${clampPercent(pDebt)}%`;
  $("barReserve").style.width = `${clampPercent(pReserve)}%`;
  $("barLeft").style.width = `${clampPercent(pLeft)}%`;

  $("sumPerc").textContent =
    total
      ? `Fixos ${pFixed.toFixed(0)}% • Dívida ${pDebt.toFixed(0)}% • Reserva ${pReserve.toFixed(0)}% • Sobra ${pLeft.toFixed(0)}%`
      : "—";

  renderHistory(state);
}

function readInputs(state){
  return {
    ...state,
    incomeYou: num($("incomeYou").value),
    incomeWife: num($("incomeWife").value),
    incomeExtra: num($("incomeExtra").value),
    fixedCosts: num($("fixedCosts").value),
    debtPay: num($("debtPay").value),
    reserveAdd: num($("reserveAdd").value),
    debtTotal: num($("debtTotal").value),
    reserveTotal: num($("reserveTotal").value),
  };
}

function monthKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

function renderHistory(state){
  const body = $("historyBody");
  body.innerHTML = "";

  const history = Array.isArray(state.history) ? state.history : [];
  if(history.length === 0){
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "Sem meses fechados ainda.";
    td.style.color = "#9fb0d0";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  for(const item of history.slice().reverse()){
    const tr = document.createElement("tr");
    const cells = [
      item.month,
      moneyBRL(item.incomeTotal),
      moneyBRL(item.fixed),
      moneyBRL(item.debtPay),
      moneyBRL(item.reserveAdd),
      moneyBRL(item.left),
      moneyBRL(item.debtAfter),
      moneyBRL(item.reserveAfter),
    ];
    for(const txt of cells){
      const td = document.createElement("td");
      td.textContent = txt;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

function exportJSON(state){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "controle-financeiro.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSON(file, onDone){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(String(reader.result));
      // Merge com defaults pra não quebrar
      const merged = { ...structuredClone(defaultState), ...parsed };
      onDone(merged);
    }catch{
      alert("JSON inválido.");
    }
  };
  reader.readAsText(file);
}

// Boot
let state = loadState();
updateUI(state);

// Wire events
$("btnSave").addEventListener("click", () => {
  state = readInputs(state);
  saveState(state);
  updateUI(state);
});

$("btnCloseMonth").addEventListener("click", () => {
  state = readInputs(state);
  const c = calc(state);

  const entry = {
    month: monthKey(),
    incomeTotal: c.incomeTotal,
    fixed: c.fixed,
    debtPay: c.debtPay,
    reserveAdd: c.reserveAdd,
    left: c.left,
    debtAfter: c.debtAfter,
    reserveAfter: c.reserveAfter
  };

  const history = Array.isArray(state.history) ? state.history : [];
  // Evita duplicar o mesmo mês
  const filtered = history.filter(h => h.month !== entry.month);
  state.history = [...filtered, entry];

  // Atualiza "totais" pra refletir que você pagou/aportou esse mês
  state.debtTotal = c.debtAfter;
  state.reserveTotal = c.reserveAfter;

  saveState(state);
  updateUI(state);
});

$("btnReset").addEventListener("click", () => {
  const ok = confirm("Tem certeza que quer zerar tudo? Isso apaga os dados do navegador.");
  if(!ok) return;
  state = structuredClone(defaultState);
  saveState(state);
  updateUI(state);
});

$("btnClearHistory").addEventListener("click", () => {
  const ok = confirm("Limpar histórico de meses fechados?");
  if(!ok) return;
  state.history = [];
  saveState(state);
  updateUI(state);
});

$("btnExport").addEventListener("click", () => exportJSON(state));

$("fileImport").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  importJSON(file, (newState) => {
    state = newState;
    saveState(state);
    updateUI(state);
    e.target.value = "";
  });
});

// Auto-update summary as user types
[
  "incomeYou","incomeWife","incomeExtra","fixedCosts","debtPay","reserveAdd","debtTotal","reserveTotal"
].forEach(id => {
  $(id).addEventListener("input", () => {
    const temp = readInputs(state);
    updateUI(temp);
  });
});
