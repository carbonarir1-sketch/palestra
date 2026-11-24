// ---------- utilità ----------
const $ = (s, el = document) => el.querySelector(s);

const store = {
  get(k, def) {
    try { const v = localStorage.getItem("pal_" + k); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(k, v) {
    try { localStorage.setItem("pal_" + k, JSON.stringify(v)); } catch {}
  }
};

const isoDate = (d = new Date()) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const today = () => isoDate();
const fmtDate = iso => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const fmtSec = s => { s = Number(s) || 0; return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`; };
const fmtNum = n => Number(n).toLocaleString("it-IT", { maximumFractionDigits: 1 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const exId = e => e.id || slug(e.nome);

const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const CHEV = `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;
const CUORE = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.4 3.2 5 6.6 5c2 0 3.4 1.1 4.2 2.3h2.4C14 6.1 15.4 5 17.4 5c3.4 0 5.5 3.4 4.1 6.7C19.5 16.4 12 21 12 21z"/></svg>`;
const NOMI_GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

// chi apre l'app la prima volta: niente scheda né dieta, solo l'invito a crearle
const benvenuto = tipo => `<section class="benvenuto">
    <div class="bv-ico">${tipo === "scheda"
      ? `<svg viewBox="0 0 24 24"><path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2 6 0 8v10"/></svg>`}</div>
    <h2>${tipo === "scheda" ? "Nessuna scheda, per ora" : "Nessuna dieta, per ora"}</h2>
    <p>${tipo === "scheda"
      ? "Carica la tua scheda da un PDF o un TXT, oppure scrivila a mano: qui troverai l'allenamento del giorno, il timer e i tuoi pesi."
      : "Carica la tua dieta da un PDF o un TXT, oppure scrivila a mano: qui troverai i pasti del giorno da spuntare."}</p>
    <button class="btn primary" data-f-apri="${tipo}">${tipo === "scheda" ? "Crea la tua scheda" : "Crea la tua dieta"}</button>
  </section>`;

const empty = (titolo, testo) => `<div class="empty"><h3>${esc(titolo)}</h3><p>${esc(testo)}</p></div>`;

// ---------- schede e diete: quella di base (data.js) + quelle caricate o create nell'app ----------
const PIANO_BASE = "base";
function getPiani() {
  const p = store.get("piani", {});
  return { schede: p.schede || [], diete: p.diete || [], scheda: p.scheda || PIANO_BASE, dieta: p.dieta || PIANO_BASE };
}
const listaDi = tipo => (tipo === "scheda" ? "schede" : "diete");
const baseDi = tipo => (tipo === "scheda" ? { ...SCHEDA, nome: SCHEDA.nome || "Scheda base" } : { ...DIETA, nome: DIETA.nome || "Dieta base" });
function pianoAttivo(tipo) {
  const p = getPiani(), id = p[tipo];
  return (id !== PIANO_BASE && p[listaDi(tipo)].find(x => x.id === id)) || baseDi(tipo);
}
const schedaAttiva = () => pianoAttivo("scheda");
const dietaAttiva = () => pianoAttivo("dieta");
const chiaveScelte = () => { const id = getPiani().dieta; return id === PIANO_BASE ? "scelte" : "scelte_" + id; };

// ---------- stato ----------
const state = {
  tab: store.get("tab", "allenamento"),
  giorno: store.get("giorno", 0),
  aperti: store.get("aperti", {}),
  esercizioGrafico: store.get("esGrafico", "")
};

// all'apertura mostra direttamente l'allenamento di oggi
function vaiAOggi() {
  const i = (schedaAttiva().giorni || []).findIndex(g => g.dow === new Date().getDay());
  state.giorno = i >= 0 ? i : 0;
}
vaiAOggi();

const TITOLI = { allenamento: "Allenamento", dieta: "Dieta", progressi: "Progressi" };

// colore dell'app, scelto in Progressi → Aspetto
const TEMI = [
  { id: "arancio", nome: "Arancio", colore: "#ff6b35" },
  { id: "blu", nome: "Blu", colore: "#3d8bff" },
  { id: "rosso", nome: "Rosso", colore: "#ff3b4f" },
  { id: "viola", nome: "Viola", colore: "#a78bfa" },
  { id: "lime", nome: "Lime", colore: "#c8f560" },
  { id: "grafite", nome: "Bianco", colore: "#f2f2f7" }
];
const temaAttuale = () => { const t = store.get("tema", "arancio"); return TEMI.some(x => x.id === t) ? t : "arancio"; };
const applicaTema = id => { document.documentElement.dataset.tema = id; };
applicaTema(temaAttuale());

// ---------- ALLENAMENTO ----------
function settimana(giorni) {
  const now = new Date(), oggiDow = now.getDay();
  const lun = new Date(now);
  lun.setDate(now.getDate() - ((oggiDow + 6) % 7));
  return `<div class="week">${[1, 2, 3, 4, 5, 6, 0].map((dow, k) => {
    const d = new Date(lun); d.setDate(lun.getDate() + k);
    const i = giorni.findIndex(g => g.dow === dow);
    const cls = `wd${dow === oggiDow ? " today" : ""}${i >= 0 && i === state.giorno ? " on" : ""}${i < 0 ? " rest" : ""}`;
    const label = i < 0 ? "Riposo" : esc(giorni[i].nome.split("·").pop().trim());
    const inner = `<span class="wl">${"DLMMGVS"[dow]}</span><span class="wn">${d.getDate()}</span><span class="wt">${label}</span>`;
    return i < 0 ? `<div class="${cls}">${inner}</div>` : `<button class="${cls}" data-giorno="${i}">${inner}</button>`;
  }).join("")}</div>`;
}

function rigaEsercizio(e, pesi, fatte) {
  const id = exId(e);
  const storia = (pesi[id] && pesi[id].s) || [];
  const ultimo = storia[storia.length - 1];
  const precedente = ultimo && ultimo.d === today() ? storia[storia.length - 2] : ultimo;
  const tot = Number(e.serie) || 0;
  const n = Math.min(fatte[id] || 0, tot);
  const valOggi = ultimo && ultimo.d === today() ? ultimo.kg : "";

  const pallini = Array.from({ length: tot }, (_, k) =>
    `<button class="set${k < n ? " on" : ""}${k === n ? " next" : ""}" data-set="${id}|${k}" data-tot="${tot}"
      data-rec="${Number(e.recupero) || 90}" data-nome="${esc(e.nome)}" aria-label="Serie ${k + 1}">${k < n ? CHECK : k + 1}</button>`).join("");

  const nota = [precedente ? `<b>Ultima volta ${fmtNum(precedente.kg)} kg</b>` : "", e.note ? esc(e.note) : ""].filter(Boolean).join(" · ");

  return `<div class="ex${tot && n >= tot ? " done" : ""}">
    <div class="ex-top">
      <div class="ex-info">
        <h3>${esc(e.nome)}</h3>
        <p class="ex-sub">${esc(e.serie)} × ${esc(e.reps)} · recupero ${fmtSec(e.recupero || 90)}</p>
      </div>
      <label class="kg"><input type="number" inputmode="decimal" step="0.5" min="0"
        placeholder="${precedente ? fmtNum(precedente.kg) : "–"}" value="${valOggi}" data-kg="${id}" data-nome="${esc(e.nome)}"><span>kg</span></label>
    </div>
    <div class="sets">${pallini}</div>
    ${nota ? `<p class="ex-note">${nota}</p>` : ""}
  </div>`;
}

function viewAllenamento() {
  const S = schedaAttiva();
  const giorni = S.giorni || [];
  if (!giorni.length) return benvenuto("scheda");
  if (state.giorno >= giorni.length) state.giorno = 0;
  const g = giorni[state.giorno];
  const es = g.esercizi || [];
  const pesi = store.get("pesi", {});
  const fatte = store.get("serie_" + today(), {});
  const nFatte = e => Math.min(fatte[exId(e)] || 0, Number(e.serie) || 0);

  const totSerie = es.reduce((a, e) => a + (Number(e.serie) || 0), 0);
  const totFatte = es.reduce((a, e) => a + nFatte(e), 0);
  const minuti = Math.round(es.reduce((a, e) => a + (Number(e.serie) || 0) * ((Number(e.recupero) || 90) + 40), 0) / 60) + (g.cardioMin || 0);
  const pct = totSerie ? Math.round((totFatte / totSerie) * 100) : 0;
  const isOggi = g.dow === new Date().getDay();

  let h = settimana(giorni);

  h += `<section class="hero">
    <p class="eyebrow">${isOggi ? "Oggi" : esc(NOMI_GIORNI[g.dow] || "Allenamento")}</p>
    <h2>${esc(g.titolo || g.nome)}</h2>
    ${g.focus ? `<p class="hero-sub">${esc(g.focus)}</p>` : ""}
    <div class="stats">
      <div><b>${es.length}</b><span>Esercizi</span></div>
      <div><b>${totFatte}<small>/${totSerie}</small></b><span>Serie</span></div>
      <div><b>${minuti}<small>min</small></b><span>Durata</span></div>
    </div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    ${pct >= 100 ? `<p class="hero-done">Allenamento completato 💪</p>` : ""}
  </section>`;

  if (S.note) h += `<details class="nota" data-gk="nota" ${state.aperti.nota ? "open" : ""}>
    <summary>Come allenarti${CHEV}</summary><p>${esc(S.note)}</p></details>`;

  // raggruppa gli esercizi per gruppo muscolare, nell'ordine della scheda
  const gruppi = [];
  es.forEach(e => {
    const nome = e.gruppo || "Esercizi";
    let gr = gruppi.find(x => x.nome === nome);
    if (!gr) gruppi.push(gr = { nome, esercizi: [] });
    gr.esercizi.push(e);
  });

  gruppi.forEach((gr, idx) => {
    const key = state.giorno + "-" + slug(gr.nome);
    const tot = gr.esercizi.reduce((a, e) => a + (Number(e.serie) || 0), 0);
    const ok = gr.esercizi.reduce((a, e) => a + nFatte(e), 0);
    const aperto = state.aperti[key] ?? idx === 0;
    const ne = gr.esercizi.length;
    h += `<details class="gruppo${ok >= tot ? " finito" : ""}" data-gk="${key}" ${aperto ? "open" : ""}>
      <summary>
        <div class="g-title"><h3>${esc(gr.nome)}</h3><span>${ne} ${ne === 1 ? "esercizio" : "esercizi"} · ${ok}/${tot} serie</span></div>
        <span class="g-badge">${CHECK}</span>${CHEV}
      </summary>
      <div class="g-body">${gr.esercizi.map(e => rigaEsercizio(e, pesi, fatte)).join("")}</div>
    </details>`;
  });

  if (g.cardio) h += `<div class="cardio"><div class="cardio-ico">${CUORE}</div>
    <div><h3>Cardio finale${g.cardioMin ? ` · ${g.cardioMin} min` : ""}</h3><p>${esc(g.cardio)}</p></div></div>`;

  h += `<button class="link" data-reset-serie>Azzera le serie di oggi</button>`;
  return h;
}

function salvaKg(input) {
  const id = input.dataset.kg;
  const kg = parseFloat(String(input.value).replace(",", "."));
  const pesi = store.get("pesi", {});
  const rec = pesi[id] || { nome: input.dataset.nome, s: [] };
  rec.nome = input.dataset.nome;
  rec.s = rec.s.filter(x => x.d !== today());
  if (!isNaN(kg) && kg > 0) rec.s.push({ d: today(), kg });
  pesi[id] = rec;
  store.set("pesi", pesi);
}

// ---------- DIETA ----------
function anello(frazione) {
  const r = 28, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="mr-bg"/>
    <circle cx="32" cy="32" r="${r}" class="mr-fg" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - frazione)).toFixed(1)}"/></svg>`;
}

function viewDieta() {
  const D = dietaAttiva();
  const pasti = D.pasti || [];
  if (!pasti.length) return benvenuto("dieta");
  const spunte = store.get("pasti_" + today(), {});
  const fatti = pasti.filter((_, i) => spunte[i]).length;
  const scelte = store.get(chiaveScelte(), {});

  let h = `<section class="hero diet-hero">
    <div class="dh-ring">${anello(fatti / pasti.length)}<b>${fatti}/${pasti.length}</b></div>
    <div>
      <p class="eyebrow">Oggi</p>
      <h2>${fatti === pasti.length ? "Tutti i pasti fatti 👏" : "Pasti di oggi"}</h2>
      ${D.obiettivo ? `<p class="hero-sub">${esc(D.obiettivo)}</p>` : ""}
    </div>
  </section>`;

  if (D.note) h += `<details class="nota" data-gk="nota-dieta" ${state.aperti["nota-dieta"] ? "open" : ""}>
    <summary>Regole della dieta${CHEV}</summary><p>${esc(D.note)}</p></details>`;

  pasti.forEach((p, i) => {
    let alimenti = p.alimenti || [], seg = "", notaOpz = "";
    if (p.opzioni && p.opzioni.length) {
      const j = Math.min(scelte[i] || 0, p.opzioni.length - 1);
      alimenti = p.opzioni[j].alimenti || [];
      notaOpz = p.opzioni[j].note || "";
      if (p.opzioni.length > 1) seg = `<div class="seg">${p.opzioni.map((o, k) =>
        `<button class="${k === j ? "on" : ""}" data-opzione="${i}:${k}">${esc(o.nome)}</button>`).join("")}</div>`;
    }
    h += `<article class="meal${spunte[i] ? " done" : ""}">
      <div class="meal-head">
        <div class="meal-info">
          ${p.ora ? `<p class="meal-time">${esc(p.ora)}</p>` : ""}
          <h3>${esc(p.nome)}</h3>
          ${p.kcal ? `<p class="meal-kcal">${esc(p.kcal)}</p>` : ""}
        </div>
        <button class="check" data-pasto="${i}" aria-label="Segna ${esc(p.nome)} come fatto">${CHECK}</button>
      </div>
      ${seg}
      <ul class="foods">${alimenti.map(a => `<li><span>${esc(a.nome)}</span><span>${esc(a.qta)}</span></li>`).join("")}</ul>
      ${notaOpz ? `<p class="meal-note">${esc(notaOpz)}</p>` : ""}
      ${p.note ? `<p class="meal-note">${esc(p.note)}</p>` : ""}
    </article>`;
  });
  return h;
}

// ---------- PROGRESSI ----------
function lineChart(points) {
  if (points.length < 2) return `<p class="small">Servono almeno 2 misurazioni per vedere il grafico.</p>`;
  const W = 340, H = 150, L = 4, R = 4, T = 14, B = 22;
  const vs = points.map(p => p.v);
  let min = Math.min(...vs), max = Math.max(...vs);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const x = i => L + (i * (W - L - R)) / (points.length - 1);
  const y = v => T + ((max - v) * (H - T - B)) / (max - min);
  const linea = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(points.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
  const ultimo = points.length - 1;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico andamento">
    <defs><linearGradient id="sfumatura" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--accent);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#sfumatura)"/>
    <path class="line" pathLength="1" d="${linea}"/>
    <circle class="pt" cx="${x(ultimo).toFixed(1)}" cy="${y(points[ultimo].v).toFixed(1)}" r="5"/>
    <text x="${L}" y="${H - 4}">${fmtDate(points[0].d)}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end">${fmtDate(points[ultimo].d)}</text>
  </svg>`;
}

function viewProgressi() {
  const corpo = store.get("corpo", []);
  const oggi = corpo.find(c => c.d === today());
  const ultimo = corpo[corpo.length - 1], primo = corpo[0];
  const delta = corpo.length > 1 ? Math.round((ultimo.v - primo.v) * 10) / 10 : null;

  let h = `<section class="card">
    <p class="eyebrow">Peso corporeo</p>
    <div class="big"><b>${ultimo ? fmtNum(ultimo.v) : "–"}</b><span>kg</span>
      ${delta !== null ? `<em class="${delta <= 0 ? "down" : "up"}">${delta > 0 ? "+" : ""}${fmtNum(delta)} kg dal ${fmtDate(primo.d)}</em>` : ""}</div>
    ${lineChart(corpo)}
    <div class="input-row">
      <label class="field"><input id="peso-corpo" type="number" inputmode="decimal" step="0.1" min="0"
        placeholder="Peso di oggi" value="${oggi ? oggi.v : ""}"><span>kg</span></label>
      <button class="btn primary" data-salva-corpo>Salva</button>
    </div>
    ${corpo.length ? `<ul class="list">${corpo.slice(-5).reverse().map(c =>
      `<li><span>${fmtDate(c.d)}</span><span>${fmtNum(c.v)} kg<button data-del-corpo="${c.d}" aria-label="Elimina">✕</button></span></li>`).join("")}</ul>` : ""}
  </section>`;

  const pesi = store.get("pesi", {});
  const ids = Object.keys(pesi).filter(k => pesi[k].s.length);
  h += `<section class="card"><p class="eyebrow">Carichi</p>`;
  if (!ids.length) {
    h += `<p class="small">Scrivi i kg durante l'allenamento: qui vedrai come crescono esercizio per esercizio.</p>`;
  } else {
    if (!ids.includes(state.esercizioGrafico)) state.esercizioGrafico = ids[0];
    const rec = pesi[state.esercizioGrafico];
    const record = Math.max(...rec.s.map(x => x.kg));
    h += `<select class="select" id="sel-esercizio">${ids.map(k =>
      `<option value="${k}" ${k === state.esercizioGrafico ? "selected" : ""}>${esc(pesi[k].nome)}</option>`).join("")}</select>
      <div class="big"><b>${fmtNum(record)}</b><span>kg · record</span></div>
      ${lineChart(rec.s.map(x => ({ d: x.d, v: x.kg })))}
      <ul class="list">${rec.s.slice(-5).reverse().map(x => `<li><span>${fmtDate(x.d)}</span><span>${fmtNum(x.kg)} kg</span></li>`).join("")}</ul>`;
  }
  h += `</section>`;

  const tema = temaAttuale();
  h += `<section class="card">
      <p class="eyebrow">Colore dell'app</p>
      <div class="temi">${TEMI.map(t => `<button class="tema${t.id === tema ? " on" : ""}" data-tema="${t.id}">
        <span style="background:${t.colore}"></span>${t.nome}</button>`).join("")}</div>
    </section>
    <section class="card">
      <p class="eyebrow">Backup</p>
      <p class="small">Pesi e progressi restano solo su questo telefono. Ogni tanto salva un backup.</p>
      <div class="row-btns">
        <button class="btn" data-esporta>Esporta</button>
        <label class="btn">Importa<input type="file" accept="application/json,.json" id="importa" hidden></label>
      </div>
    </section>`;
  return h;
}

function esportaDati() {
  const dati = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith("pal_")) dati[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(dati)], { type: "application/json" });
  const nome = `palestra-backup-${today()}.json`;
  const file = new File([blob], nome, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: "Backup Palestra" }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

