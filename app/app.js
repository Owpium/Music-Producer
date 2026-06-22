'use strict';

/* =============================================================================
   APP — couche AUDIO (navigateur, Tone.js).
   Ne contient AUCUNE logique musicale : elle lit la liste d'événements produite
   par core.js (source de vérité) et se contente de les déclencher, en temps
   réel (lecture) ou hors-ligne (export WAV).
============================================================================= */

const A = (typeof MPArrangement !== "undefined") ? MPArrangement : window.MPArrangement;
const Core = (typeof MPCore !== "undefined") ? MPCore : window.MPCore;
const data = Core.buildArrangement(A);

/* ---------------------------------------------------------------------------
   Graphe audio (instruments + bus). Reconstruit à l'identique en temps réel
   ET dans le contexte hors-ligne de l'export (Tone bascule le contexte courant).
--------------------------------------------------------------------------- */
function gainOf(name) {
  const l = A.layers.find((x) => x.name === name);
  return l && typeof l.gain === "number" ? l.gain : 0;
}

function buildGraph() {
  const limiter = new Tone.Limiter(-1).toDestination();
  const drums = new Tone.Gain(1).connect(limiter);                       // jamais ducké
  const musicalFilter = new Tone.Filter({ type: "lowpass", frequency: 16000, Q: 1 }).connect(limiter);
  const sidechain = new Tone.Gain(1).connect(musicalFilter);             // "respire" avec le kick
  const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.32 }).connect(sidechain);

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03, octaves: 6, oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.34, sustain: 0, release: 0.12 }
  }).connect(drums);

  const clap = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.002, decay: 0.16, sustain: 0 } });
  const clapFilter = new Tone.Filter({ type: "bandpass", frequency: 1600, Q: 1.2 });
  clap.connect(clapFilter); clapFilter.connect(drums);

  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } });
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

  const sub = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.9, release: 0.2 } }).connect(sidechain);

  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "fatsawtooth", count: 3, spread: 24 },
    envelope: { attack: 0.6, decay: 0.4, sustain: 0.7, release: 1.6 }
  });
  pad.connect(reverb); pad.connect(sidechain);

  const lead = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.003, decay: 0.22, sustain: 0.05, release: 0.25 } });
  const leadDelay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.32, wet: 0.3 });
  lead.connect(leadDelay); leadDelay.connect(reverb); lead.connect(sidechain);

  const riser = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 1.0, decay: 0.1, sustain: 1, release: 0.4 } });
  const riserFilter = new Tone.Filter({ type: "bandpass", frequency: 400, Q: 2 });
  riser.connect(riserFilter); riserFilter.connect(reverb); riser.volume.value = -22;

  const impact = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 1.4, sustain: 0 } });
  impact.connect(reverb); impact.volume.value = -14;

  kick.volume.value = gainOf("kick"); clap.volume.value = gainOf("clap"); hat.volume.value = gainOf("hat");
  acid.volume.value = gainOf("acid"); sub.volume.value = gainOf("sub"); pad.volume.value = gainOf("pad"); lead.volume.value = gainOf("lead");

  const inst = { kick, clap, hat, acid, sub, pad, lead };
  const G = { limiter, drums, musicalFilter, sidechain, reverb, riser, riserFilter, impact };
  return { G, inst };
}

/* --------------------------------------------------------------------------- déclenchement d'un événement --------------------------------------------------------------------------- */
function duck(G, time) {
  const beat = 60 / Tone.Transport.bpm.value;
  const g = G.sidechain.gain;
  g.cancelScheduledValues(time);
  g.setValueAtTime(0.25, time);
  g.linearRampToValueAtTime(1.0, time + beat * 0.92);
}
function riserSweep(G, time, durBars) {
  const dur = durBars * 4 * (60 / Tone.Transport.bpm.value);
  const f = G.riserFilter.frequency;
  f.cancelScheduledValues(time);
  f.setValueAtTime(350, time);
  f.exponentialRampToValueAtTime(7000, time + dur);
  G.riser.triggerAttackRelease(dur, time);
}
function triggerEvent(ev, time, G, inst, spb) {
  switch (ev.kind) {
    case "kick": inst.kick.triggerAttackRelease("C1", "8n", time); duck(G, time); break;
    case "clap": inst.clap.triggerAttackRelease("16n", time); break;
    case "hat":  inst.hat.triggerAttackRelease("32n", time); break;
    case "sub":  inst.sub.triggerAttackRelease(ev.note, ev.durSteps * spb * 0.95, time); break;
    case "pad":  inst.pad.triggerAttackRelease(ev.notes, ev.durSteps * spb * 0.98, time); break;
    case "bass": inst.acid.portamento = ev.slide ? 0.06 : 0; inst.acid.triggerAttackRelease(ev.note, ev.durSteps * spb * 0.9, time); break;
    case "lead": inst.lead.triggerAttackRelease(ev.note, ev.durSteps * spb * 0.9, time); break;
    case "section": {
      const cutoff = 400 * Math.pow(40, ev.energy);
      G.musicalFilter.frequency.cancelScheduledValues(time);
      G.musicalFilter.frequency.rampTo(cutoff, 2, time);
      if (ev.name === "drop") G.impact.triggerAttackRelease(2, time);
      break;
    }
    case "riser": riserSweep(G, time, ev.durBars); break;
  }
}

