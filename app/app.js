'use strict';

/* =============================================================================
   ARRANGEMENT — LE CONTRAT CENTRAL (schéma v1)
   -----------------------------------------------------------------------------
   C'est l'unique source de vérité du morceau. Le moteur audio ci-dessous se
   contente de LIRE cet objet et de le jouer. Plus tard (Phase 3), c'est ce
   même objet que Claude Code / une IA générera, et que l'UI éditera.

   Démo : melodic techno hypnotique + basse acid, 124 BPM, La mineur.
   Réfs : Miss Monique × Boris Brejcha (socle) + Mathu "Acid Rain" (la basse).

   - energy (0..1)  : l'arc narratif. Pilote l'ouverture du filtre "musical".
   - transitions    : ce qui relie les sections (riser, impact...).
   - patterns        : par section. Batterie = chaîne de 16 pas "x" / ".".
                       Basse  = [{step, off (demi-tons depuis la fondamentale
                       de l'accord courant), len (en pas), slide}].
                       Lead   = [{step, note (absolue), len}].
   - role            : indique au moteur quel instrument / quelle logique.
   - chords par section : la progression i–VI–III–VII (Am–F–C–G), très "melodic
                       techno". Pad & basse & sub en sont dérivés.
============================================================================= */
const ARRANGEMENT = {
  title: "Demo — Melodic Acid (Phase 1)",
  tempo: 124,
  key: "A minor",
  swing: 0.08,

  sections: [
    { name: "intro", bars: 8,  energy: 0.25, chords: ["Am", "F", "C", "G"] },
    { name: "build", bars: 8,  energy: 0.60, chords: ["Am", "F", "C", "G"] },
    { name: "drop",  bars: 16, energy: 1.00, chords: ["Am", "F", "C", "G"] },
    { name: "break", bars: 8,  energy: 0.35, chords: ["F",  "C", "Am", "G"] },
    { name: "outro", bars: 8,  energy: 0.30, chords: ["Am", "F", "C", "G"] }
  ],

  transitions: [
    { from: "build", to: "drop", type: "riser+impact" }
  ],

  layers: [
    {
      name: "kick", role: "kick", type: "synth", sound: "909-ish", gain: 0,
      patterns: {
        build: "x...x...x...x...",
        drop:  "x...x...x...x...",
        outro: "x...x...x...x..."
      }
    },
    {
      name: "clap", role: "clap", type: "synth", sound: "white-clap", gain: -11,
      patterns: { drop: "....x.......x..." }
    },
    {
      name: "hat", role: "hat", type: "synth", sound: "closed-hat", gain: -20,
      patterns: {
        intro: "..x...x...x...x.",
        build: "..x.x.x...x.x.x.",
        drop:  "..x...x...x...x.",
        outro: "..x...x...x...x."
      }
    },
    {
      name: "acid", role: "bass", type: "synth", sound: "acid-303", gain: -7,
      sidechain: "kick",
      automation: { filterCutoff: { build: [180, 900] } },
      patterns: {
        build: [
          { step: 0, off: 0, len: 2 }, { step: 4, off: 0, len: 2 },
          { step: 8, off: 0, len: 2 }, { step: 12, off: 0, len: 2 }
        ],
        drop: [
          { step: 0, off: 0 }, { step: 2, off: 0 }, { step: 3, off: 12, slide: true },
          { step: 4, off: 0 }, { step: 6, off: 3 }, { step: 8, off: 0 },
          { step: 10, off: 7 }, { step: 11, off: 0 }, { step: 12, off: 0 },
          { step: 14, off: -2 }, { step: 15, off: 12, slide: true }
        ],
        break: [ { step: 0, off: 0, len: 4 }, { step: 8, off: 7, len: 4 } ]
      }
    },
    {
      name: "sub", role: "sub", type: "synth", sound: "sine-sub", gain: -7,
      sidechain: "kick",
      sections: ["intro", "build", "drop", "break", "outro"]
    },
    {
      name: "pad", role: "pad", type: "synth", sound: "warm-pad", gain: -15,
      sidechain: "kick",
      sections: ["intro", "build", "drop", "break", "outro"]
    },
    {
      name: "lead", role: "lead", type: "synth", sound: "pluck", gain: -13,
      sidechain: "kick",
      patterns: {
        drop: [
          { step: 0, note: "A4", len: 2 }, { step: 4, note: "E5", len: 2 },
          { step: 7, note: "C5", len: 1 }, { step: 8, note: "D5", len: 2 },
          { step: 12, note: "C5", len: 2 }, { step: 14, note: "B4", len: 2 }
        ],
        break: [ { step: 0, note: "A4", len: 6 }, { step: 8, note: "C5", len: 6 } ]
      }
    }
  ]
};

