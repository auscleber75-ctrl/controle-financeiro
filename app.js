const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "cg_finance_v2";
const PIN_KEY = "cg_finance_pin_v2";

const defaultState = {
  // Modes
  uberMode: "manual", // manual | auto | weekly
  workDays: 30,

  // Uber auto params
  uberDaily: 200,
  uberBonusPct: 20,

  // Weekly inputs
  w1: 0, w2: 0, w3: 0, w4: 0, w5: 0,

  // Finance inputs
  incomeYou: 7200,
  incomeWife: 3000,
  incomeExtra: 0,
  fixedCosts: 5000,
  debtPay: 4000,
  reserveAdd: 1200,
  debtTotal: 60000,
  reserveTotal: 0,

  // Goals
  goalDebtDate: "",
  goalReserveMonths: 6,

  // History
  history: []
};

// ---------- helpers ----------
function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function moneyBRL(n){
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function clampPercent(p){
  if(!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

function monthKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

function addMonths(ym, n){
  // ym: "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m-1)+n, 1);
  return monthKey(d);
}

function cmpYM(a, b){
  // returns -1,0,1 for YYYY-MM
  if(a === b) return 0;
  return a < b ? -1 : 1;
}

// Simple hash (local deterrent, not security)
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2,"0")).join("");
}

// ---------- storage ----------
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

// ---------- calculations ----------
function calcUberIncome(state){
  const mode = state.uberMode;

  if(mode === "auto"){
    const daily = num(state.uberDaily);
    const pct = num(state.uberBonusPct) / 100;
    const bonus = daily * pct;         // diária anterior fixada = diária
    const perDay = daily + bonus;
    const days = num(state.workDays);
    return perDay * days;
  }

  if(mode === "weekly"){
    return num(state.w1)+num(state.w2)+num(state.w3)+num(state.w4)+num(state.w5);
  }

  // manual
  return num(state.incomeYou);
}

function calc(state){
  const incomeYouComputed = calcUberIncome(state);

  const incomeTotal =
    num(incomeYouComputed) + num(state.incomeWife) + num(state.incomeExtra);

  const fixed = num(state.fixedCosts);
  const debtPay = num(state.debtPay);
  const reserveAdd = num(state.reserveAdd);
  const aports = debtPay + reserveAdd;
  const left = incomeTotal - fixed - aports;

  const debtAfter = Math.max(0, num(state.debtTotal) - debtPay);
  const reserveAfter = Math.max(0, num(state.reserveTotal) + reserveAdd);

  const monthsToPay = debtPay > 0 ? Math.ceil(num(state.debtTotal) / debtPay) : null;

  // default reserve goal in summary uses 6x fixed
  const reserveGoalAuto = Math.max(0, fixed * 6);

  return {
    incomeYouComputed,
    incomeTotal, fixed, debtPay, reserveAdd, aports, left,
    debtAfter, reserveAfter, monthsToPay,
    reserveGoalAuto
  };
}

// ---------- UI ----------
function setVisible(el, visible){
  el.classList.toggle("hidden", !visible);
}

function readInputs(state){
  return {
    ...state,
    uberMode: $("uberMode").value,
    workDays: num($("workDays").value),

    uberDaily: num($("uberDaily").value),
    uberBonusPct: num($("uberBonusPct").value),

    w1: num($("w1").value),
    w2: num($("w2").value),
    w3: num($("w3").value),
    w4: num($("w4").value),
    w5: num($("w5").value),

    incomeYou: num($("incomeYou").value),
    incomeWife: num($("incomeWife").value),
    incomeExtra: num($("incomeExtra").value),
    fixedCosts: num($("fixedCosts").value),
    debtPay: num($("debtPay").value),
    reserveAdd: num($("reserveAdd").value),
    debtTotal: num($("debtTotal").value),
    reserveTotal: num($("reserveTotal").value),

    goalDebtDate: $("goalDebtDate").value || "",
    goalReserveMonths: num($("goalReserveMonths").value)
  };
}

function updateModeUI(state){
  $("uberMode").value = state.uberMode;
  $("workDays").value = String(state.workDays);

  setVisible($("uberAutoBox"), state.uberMode === "auto");
  setVisible($("uberWeeklyBox"), state.uberMode === "weekly");

  // if auto/weekly, we still display computed income in incomeYou field
  const computed = calcUberIncome(state);
  if(state.uberMode !== "manual"){
    $("incomeYou").value = computed.toFixed(2);
    $("incomeYou").setAttribute("disabled","disabled");
  }else{
    $("incomeYou").removeAttribute("disabled");
  }
}

