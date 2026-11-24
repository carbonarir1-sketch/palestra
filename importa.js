// ============================================================
//  LETTURA DI SCHEDE E DIETE DA FILE (TXT o PDF)
//  Tutto gira sul telefono: niente server, niente costi.
//  Riconosce i formati più comuni; il resto si corregge a mano
//  nell'anteprima prima di salvare.
// ============================================================

// ---------- testo dal file ----------
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

function caricaPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = PDFJS + "pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; ok(); };
    s.onerror = () => ko(new Error("Per leggere i PDF serve la connessione a internet. Riprova quando sei online."));
    document.head.appendChild(s);
  });
}

// ricostruisce le righe del PDF mettendo insieme i pezzi di testo che stanno alla stessa altezza
async function testoDaPdf(file) {
  await caricaPdfJs();
  const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const righe = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pag = await doc.getPage(n);
    const tc = await pag.getTextContent();
    const pezzi = tc.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ x: it.transform[4], y: it.transform[5], w: it.width || 0, s: it.str }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let riga = [];
    const chiudi = () => {
      if (!riga.length) return;
      riga.sort((a, b) => a.x - b.x);
      let t = "", fine = null;
      riga.forEach(p => {
        if (fine !== null) t += p.x - fine > 12 ? "   " : p.x - fine > 1 ? " " : "";
        t += p.s;
        fine = p.x + p.w;
      });
      righe.push(t);
      riga = [];
    };
    pezzi.forEach(p => {
      if (riga.length && Math.abs(riga[0].y - p.y) > 3) chiudi();
      riga.push(p);
    });
    chiudi();
  }
  return righe.join("\n");
}