/* =============================================================================
   THÉORIE — accords / fondamentales
============================================================================= */
const CHORDS = {
  Am: { root: "A", q: "min" }, Dm: { root: "D", q: "min" }, Em: { root: "E", q: "min" },
  F:  { root: "F", q: "maj" }, C:  { root: "C", q: "maj" }, G:  { root: "G", q: "maj" }
};
const pcMidi = (pc, octave) => Tone.Frequency(pc + octave).toMidi();
const midiToNote = (m) => Tone.Frequency(m, "midi").toNote();
function chordTriad(name, octave) {
  const c = CHORDS[name];
  const root = pcMidi(c.root, octave);
  const third = c.q === "min" ? 3 : 4;
  return [root, root + third, root + 7].map(midiToNote);
}
const chordRootNote = (name, octave) => midiToNote(pcMidi(CHORDS[name].root, octave));

/* =============================================================================
   TIMELINE — découpage du morceau en pas (16 pas / mesure)
============================================================================= */
const STEPS_PER_BAR = 16;
function buildTimeline() {
  let acc = 0;
  const bounds = ARRANGEMENT.sections.map((s, idx) => {
    const len = s.bars * STEPS_PER_BAR;
    const entry = { idx, section: s, start: acc, len };
    acc += len;
    return entry;
  });
  return { bounds, totalSteps: acc };
}
const TL = buildTimeline();
function locate(pos) {
  for (const b of TL.bounds) {
    if (pos < b.start + b.len) {
      return { idx: b.idx, section: b.section, barInSection: Math.floor((pos - b.start) / STEPS_PER_BAR) };
    }
  }
  const last = TL.bounds[TL.bounds.length - 1];
  return { idx: last.idx, section: last.section, barInSection: last.section.bars - 1 };
}

/* =============================================================================
   MOTEUR AUDIO
============================================================================= */
let G = null;            // graphe de nœuds audio
let inst = {};           // instrument par nom de couche
let scheduledId = null;
let currentStep = 0;
let lastSectionIdx = -1;
let playing = false;

function dbToLayer(name) {
  const l = ARRANGEMENT.layers.find(x => x.name === name);
  return l && typeof l.gain === "number" ? l.gain : 0;
}