/* --------------------------------------------------------------------------- lecture temps réel --------------------------------------------------------------------------- */
let graph = null;       // {G, inst} persistant
let repeatId = null;
let playing = false;
let currentStep = 0;

function configureTransport() {
  Tone.Transport.bpm.value = data.tempo;
  Tone.Transport.swing = data.swing;
  Tone.Transport.swingSubdivision = "16n";
}

async function start() {
  await Tone.start();
  if (!graph) graph = buildGraph();
  configureTransport();
  const spb = data.secondsPerStep;
  let step = 0;
  repeatId = Tone.Transport.scheduleRepeat((time) => {
    const evs = data.eventsByStep[step % data.totalSteps];
    if (evs) for (const ev of evs) triggerEvent(ev, time, graph.G, graph.inst, spb);
    currentStep = step;
    step++;
  }, "16n");
  Tone.Transport.start();
  playing = true;
}
function stop() {
  Tone.Transport.stop();
  if (repeatId !== null) { Tone.Transport.clear(repeatId); repeatId = null; }
  if (graph) { graph.G.sidechain.gain.cancelScheduledValues(Tone.now()); graph.G.sidechain.gain.value = 1; }
  currentStep = 0;
  playing = false;
}

/* --------------------------------------------------------------------------- export WAV (rendu hors-ligne via le VRAI moteur) --------------------------------------------------------------------------- */
async function exportWav(btn) {
  if (playing) stop();
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Rendu…"; }
  try {
    await Tone.start();
    const dur = data.durationSec + 2; // queue de réverb
    const rendered = await Tone.Offline(async () => {
      const { G, inst } = buildGraph();
      await G.reverb.ready;
      configureTransport();
      const spb = data.secondsPerStep;
      let step = 0;
      Tone.Transport.scheduleRepeat((time) => {
        if (step < data.totalSteps) {
          const evs = data.eventsByStep[step];
          if (evs) for (const ev of evs) triggerEvent(ev, time, G, inst, spb);
        }
        step++;
      }, "16n", 0);
      Tone.Transport.start(0);
    }, dur);
    downloadBlob(audioBufferToWav(rendered.get()), "morceau.wav");
  } catch (e) {
    console.error(e);
    alert("Échec de l'export : " + (e && e.message ? e.message : e));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⬇ Exporter WAV"; }
  }
}

function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  const blockAlign = numCh * 2, dataSize = len * blockAlign;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  let o = 0;
  const wstr = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i)); };
  const w32 = (v) => { view.setUint32(o, v, true); o += 4; };
  const w16 = (v) => { view.setUint16(o, v, true); o += 2; };
  wstr("RIFF"); w32(36 + dataSize); wstr("WAVE");
  wstr("fmt "); w32(16); w16(1); w16(numCh); w32(sr); w32(sr * blockAlign); w16(blockAlign); w16(16);
  wstr("data"); w32(dataSize);
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/* --------------------------------------------------------------------------- UI --------------------------------------------------------------------------- */
function locateUI(pos) {
  for (const s of data.sections) if (pos < s.start + s.len) return s;
  return data.sections[data.sections.length - 1];
}
async function showVersion() {
  const el = document.getElementById("version");
  if (!el) return;
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error();
    const v = await r.json();
    el.textContent = `version : ${v.commit} · ${v.date}`;
  } catch (_) { el.textContent = "version : dev (local)"; }
}

window.addEventListener("DOMContentLoaded", () => {
  showVersion();
  document.getElementById("title").textContent = A.title;
  document.getElementById("meta").textContent =
    `${A.tempo} BPM · ${A.key} · ${data.sections.length} sections · ~${data.durationSec.toFixed(0)}s`;

  const timeline = document.getElementById("timeline");
  data.sections.forEach((s, idx) => {
    const el = document.createElement("div");
    el.className = "section"; el.dataset.idx = idx; el.style.flex = String(s.len);
    el.innerHTML = `<span class="name">${s.name}</span><span class="bars">${s.bars} mes.</span>`;
    timeline.appendChild(el);
  });

  const btn = document.getElementById("play");
  btn.addEventListener("click", async () => {
    if (!playing) { await start(); btn.textContent = "■ Stop"; btn.classList.add("on"); }
    else { stop(); btn.textContent = "▶ Play"; btn.classList.remove("on"); }
  });

  const expBtn = document.getElementById("export");
  if (expBtn) expBtn.addEventListener("click", () => exportWav(expBtn));

  const energyFill = document.getElementById("energy-fill");
  const sectionEls = [...document.querySelectorAll(".section")];
  function frame() {
    if (playing) {
      const s = locateUI(currentStep % data.totalSteps);
      sectionEls.forEach((el) => el.classList.toggle("active", Number(el.dataset.idx) === data.sections.indexOf(s)));
      energyFill.style.width = (s.energy * 100) + "%";
    }
    requestAnimationFrame(frame);
  }
  frame();
});