function importaDati(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const dati = JSON.parse(r.result);
      if (!confirm("Sostituire i dati attuali con quelli del backup?")) return;
      Object.entries(dati).forEach(([k, v]) => { if (k.startsWith("pal_")) localStorage.setItem(k, v); });
      applicaTema(temaAttuale());
      render();
      alert("Backup ripristinato.");
    } catch { alert("File di backup non valido."); }
  };
  r.readAsText(file);
}

// ---------- TIMER ----------
const timer = { end: 0, total: 0, id: null };
let actx = null;
const CIRC = 2 * Math.PI * 52;

function sbloccaAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  } catch {}
}

function beep() {
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  if (!actx) return;
  const t0 = actx.currentTime;
  [0, 0.3, 0.6].forEach((t, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + t);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.22);
    o.connect(g).connect(actx.destination);
    o.start(t0 + t); o.stop(t0 + t + 0.25);
  });
}

function avviaTimer(sec, titolo = "Recupero", sotto = "") {
  sbloccaAudio();
  $("#timer-label").textContent = titolo;
  $("#timer-sub").textContent = sotto;
  timer.total = sec;
  timer.end = Date.now() + sec * 1000;
  $("#ring").style.strokeDasharray = CIRC;
  $("#ring").style.strokeDashoffset = 0;
  $("#timer").classList.remove("hidden", "finito");
  tick();
}

