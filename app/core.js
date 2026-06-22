/* =============================================================================
   CORE — logique musicale PURE (zéro Tone.js, zéro DOM, zéro audio)
   -----------------------------------------------------------------------------
   Transforme un ARRANGEMENT en une liste déterministe d'ÉVÉNEMENTS
   (quoi jouer, à quel pas). C'est la SOURCE DE VÉRITÉ partagée :
     - le moteur audio (app.js) ne fait que déclencher ces événements ;
     - les tests + l'inspection structurelle utilisent les mêmes événements.
   Donc le rendu et la vérification ne peuvent pas diverger.

   Module "dual" : navigateur (global MPCore) ET Node (require) pour les tests.
============================================================================= */
(function (root) {
  const STEPS_PER_BAR = 16;
  const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // --- théorie musicale pure (pas de dépendance) ---
  function noteToMidi(name) {
    const m = /^([A-G]#?)(-?\d+)$/.exec(name);
    if (!m) throw new Error("note invalide: " + name);
    const pc = NOTES.indexOf(m[1]);
    return (parseInt(m[2], 10) + 1) * 12 + pc;
  }
  function midiToNote(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return NOTES[pc] + octave;
  }
  const CHORDS = {
    Am: { root: "A", q: "min" }, Dm: { root: "D", q: "min" }, Em: { root: "E", q: "min" },
    F:  { root: "F", q: "maj" }, C:  { root: "C", q: "maj" }, G:  { root: "G", q: "maj" }
  };
  function chordTriad(name, octave) {
    const c = CHORDS[name];
    if (!c) throw new Error("accord inconnu: " + name);
    const r = noteToMidi(c.root + octave);
    return [r, r + (c.q === "min" ? 3 : 4), r + 7].map(midiToNote);
  }
  const chordRootNote = (name, octave) => midiToNote(noteToMidi(CHORDS[name].root + octave));
  const chordRootMidi = (name, octave) => noteToMidi(CHORDS[name].root + octave);

  // --- timeline ---
  function buildTimeline(A) {
    let acc = 0;
    const bounds = A.sections.map((s, idx) => {
      const len = s.bars * STEPS_PER_BAR;
      const e = { idx, section: s, start: acc, len };
      acc += len;
      return e;
    });
    return { bounds, totalSteps: acc };
  }
  function locate(bounds, pos) {
    for (const b of bounds) {
      if (pos < b.start + b.len) {
        return { idx: b.idx, section: b.section, barInSection: Math.floor((pos - b.start) / STEPS_PER_BAR) };
      }
    }
    const last = bounds[bounds.length - 1];
    return { idx: last.idx, section: last.section, barInSection: last.section.bars - 1 };
  }

  const layersByRole = (A, role) => A.layers.filter((l) => l.role === role);
  const isHit = (pattern, i) => typeof pattern === "string" && pattern[i] === "x";

  /**
   * buildArrangement(A) → { tempo, swing, stepsPerBar, totalSteps,
   *   secondsPerStep, durationSec, sections, events, eventsByStep }
   * events: [{ pos, kind, ... }] avec kind ∈
   *   section | kick | clap | hat | sub | pad | bass | lead | riser
   */
  function buildArrangement(A) {
    const { bounds, totalSteps } = buildTimeline(A);
    const events = [];

    for (let pos = 0; pos < totalSteps; pos++) {
      const loc = locate(bounds, pos);
      const sec = loc.section.name;
      const stepInBar = pos % STEPS_PER_BAR;

      const chords = loc.section.chords;
      const barsPerChord = loc.section.bars / chords.length;
      const chordName = chords[Math.floor(loc.barInSection / barsPerChord) % chords.length];
      const chordBoundary = stepInBar === 0 && loc.barInSection % barsPerChord === 0;
      const sectionStart = stepInBar === 0 && loc.barInSection === 0;

      if (sectionStart) {
        events.push({ pos, kind: "section", name: sec, energy: loc.section.energy });
      }

      // batterie
      for (const l of layersByRole(A, "kick")) if (isHit(l.patterns[sec], stepInBar)) events.push({ pos, kind: "kick" });
      for (const l of layersByRole(A, "clap")) if (isHit(l.patterns[sec], stepInBar)) events.push({ pos, kind: "clap" });
      for (const l of layersByRole(A, "hat"))  if (isHit(l.patterns[sec], stepInBar)) events.push({ pos, kind: "hat" });

      // pad (accords)
      for (const l of layersByRole(A, "pad")) if ((l.sections || []).includes(sec) && chordBoundary) {
        events.push({ pos, kind: "pad", notes: chordTriad(chordName, 3), durSteps: barsPerChord * STEPS_PER_BAR });
      }
      // sub (fondamentale par mesure)
      for (const l of layersByRole(A, "sub")) if ((l.sections || []).includes(sec) && stepInBar === 0) {
        events.push({ pos, kind: "sub", note: chordRootNote(chordName, 1), durSteps: STEPS_PER_BAR });
      }
      // basse acid (offsets depuis la fondamentale de l'accord)
      for (const l of layersByRole(A, "bass")) {
        const evs = l.patterns[sec];
        if (!evs) continue;
        for (const e of evs) if (e.step === stepInBar) {
          events.push({ pos, kind: "bass", note: midiToNote(chordRootMidi(chordName, 2) + e.off), durSteps: e.len || 1, slide: !!e.slide });
        }
      }
      // lead (notes absolues)
      for (const l of layersByRole(A, "lead")) {
        const evs = l.patterns[sec];
        if (!evs) continue;
        for (const e of evs) if (e.step === stepInBar) {
          events.push({ pos, kind: "lead", note: e.note, durSteps: e.len || 1 });
        }
      }
      // transition : riser 2 dernières mesures du build
      if (sec === "build" && loc.barInSection === loc.section.bars - 2 && stepInBar === 0) {
        events.push({ pos, kind: "riser", durBars: 2 });
      }
    }

    const eventsByStep = {};
    for (const ev of events) (eventsByStep[ev.pos] = eventsByStep[ev.pos] || []).push(ev);

    const secondsPerStep = (60 / A.tempo) / 4;
    return {
      tempo: A.tempo, swing: A.swing, stepsPerBar: STEPS_PER_BAR,
      totalSteps, secondsPerStep, durationSec: totalSteps * secondsPerStep,
      sections: bounds.map((b) => ({ name: b.section.name, bars: b.section.bars, energy: b.section.energy, start: b.start, len: b.len })),
      events, eventsByStep
    };
  }

  /** Rendu texte ("piano-roll" lisible) — les yeux structurels de l'assistant. */
  function renderTextTimeline(A) {
    const data = buildArrangement(A);
    const lines = [];
    lines.push(`${A.title} | ${A.tempo} BPM | ${A.key} | ${data.totalSteps} pas (~${data.durationSec.toFixed(0)}s)`);
    const drumRoles = ["kick", "clap", "hat"];
    for (const b of data.sections) {
      const secEvents = data.events.filter((e) => e.pos >= b.start && e.pos < b.start + b.len);
      lines.push("");
      lines.push(`■ ${b.name.toUpperCase()}  (${b.bars} mes., énergie ${b.energy})  accords: ${A.sections.find((s) => s.name === b.name).chords.join(" ")}`);
      // une mesure de référence pour chaque couche de batterie
      for (const role of drumRoles) {
        const row = Array.from({ length: 16 }, (_, i) =>
          secEvents.some((e) => e.kind === role && (e.pos - b.start) % 16 === i) ? "x" : ".").join("");
        if (row.includes("x")) lines.push(`  ${role.padEnd(5)} ${row}`);
      }
      const counts = ["bass", "lead", "pad", "sub"].map((k) => {
        const n = secEvents.filter((e) => e.kind === k).length;
        return n ? `${k}:${n}` : null;
      }).filter(Boolean);
      if (counts.length) lines.push(`  notes  ${counts.join("  ")}`);
      if (secEvents.some((e) => e.kind === "riser")) lines.push("  riser  (montée vers le drop)");
    }
    return lines.join("\n");
  }

  const Core = {
    STEPS_PER_BAR, noteToMidi, midiToNote, chordTriad, chordRootNote, chordRootMidi,
    buildArrangement, renderTextTimeline
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  else root.MPCore = Core;
})(typeof self !== "undefined" ? self : globalThis);