function updateSummaryUI(state){
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
  $("sumReserveGoal").textContent = moneyBRL(c.reserveGoalAuto);
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

  return c;
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

function updateGoalsUI(state, c){
  const nowYM = monthKey(new Date());
  const debtPay = num(state.debtPay);
  const debtTotal = num(state.debtTotal);

  // Debt ETA
  let etaYM = "—";
  if(debtPay > 0 && debtTotal > 0){
    const months = Math.ceil(debtTotal / debtPay);
    etaYM = addMonths(nowYM, months);
  }else if(debtTotal === 0){
    etaYM = nowYM;
  }
  $("goalDebtETA").textContent = etaYM === "—" ? "—" : etaYM;

  // Debt goal status
  const goal = state.goalDebtDate || "";
  if(!goal){
    $("goalDebtStatus").textContent = "Defina uma data";
  }else if(etaYM === "—"){
    $("goalDebtStatus").textContent = "Sem aporte definido";
  }else{
    $("goalDebtStatus").textContent =
      cmpYM(etaYM, goal) <= 0 ? "✅ Dentro da meta" : "⚠️ Fora da meta (precisa acelerar)";
  }

  // Reserve goal
  const goalMonths = Math.max(1, num(state.goalReserveMonths));
  const reserveGoal = Math.max(0, num(state.fixedCosts) * goalMonths);
  $("goalReserveValue").textContent = moneyBRL(reserveGoal);

  const reserveTotal = num(state.reserveTotal);
  const reserveAdd = num(state.reserveAdd);

  let reserveETA = "—";
  if(reserveTotal >= reserveGoal){
    reserveETA = "✅ Já bateu";
  }else if(reserveAdd > 0){
    const missing = reserveGoal - reserveTotal;
    const months = Math.ceil(missing / reserveAdd);
    reserveETA = `${months} mês(es)`;
  }else{
    reserveETA = "Sem aporte definido";
  }
  $("goalReserveETA").textContent = reserveETA;
}

// ---------- charts (no libs) ----------
function clearCanvas(ctx){
  ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
}

function drawAxes(ctx){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.lineTo(40, h-30);
  ctx.lineTo(w-20, h-30);
  ctx.stroke();
}

function drawText(ctx, text, x, y, alpha=1){
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(234,240,255,.9)";
  ctx.font = "12px system-ui";
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function drawAllocChart(state){
  const c = calc(state);
  const canvas = $("chartAlloc");
  const ctx = canvas.getContext("2d");
  clearCanvas(ctx);
  drawAxes(ctx);

  const total = c.incomeTotal > 0 ? c.incomeTotal : 1;

  const parts = [
    { name:"Fixos", v:c.fixed, col:"rgba(90,168,255,.85)" },
    { name:"Dívida", v:c.debtPay, col:"rgba(255,107,107,.85)" },
    { name:"Reserva", v:c.reserveAdd, col:"rgba(125,255,178,.85)" },
    { name:"Sobra", v:Math.max(0,c.left), col:"rgba(255,211,107,.85)" }
  ];

  const maxV = Math.max(...parts.map(p => p.v), 1);
  const chartW = canvas.width - 70;
  const chartH = canvas.height - 70;
  const baseX = 50;
  const baseY = canvas.height - 35;

  const barW = Math.floor(chartW / parts.length) - 18;

  parts.forEach((p, i) => {
    const x = baseX + i*(barW+18) + 10;
    const h = Math.round((p.v / maxV) * chartH);
    ctx.fillStyle = p.col;
    ctx.fillRect(x, baseY - h, barW, h);

    drawText(ctx, `${Math.round((p.v/total)*100)}%`, x, baseY - h - 8, 0.95);
    drawText(ctx, p.name, x, baseY + 14, 0.75);
  });

  drawText(ctx, "Distribuição do mês (R$)", 50, 16, 0.8);
}

function drawHistoryChart(state){
  const canvas = $("chartHistory");
  const ctx = canvas.getContext("2d");
  clearCanvas(ctx);
  drawAxes(ctx);

  const hist = Array.isArray(state.history) ? state.history.slice().sort((a,b)=>a.month.localeCompare(b.month)) : [];
  const points = hist.map(h => ({
    month: h.month,
    debt: num(h.debtAfter),
    reserve: num(h.reserveAfter)
  }));

  // include current snapshot as last point (not closed yet)
  const nowYM = monthKey(new Date());
  const c = calc(state);
  points.push({ month: nowYM, debt: num(state.debtTotal), reserve: num(state.reserveTotal) });

  const maxV = Math.max(...points.flatMap(p=>[p.debt,p.reserve]), 1);

  const w = canvas.width, h = canvas.height;
  const plotW = w - 70, plotH = h - 70;
  const left = 45, bottom = h - 35;

  function xy(i, v){
    const x = left + (points.length === 1 ? 0 : (i/(points.length-1))*plotW);
    const y = bottom - (v/maxV)*plotH;
    return {x,y};
  }

  // debt line
  ctx.strokeStyle = "rgba(255,107,107,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p,i)=>{
    const {x,y}=xy(i,p.debt);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // reserve line
  ctx.strokeStyle = "rgba(125,255,178,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p,i)=>{
    const {x,y}=xy(i,p.reserve);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // labels
  drawText(ctx, "Histórico: Dívida (vermelho) x Reserva (verde)", 50, 16, 0.8);

  // month labels (sparse)
  points.forEach((p,i)=>{
    if(points.length <= 6 || i===0 || i===points.length-1 || i%2===0){
      const {x}=xy(i,0);
      drawText(ctx, p.month, x-18, h-10, 0.55);
    }
  });

  drawText(ctx, `Topo ≈ ${moneyBRL(maxV)}`, 50, 36, 0.6);
}

// ---------- export/import ----------
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

// ---------- PIN / LOCK ----------
async function checkLock(){
  const pinHash = localStorage.getItem(PIN_KEY);
  if(!pinHash){
    $("lockScreen").classList.add("hidden");
    return;
  }
  $("lockScreen").classList.remove("hidden");
  $("pinInput").value = "";
  $("pinInput").focus();
}

async function unlock(){
  const pinHash = localStorage.getItem(PIN_KEY);
  if(!pinHash){
    $("lockScreen").classList.add("hidden");
    return;
  }
  const pin = $("pinInput").value || "";
  const h = await sha256(pin);
  if(h === pinHash){
    $("lockScreen").classList.add("hidden");
  }else{
    alert("PIN errado.");
    $("pinInput").value = "";
    $("pinInput").focus();
  }
}

async function setPin(){
  const a = $("pinNew").value || "";
  const b = $("pinConfirm").value || "";
  if(a.length < 4) return alert("PIN precisa ter pelo menos 4 números.");
  if(a !== b) return alert("PIN e confirmação não batem.");
  const h = await sha256(a);
  localStorage.setItem(PIN_KEY, h);
  $("pinNew").value = "";
  $("pinConfirm").value = "";
  alert("PIN salvo. Ao abrir o site, ele vai pedir o PIN.");
  await checkLock();
}

async function removePin(){
  localStorage.removeItem(PIN_KEY);
  alert("PIN removido.");
  $("lockScreen").classList.add("hidden");
}

// ---------- boot ----------
let state = loadState();

// init inputs
function hydrateInputs(state){
  $("uberMode").value = state.uberMode;
  $("workDays").value = String(state.workDays);

  $("uberDaily").value = state.uberDaily ?? "";
  $("uberBonusPct").value = state.uberBonusPct ?? "";

  $("w1").value = state.w1 ?? "";
  $("w2").value = state.w2 ?? "";
  $("w3").value = state.w3 ?? "";
  $("w4").value = state.w4 ?? "";
  $("w5").value = state.w5 ?? "";

  $("incomeYou").value = state.incomeYou ?? "";
  $("incomeWife").value = state.incomeWife ?? "";
  $("incomeExtra").value = state.incomeExtra ?? "";
  $("fixedCosts").value = state.fixedCosts ?? "";
  $("debtPay").value = state.debtPay ?? "";
  $("reserveAdd").value = state.reserveAdd ?? "";
  $("debtTotal").value = state.debtTotal ?? "";
  $("reserveTotal").value = state.reserveTotal ?? "";

  $("goalDebtDate").value = state.goalDebtDate || "";
  $("goalReserveMonths").value = String(state.goalReserveMonths ?? 6);

  updateModeUI(state);
}

function fullRender(){
  hydrateInputs(state);
  const c = updateSummaryUI(state);
  updateGoalsUI(state, c);
  renderHistory(state);
  drawAllocChart(state);
  drawHistoryChart(state);
}

fullRender();
checkLock();

// ---------- events ----------
$("btnUnlock").addEventListener("click", unlock);
$("pinInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") unlock(); });

