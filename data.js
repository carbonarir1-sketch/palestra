// ============================================================
//  SCHEDA E DIETA — le compiliamo insieme, passo per passo.
// ============================================================
//
// Formato scheda:
//   giorni: [
//     { nome: "Giorno A", focus: "Petto e tricipiti", cardio: "15 min cyclette", esercizi: [
//         { nome: "Panca piana", serie: 4, reps: "8-10", recupero: 120, note: "Fermo al petto" },
//     ]},
//   ]
//   (recupero in secondi)
//
// Formato dieta:
//   pasti: [
//     { nome: "Colazione", ora: "07:30", alimenti: [ { nome: "Fiocchi d'avena", qta: "60 g" } ], note: "" },
//   ]

const SCHEDA = {
  nome: "Scheda rientro",
  note: "Primo mese: circa 50–60% dei pesi di una volta, chiudi ogni serie con 2–3 ripetizioni in canna. " +
        "Dal secondo mese aumenta il carico quando arrivi al massimo delle ripetizioni in tutte le serie. " +
        "Petto e bicipiti (i tuoi punti deboli) li alleni 2 volte a settimana: cerca la contrazione e scendi lento, il peso viene dopo.",
  giorni: [
    {
      nome: "Lun · Petto", dow: 1,
      titolo: "Petto e tricipiti",
      focus: "Giorno principale per il petto, con molto lavoro sul petto alto",
      cardio: "Camminata in salita sul tapis roulant, 20 min a passo sostenuto", cardioMin: 20,
      esercizi: [
        { gruppo: "Petto", nome: "Panca inclinata bilanciere", serie: 4, reps: "6-8", recupero: 150, note: "Panca a 30°: il petto alto è quello che dà più forma" },
        { gruppo: "Petto", nome: "Panca piana manubri", serie: 3, reps: "8-10", recupero: 120, note: "Scendi lento e in profondità, stringi in alto" },
        { gruppo: "Petto", nome: "Croci ai cavi dal basso", serie: 3, reps: "12-15", recupero: 60, note: "Dal basso verso l'alto, mani unite all'altezza del mento" },
        { gruppo: "Tricipiti", nome: "Dip alle parallele", serie: 3, reps: "8-12", recupero: 90, note: "Lavorano petto basso e tricipiti: busto dritto per i tricipiti, inclinato per il petto" },
        { gruppo: "Tricipiti", nome: "French press EZ", serie: 3, reps: "10", recupero: 75, note: "Gomiti fermi, scendi dietro la fronte" },
        { gruppo: "Tricipiti", nome: "Pushdown con corda", serie: 3, reps: "12", recupero: 60, note: "Apri la corda in basso" },
        { gruppo: "Addome", nome: "Ginocchia al petto alla sedia romana", serie: 3, reps: "10-15", recupero: 60, note: "Stessa stazione delle dip. Niente dondolio: arrotola il bacino verso l'alto. Quando diventa facile, gambe tese" }
      ]
    },
    {
      nome: "Mar · Schiena", dow: 2,
      titolo: "Schiena e bicipiti",
      focus: "Larghezza e spessore della schiena, con un lavoro mirato sui bicipiti",
      cardio: "Cyclette a ritmo moderato, 15 min", cardioMin: 15,
      esercizi: [
        { gruppo: "Schiena", nome: "Trazioni alla sbarra", serie: 4, reps: "6-10", recupero: 120, note: "Se non arrivi a 6: lat machine presa larga" },
        { gruppo: "Schiena", nome: "Rematore bilanciere", serie: 4, reps: "8", recupero: 120, note: "Schiena neutra, tira verso l'ombelico" },
        { gruppo: "Schiena", nome: "Lat machine presa stretta", serie: 3, reps: "10-12", recupero: 90 },
        { gruppo: "Schiena", nome: "Pulley basso", serie: 3, reps: "12", recupero: 75 },
        { gruppo: "Bicipiti", nome: "Curl bilanciere", serie: 3, reps: "8-10", recupero: 75, note: "Gomiti fermi, niente slancio con la schiena" },
        { gruppo: "Bicipiti", nome: "Curl su panca inclinata", serie: 3, reps: "10-12", recupero: 60, note: "Braccia distese dietro il busto: massimo allungamento del bicipite" }
      ]
    },
    {
      nome: "Gio · Gambe", dow: 4,
      titolo: "Gambe e addome",
      focus: "Unica seduta di gambe della settimana: completa ma senza strafare",
      cardio: "Cyclette a ritmo moderato, 10 min", cardioMin: 10,
      esercizi: [
        { gruppo: "Gambe", nome: "Squat bilanciere", serie: 4, reps: "6-8", recupero: 180, note: "Almeno al parallelo, ginocchia in linea con le punte" },
        { gruppo: "Gambe", nome: "Hip thrust", serie: 3, reps: "8-10", recupero: 120, note: "Schiena appoggiata alla panca, spingi coi talloni e stringi i glutei in alto per 1 secondo. Non carica la zona lombare" },
        { gruppo: "Gambe", nome: "Leg press", serie: 3, reps: "10-12", recupero: 90 },
        { gruppo: "Gambe", nome: "Leg curl sdraiato", serie: 3, reps: "12", recupero: 60 },
        { gruppo: "Gambe", nome: "Calf in piedi", serie: 3, reps: "12-15", recupero: 60, note: "Pausa di 1 secondo in alto" },
        { gruppo: "Addome", nome: "Crunch ai cavi", serie: 3, reps: "15", recupero: 45 }
      ]
    },
    {
      nome: "Ven · Spalle", dow: 5,
      titolo: "Spalle e braccia",
      focus: "Spalle complete (anche le posteriori), seconda seduta di petto e bicipiti, richiamo dei tricipiti",
      cardio: "Camminata in salita sul tapis roulant, 15 min a passo sostenuto", cardioMin: 15,
      esercizi: [
        { gruppo: "Spalle", nome: "Lento avanti manubri seduto", serie: 3, reps: "8-10", recupero: 120 },
        { gruppo: "Spalle", nome: "Alzate laterali manubri", serie: 4, reps: "12-15", recupero: 60, note: "Peso leggero, controlla la discesa: allargano le spalle" },
        { gruppo: "Spalle", nome: "Face pull al cavo", serie: 3, reps: "15", recupero: 60, note: "Spalle posteriori: corda all'altezza degli occhi, tira verso la fronte aprendo i gomiti. Aiuta la postura se stai molto seduto" },
        { gruppo: "Petto (richiamo)", nome: "Panca inclinata manubri", serie: 3, reps: "10-12", recupero: 90, note: "Panca a 30°" },
        { gruppo: "Bicipiti", nome: "Curl alla panca Scott", serie: 3, reps: "10-12", recupero: 60, note: "Scendi fino in fondo, lento" },
        { gruppo: "Bicipiti", nome: "Curl a martello", serie: 3, reps: "10-12", recupero: 60, note: "Allena anche il brachiale: il braccio sembra più spesso" },
        { gruppo: "Tricipiti", nome: "Estensioni sopra la testa al cavo", serie: 3, reps: "12", recupero: 60, note: "Il capo lungo del tricipite dà volume al braccio" }
      ]
    }
  ]
};