// il cerchio si aggiorna a ogni fotogramma: scorre fluido invece di andare a scatti
function tick() {
  clearTimeout(timer.id);
  cancelAnimationFrame(timer.raf);
  const restanti = Math.max(0, (timer.end - Date.now()) / 1000);
  const s = Math.ceil(restanti);
  const testo = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if ($("#timer-num").textContent !== testo) $("#timer-num").textContent = testo;
  $("#ring").style.strokeDashoffset = CIRC * (1 - restanti / Math.max(timer.total, 1));
  if (restanti <= 0) {
    $("#timer").classList.add("finito");
    $("#timer-num").textContent = "Via!";
    beep();
    timer.id = setTimeout(chiudiTimer, 2500);
  } else {
    timer.raf = requestAnimationFrame(tick);
    timer.id = setTimeout(tick, 250); // riserva se i fotogrammi si fermano
  }
}

function chiudiTimer() {
  clearTimeout(timer.id);
  cancelAnimationFrame(timer.raf);
  $("#timer").classList.add("hidden");
}

// ---------- animazioni ----------
const RIDUCI = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.22, 1, .36, 1)";
const SPRING = "cubic-bezier(.34, 1.45, .64, 1)";

// aggiorna la pagina modificando solo ciò che cambia, così le transizioni CSS si vedono
function patch(vecchio, nuovo) {
  if (vecchio.nodeType !== nuovo.nodeType || vecchio.nodeName !== nuovo.nodeName) { vecchio.replaceWith(nuovo); return; }
  if (vecchio.nodeType !== 1) { if (vecchio.nodeValue !== nuovo.nodeValue) vecchio.nodeValue = nuovo.nodeValue; return; }
  for (const { name } of [...vecchio.attributes]) if (!nuovo.hasAttribute(name)) vecchio.removeAttribute(name);
  for (const { name, value } of [...nuovo.attributes]) if (vecchio.getAttribute(name) !== value) vecchio.setAttribute(name, value);
  patchFigli(vecchio, nuovo);
  if (vecchio.tagName === "INPUT" && vecchio.type !== "file" && vecchio !== document.activeElement) vecchio.value = nuovo.getAttribute("value") || "";
  if (vecchio.tagName === "SELECT") vecchio.value = nuovo.value;
}
function patchFigli(vecchio, nuovo) {
  const a = [...vecchio.childNodes], b = [...nuovo.childNodes];
  b.forEach((n, i) => { if (a[i]) patch(a[i], n); else vecchio.appendChild(n); });
  for (let i = b.length; i < a.length; i++) a[i].remove();
}