// ---------- utilità comuni ----------
function normalizza(r) {
  return r
    .replace(/\t/g, "   ")
    .replace(/[×✕]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[’‘`´]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/′/g, "'")
    .replace(/^\s*(?:[-•*·▪►●◦➤→>]|\d{1,2}[.)])\s+/, "")
    .replace(/\s{2,}/g, "  ")
    .trim();
}
const maiuscola = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const pulisciBordi = s => String(s || "").replace(/^[\s:;,.|\-=·/]+|[\s:;,|\-=·/]+$/g, "").replace(/\s{2,}/g, " ").trim();

// (\b non funziona con le lettere accentate: "Lunedì" finisce con ì)
const FINE = "(?![a-zà-ù])";
const giornoRe = (lungo, corto) => new RegExp(`(?:^|[^a-zà-ù])(${lungo})${FINE}|^${corto}${FINE}\\.?`, "i");
const GIORNI_RE = [
  [1, giornoRe("luned[iì]|monday", "lun")],
  [2, giornoRe("marted[iì]|tuesday", "mar")],
  [3, giornoRe("mercoled[iì]|wednesday", "mer")],
  [4, giornoRe("gioved[iì]|thursday", "gio")],
  [5, giornoRe("venerd[iì]|friday", "ven")],
  [6, giornoRe("sabato|saturday", "sab")],
  [0, giornoRe("domenica|sunday", "dom")]
];
function giornoSettimana(r) {
  for (const [dow, re] of GIORNI_RE) if (re.test(r)) return dow;
  return null;
}
function togliGiorno(r) {
  let s = r;
  GIORNI_RE.forEach(([, re]) => { s = s.replace(new RegExp(re.source, "gi"), ""); });
  return s;
}

// durata scritta all'inizio di s: 90'' · 90" · 90 s · 1'30 · 2' · 2 min · (se nudo) 90
function durata(s, nudoOk) {
  let m;
  if ((m = s.match(/^(\d{1,2})\s*'\s*(\d{1,2})\s*(?:''|"|s\b|sec\w*)?/))) return { sec: +m[1] * 60 + +m[2], len: m[0].length };
  if ((m = s.match(/^(\d{1,3})\s*(?:''|"|s\b|sec\w*)/i))) return { sec: +m[1], len: m[0].length };
  if ((m = s.match(/^(\d{1,2}(?:[.,]\d)?)\s*(?:min\w*|m\b|')/i))) return { sec: Math.round(parseFloat(m[1].replace(",", ".")) * 60), len: m[0].length };
  if (nudoOk && (m = s.match(/^(\d{1,3}(?:[.,]\d)?)/))) {
    const v = parseFloat(m[1].replace(",", "."));
    return { sec: v <= 5 ? Math.round(v * 60) : Math.round(v), len: m[0].length };
  }
  return null;
}

// cerca il recupero: prima dopo una parola chiave, altrimenti un tempo con l'unità scritta
function trovaRecupero(s) {
  const k = s.match(/\b(?:rec(?:upero|uperi)?|riposo|pausa|rest)\b\.?\s*[:=]?\s*/i);
  if (k) {
    const dopo = s.slice(k.index + k[0].length);
    const d = durata(dopo, true);
    if (d) return { sec: d.sec, resto: s.slice(0, k.index) + " " + dopo.slice(d.len) };
  }
  const re = /(\d{1,2})\s*'\s*(\d{1,2})\s*(?:''|")?|(\d{1,3})\s*(?:''|"|sec\w*|s\b)|(\d{1,2}(?:[.,]\d)?)\s*(?:min\w*|')/i;
  const m = s.match(re);
  if (m) {
    const sec = m[1] ? +m[1] * 60 + +m[2] : m[3] ? +m[3] : Math.round(parseFloat(m[4].replace(",", ".")) * 60);
    return { sec, resto: s.slice(0, m.index) + " " + s.slice(m.index + m[0].length) };
  }
  return { sec: null, resto: s };
}

// ---------- SCHEDA ----------
const RE_SXR = /(\d{1,2})\s*x\s*(\d{1,3}(?:\s*[-/]\s*\d{1,3})*\s*(?:''|"|sec\w*|s\b)?|max\w*|cedimento|amrap)/i;
const RE_SERIE = /(\d{1,2})\s*serie\s*(?:da|di|x|per)?\s*(\d{1,3}(?:\s*[-/]\s*\d{1,3})*|max\w*|cedimento)?\s*(?:rip\w*|reps?)?\.?/i;
const RE_PIRAMIDE = /(?:^|\s)(\d{1,2}(?:\s*[-/,]\s*\d{1,2}){2,})(?=\s|$)/;
const RE_TABELLA = /^(.*?[a-zà-ù].*?)\s+(\d{1,2})\s+(\d{1,3}(?:\s*[-/]\s*\d{1,3})?|max)(?:\s+(.+))?$/i;
const RE_GRUPPO = /^(petto|pettorali|schiena|dorso|dorsali|gambe|quadricipiti|femorali|glutei|polpacci|spalle|deltoidi|bicipiti|tricipiti|braccia|addome|addominali|core|avambracci|trapezi|lombari|riscaldamento|defaticamento|stretching|superserie|circuito)\b/i;
const RE_CARDIO = /\b(cardio|tapis|treadmill|cyclette|bike|corsa|camminata|ellittica|vogatore|spinning|step|hiit)\b/i;

const pulisciReps = r => String(r)
  .replace(/\s*([-/])\s*/g, "-")
  .replace(/\s*(?:''|"|sec\w*|s)\s*$/i, " s")
  .replace(/^max\w*/i, "max")
  .trim();

function leggiEsercizio(riga) {
  let m, nome, resto, serie, reps;
  if ((m = riga.match(RE_SXR))) {
    serie = +m[1]; reps = pulisciReps(m[2]);
    nome = riga.slice(0, m.index); resto = riga.slice(m.index + m[0].length);
  } else if ((m = riga.match(RE_SERIE))) {
    serie = +m[1]; reps = m[2] ? pulisciReps(m[2]) : "";
    nome = riga.slice(0, m.index); resto = riga.slice(m.index + m[0].length);
  } else if ((m = riga.match(RE_PIRAMIDE))) {
    reps = m[1].replace(/\s/g, "").replace(/[/,]/g, "-");
    serie = reps.split("-").length;
    nome = riga.slice(0, m.index); resto = riga.slice(m.index + m[0].length);
  } else if ((m = riga.match(RE_TABELLA))) {
    serie = +m[2]; reps = pulisciReps(m[3]);
    nome = m[1]; resto = m[4] || "";
  } else return null;
  if (!serie || serie > 12) return null;

  // a volte serie e ripetizioni vengono prima del nome: "4x8 Panca piana rec 90"
  if (!/[a-zà-ù]/i.test(nome)) { nome = resto; resto = ""; }
  let rec = trovaRecupero(resto);
  if (rec.sec === null) {
    const r2 = trovaRecupero(nome);
    if (r2.sec !== null) { rec = { sec: r2.sec, resto }; nome = r2.resto; }
  }
  // le ripetizioni scritte a parte: "4 serie - 8 ripetizioni"
  if (!reps) {
    const mr = rec.resto.match(/(\d{1,3}(?:\s*-\s*\d{1,3})?)\s*(?:rip\w*|reps?)\b/i);
    if (mr) { reps = pulisciReps(mr[1]); rec.resto = rec.resto.replace(mr[0], " "); }
  }
  const note = pulisciBordi(rec.resto.replace(/[()[\]]/g, " "));
  nome = pulisciBordi(nome.replace(/\(.*?\)/g, " "));
  if (!nome || nome.length < 2) return null;
  return { gruppo: "", nome: maiuscola(nome), serie, reps: reps || "10", recupero: rec.sec ?? 90, note };
}

function eGiorno(r) {
  if (giornoSettimana(r) !== null && r.length < 60) return true;
  return /^(giorno|day|seduta|sessione|allenamento|workout|scheda)\s*(\d{1,2}|[a-f])\b/i.test(r) ||
         /^[a-f]\s*[:)\-]/i.test(r) || /^[a-f]$/i.test(r);
}

const SCHEMI_SETTIMANA = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] };

function leggiScheda(testo) {
  const scheda = { nome: "", note: "", giorni: [] };
  const ignorate = [];
  let giorno = null, gruppo = "", ultimo = null;
  const nuovoGiorno = titolo => {
    giorno = { titolo, dow: null, cardio: "", cardioMin: 0, esercizi: [] };
    scheda.giorni.push(giorno);
    gruppo = ""; ultimo = null;
  };

  testo.split(/\r?\n/).map(normalizza).forEach(r => {
    if (!r || !/[a-zà-ù0-9]/i.test(r)) return;
    if (/^(pag(ina)?\.?\s*)?\d+(\s*(di|\/)\s*\d+)?$/i.test(r)) return;                 // numeri di pagina
    if (/^esercizi?o?\b.*\b(serie|rip|reps|recupero)\b/i.test(r)) return;               // intestazione di tabella
    const es = leggiEsercizio(r);

    if (!es && eGiorno(r)) {
      const dow = giornoSettimana(r);
      let titolo = pulisciBordi(togliGiorno(r)) || r;
      const senzaPrefisso = pulisciBordi(titolo.replace(/^(giorno|day|seduta|sessione|allenamento|workout|scheda)\s*(\d{1,2}|[a-f])\b/i, "").replace(/^[a-f]\s*[:)\-]/i, ""));
      if (senzaPrefisso) titolo = senzaPrefisso;
      nuovoGiorno(maiuscola(titolo) || `Giorno ${scheda.giorni.length + 1}`);
      giorno.dow = dow;
      return;
    }
    if (!es && RE_CARDIO.test(r) && !RE_GRUPPO.test(r.replace(/^cardio\b/i, ""))) {
      if (!giorno) nuovoGiorno("Giorno 1");
      giorno.cardio = pulisciBordi(r.replace(/^cardio\s*(finale)?\s*[:\-]?/i, "")) || r;
      const mm = r.match(/(\d{1,3})\s*(?:min\w*|')/i);
      if (mm) giorno.cardioMin = +mm[1];
      return;
    }
    if (!es && RE_GRUPPO.test(r) && r.split(/\s+/).length <= 5) {
      gruppo = maiuscola(pulisciBordi(r.replace(/\(.*?\)/g, "")));
      return;
    }
    if (es) {
      if (!giorno) nuovoGiorno("Giorno 1");
      es.gruppo = gruppo;
      giorno.esercizi.push(es);
      ultimo = es;
      return;
    }
    // riga di testo: nota dell'esercizio precedente, titolo o note della scheda
    if (ultimo && (/^[a-zà-ù(]/.test(r) || r.split(/\s+/).length > 6)) {
      ultimo.note = pulisciBordi([ultimo.note, r].filter(Boolean).join(" · "));
      return;
    }
    if (!scheda.giorni.length) {
      if (!scheda.nome && r.length <= 45) scheda.nome = maiuscola(pulisciBordi(r));
      else scheda.note = [scheda.note, r].filter(Boolean).join(" ");
      return;
    }
    ignorate.push(r);
  });

  scheda.giorni = scheda.giorni.filter(g => g.esercizi.length);
  // giorni senza giorno della settimana: li distribuisco io nella settimana
  const senza = scheda.giorni.filter(g => g.dow === null);
  const usati = new Set(scheda.giorni.map(g => g.dow).filter(d => d !== null));
  let assegnati = false;
  if (senza.length) {
    const schema = (SCHEMI_SETTIMANA[scheda.giorni.length] || SCHEMI_SETTIMANA[7]).filter(d => !usati.has(d));
    const liberi = [...schema, ...[1, 2, 3, 4, 5, 6, 0].filter(d => !usati.has(d) && !schema.includes(d))];
    senza.forEach((g, i) => { if (liberi[i] !== undefined) { g.dow = liberi[i]; assegnati = true; } });
  }
  const nEs = scheda.giorni.reduce((a, g) => a + g.esercizi.length, 0);
  return { dati: scheda, ignorate, trovati: nEs, giorniAssegnati: assegnati };
}

// ---------- DIETA ----------
const RE_PASTO = /^(seconda colazione|colazione|spuntino(?:\s+(?:di\s+)?(?:met[aà]\s+)?(?:mattina|mattutino|pomeriggio|pomeridiano|serale))?|merenda|pranzo|cena|pre[\s-]?(?:workout|allenamento|nanna|dormire)|post[\s-]?(?:workout|allenamento|cena)|pasto\s*\d+|snack|prima di dormire|dopo cena|breakfast|lunch|dinner)\b/i;
const UNITA = "grammi|gr|g|kg|ml|cl|litri|litro|l|cucchiaini|cucchiaino|cucchiai|cucchiaio|pz|pezzi|pezzo|fette|fetta|vasetti|vasetto|scatolette|scatoletta|bicchieri|bicchiere|tazze|tazza|porzioni|porzione|manciate|manciata";
const RE_QTA = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:-\\s*\\d+(?:[.,]\\d+)?\\s*)?(${UNITA})\\b(?!\\s*biscottat)\\.?`, "i");
const RE_QB = /(?:^|\s)(q\.?\s?b\.?|a piacere|a volont[aà]|liber[aeoi])(?![a-zà-ù])/i;
const RE_CONSIGLIO = /^(bere|evitare|evita|preferire|preferibilmente|non\s|ricorda|consiglio|consigli|nota|attenzione|si consiglia|importante|integrazione)/i;
const RE_CONTA = /^(\d+(?:[.,]\d+)?|mezz[oa]|un[oa]?|due|tre|quattro)\s+([a-zà-ù].*)$/i;
const RE_ALTERNATIVA = /^(oppure|in alternativa|o in alternativa|alternativa|opzione|variante)\b\s*(\d+|[a-d]\b)?\s*[:\-)]?\s*(.*)$/i;

function normQta(q) {
  return q.replace(/\s*(grammi|gr)\b\.?/i, " g").replace(/(\d)\s*(g|ml|kg|cl|l)\b/i, "$1 $2").replace(/\s{2,}/g, " ").trim();
}

// una riga può contenere più alimenti: "riso 80 g con tonno 1 scatoletta"
function leggiAlimenti(r) {
  if (RE_CONSIGLIO.test(r)) return [];
  const quante = (r.match(new RegExp(RE_QTA.source, "gi")) || []).length;
  if (quante > 1) {
    if (/\b(oppure|o)\b|\//i.test(r)) return [{ nome: maiuscola(pulisciBordi(r)), qta: "" }];   // "150 g pollo oppure 200 g merluzzo"
    const parti = r.split(/\s+(?:con|e|più)\s+|\s*[,;+]\s*/i).filter(Boolean).map(leggiAlimento).filter(Boolean);
    if (parti.length >= 2) return parti;
  }
  const a = leggiAlimento(r);
  return a ? [a] : [];
}

function leggiAlimento(r) {
  let m;
  if ((m = r.match(RE_QTA))) {
    const nome = pulisciBordi((r.slice(0, m.index) + " " + r.slice(m.index + m[0].length)).replace(/^\s*(di|d')\s*/i, "").replace(/\(\s*\)/g, ""));
    return nome ? { nome: maiuscola(nome.replace(/^(di|d')\s+/i, "")), qta: normQta(m[0]) } : null;
  }
  if ((m = r.match(RE_QB))) {
    const nome = pulisciBordi(r.replace(m[0], " "));
    return nome ? { nome: maiuscola(nome), qta: m[1].toLowerCase().startsWith("q") ? "q.b." : "a piacere" } : null;
  }
  if ((m = r.match(RE_CONTA)) && r.length < 50) return { nome: maiuscola(pulisciBordi(m[2])), qta: m[1] };
  if ((m = r.match(/^(.*?[a-zà-ù].*?)\s*[:\-]?\s*(?:n\.?\s*)?(\d{1,2})$/i)) && r.length < 40 && !RE_PASTO.test(r)) return { nome: maiuscola(pulisciBordi(m[1])), qta: m[2] };
  return null;
}

function leggiDieta(testo) {
  const dieta = { nome: "", obiettivo: "", note: "", pasti: [] };
  const ignorate = [];
  let pasto = null, opz = null, giornoDieta = "";

  const nuovaOpzione = nome => {
    opz = { nome: nome || "", alimenti: [] };
    pasto.opzioni.push(opz);
  };

  testo.split(/\r?\n/).map(normalizza).forEach(r => {
    if (!r || !/[a-zà-ù0-9]/i.test(r)) return;
    if (/^(pag(ina)?\.?\s*)?\d+(\s*(di|\/)\s*\d+)?$/i.test(r)) return;

    // la dieta cambia giorno per giorno: ogni giorno diventa un'alternativa del pasto
    if (giornoSettimana(r) !== null && r.length < 30 && !RE_QTA.test(r)) {
      giornoDieta = maiuscola(pulisciBordi(r).toLowerCase());
      pasto = null; opz = null;
      return;
    }

    const kcal = r.match(/(\d[\d.]{2,5})\s*kcal/i);
    const mp = r.match(RE_PASTO);
    if (mp) {
      const ora = (r.match(/(\d{1,2})[:.](\d{2})/) || [])[0] || "";
      const nome = maiuscola(mp[0].toLowerCase());
      const esistente = dieta.pasti.find(p => p.nome.toLowerCase() === nome.toLowerCase());
      if (esistente) pasto = esistente;
      else {
        pasto = { nome, ora: ora.replace(".", ":"), kcal: "", note: "", opzioni: [] };
        dieta.pasti.push(pasto);
      }
      if (kcal) pasto.kcal = `~${kcal[1]} kcal`;
      const extra = pulisciBordi(r.slice(mp[0].length).replace(/\(?\s*(ore\s*)?\d{1,2}[:.]\d{2}\s*\)?/i, "").replace(/\(?\s*\d[\d.]{2,5}\s*kcal\s*\)?/i, "").replace(/[()]/g, ""));
      nuovaOpzione(giornoDieta);
      if (extra) {
        const al = leggiAlimenti(extra);
        if (al.length) opz.alimenti.push(...al); else pasto.note = extra;
      }
      return;
    }

    const alt = r.match(RE_ALTERNATIVA);
    if (alt && pasto) {
      const resto = alt[3] || "";
      const al = resto ? leggiAlimenti(resto) : [];
      if (!opz || opz.alimenti.length) nuovaOpzione(al.length ? "" : maiuscola(pulisciBordi(resto)));
      else if (!al.length && resto) opz.nome = maiuscola(pulisciBordi(resto));
      opz.alimenti.push(...al);
      return;
    }

    if (kcal && !pasto) {
      const prot = r.match(/(\d{2,3})\s*g\s*(?:di\s*)?prot/i);
      dieta.obiettivo = `≈ ${kcal[1]} kcal${prot ? ` · ${prot[1]} g di proteine` : ""}`;
      // "Piano alimentare - 1800 kcal": la parte di testo è il titolo
      const titolo = pulisciBordi(r.slice(0, kcal.index).replace(/\d+\s*$/, ""));
      if (!dieta.nome && titolo.length >= 3 && titolo.length <= 45) dieta.nome = maiuscola(titolo);
      return;
    }
    if (kcal && pasto && !RE_QTA.test(r)) { pasto.kcal = `~${kcal[1]} kcal`; return; }

    const al = leggiAlimenti(r);
    if (al.length && pasto) {
      if (!opz) nuovaOpzione(giornoDieta);
      opz.alimenti.push(...al);
      return;
    }
    // un consiglio scritto dopo l'ultimo pasto vale per tutta la dieta
    if (RE_CONSIGLIO.test(r)) { dieta.note = [dieta.note, r].filter(Boolean).join(" "); return; }
    if (pasto) {
      pasto.note = [pasto.note, r].filter(Boolean).join(" ");
      return;
    }
    if (!dieta.nome && r.length <= 45 && !al.length) { dieta.nome = maiuscola(pulisciBordi(r)); return; }
    if (al.length) { ignorate.push(r); return; }
    dieta.note = [dieta.note, r].filter(Boolean).join(" ");
  });

  dieta.pasti.forEach(p => {
    p.opzioni = p.opzioni.filter(o => o.alimenti.length);
    p.opzioni.forEach((o, k) => { if (!o.nome) o.nome = p.opzioni.length > 1 ? `Opzione ${k + 1}` : "Opzione 1"; });
  });
  dieta.pasti = dieta.pasti.filter(p => p.opzioni.length);
  const nAl = dieta.pasti.reduce((a, p) => a + p.opzioni.reduce((b, o) => b + o.alimenti.length, 0), 0);
  return { dati: dieta, ignorate, trovati: nAl };
}

if (typeof module !== "undefined") module.exports = { leggiScheda, leggiDieta, leggiEsercizio, trovaRecupero };