const DIETA = {
  obiettivo: "≈ 2.000 kcal · 135 g di proteine",
  note: "Pesi degli alimenti a crudo. Verdure libere (niente peperoni 😉), " +
        "almeno 2 litri d'acqua. Pesati una volta a settimana, la mattina a digiuno: l'obiettivo è perdere 0,3–0,5 kg a settimana. " +
        "Fino a febbraio, finché non ti alleni, salta lo spuntino post-allenamento. Un pasto libero a settimana (es. una pizza).",
  pasti: [
    {
      nome: "Colazione", ora: "Prima del lavoro", kcal: "~420 kcal · 28 g proteine",
      opzioni: [
        { nome: "Yogurt e avena", alimenti: [
          { nome: "Yogurt greco 0%", qta: "200 g" },
          { nome: "Fiocchi d'avena", qta: "50 g" },
          { nome: "Banana o frutti di bosco", qta: "1 / 150 g" },
          { nome: "Miele", qta: "10 g" }
        ]},
        { nome: "Salata", alimenti: [
          { nome: "Pane integrale", qta: "60 g" },
          { nome: "Uova strapazzate", qta: "2" },
          { nome: "Bresaola", qta: "40 g" },
          { nome: "Frutto", qta: "1" }
        ]},
        { nome: "Classica", alimenti: [
          { nome: "Latte parzialmente scremato", qta: "250 ml" },
          { nome: "Fette biscottate integrali", qta: "4" },
          { nome: "Marmellata", qta: "20 g" },
          { nome: "Skyr o yogurt greco 0%", qta: "150 g" }
        ]}
      ]
    },
    {
      nome: "Spuntino", ora: "Metà mattina", kcal: "~200 kcal",
      opzioni: [
        { nome: "Frutta secca", alimenti: [
          { nome: "Frutto", qta: "1" },
          { nome: "Mandorle o noci", qta: "25 g" }
        ]},
        { nome: "Yogurt", alimenti: [
          { nome: "Yogurt greco 0%", qta: "170 g" },
          { nome: "Frutto", qta: "1" }
        ]},
        { nome: "Panino", alimenti: [
          { nome: "Pane", qta: "40 g" },
          { nome: "Bresaola o fesa di tacchino", qta: "50 g" }
        ]}
      ]
    },
    {
      nome: "Pranzo", ora: "14:30 · pre-allenamento", kcal: "~580 kcal · 38 g proteine",
      note: "Pasto con carboidrati ma leggero: niente fritti o sughi pesanti prima della palestra.",
      opzioni: [
        { nome: "Pasta e pollo", alimenti: [
          { nome: "Pasta (meglio integrale)", qta: "90 g" },
          { nome: "Petto di pollo o tacchino", qta: "130 g" },
          { nome: "Verdure (zucchine, pomodorini…)", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "10 g (1 cucchiaio)" }
        ]},
        { nome: "Riso e tonno", alimenti: [
          { nome: "Riso basmati", qta: "90 g" },
          { nome: "Tonno al naturale", qta: "120 g" },
          { nome: "Verdure", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "10 g" }
        ]},
        { nome: "Pasta al ragù", alimenti: [
          { nome: "Pasta", qta: "90 g" },
          { nome: "Macinato magro di manzo (5%)", qta: "100 g" },
          { nome: "Passata di pomodoro", qta: "100 g" },
          { nome: "Parmigiano", qta: "10 g" },
          { nome: "Olio extravergine", qta: "10 g" }
        ]}
      ]
    },
    {
      nome: "Post-allenamento", ora: "~18:00", kcal: "~190 kcal · 18 g proteine",
      opzioni: [
        { nome: "Skyr e banana", alimenti: [
          { nome: "Skyr o yogurt greco 0%", qta: "150 g" },
          { nome: "Banana", qta: "1" }
        ]},
        { nome: "Proteine", alimenti: [
          { nome: "Proteine in polvere (whey)", qta: "30 g" },
          { nome: "Frutto", qta: "1" }
        ]},
        { nome: "Gallette", alimenti: [
          { nome: "Gallette di riso", qta: "3" },
          { nome: "Fesa di tacchino", qta: "60 g" }
        ]}
      ]
    },
    {
      nome: "Cena", ora: "~20:30", kcal: "~500 kcal · 38 g proteine",
      opzioni: [
        { nome: "Pollo", alimenti: [
          { nome: "Petto di pollo", qta: "180 g" },
          { nome: "Pane integrale", qta: "60 g" },
          { nome: "Insalata o verdure", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "10 g" }
        ]},
        { nome: "Salmone", alimenti: [
          { nome: "Salmone", qta: "150 g" },
          { nome: "Patate", qta: "200 g" },
          { nome: "Verdure", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "5 g" }
        ]},
        { nome: "Pesce bianco", alimenti: [
          { nome: "Merluzzo, orata o branzino", qta: "200 g" },
          { nome: "Riso o pasta", qta: "60 g" },
          { nome: "Verdure", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "10 g" }
        ]},
        { nome: "Frittata", alimenti: [
          { nome: "Uova intere", qta: "2" },
          { nome: "Albumi", qta: "100 g" },
          { nome: "Pane integrale", qta: "60 g" },
          { nome: "Verdure (spinaci, zucchine…)", qta: "a piacere" },
          { nome: "Olio extravergine", qta: "5 g" }
        ]}
      ]
    }
  ]
};