// gli elementi entrano dal basso, uno dopo l'altro
function entra(els) {
  if (RIDUCI) return;
  els.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
    { duration: 550, delay: Math.min(i, 8) * 50, easing: EASE, fill: "backwards" }));
  document.querySelectorAll("#view .chart .line").forEach(l =>
    l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1100, delay: 200, easing: EASE, fill: "backwards" }));
}

function pop(el) {
  if (el && !RIDUCI) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 420, easing: SPRING });
}

// tendine che si aprono e chiudono scorrendo
function animaTendina(d) {
  const s = d.querySelector("summary");
  const apri = d._dest !== undefined ? !d._dest : !d.open;
  const h0 = d.getBoundingClientRect().height;
  if (d._anim) d._anim.cancel();
  d.open = true;
  const h1 = apri ? d.getBoundingClientRect().height : s.getBoundingClientRect().height;
  d._dest = apri;
  d.classList.toggle("chiudendo", !apri);
  d.style.overflow = "hidden";
  const corpo = s.nextElementSibling;
  if (apri && corpo) corpo.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: EASE });
  d._anim = d.animate({ height: [h0 + "px", h1 + "px"] }, { duration: 450, easing: EASE });
  d._anim.onfinish = () => {
    d.open = apri;
    d.classList.remove("chiudendo");
    d.style.overflow = "";
    d._anim = null;
    d._dest = undefined;
  };
}

// ---------- LE MIE SCHEDE: menu, import da file ed editor ----------
const foglio = { aperto: false, vista: "menu", tipo: "scheda", bozza: null, id: null, ignorate: [], avviso: "", errore: "", erroreTipo: "", caricamento: "" };
const NOMI_SETT = [[1, "Lunedì"], [2, "Martedì"], [3, "Mercoledì"], [4, "Giovedì"], [5, "Venerdì"], [6, "Sabato"], [0, "Domenica"]];
const copia = o => JSON.parse(JSON.stringify(o));
const nuovoId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// elementi vuoti da aggiungere nell'editor, in base a dove li aggiungi
const NUOVI = {
  giorni: () => ({ titolo: "", dow: "", cardio: "", cardioMin: "", esercizi: [NUOVI.esercizi()] }),
  esercizi: () => ({ gruppo: "", nome: "", serie: 3, reps: "10", recupero: 90, note: "" }),
  pasti: () => ({ nome: "", ora: "", kcal: "", note: "", opzioni: [NUOVI.opzioni()] }),
  opzioni: () => ({ nome: "", alimenti: [NUOVI.alimenti()] }),
  alimenti: () => ({ nome: "", qta: "" })
};
const vuoto = tipo => tipo === "scheda"
  ? { nome: "", note: "", giorni: [NUOVI.giorni()] }
  : { nome: "", obiettivo: "", note: "", pasti: [NUOVI.pasti()] };

const percorso = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
function impostaPercorso(o, p, v) {
  const k = p.split("."), ult = k.pop();
  const dove = percorso(o, k.join("."));
  if (dove) dove[ult] = v;
}

function riassunto(tipo, x) {
  if (tipo === "scheda") {
    const g = (x.giorni || []).length, e = (x.giorni || []).reduce((a, d) => a + (d.esercizi || []).length, 0);
    return `${g} ${g === 1 ? "giorno" : "giorni"} · ${e} esercizi`;
  }
  const n = (x.pasti || []).length;
  return `${n} ${n === 1 ? "pasto" : "pasti"}${x.obiettivo ? " · " + x.obiettivo.replace(/^≈\s*/, "") : ""}`;
}

// ---- schermate del menu ----
const ICONE = {
  scheda: `<svg viewBox="0 0 24 24"><path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/></svg>`,
  dieta: `<svg viewBox="0 0 24 24"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2 6 0 8v10"/></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 14l3-3 3 3"/></svg>`,
  penna: `<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>`,
  freccia: `<svg class="m-freccia" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`
};
const haPiano = tipo => getPiani()[tipo] !== PIANO_BASE && !!getPiani()[listaDi(tipo)].find(x => x.id === getPiani()[tipo]);
const NOME_TIPO = { scheda: "scheda", dieta: "dieta" };

function vistaMenu() {
  const card = tipo => {
    const c = haPiano(tipo);
    return `<button class="m-card" data-f-crea="${tipo}">
      <span class="m-ico">${ICONE[tipo]}</span>
      <span class="m-txt"><b>Nuova ${NOME_TIPO[tipo]}</b><small>${c ? "Prende il posto di quella che usi ora" : tipo === "scheda" ? "Giorni, esercizi, serie e recuperi" : "Pasti, alimenti e alternative"}</small></span>
      ${ICONE.freccia}
    </button>`;
  };
  const inUso = ["scheda", "dieta"].filter(haPiano).map(tipo => {
    const x = pianoAttivo(tipo);
    return `<div class="m-uso">
      <span class="m-uso-ico">${ICONE[tipo]}</span>
      <span class="m-txt"><b>${esc(x.nome)}</b><small>${esc(riassunto(tipo, x))}</small></span>
      <button data-f-modifica="${tipo}">Modifica</button>
      <button data-f-invia="${tipo}" aria-label="Invia a un amico">Invia</button>
    </div>`;
  }).join("");
  return `<div class="m-hero"><p class="eyebrow">Menu</p><h2>Cosa vuoi fare?</h2></div>
    ${card("scheda")}${card("dieta")}
    ${inUso ? `<p class="m-sez">In uso su questo telefono</p><div class="m-lista">${inUso}</div>` : ""}
    <p class="m-nota">Tutto resta salvato solo su questo telefono: nessun altro lo vede.</p>`;
}

function vistaCrea(tipo) {
  return `<div class="m-hero"><p class="eyebrow">Nuova ${NOME_TIPO[tipo]}</p><h2>Come la vuoi creare?</h2></div>
    <label class="m-card m-grande">
      <span class="m-ico">${ICONE.file}</span>
      <span class="m-txt"><b>Carica un file</b><small>PDF o TXT: lo leggo io e la salvo da sola</small></span>
      ${ICONE.freccia}
      <input type="file" accept=".txt,.pdf,.json,text/plain,application/pdf,application/json" data-f-file="${tipo}" hidden>
    </label>
    <button class="m-card" data-f-nuova="${tipo}">
      <span class="m-ico">${ICONE.penna}</span>
      <span class="m-txt"><b>Scrivila a mano</b><small>${tipo === "scheda" ? "Aggiungi giorni ed esercizi uno per uno" : "Aggiungi pasti e alimenti uno per uno"}</small></span>
      ${ICONE.freccia}
    </button>
    <div class="f-slot">${foglio.caricamento ? `<div class="m-carica"><span class="m-spinner"></span>Sto leggendo il file…</div>` : ""}</div>
    <div class="f-slot">${foglio.errore ? `<p class="f-errore">${esc(foglio.errore)}</p>` : ""}</div>`;
}