$("btnSetPin").addEventListener("click", setPin);
$("btnRemovePin").addEventListener("click", removePin);

$("btnSave").addEventListener("click", () => {
  state = readInputs(state);
  // if auto/weekly, overwrite incomeYou with computed
  if(state.uberMode !== "manual"){
    state.incomeYou = calcUberIncome(state);
  }
  saveState(state);
  fullRender();
});

$("btnCloseMonth").addEventListener("click", () => {
  state = readInputs(state);
  if(state.uberMode !== "manual"){
    state.incomeYou = calcUberIncome(state);
  }

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
  const filtered = history.filter(h => h.month !== entry.month);
  state.history = [...filtered, entry];

  // Update totals to reflect closed month
  state.debtTotal = c.debtAfter;
  state.reserveTotal = c.reserveAfter;

  saveState(state);
  fullRender();
});

$("btnReset").addEventListener("click", () => {
  const ok = confirm("Tem certeza que quer zerar tudo? Isso apaga os dados do navegador.");
  if(!ok) return;
  state = structuredClone(defaultState);
  saveState(state);
  fullRender();
});

$("btnClearHistory").addEventListener("click", () => {
  const ok = confirm("Limpar histórico de meses fechados?");
  if(!ok) return;
  state.history = [];
  saveState(state);
  fullRender();
});

