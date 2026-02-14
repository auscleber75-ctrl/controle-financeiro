// Controle de Grana (tabs + finanças simples + dívidas completas)

const $ = (id) => document.getElementById(id);

// ====== FINANÇAS SIMPLES (1 dívida total) ======
const KEY = "cg_finance_full_v1";

const defaultState = {
  incomeYou: 7200,
  incomeWife: 3000,
  incomeExtra: 0,
  fixedCosts: 4380,

  // modo simples (1 dívida total)
  debtTotal: 60000,
  debtPay: 2000,

  reserveTotal: 0,
  reserveAdd: 200,

  goalDebtDate: "",
  goalReserveMonths: 6,

  dailyValue: 240,
  dailyFixed: 146,

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

function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

function calcSimple(state){
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
  if(!body) return;
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

function updateDaily(state){
  const d = Math.max(0, num(state.dailyValue));
  const f = Math.max(0, num(state.dailyFixed));
  const left = d - f;
  $("dailyLeft").textContent = money(left);
  $("dailyLeftMonth").textContent = money(left * 30);
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

  $("dailyValue").value = state.dailyValue ?? "";
  $("dailyFixed").value = state.dailyFixed ?? "";

  // summary
  const c = calcSimple(state);
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
  updateDaily(state);
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
    dailyValue: num($("dailyValue").value),
    dailyFixed: num($("dailyFixed").value),
  };
}

// ====== TABS ======
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

// ====== EXPORT/IMPORT ======
function exportJSON(state){
  const pack = {
    finance: state,
    debts: debtsDB
  };
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "controle-financeiro-pack.json";
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
      const finance = parsed.finance ? { ...structuredClone(defaultState), ...parsed.finance } : { ...structuredClone(defaultState), ...parsed };
      const debts = parsed.debts ? parsed.debts : null;
      onDone(finance, debts);
    }catch{
      alert("JSON inválido.");
    }
  };
  reader.readAsText(file);
}

// ====== DÍVIDAS COMPLETO ======
const DEBTS_KEY = "cg_debts_full_v1";

function loadDebts(){
  try{
    const raw = localStorage.getItem(DEBTS_KEY);
    if(!raw) return { budgetMonthly: 2000, strategy:"avalanche", debts: [], payments: [] };
    return { budgetMonthly: 2000, strategy:"avalanche", debts: [], payments: [], ...JSON.parse(raw) };
  }catch{
    return { budgetMonthly: 2000, strategy:"avalanche", debts: [], payments: [] };
  }
}