function vistaFatto() {
  const f = foglio.fatto;
  const righe = f.tipi.map(tipo => `<p class="m-fatto-riga">${ICONE[tipo]}<span><b>${esc(pianoAttivo(tipo).nome)}</b><small>${esc(riassunto(tipo, pianoAttivo(tipo)))}</small></span></p>`).join("");
  return `<div class="m-fatto">
      <div class="m-check">${CHECK}</div>
      <h2>${f.titolo}</h2>
      ${righe}
    </div>
    ${f.avviso ? `<div class="f-avviso">${f.avviso}</div>` : ""}
    ${f.ignorate && f.ignorate.length ? `<div class="f-avviso giallo"><b>Queste righe non le ho capite</b>: se servono, aggiungile con «Controlla e modifica».<ul>${f.ignorate.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
    <button class="btn primary m-azione" data-f-vai="${f.tipi[0]}">Vai alla ${NOME_TIPO[f.tipi[0]]}</button>
    <button class="btn m-azione" data-f-modifica="${f.tipi[0]}">Controlla e modifica</button>`;
}

const campo = (p, v, o = {}) => o.area
  ? `<textarea class="in" data-p="${p}" rows="${o.righe || 3}" placeholder="${esc(o.ph || "")}">${esc(v ?? "")}</textarea>`
  : `<input class="in${o.cls ? " " + o.cls : ""}" data-p="${p}" ${o.num ? 'data-num type="number" inputmode="numeric" min="0"' : 'type="text"'} value="${esc(v ?? "")}" placeholder="${esc(o.ph || "")}">`;
const etichetta = (testo, dentro) => `<label class="f-lbl"><span>${testo}</span>${dentro}</label>`;

function editorScheda(b) {
  let h = `<section class="card">
    ${etichetta("Nome della scheda", campo("nome", b.nome, { ph: "Es. Scheda massa" }))}
    ${etichetta("Note e consigli", campo("note", b.note, { area: true, ph: "Facoltative: compaiono in «Come allenarti»" }))}
  </section>`;
  b.giorni.forEach((g, i) => {
    const opz = `<option value="">Scegli…</option>` + NOMI_SETT.map(([d, n]) => `<option value="${d}" ${String(g.dow) === String(d) ? "selected" : ""}>${n}</option>`).join("");
    h += `<section class="card f-giorno">
      <div class="f-head"><p class="eyebrow">Giorno ${i + 1}</p><button class="f-rimuovi" data-rm="giorni.${i}">Elimina giorno</button></div>
      ${etichetta("Nome del giorno", campo(`giorni.${i}.titolo`, g.titolo, { ph: "Es. Petto e tricipiti" }))}
      <div class="f-grid2">
        ${etichetta("Giorno della settimana", `<select class="in" data-p="giorni.${i}.dow" data-num>${opz}</select>`)}
        ${etichetta("Cardio (minuti)", campo(`giorni.${i}.cardioMin`, g.cardioMin, { num: true, ph: "0" }))}
      </div>
      ${etichetta("Cardio finale", campo(`giorni.${i}.cardio`, g.cardio, { ph: "Facoltativo, es. 15 min cyclette" }))}
      <div class="f-lista">${g.esercizi.map((e, j) => {
        const p = `giorni.${i}.esercizi.${j}`;
        return `<div class="f-voce">
          <div class="f-voce-top">${campo(p + ".nome", e.nome, { ph: "Nome esercizio", cls: "in-forte" })}<button class="f-x" data-rm="${p}" aria-label="Elimina esercizio">✕</button></div>
          <div class="f-grid3">
            ${etichetta("Serie", campo(p + ".serie", e.serie, { num: true }))}
            ${etichetta("Ripetizioni", campo(p + ".reps", e.reps, { ph: "8-10" }))}
            ${etichetta("Recupero (s)", campo(p + ".recupero", e.recupero, { num: true }))}
          </div>
          <div class="f-grid2">
            ${etichetta("Gruppo", campo(p + ".gruppo", e.gruppo, { ph: "Es. Petto" }))}
            ${etichetta("Note", campo(p + ".note", e.note, { ph: "Facoltative" }))}
          </div>
        </div>`;
      }).join("")}</div>
      <button class="f-add" data-add="giorni.${i}.esercizi">+ Aggiungi esercizio</button>
    </section>`;
  });
  return h + `<button class="btn f-add-grande" data-add="giorni">+ Aggiungi giorno</button>`;
}

function editorDieta(b) {
  let h = `<section class="card">
    ${etichetta("Nome della dieta", campo("nome", b.nome, { ph: "Es. Dieta definizione" }))}
    ${etichetta("Obiettivo", campo("obiettivo", b.obiettivo, { ph: "Es. 2.000 kcal · 130 g di proteine" }))}
    ${etichetta("Regole e consigli", campo("note", b.note, { area: true, ph: "Facoltative: compaiono in «Regole della dieta»" }))}
  </section>`;
  b.pasti.forEach((p, i) => {
    h += `<section class="card f-giorno">
      <div class="f-head"><p class="eyebrow">Pasto ${i + 1}</p><button class="f-rimuovi" data-rm="pasti.${i}">Elimina pasto</button></div>
      ${etichetta("Nome del pasto", campo(`pasti.${i}.nome`, p.nome, { ph: "Es. Pranzo" }))}
      <div class="f-grid2">
        ${etichetta("Orario", campo(`pasti.${i}.ora`, p.ora, { ph: "Es. 13:00" }))}
        ${etichetta("Calorie", campo(`pasti.${i}.kcal`, p.kcal, { ph: "Es. ~500 kcal" }))}
      </div>
      ${etichetta("Note", campo(`pasti.${i}.note`, p.note, { ph: "Facoltative" }))}
      ${p.opzioni.map((o, k) => {
        const q = `pasti.${i}.opzioni.${k}`;
        return `<div class="f-opz">
          <div class="f-voce-top">${campo(q + ".nome", o.nome, { ph: p.opzioni.length > 1 ? `Alternativa ${k + 1}` : "Nome (facoltativo)", cls: "in-forte" })}${p.opzioni.length > 1 ? `<button class="f-x" data-rm="${q}" aria-label="Elimina alternativa">✕</button>` : ""}</div>
          ${o.alimenti.map((a, n) => `<div class="f-alimento">
            ${campo(`${q}.alimenti.${n}.nome`, a.nome, { ph: "Alimento" })}
            ${campo(`${q}.alimenti.${n}.qta`, a.qta, { ph: "Quantità", cls: "in-qta" })}
            <button class="f-x" data-rm="${q}.alimenti.${n}" aria-label="Elimina alimento">✕</button>
          </div>`).join("")}
          <button class="f-add" data-add="${q}.alimenti">+ Aggiungi alimento</button>
        </div>`;
      }).join("")}
      <button class="f-add" data-add="pasti.${i}.opzioni">+ Aggiungi alternativa</button>
    </section>`;
  });
  return h + `<button class="btn f-add-grande" data-add="pasti">+ Aggiungi pasto</button>`;
}

function renderFoglio() {
  const el = $("#foglio");
  let testa, corpo;
  const chiudi = `<button class="fh-x" data-f-chiudi aria-label="Chiudi"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
  if (foglio.vista !== "editor") {
    testa = (foglio.vista === "crea" ? `<button class="fh-btn" data-f-indietro>Indietro</button>` : `<span></span>`) + `<span></span>` + chiudi;
    corpo = foglio.vista === "crea" ? vistaCrea(foglio.tipo) : foglio.vista === "fatto" ? vistaFatto() : vistaMenu();
  } else {
    const t = foglio.tipo === "scheda";
    testa = `<button class="fh-btn" data-f-indietro>Annulla</button><h2>${t ? "Scheda" : "Dieta"}</h2><button class="fh-btn forte" data-f-salva>Salva</button>`;
    // i tre avvisi hanno sempre il loro posto (vuoto se non servono), così i campi sotto non si spostano
    corpo = `<div class="f-slot">${foglio.avviso ? `<div class="f-avviso">${foglio.avviso}</div>` : ""}</div>` +
      `<div class="f-slot">${foglio.ignorate.length ? `<div class="f-avviso giallo"><b>Queste righe non le ho capite</b>: se servono, aggiungile a mano.<ul>${foglio.ignorate.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}</div>` +
      `<div class="f-slot">${foglio.errore && foglio.erroreTipo === "editor" ? `<p class="f-errore">${esc(foglio.errore)}</p>` : ""}</div>` +
      (t ? editorScheda(foglio.bozza) : editorDieta(foglio.bozza)) +
      `<button class="btn primary f-salva-fondo" data-f-salva>Salva</button>`;
  }
  const nuovo = document.createElement("div");
  nuovo.innerHTML = `<div class="foglio-testa">${testa}</div><div class="foglio-corpo">${corpo}</div>`;
  if (!el.children.length) el.append(...nuovo.children);
  else patchFigli(el, nuovo);
}

// il menu "esplode" a cerchio dal pulsante in alto e ci si richiude dentro
function centroPulsante(origine) {
  const b = (origine || $(".menu-btn")).getBoundingClientRect();
  const x = b.left + b.width / 2, y = b.top + b.height / 2;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  const f = $("#foglio");
  f.style.setProperty("--cx", x + "px");
  f.style.setProperty("--cy", y + "px");
  f.style.setProperty("--r", r + "px");
}
function apriFoglio(vista = "menu", tipo, origine) {
  Object.assign(foglio, { aperto: true, vista, errore: "", caricamento: "" });
  if (tipo) foglio.tipo = tipo;
  centroPulsante(origine);
  $("#foglio").innerHTML = "";
  renderFoglio();
  void $("#foglio").offsetWidth;
  $("#foglio").classList.add("aperto");
  document.body.classList.add("bloccato");
  const c = $("#foglio .foglio-corpo");
  if (c && !RIDUCI) [...c.children].forEach((el, i) => el.animate(
    [{ opacity: 0, transform: "translateY(26px) scale(.96)" }, { opacity: 1, transform: "none" }],
    { duration: 650, delay: 180 + i * 70, easing: EASE, fill: "backwards" }));
}
function chiudiFoglio() {
  foglio.aperto = false;
  centroPulsante();
  $("#foglio").classList.remove("aperto");
  document.body.classList.remove("bloccato");
  pop($(".menu-btn"));
}
function vistaFoglio(vista) {
  const c0 = $("#foglio .foglio-corpo");
  foglio.vista = vista;
  const cambia = () => {
    if (foglio.vista !== vista) return;
    $("#foglio").innerHTML = "";
    renderFoglio();
    const c = $("#foglio .foglio-corpo");
    if (c) { c.scrollTop = 0; entra([...c.children].slice(0, 7)); }
  };
  // la schermata vecchia scivola via, la nuova entra
  if (c0 && !RIDUCI) c0.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-24px)" }], { duration: 150, easing: "ease-in", fill: "forwards" }).onfinish = cambia;
  else cambia();
}

function apriEditor(tipo, dati, id, ignorate = [], avviso = "") {
  const b = copia(dati);
  // l'editor lavora sempre con almeno un elemento per livello
  if (tipo === "scheda") {
    b.giorni = (b.giorni || []).map(g => ({ titolo: g.titolo || g.nome || "", dow: g.dow ?? "", cardio: g.cardio || "", cardioMin: g.cardioMin || "", esercizi: (g.esercizi || []).map(e => ({ ...NUOVI.esercizi(), ...e })) }));
    if (!b.giorni.length) b.giorni.push(NUOVI.giorni());
  } else {
    b.pasti = (b.pasti || []).map(p => ({ nome: p.nome || "", ora: p.ora || "", kcal: p.kcal || "", note: p.note || "",
      opzioni: p.opzioni && p.opzioni.length ? p.opzioni.map(o => ({ nome: o.nome || "", alimenti: (o.alimenti || []).map(a => ({ nome: a.nome || "", qta: a.qta || "" })) }))
        : [{ nome: "", alimenti: (p.alimenti || []).map(a => ({ nome: a.nome || "", qta: a.qta || "" })) }] }));
    if (!b.pasti.length) b.pasti.push(NUOVI.pasti());
  }
  Object.assign(foglio, { tipo, bozza: b, id, ignorate, avviso, errore: "", erroreTipo: "", daVista: foglio.vista });
  vistaFoglio("editor");
}

// salva la nuova scheda/dieta al posto di quella in uso (ogni telefono ha la sua)
function salvaPiano(tipo, dati, id) {
  const p = getPiani();
  const nuovo = { id: id || nuovoId(), ...dati };
  p[listaDi(tipo)] = [nuovo];
  p[tipo] = nuovo.id;
  store.set("piani", p);
  if (tipo === "scheda") vaiAOggi();
}
function mostraFatto(fatto) {
  foglio.fatto = fatto;
  vistaFoglio("fatto");
  render();
  setTimeout(() => pop($("#foglio .m-check")), 250);
}

// pulisce la bozza prima di salvarla; restituisce un messaggio se manca qualcosa
function preparaScheda(b) {
  const giorni = b.giorni.map((g, i) => {
    const titolo = String(g.titolo || "").trim() || `Giorno ${i + 1}`;
    return {
      nome: titolo, titolo, dow: g.dow === "" || g.dow == null ? null : Number(g.dow),
      cardio: String(g.cardio || "").trim(), cardioMin: parseInt(g.cardioMin) || 0,
      esercizi: g.esercizi.filter(e => String(e.nome || "").trim()).map(e => ({
        gruppo: String(e.gruppo || "").trim(), nome: String(e.nome).trim(),
        serie: Math.min(20, Math.max(1, parseInt(e.serie) || 3)), reps: String(e.reps || "").trim() || "10",
        recupero: Math.max(0, parseInt(e.recupero) || 90), note: String(e.note || "").trim()
      }))
    };
  }).filter(g => g.esercizi.length);
  if (!giorni.length) return { errore: "Aggiungi almeno un esercizio con il nome." };
  const visti = {};
  for (const g of giorni) {
    if (g.dow === null) return { errore: `Scegli il giorno della settimana per «${g.titolo}».` };
    if (visti[g.dow]) return { errore: `«${visti[g.dow]}» e «${g.titolo}» sono tutti e due di ${NOMI_GIORNI[g.dow]}: cambiane uno.` };
    visti[g.dow] = g.titolo;
  }
  giorni.sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7));
  return { dati: { nome: String(b.nome || "").trim() || "La mia scheda", note: String(b.note || "").trim(), giorni } };
}
function preparaDieta(b) {
  const pasti = b.pasti.map((p, i) => ({
    nome: String(p.nome || "").trim() || `Pasto ${i + 1}`, ora: String(p.ora || "").trim(), kcal: String(p.kcal || "").trim(), note: String(p.note || "").trim(),
    opzioni: p.opzioni.map((o, k) => ({
      nome: String(o.nome || "").trim() || `Opzione ${k + 1}`,
      alimenti: o.alimenti.filter(a => String(a.nome || "").trim()).map(a => ({ nome: String(a.nome).trim(), qta: String(a.qta || "").trim() }))
    })).filter(o => o.alimenti.length)
  })).filter(p => p.opzioni.length);
  if (!pasti.length) return { errore: "Aggiungi almeno un pasto con un alimento." };
  return { dati: { nome: String(b.nome || "").trim() || "La mia dieta", obiettivo: String(b.obiettivo || "").trim(), note: String(b.note || "").trim(), pasti } };
}

function salvaBozza() {
  const r = foglio.tipo === "scheda" ? preparaScheda(foglio.bozza) : preparaDieta(foglio.bozza);
  foglio.errore = "";
  if (r.errore) {
    Object.assign(foglio, { errore: r.errore, erroreTipo: "editor" });
    renderFoglio();
    const e = $("#foglio .f-errore");
    if (e) { e.scrollIntoView({ behavior: "smooth", block: "center" }); pop(e); }
    return;
  }
  const tipo = foglio.tipo, modifica = !!foglio.id;
  salvaPiano(tipo, r.dati, foglio.id);
  Object.assign(foglio, { bozza: null, avviso: "", ignorate: [] });
  mostraFatto({ tipi: [tipo], titolo: modifica ? "Modifiche salvate" : `${maiuscolaTipo(tipo)} salvata` });
}
const maiuscolaTipo = tipo => (tipo === "scheda" ? "Scheda" : "Dieta");

async function caricaFile(file, tipo) {
  Object.assign(foglio, { caricamento: tipo, errore: "", erroreTipo: "" });
  renderFoglio();
  const inizio = Date.now();
  // la rotellina resta almeno un attimo, così si capisce che sta lavorando
  const attendi = () => new Promise(r => setTimeout(r, Math.max(0, 700 - (Date.now() - inizio))));
  try {
    const nome = file.name.toLowerCase();
    const pdf = nome.endsWith(".pdf") || file.type === "application/pdf";
    if (nome.endsWith(".json") || file.type === "application/json") {
      let j;
      try { j = JSON.parse(await file.text()); } catch { throw new Error("Questo file non si riesce a leggere."); }
      if (j.formato !== "palestra") throw new Error("Questo file non è una scheda o una dieta dell'app.");
      // file completo (scheda + dieta insieme) oppure una sola delle due
      const tipi = j.tipo === "completo" ? ["scheda", "dieta"].filter(t => j[t]) : [j.tipo];
      if (j.tipo !== "completo" && j.tipo !== tipo) throw new Error(j.tipo === "dieta" ? "Questo file è una dieta: caricalo da «Nuova dieta»." : "Questo file è una scheda: caricalo da «Nuova scheda».");
      for (const t of tipi) {
        const dati = j.tipo === "completo" ? j[t] : j.dati;
        if (!dati) throw new Error("Il file è incompleto.");
        salvaPiano(t, dati);
      }
      await attendi();
      mostraFatto({ tipi, titolo: tipi.length > 1 ? "Scheda e dieta salvate" : `${maiuscolaTipo(tipi[0])} salvata` });
      return;
    }
    const testo = pdf ? await testoDaPdf(file) : await file.text();
    if (!testo.trim()) throw new Error(pdf ? "Questo PDF non contiene testo (probabilmente è una foto o una scansione). Prova con un file TXT oppure creala a mano." : "Il file è vuoto.");
    const r = tipo === "scheda" ? leggiScheda(testo) : leggiDieta(testo);
    if (!r.trovati) throw new Error(tipo === "scheda"
      ? "Non ho trovato esercizi in questo file. Ogni esercizio deve avere serie e ripetizioni, per esempio «Panca piana 4x8 rec 90»."
      : "Non ho trovato pasti in questo file. Servono i nomi dei pasti (Colazione, Pranzo…) e gli alimenti con le quantità.");
    if (!r.dati.nome) r.dati.nome = file.name.replace(/\.[^.]+$/, "");
    // controllo come farebbe il tasto Salva, poi salvo subito
    const pronto = tipo === "scheda" ? preparaScheda(r.dati) : preparaDieta(r.dati);
    if (pronto.errore) throw new Error("Ho letto il file ma manca qualcosa: " + pronto.errore.charAt(0).toLowerCase() + pronto.errore.slice(1) + " Prova a scriverla a mano.");
    salvaPiano(tipo, pronto.dati);
    await attendi();
    mostraFatto({
      tipi: [tipo], titolo: `${maiuscolaTipo(tipo)} salvata`, ignorate: r.ignorate,
      avviso: r.giorniAssegnati ? "Il file non diceva i giorni della settimana: li ho scelti io. Se vuoi cambiarli tocca <b>Controlla e modifica</b>." : ""
    });
  } catch (err) {
    await attendi();
    Object.assign(foglio, { errore: err.message || "Non sono riuscito a leggere il file.", erroreTipo: tipo });
  } finally {
    foglio.caricamento = "";
    if (foglio.vista === "crea") {
      renderFoglio();
      const e = $("#foglio .f-errore");
      if (e) pop(e);
    }
  }
}

function inviaPiano(tipo) {
  if (!haPiano(tipo)) return;
  const x = pianoAttivo(tipo);
  const { id: _, ...dati } = x;
  const blob = new Blob([JSON.stringify({ formato: "palestra", tipo, dati })], { type: "application/json" });
  const nomeFile = `${tipo}-${slug(x.nome) || tipo}.json`;
  const file = new File([blob], nomeFile, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: x.nome }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nomeFile; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

function clickFoglio(t, ds) {
  if (ds.fChiudi !== undefined) return chiudiFoglio();
  if (ds.fIndietro !== undefined) {
    if (foglio.vista === "editor") return vistaFoglio(foglio.daVista === "crea" ? "crea" : "menu");
    return vistaFoglio("menu");
  }
  if (ds.fSalva !== undefined) return salvaBozza();
  if (ds.fCrea) { foglio.tipo = ds.fCrea; foglio.errore = ""; return vistaFoglio("crea"); }
  if (ds.fNuova) return apriEditor(ds.fNuova, vuoto(ds.fNuova), null);
  if (ds.fModifica) { if (haPiano(ds.fModifica)) apriEditor(ds.fModifica, pianoAttivo(ds.fModifica), getPiani()[ds.fModifica]); return; }
  if (ds.fInvia) return inviaPiano(ds.fInvia);
  if (ds.fVai) {
    chiudiFoglio();
    if (state.tab !== (ds.fVai === "scheda" ? "allenamento" : "dieta")) vaiTab(ds.fVai === "scheda" ? "allenamento" : "dieta");
    return;
  }
  if (ds.add) {
    const lista = percorso(foglio.bozza, ds.add);
    const chiave = ds.add.split(".").pop();
    if (!Array.isArray(lista) || !NUOVI[chiave]) return;
    lista.push(NUOVI[chiave]());
    renderFoglio();
    // il nuovo elemento entra e viene portato in vista
    const nuovo = document.querySelector(`#foglio [data-p^="${ds.add}.${lista.length - 1}."]`);
    const blocco = nuovo && nuovo.closest(".f-voce, .f-alimento, .f-opz, .f-giorno");
    if (blocco) { entra([blocco]); blocco.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    return;
  }
  if (ds.rm) {
    const k = ds.rm.split("."), i = +k.pop();
    const lista = percorso(foglio.bozza, k.join("."));
    if (!Array.isArray(lista)) return;
    // giorni e pasti interi: chiedi conferma; esercizi e alimenti: subito
    if (["giorni", "pasti"].includes(k[k.length - 1]) && !chiediConferma(t, "Tocca di nuovo per eliminare")) return;
    const blocco = t.closest(".f-voce, .f-alimento, .f-opz, .f-giorno");
    const togli = () => { lista.splice(i, 1); if (!lista.length) lista.push(NUOVI[k[k.length - 1]]()); renderFoglio(); };
    if (blocco && !RIDUCI) blocco.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 180, easing: "ease-in" }).onfinish = togli;
    else togli();
  }
}