$("btnExport").addEventListener("click", () => exportJSON(state));

$("fileImport").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  importJSON(file, (newState) => {
    state = newState;
    saveState(state);
    fullRender();
    e.target.value = "";
  });
});

// live updates
const liveIds = [
  "uberMode","workDays","uberDaily","uberBonusPct",
  "w1","w2","w3","w4","w5",
  "incomeYou","incomeWife","incomeExtra","fixedCosts","debtPay","reserveAdd","debtTotal","reserveTotal",
  "goalDebtDate","goalReserveMonths"
];

liveIds.forEach(id => {
  $(id).addEventListener("input", () => {
    const temp = readInputs(state);
    updateModeUI(temp);

    // keep computed in the incomeYou field for auto/weekly
    if(temp.uberMode !== "manual"){
      const computed = calcUberIncome(temp);
      $("incomeYou").value = computed.toFixed(2);
      $("incomeYou").setAttribute("disabled","disabled");
      temp.incomeYou = computed;
    }else{
      $("incomeYou").removeAttribute("disabled");
    }

    const c = updateSummaryUI(temp);
    updateGoalsUI(temp, c);
    renderHistory(temp);
    drawAllocChart(temp);
    drawHistoryChart(temp);
  });
});

// mode change also re-renders
$("uberMode").addEventListener("change", () => {
  const temp = readInputs(state);
  updateModeUI(temp);
});

// ---------- Tabs (pages) ----------
function openTab(tabName){
  document.querySelectorAll(".tab").forEach(b=>{
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".page").forEach(p=>{
    p.classList.toggle("active", p.id === `page-${tabName}`);
  });
}

document.getElementById("tabs")?.addEventListener("click", (e)=>{
  const btn = e.target.closest(".tab");
  if(!btn) return;
  openTab(btn.dataset.tab);
});

// Default
openTab("dash");

// ---------- Extra save buttons by section ----------
document.getElementById("btnSaveCosts")?.addEventListener("click", ()=>{
  state = readInputs(state);
  if(state.uberMode !== "manual") state.incomeYou = calcUberIncome(state);
  saveState(state);
  fullRender();
});

document.getElementById("btnSaveDebts")?.addEventListener("click", ()=>{
  state = readInputs(state);
  if(state.uberMode !== "manual") state.incomeYou = calcUberIncome(state);
  saveState(state);
  fullRender();
});

document.getElementById("btnSaveReserve")?.addEventListener("click", ()=>{
  state = readInputs(state);
  if(state.uberMode !== "manual") state.incomeYou = calcUberIncome(state);
  saveState(state);
  fullRender();
});

// Mirror export/import buttons on History tab (optional)
document.getElementById("btnExport2")?.addEventListener("click", ()=> exportJSON(state));
document.getElementById("fileImport2")?.addEventListener("change", (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  importJSON(file, (newState) => {
    state = newState;
    saveState(state);
    fullRender();
    e.target.value = "";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  function openTab(tabName){
    document.querySelectorAll(".tab").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === tabName);
    });
    document.querySelectorAll(".page").forEach(p=>{
      p.classList.toggle("active", p.id === `page-${tabName}`);
    });
  }

  const tabs = document.getElementById("tabs");
  if(!tabs){
    console.error('Não achei o nav id="tabs".');
    return;
  }

  tabs.addEventListener("click", (e)=>{
    const btn = e.target.closest(".tab");
    if(!btn) return;
    openTab(btn.dataset.tab);
  });

  // abre a primeira aba automaticamente
  const first = tabs.querySelector(".tab")?.dataset.tab || "dash";
  openTab(first);
});