function buildGraph() {
  const limiter = new Tone.Limiter(-1).toDestination();

  // Bus batterie : direct, jamais "ducké" (le kick doit rester solide).
  const drums = new Tone.Gain(1).connect(limiter);

  // Bus musical : passe par un filtre dont la coupure suit l'ENERGIE de la
  // section (le filtre s'ouvre sur le drop -> sensation d'arrivée/émotion).
  const musicalFilter = new Tone.Filter({ type: "lowpass", frequency: 16000, Q: 1 }).connect(limiter);

  // Sidechain : tout le bus musical "respire" au rythme du kick.
  const sidechain = new Tone.Gain(1).connect(musicalFilter);

  const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.32 }).connect(sidechain);

  // --- instruments par rôle ---
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03, octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.34, sustain: 0, release: 0.12 }
  }).connect(drums);

  const clap = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.002, decay: 0.16, sustain: 0 }
  });
  const clapFilter = new Tone.Filter({ type: "bandpass", frequency: 1600, Q: 1.2 });
  clap.connect(clapFilter); clapFilter.connect(drums);

  const hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0 }
  });
  const hatFilter = new Tone.Filter({ type: "highpass", frequency: 8500 });
  hat.connect(hatFilter); hatFilter.connect(drums);

  // BASSE ACID (la signature) : saw mono + filtre résonant + saturation.
  const acid = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    filter: { type: "lowpass", rolloff: -24, Q: 6 },
    filterEnvelope: { attack: 0.005, decay: 0.18, sustain: 0.25, release: 0.2, baseFrequency: 180, octaves: 3.2 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.2 }
  });
  const acidDrive = new Tone.Distortion(0.35);
  acid.connect(acidDrive); acidDrive.connect(sidechain);

  const sub = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.9, release: 0.2 }
  }).connect(sidechain);

  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "fatsawtooth", count: 3, spread: 24 },
    envelope: { attack: 0.6, decay: 0.4, sustain: 0.7, release: 1.6 }
  });
  pad.connect(reverb); pad.connect(sidechain); // dry + wet

  const lead = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.003, decay: 0.22, sustain: 0.05, release: 0.25 }
  });
  const leadDelay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.32, wet: 0.3 });
  lead.connect(leadDelay); leadDelay.connect(reverb); lead.connect(sidechain);

  // Transition : riser bruité qui monte avant le drop + impact sur le drop.
  const riser = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 1.0, decay: 0.1, sustain: 1, release: 0.4 } });
  const riserFilter = new Tone.Filter({ type: "bandpass", frequency: 400, Q: 2 });
  riser.connect(riserFilter); riserFilter.connect(reverb); riser.volume.value = -22;

  const impact = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 1.4, sustain: 0 } });
  impact.connect(reverb); impact.volume.value = -14;

  // volumes des couches
  kick.volume.value = dbToLayer("kick");
  clap.volume.value = dbToLayer("clap");
  hat.volume.value  = dbToLayer("hat");
  acid.volume.value = dbToLayer("acid");
  sub.volume.value  = dbToLayer("sub");
  pad.volume.value  = dbToLayer("pad");
  lead.volume.value = dbToLayer("lead");

  inst = { kick, clap, hat, acid, sub, pad, lead };
  G = { limiter, drums, musicalFilter, sidechain, reverb, riser, riserFilter, impact };
}

const isHit = (pattern, i) => typeof pattern === "string" && pattern[i] === "x";

function duck(time) {
  const beat = 60 / Tone.Transport.bpm.value;
  const g = G.sidechain.gain;
  g.cancelScheduledValues(time);
  g.setValueAtTime(0.25, time);
  g.linearRampToValueAtTime(1.0, time + beat * 0.92);
}

function riserSweep(time) {
  const bars = 2;
  const dur = bars * 4 * (60 / Tone.Transport.bpm.value);
  const f = G.riserFilter.frequency;
  f.cancelScheduledValues(time);
  f.setValueAtTime(350, time);
  f.exponentialRampToValueAtTime(7000, time + dur);
  G.riser.triggerAttackRelease(dur, time);
}

function layerByRole(role) { return ARRANGEMENT.layers.filter(l => l.role === role); }