// primo tocco: il pulsante diventa rosso e chiede conferma per 3 secondi; secondo tocco: true
function chiediConferma(btn, testo) {
  if (btn.classList.contains("conferma")) { clearTimeout(btn._t); return true; }
  const prima = btn.innerHTML;
  btn.classList.add("conferma");
  btn.textContent = testo;
  btn._t = setTimeout(() => { btn.classList.remove("conferma"); btn.innerHTML = prima; }, 3000);
  return false;
}

// ---------- render & eventi ----------
function aggiornaTabs() {
  const tabs = [...document.querySelectorAll(".tabs button")];
  tabs.forEach(b => b.classList.toggle("on", b.dataset.tab === state.tab));
  const i = Math.max(0, tabs.findIndex(b => b.dataset.tab === state.tab));
  $(".tab-pill").style.transform = `translateX(${i * 100}%)`;
}

function render() {
  aggiornaTabs();
  $("#title").textContent = TITOLI[state.tab];
  const view = { allenamento: viewAllenamento, dieta: viewDieta, progressi: viewProgressi }[state.tab] || viewAllenamento;
  const nuovo = document.createElement("main");
  nuovo.innerHTML = view();
  patchFigli($("#view"), nuovo);
}

// cambio sezione: la vecchia sfuma via, la nuova entra
let cambio = 0;
function vaiTab(tab) {
  if (tab === state.tab) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  state.tab = tab;
  store.set("tab", tab);
  aggiornaTabs();
  const n = ++cambio, v = $("#view"), titolo = $("#title");
  const mostra = () => {
    if (n !== cambio) return;
    v.innerHTML = "";
    render();
    window.scrollTo(0, 0);
    entra([titolo, ...v.children]);
  };
  if (RIDUCI) return mostra();
  const via = [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(8px)" }];
  const opz = { duration: 160, easing: "ease-in", fill: "forwards" };
  titolo.animate(via, opz);
  v.animate(via, opz).onfinish = () => {
    mostra();
    v.getAnimations().forEach(a => a.cancel());
    titolo.getAnimations().forEach(a => { if (a.effect && a.effect.getTiming().fill === "forwards") a.cancel(); });
  };
}

document.addEventListener("click", e => {
  const sum = e.target.closest("details[data-gk] > summary");
  if (sum && !RIDUCI) { e.preventDefault(); animaTendina(sum.parentElement); return; }

  const t = e.target.closest("button");
  if (!t) return;
  const ds = t.dataset;

  if (t.closest("#foglio")) { clickFoglio(t, ds); return; }
  if (ds.fApri !== undefined) { ds.fApri ? apriFoglio("crea", ds.fApri, t) : apriFoglio("menu", null, t); return; }
  if (ds.tab) { vaiTab(ds.tab); return; }
  if (ds.giorno !== undefined) {
    if (+ds.giorno === state.giorno) return;
    state.giorno = +ds.giorno;
    store.set("giorno", state.giorno);
    render();
    entra([...$("#view").children].slice(1));
    return;
  }

  // tocchi un pallino: segna la serie e parte il recupero (se è già fatta, la annulli)
  if (ds.set) {
    const [id, kStr] = ds.set.split("|");
    const k = +kStr, tot = +ds.tot;
    const key = "serie_" + today();
    const fatte = store.get(key, {});
    const n = fatte[id] || 0;
    if (k < n) { fatte[id] = k; store.set(key, fatte); render(); return; }
    const input = document.querySelector(`input[data-kg="${id}"]`);
    if (input && input.value !== "") salvaKg(input);
    fatte[id] = k + 1;
    store.set(key, fatte);
    render();
    pop(document.querySelector(`.set[data-set="${CSS.escape(id + "|" + k)}"]`));
    avviaTimer(+ds.rec, ds.nome, k + 1 < tot ? `Prossima: serie ${k + 2} di ${tot}` : "Esercizio finito · passa al prossimo");
    return;
  }
  // conferma dentro l'app: primo tocco chiede, secondo tocco esegue
  if (ds.resetSerie !== undefined) {
    if (!chiediConferma(t, "Tocca di nuovo per azzerare")) return;
    store.set("serie_" + today(), {});
    render();
    entra([...document.querySelectorAll("#view .gruppo, #view .hero")]);
    return;
  }

  if (ds.pasto !== undefined) {
    const key = "pasti_" + today();
    const spunte = store.get(key, {});
    spunte[ds.pasto] = !spunte[ds.pasto];
    store.set(key, spunte);
    render();
    if (spunte[ds.pasto]) pop(t);
    return;
  }

  if (ds.tema) { store.set("tema", ds.tema); applicaTema(ds.tema); render(); pop(t.querySelector("span")); return; }

  if (ds.opzione) {
    const [i, k] = ds.opzione.split(":").map(Number);
    const scelte = store.get(chiaveScelte(), {});
    if (scelte[i] === k || (!scelte[i] && k === 0)) return;
    scelte[i] = k;
    store.set(chiaveScelte(), scelte);
    render();
    const pasto = t.closest(".meal");
    if (pasto && !RIDUCI) pasto.querySelectorAll(".foods li, .meal-note").forEach((el, n) => el.animate(
      [{ opacity: 0, transform: "translateX(10px)" }, { opacity: 1, transform: "none" }],
      { duration: 400, delay: n * 35, easing: EASE, fill: "backwards" }));
    return;
  }

  if (ds.salvaCorpo !== undefined) {
    const v = parseFloat(String($("#peso-corpo").value).replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    const corpo = store.get("corpo", []).filter(c => c.d !== today());
    corpo.push({ d: today(), v });
    corpo.sort((a, b) => a.d.localeCompare(b.d));
    store.set("corpo", corpo);
    render();
    return;
  }
  if (ds.delCorpo) {
    if (!chiediConferma(t, "Elimina?")) return;
    store.set("corpo", store.get("corpo", []).filter(c => c.d !== ds.delCorpo));
    render();
    return;
  }
  if (ds.esporta !== undefined) { esportaDati(); return; }

  if (ds.t) {
    if (ds.t === "skip") return chiudiTimer();
    timer.end += (+ds.t) * 1000;
    timer.total = Math.max(timer.total + (+ds.t), 1);
    if (timer.end > Date.now()) { $("#timer").classList.remove("finito"); tick(); }
  }
});

document.addEventListener("change", e => {
  const t = e.target;
  if (t.matches("input[data-kg]")) salvaKg(t);
  if (t.id === "sel-esercizio") { state.esercizioGrafico = t.value; store.set("esGrafico", t.value); render(); }
  if (t.id === "importa" && t.files[0]) importaDati(t.files[0]);
  if (t.dataset.fFile && t.files[0]) { caricaFile(t.files[0], t.dataset.fFile); t.value = ""; }
});

// l'editor scrive direttamente nella bozza mentre digiti
document.addEventListener("input", e => {
  const el = e.target;
  if (!foglio.bozza || !el.dataset || !el.dataset.p || !el.closest("#foglio")) return;
  impostaPercorso(foglio.bozza, el.dataset.p, el.hasAttribute("data-num") ? (el.value === "" ? "" : Number(el.value)) : el.value);
});

// ricorda quali tendine sono aperte o chiuse
document.addEventListener("toggle", e => {
  const d = e.target;
  if (d.matches && d.matches("details[data-gk]")) {
    state.aperti[d.dataset.gk] = d.open;
    store.set("aperti", state.aperti);
  }
}, true);

// quando torni nell'app il timer si riallinea all'ora reale
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !$("#timer").classList.contains("hidden")) tick();
  if (!document.hidden && !document.activeElement.matches("input")) render();
});

// senza questo, su iPhone l'effetto "premuto" dei pulsanti (:active) non si vede
document.addEventListener("touchstart", () => {}, { passive: true });

$("#oggi").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
render();

// schermata di apertura: resta un attimo, poi sfuma e l'app entra (un tocco la salta)
(() => {
  const s = $("#splash");
  if (!s) return entra([$(".top"), ...$("#view").children]);
  let chiusa = false;
  const chiudi = () => {
    if (chiusa) return;
    chiusa = true;
    s.classList.add("esce");
    entra([$(".top"), ...$("#view").children]);
    setTimeout(() => s.remove(), 700);
  };
  s.addEventListener("click", chiudi);
  setTimeout(chiudi, RIDUCI ? 600 : 1500);
})();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
