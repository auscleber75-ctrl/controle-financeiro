// Controle de Grana v1 (tabs + localStorage)
const $ = (id) => document.getElementById(id);

const KEY = "cg_finance_tabs_v1";

const defaultState = {
  incomeYou: 7200,
  incomeWife: 3000,
  incomeExtra: 0,
  fixedCosts: 5000,
  debtTotal: 60000,
  debtPay: 4000,
  reserveTotal: 0,
  reserveAdd: 1200,
  goalDebtDate: "",
  goalReserveMonths: 6,
  history: []
};

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n){
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function monthKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

function addMonths(ym, months){
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m-1)+months, 1);
  return monthKey(d);
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  }catch{
    return structuredClone(defaultState);
  }
}

function save(state){
  localStorage.setItem(KEY, JSON.stringify(state));
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
  const reserveGoal6x = Math.max(0, fixed * 6);

  return { incomeTotal, fixed, debtPay, reserveAdd, aports, left, debtAfter, reserveAfter, monthsToPay, reserveGoal6x };
}

function renderHistory(state){
  const body = $("historyBody");
  body.innerHTML = "";

  const hist = Array.isArray(state.history) ? state.history : [];
  if(hist.length === 0){
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "Sem meses fechados ainda.";
    td.style.color = "#a8b7d6";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  for(const item of hist.slice().reverse()){
    const tr = document.createElement("tr");
    const cells = [
      item.month,
      money(item.incomeTotal),
      money(item.fixed),
      money(item.debtPay),
      money(item.reserveAdd),
      money(item.left),
      money(item.debtAfter),
      money(item.reserveAfter),
    ];
    cells.forEach(t=>{
      const td = document.createElement("td");
      td.textContent = t;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

function updateGoals(state){
  const nowYM = monthKey();
  const debtPay = num(state.debtPay);
  const debtTotal = num(state.debtTotal);

  let eta = "—";
  if(debtTotal === 0) eta = nowYM;
  else if(debtPay > 0) eta = addMonths(nowYM, Math.ceil(debtTotal / debtPay));

  $("goalDebtETA").textContent = eta;

  const goal = state.goalDebtDate || "";
  if(!goal) $("goalDebtStatus").textContent = "Defina uma data";
  else if(eta === "—") $("goalDebtStatus").textContent = "Sem aporte";
  else $("goalDebtStatus").textContent = (eta <= goal) ? "✅ Dentro da meta" : "⚠️ Fora da meta";

  const gm = Math.max(1, num(state.goalReserveMonths));
  const reserveGoal = num(state.fixedCosts) * gm;
  $("goalReserveValue").textContent = money(reserveGoal);

  const missing = Math.max(0, reserveGoal - num(state.reserveTotal));
  if(missing === 0) $("goalReserveETA").textContent = "✅ Já bateu";
  else if(num(state.reserveAdd) > 0) $("goalReserveETA").textContent = `${Math.ceil(missing / num(state.reserveAdd))} mês(es)`;
  else $("goalReserveETA").textContent = "Sem aporte";
}

function updateUI(state){
  // inputs
  $("incomeYou").value = state.incomeYou ?? "";
  $("incomeWife").value = state.incomeWife ?? "";
  $("incomeExtra").value = state.incomeExtra ?? "";
  $("fixedCosts").value = state.fixedCosts ?? "";
  $("debtTotal").value = state.debtTotal ?? "";
  $("debtPay").value = state.debtPay ?? "";
  $("reserveTotal").value = state.reserveTotal ?? "";
  $("reserveAdd").value = state.reserveAdd ?? "";
  $("goalDebtDate").value = state.goalDebtDate || "";
  $("goalReserveMonths").value = String(state.goalReserveMonths ?? 6);

  // summary
  const c = calc(state);
  $("sumIncome").textContent = money(c.incomeTotal);
  $("sumFixed").textContent = money(c.fixed);
  $("sumAports").textContent = money(c.aports);

  const leftEl = $("sumLeft");
  leftEl.textContent = money(c.left);
  leftEl.classList.toggle("good", c.left >= 0);
  leftEl.classList.toggle("bad", c.left < 0);

  $("sumDebtAfter").textContent = money(c.debtAfter);
  $("sumReserveAfter").textContent = money(c.reserveAfter);
  $("sumReserveGoal").textContent = money(c.reserveGoal6x);
  $("sumMonths").textContent = (c.monthsToPay === null) ? "—" : `${c.monthsToPay} mês(es)`;

  // bar
  const total = c.incomeTotal > 0 ? c.incomeTotal : 1;
  const pFixed = (c.fixed/total)*100;
  const pDebt = (c.debtPay/total)*100;
  const pReserve = (c.reserveAdd/total)*100;
  const pLeft = (Math.max(0,c.left)/total)*100;

  $("barFixed").style.width = `${Math.min(100, Math.max(0,pFixed))}%`;
  $("barDebt").style.width = `${Math.min(100, Math.max(0,pDebt))}%`;
  $("barReserve").style.width = `${Math.min(100, Math.max(0,pReserve))}%`;
  $("barLeft").style.width = `${Math.min(100, Math.max(0,pLeft))}%`;

  $("sumPerc").textContent = `Fixos ${pFixed.toFixed(0)}% • Dívida ${pDebt.toFixed(0)}% • Reserva ${pReserve.toFixed(0)}% • Sobra ${pLeft.toFixed(0)}%`;

  updateGoals(state);
  renderHistory(state);
}

function readStateFromInputs(state){
  return {
    ...state,
    incomeYou: num($("incomeYou").value),
    incomeWife: num($("incomeWife").value),
    incomeExtra: num($("incomeExtra").value),
    fixedCosts: num($("fixedCosts").value),
    debtTotal: num($("debtTotal").value),
    debtPay: num($("debtPay").value),
    reserveTotal: num($("reserveTotal").value),
    reserveAdd: num($("reserveAdd").value),
    goalDebtDate: $("goalDebtDate").value || "",
    goalReserveMonths: num($("goalReserveMonths").value),
  };
}

// ---------- Tabs (definitivo) ----------
function openTab(name){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
  document.querySelectorAll(".page").forEach(page=>{
    page.classList.toggle("active", page.id === `page-${name}`);
  });
  location.hash = name;
}

function initTabs(){
  const tabs = $("tabs");
  tabs.addEventListener("click", (e)=>{
    const btn = e.target.closest(".tab");
    if(!btn) return;
    openTab(btn.dataset.tab);
  });

  const initial = (location.hash || "").replace("#","") || "dash";
  openTab(initial);

  window.addEventListener("hashchange", ()=>{
    const name = (location.hash || "").replace("#","") || "dash";
    openTab(name);
  });
}

// ---------- Export / Import ----------
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
      const merged = { ...structuredClone(defaultState), ...parsed };
      onDone(merged);
    }catch{
      alert("JSON inválido.");
    }
  };
  reader.readAsText(file);
}

// ---------- Boot ----------
let state = load();

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  updateUI(state);

  // Save buttons
  $("btnSave").addEventListener("click", ()=>{
    state = readStateFromInputs(state);
    save(state);
    updateUI(state);
  });

  document.querySelectorAll("[data-save]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state = readStateFromInputs(state);
      save(state);
      updateUI(state);
    });
  });

  // Close month
  $("btnCloseMonth").addEventListener("click", ()=>{
    state = readStateFromInputs(state);
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

    const hist = Array.isArray(state.history) ? state.history : [];
    state.history = [...hist.filter(h => h.month !== entry.month), entry];

    // update totals after closing
    state.debtTotal = c.debtAfter;
    state.reserveTotal = c.reserveAfter;

    save(state);
    updateUI(state);
    openTab("history");
  });

  // Clear history
  $("btnClearHistory").addEventListener("click", ()=>{
    if(!confirm("Limpar histórico?")) return;
    state.history = [];
    save(state);
    updateUI(state);
  });

  // Export / Import
  $("btnExport").addEventListener("click", ()=> exportJSON(state));
  $("fileImport").addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    importJSON(file, (newState)=>{
      state = newState;
      save(state);
      updateUI(state);
      e.target.value = "";
    });
  });

  // Reset
  $("btnReset").addEventListener("click", ()=>{
    if(!confirm("Zerar tudo? (apaga dados do navegador)")) return;
    state = structuredClone(defaultState);
    save(state);
    updateUI(state);
    openTab("dash");
  });

  // Live update (opcional, dá sensação de app)
  const liveIds = [
    "incomeYou","incomeWife","incomeExtra",
    "fixedCosts","debtTotal","debtPay",
    "reserveTotal","reserveAdd",
    "goalDebtDate","goalReserveMonths"
  ];
  liveIds.forEach(id=>{
    $(id).addEventListener("input", ()=>{
      const temp = readStateFromInputs(state);
      updateUI(temp);
    });
  });
});