function onStep(time) {
  const pos = currentStep % TL.totalSteps;
  const loc = locate(pos);
  const sec = loc.section.name;
  const stepInBar = pos % STEPS_PER_BAR;
  const bpm = Tone.Transport.bpm.value;
  const stepDur = (60 / bpm) / 4;

  // --- changement de section : ouverture du filtre selon l'énergie + impact ---
  if (loc.idx !== lastSectionIdx) {
    lastSectionIdx = loc.idx;
    const cutoff = 400 * Math.pow(40, loc.section.energy); // 0->400Hz, 1->16kHz
    G.musicalFilter.frequency.cancelScheduledValues(time);
    G.musicalFilter.frequency.rampTo(cutoff, 2, time);
    if (sec === "drop") G.impact.triggerAttackRelease(2, time);
  }

  // accord courant
  const chords = loc.section.chords;
  const barsPerChord = loc.section.bars / chords.length;
  const chordName = chords[Math.floor(loc.barInSection / barsPerChord) % chords.length];
  const chordBoundary = stepInBar === 0 && loc.barInSection % barsPerChord === 0;

  // --- batterie ---
  let kicked = false;
  for (const l of layerByRole("kick")) if (isHit(l.patterns[sec], stepInBar)) {
    inst.kick.triggerAttackRelease("C1", "8n", time); kicked = true;
  }
  if (kicked) duck(time);
  for (const l of layerByRole("clap")) if (isHit(l.patterns[sec], stepInBar)) inst.clap.triggerAttackRelease("16n", time);
  for (const l of layerByRole("hat"))  if (isHit(l.patterns[sec], stepInBar)) inst.hat.triggerAttackRelease("32n", time);

  // --- pad (accords) ---
  for (const l of layerByRole("pad")) if ((l.sections || []).includes(sec) && chordBoundary) {
    const dur = barsPerChord * 4 * (60 / bpm) * 0.98;
    inst.pad.triggerAttackRelease(chordTriad(chordName, 3), dur, time);
  }

  // --- sub (fondamentale, une note par mesure) ---
  for (const l of layerByRole("sub")) if ((l.sections || []).includes(sec) && stepInBar === 0) {
    inst.sub.triggerAttackRelease(chordRootNote(chordName, 1), (60 / bpm) * 0.95, time);
  }

  // --- basse acid (offsets depuis la fondamentale de l'accord) ---
  for (const l of layerByRole("bass")) {
    const evs = l.patterns[sec];
    if (!evs) continue;
    for (const e of evs) if (e.step === stepInBar) {
      const note = midiToNote(pcMidi(CHORDS[chordName].root, 2) + e.off);
      inst.acid.portamento = e.slide ? 0.06 : 0;
      inst.acid.triggerAttackRelease(note, (e.len || 1) * stepDur * 0.9, time);
    }
  }

  // --- lead (notes absolues, en La mineur) ---
  for (const l of layerByRole("lead")) {
    const evs = l.patterns[sec];
    if (!evs) continue;
    for (const e of evs) if (e.step === stepInBar) {
      inst.lead.triggerAttackRelease(e.note, (e.len || 1) * stepDur * 0.9, time);
    }
  }

  // --- transition riser : 2 dernières mesures du build ---
  if (sec === "build" && loc.barInSection === loc.section.bars - 2 && stepInBar === 0) {
    try { riserSweep(time); } catch (_) {}
  }

  currentStep++;
}

/* =============================================================================
   TRANSPORT + UI
============================================================================= */
async function start() {
  await Tone.start();
  if (!G) buildGraph();
  Tone.Transport.bpm.value = ARRANGEMENT.tempo;
  Tone.Transport.swing = ARRANGEMENT.swing;
  Tone.Transport.swingSubdivision = "16n";
  currentStep = 0;
  lastSectionIdx = -1;
  if (scheduledId === null) scheduledId = Tone.Transport.scheduleRepeat(onStep, "16n");
  Tone.Transport.start();
  playing = true;
}
function stop() {
  Tone.Transport.stop();
  if (G) G.sidechain.gain.cancelScheduledValues(Tone.now());
  if (G) G.sidechain.gain.value = 1;
  currentStep = 0;
  lastSectionIdx = -1;
  playing = false;
}

window.addEventListener("DOMContentLoaded", () => {
  // métadonnées
  document.getElementById("title").textContent = ARRANGEMENT.title;
  document.getElementById("meta").textContent =
    `${ARRANGEMENT.tempo} BPM · ${ARRANGEMENT.key} · ${ARRANGEMENT.sections.length} sections`;

  // blocs de sections (largeur proportionnelle au nombre de mesures)
  const timeline = document.getElementById("timeline");
  TL.bounds.forEach(b => {
    const el = document.createElement("div");
    el.className = "section";
    el.dataset.idx = b.idx;
    el.style.flex = String(b.len);
    el.innerHTML = `<span class="name">${b.section.name}</span><span class="bars">${b.section.bars} mes.</span>`;
    timeline.appendChild(el);
  });

  const btn = document.getElementById("play");
  btn.addEventListener("click", async () => {
    if (!playing) { await start(); btn.textContent = "■ Stop"; btn.classList.add("on"); }
    else { stop(); btn.textContent = "▶ Play"; btn.classList.remove("on"); }
  });

  // boucle d'affichage : surligne la section courante + jauge d'énergie
  const energyFill = document.getElementById("energy-fill");
  const sectionEls = [...document.querySelectorAll(".section")];
  function frame() {
    if (playing) {
      const loc = locate(currentStep % TL.totalSteps);
      sectionEls.forEach(el => el.classList.toggle("active", Number(el.dataset.idx) === loc.idx));
      energyFill.style.width = (loc.section.energy * 100) + "%";
    }
    requestAnimationFrame(frame);
  }
  frame();
});
