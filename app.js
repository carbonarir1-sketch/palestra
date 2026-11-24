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

const empty = (titolo, testo) => `<div class="empty"><h3>${esc(titolo)}</h3><p>${esc(testo)}</p></div>`;

// ---------- stato ----------
const state = {
  tab: store.get("tab", "allenamento"),
  giorno: store.get("giorno", 0),
  aperti: store.get("aperti", {}),
  esercizioGrafico: store.get("esGrafico", "")
};

// all'apertura mostra direttamente l'allenamento di oggi
(() => {
  const i = (SCHEDA.giorni || []).findIndex(g => g.dow === new Date().getDay());
  if (i >= 0) state.giorno = i;
})();

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
  const giorni = SCHEDA.giorni || [];
  if (!giorni.length) return empty("Scheda in costruzione", "La stiamo preparando insieme: appena è pronta la trovi qui.");
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

  if (SCHEDA.note) h += `<details class="nota" data-gk="nota" ${state.aperti.nota ? "open" : ""}>
    <summary>Come allenarti${CHEV}</summary><p>${esc(SCHEDA.note)}</p></details>`;

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
  const pasti = DIETA.pasti || [];
  if (!pasti.length) return empty("Dieta in costruzione", "La stiamo preparando insieme: appena è pronta la trovi qui.");
  const spunte = store.get("pasti_" + today(), {});
  const fatti = pasti.filter((_, i) => spunte[i]).length;
  const scelte = store.get("scelte", {});

  let h = `<section class="hero diet-hero">
    <div class="dh-ring">${anello(fatti / pasti.length)}<b>${fatti}/${pasti.length}</b></div>
    <div>
      <p class="eyebrow">Oggi</p>
      <h2>${fatti === pasti.length ? "Tutti i pasti fatti 👏" : "Pasti di oggi"}</h2>
      ${DIETA.obiettivo ? `<p class="hero-sub">${esc(DIETA.obiettivo)}</p>` : ""}
    </div>
  </section>`;

  if (DIETA.note) h += `<details class="nota" data-gk="nota-dieta" ${state.aperti["nota-dieta"] ? "open" : ""}>
    <summary>Regole della dieta${CHEV}</summary><p>${esc(DIETA.note)}</p></details>`;

  pasti.forEach((p, i) => {
    let alimenti = p.alimenti || [], seg = "", notaOpz = "";
    if (p.opzioni && p.opzioni.length) {
      const j = Math.min(scelte[i] || 0, p.opzioni.length - 1);
      alimenti = p.opzioni[j].alimenti || [];
      notaOpz = p.opzioni[j].note || "";
      seg = `<div class="seg">${p.opzioni.map((o, k) =>
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
    const scelte = store.get("scelte", {});
    if (scelte[i] === k || (!scelte[i] && k === 0)) return;
    scelte[i] = k;
    store.set("scelte", scelte);
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
entra([$(".top"), ...$("#view").children]);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