function saveDebts(db){
  localStorage.setItem(DEBTS_KEY, JSON.stringify(db));
}

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function fmtMoney(n){
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

let debtsDB = loadDebts();
let editingDebtId = null;
let payingDebtId = null;

function openDebtModal(mode, debt){
  const modal = $("debtModal");
  modal.classList.remove("hidden");

  $("debtModalTitle").textContent = mode === "edit" ? "Editar dívida" : "Nova dívida";
  $("btnDeleteDebt").classList.toggle("hidden", mode !== "edit");

  $("debtName").value = debt?.name ?? "";
  $("debtBalance").value = debt?.balance ?? "";
  $("debtAprMonthly").value = debt?.aprMonthlyPct ?? "";
  $("debtMinPay").value = debt?.minPayMonthly ?? "";
  $("debtDueDay").value = debt?.dueDay ?? "";

  editingDebtId = debt?.id ?? null;
}

function closeDebtModal(){
  $("debtModal").classList.add("hidden");
  editingDebtId = null;
}

function openPayModal(debtId){
  payingDebtId = debtId;
  const d = debtsDB.debts.find(x=>x.id===debtId);
  $("payModalTitle").textContent = `Registrar pagamento: ${d?.name || ""}`;
  $("payAmount").value = "";
  $("payDate").value = todayISO();
  $("payModal").classList.remove("hidden");
}

function closePayModal(){
  $("payModal").classList.add("hidden");
  payingDebtId = null;
}

function registerPayment(debtId, amount, dateISO){
  const debt = debtsDB.debts.find(d=>d.id===debtId);
  if(!debt) return;

  const a = Math.max(0, Number(amount)||0);
  if(a <= 0) return;

  const old = Math.max(0, Number(debt.balance)||0);
  const newBal = Math.max(0, old - a);
  debt.balance = Number(newBal.toFixed(2));

  debtsDB.payments = debtsDB.payments || [];
  debtsDB.payments.push({
    id: uid(),
    debtId,
    amount: a,
    date: dateISO || todayISO()
  });

  saveDebts(debtsDB);
}

function runProjection(){
  const debts0 = (debtsDB.debts || []).map(d=>({
    id: d.id,
    name: d.name,
    balance: Math.max(0, Number(d.balance)||0),
    aprMonthlyPct: Math.max(0, Number(d.aprMonthlyPct)||0),
    minPayMonthly: Math.max(0, Number(d.minPayMonthly)||0),
  })).filter(d=>d.balance > 0);

  const budget = Math.max(0, Number(debtsDB.budgetMonthly)||0);
  if(debts0.length === 0) return { ok:true, months:0 };
  if(budget <= 0) return { ok:false, msg:"Defina aporte mensal" };

  let debts = debts0.map(d=>({ ...d }));
  let months = 0;
  const MAX_MONTHS = 600;

  while(months < MAX_MONTHS){
    const totalBal = debts.reduce((s,d)=>s+d.balance,0);
    if(totalBal <= 0.009) break;
    months++;

    // juros
    debts.forEach(d=>{
      const r = (d.aprMonthlyPct/100);
      if(r > 0 && d.balance > 0) d.balance = d.balance * (1 + r);
    });

    let remaining = budget;

    // mínimos
    for(const d of debts){
      if(d.balance <= 0) continue;
      const pay = Math.min(d.minPayMonthly, d.balance, remaining);
      d.balance -= pay;
      remaining -= pay;
      if(remaining <= 0) break;
    }

    // extra
    if(remaining > 0){
      const active = debts.filter(d=>d.balance > 0);
      active.sort((a,b)=>{
        if(debtsDB.strategy === "snowball"){
          return a.balance - b.balance;
        }
        return (b.aprMonthlyPct - a.aprMonthlyPct) || (b.balance - a.balance);
      });

      if(active.length){
        const t = active[0];
        const pay = Math.min(t.balance, remaining);
        t.balance -= pay;
        remaining -= pay;
      }
    }

    debts.forEach(d=>{
      if(d.balance < 0.01) d.balance = 0;
    });
  }

  if(months >= MAX_MONTHS) return { ok:false, msg:"Não converge (juros > pagamento)" };
  return { ok:true, months };
}

function renderDebts(){
  // Sync controls
  const budgetEl = $("debtBudgetMonthly");
  const stratEl = $("debtStrategy");
  if(budgetEl) budgetEl.value = (debtsDB.budgetMonthly ?? 0);
  if(stratEl) stratEl.value = debtsDB.strategy || "avalanche";

  const body = $("debtsBody");
  if(!body) return;
  body.innerHTML = "";

  const debts = Array.isArray(debtsDB.debts) ? debtsDB.debts : [];

  if(debts.length === 0){
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Nenhuma dívida cadastrada. Clique em “+ Nova dívida”.";
    td.style.color = "rgba(168,183,214,.9)";
    tr.appendChild(td);
    body.appendChild(tr);
  }else{
    debts.forEach(d=>{
      const tr = document.createElement("tr");
      const apr = (Number(d.aprMonthlyPct) || 0).toFixed(2) + "%";
      const minPay = fmtMoney(Number(d.minPayMonthly) || 0);
      const due = d.dueDay ? `dia ${d.dueDay}` : "—";
      const isQuit = (Number(d.balance) || 0) <= 0;

      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(d.name || "Dívida")}</strong><br/>
          <span class="badge ${isQuit ? "green":"red"}">${isQuit ? "Quitada" : "Ativa"}</span>
        </td>
        <td>${fmtMoney(Number(d.balance) || 0)}</td>
        <td>${apr}</td>
        <td>${minPay}</td>
        <td>${due}</td>
        <td>
          <div class="actionBtns">
            <button type="button" class="btn" data-act="pay" data-id="${d.id}">Pagar</button>
            <button type="button" class="btn ghost" data-act="edit" data-id="${d.id}">Editar</button>
            <button type="button" class="btn danger" data-act="del" data-id="${d.id}">Remover</button>
          </div>
        </td>
      `;
      body.appendChild(tr);
    });
  }

  const total = debts.reduce((s,d)=> s + Math.max(0, Number(d.balance)||0), 0);
  const minTotal = debts.reduce((s,d)=> s + Math.max(0, Number(d.minPayMonthly)||0), 0);
  const paidTotal = (debtsDB.payments || []).reduce((s,p)=> s + Math.max(0, Number(p.amount)||0), 0);

  $("debtsTotal").textContent = fmtMoney(total);
  $("debtsMinTotal").textContent = fmtMoney(minTotal);
  $("debtsPaidTotal").textContent = fmtMoney(paidTotal);

  const proj = runProjection();
  $("debtsETA").textContent = proj.ok ? `${proj.months} mês(es)` : proj.msg;
}

function initDebtsUI(){
  $("debtBudgetMonthly")?.addEventListener("input", ()=>{
    debtsDB.budgetMonthly = Math.max(0, Number($("debtBudgetMonthly").value)||0);
    saveDebts(debtsDB);
    renderDebts();
  });

  $("debtStrategy")?.addEventListener("change", ()=>{
    debtsDB.strategy = $("debtStrategy").value;
    saveDebts(debtsDB);
    renderDebts();
  });

  $("btnAddDebt")?.addEventListener("click", ()=> openDebtModal("new", null));
  $("btnRunProjection")?.addEventListener("click", renderDebts);

  $("btnCloseDebtModal")?.addEventListener("click", closeDebtModal);
  $("btnClosePayModal")?.addEventListener("click", closePayModal);

  $("btnSaveDebt")?.addEventListener("click", ()=>{
    const name = ($("debtName").value || "").trim();
    const balance = Math.max(0, Number($("debtBalance").value)||0);
    const aprMonthlyPct = Math.max(0, Number($("debtAprMonthly").value)||0);
    const minPayMonthly = Math.max(0, Number($("debtMinPay").value)||0);
    const dueDayRaw = Number($("debtDueDay").value)||0;
    const dueDay = dueDayRaw ? Math.min(31, Math.max(1, dueDayRaw)) : null;

    if(!name) return alert("Coloque um nome pra dívida.");
    if(balance <= 0) return alert("Saldo precisa ser maior que 0.");

    if(editingDebtId){
      const d = debtsDB.debts.find(x=>x.id===editingDebtId);
      if(!d) return;
      d.name = name;
      d.balance = Number(balance.toFixed(2));
      d.aprMonthlyPct = Number(aprMonthlyPct.toFixed(2));
      d.minPayMonthly = Number(minPayMonthly.toFixed(2));
      d.dueDay = dueDay;
    }else{
      debtsDB.debts.push({
        id: uid(),
        name,
        balance: Number(balance.toFixed(2)),
        aprMonthlyPct: Number(aprMonthlyPct.toFixed(2)),
        minPayMonthly: Number(minPayMonthly.toFixed(2)),
        dueDay
      });
    }

    saveDebts(debtsDB);
    closeDebtModal();
    renderDebts();
  });

  $("btnDeleteDebt")?.addEventListener("click", ()=>{
    if(!editingDebtId) return;
    if(!confirm("Remover essa dívida?")) return;
    debtsDB.debts = debtsDB.debts.filter(d=>d.id!==editingDebtId);
    saveDebts(debtsDB);
    closeDebtModal();
    renderDebts();
  });

  $("btnConfirmPay")?.addEventListener("click", ()=>{
    if(!payingDebtId) return;
    const amount = Math.max(0, Number($("payAmount").value)||0);
    const date = $("payDate").value || todayISO();
    if(amount <= 0) return alert("Informe um valor.");
    registerPayment(payingDebtId, amount, date);
    closePayModal();
    renderDebts();
  });

  $("debtsBody")?.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;

    if(act === "edit"){
      const d = debtsDB.debts.find(x=>x.id===id);
      openDebtModal("edit", d);
    }else if(act === "pay"){
      openPayModal(id);
    }else if(act === "del"){
      if(!confirm("Remover essa dívida?")) return;
      debtsDB.debts = debtsDB.debts.filter(d=>d.id!==id);
      saveDebts(debtsDB);
      renderDebts();
    }
  });

  renderDebts();
}

// ====== BOOT ======
let state = load();

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  updateUI(state);
  initDebtsUI();

  // Save buttons
  $("btnSave")?.addEventListener("click", ()=>{
    state = readStateFromInputs(state);
    saveState(state);
    updateUI(state);
  });

  document.querySelectorAll("[data-save]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state = readStateFromInputs(state);
      saveState(state);
      updateUI(state);
    });
  });

  // close month (simple mode snapshot)
  $("btnCloseMonth")?.addEventListener("click", ()=>{
    state = readStateFromInputs(state);
    const c = calcSimple(state);

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

    state.debtTotal = c.debtAfter;
    state.reserveTotal = c.reserveAfter;

    saveState(state);
    updateUI(state);
    openTab("history");
  });

  // clear history
  $("btnClearHistory")?.addEventListener("click", ()=>{
    if(!confirm("Limpar histórico?")) return;
    state.history = [];
    saveState(state);
    updateUI(state);
  });

  // export/import pack
  $("btnExport")?.addEventListener("click", ()=> exportJSON(state));
  $("fileImport")?.addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    importJSON(file, (financeState, debtsState)=>{
      state = financeState;
      if(debtsState){
        debtsDB = debtsState;
        saveDebts(debtsDB);
      }
      saveState(state);
      updateUI(state);
      renderDebts();
      e.target.value = "";
    });
  });

  // reset
  $("btnReset")?.addEventListener("click", ()=>{
    if(!confirm("Zerar tudo? (apaga dados do navegador)")) return;
    state = structuredClone(defaultState);
    debtsDB = { budgetMonthly: 2000, strategy:"avalanche", debts: [], payments: [] };
    saveState(state);
    saveDebts(debtsDB);
    updateUI(state);
    renderDebts();
    openTab("dash");
  });

  // live update
  const liveIds = [
    "incomeYou","incomeWife","incomeExtra",
    "fixedCosts","debtTotal","debtPay",
    "reserveTotal","reserveAdd",
    "goalDebtDate","goalReserveMonths",
    "dailyValue","dailyFixed"
  ];
  liveIds.forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", ()=>{
      const temp = readStateFromInputs(state);
      updateUI(temp);
    });
  });
});
