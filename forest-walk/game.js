// Forest Walk — A Sensation Journey
// An endless, sense-driven walking game. No assets: everything is drawn with
// canvas primitives and all sound is synthesized with the Web Audio API.

(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lerpColor(hex1, hex2, t) {
    const a = hexToRgb(hex1), b = hexToRgb(hex2);
    const r = Math.round(lerp(a[0], b[0], t));
    const g = Math.round(lerp(a[1], b[1], t));
    const bl = Math.round(lerp(a[2], b[2], t));
    return `rgb(${r},${g},${bl})`;
  }
  function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ---------------------------------------------------------------------
  // Audio engine — synthesized, no files
  // ---------------------------------------------------------------------

  const Audio_ = (() => {
    let ctxA = null, master = null, windGain = null, rainGain = null;
    let muted = false, ready = false;
    let nextCritterAt = 0, critterTimer = 0;

    function noiseBuffer(seconds) {
      const buf = ctxA.createBuffer(1, ctxA.sampleRate * seconds, ctxA.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    function init() {
      if (ready) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxA = new AC();
      master = ctxA.createGain();
      master.gain.value = 0.55;
      master.connect(ctxA.destination);

      // Wind bed
      const windSrc = ctxA.createBufferSource();
      windSrc.buffer = noiseBuffer(4);
      windSrc.loop = true;
      const windFilter = ctxA.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 500;
      windGain = ctxA.createGain();
      windGain.gain.value = 0.05;
      windSrc.connect(windFilter).connect(windGain).connect(master);
      windSrc.start();

      // Rain bed
      const rainSrc = ctxA.createBufferSource();
      rainSrc.buffer = noiseBuffer(4);
      rainSrc.loop = true;
      const rainFilter = ctxA.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 2200;
      rainGain = ctxA.createGain();
      rainGain.gain.value = 0.0;
      rainSrc.connect(rainFilter).connect(rainGain).connect(master);
      rainSrc.start();

      ready = true;
    }

    function setMuted(m) {
      muted = m;
      if (master) master.gain.value = muted ? 0 : 0.55;
    }

    // amt: 0..1 continuous wind strength; called every frame
    function updateBeds(dt, tSec, windAmt, rainAmt) {
      if (!ready) return;
      const wobble = 0.035 + Math.sin(tSec * 0.25) * 0.02;
      windGain.gain.value = lerp(windGain.gain.value, 0.03 + windAmt * 0.09 + wobble * 0.3, dt * 1.5);
      rainGain.gain.value = lerp(rainGain.gain.value, rainAmt * 0.16, dt * 1.5);
    }

    function chirp(kind) {
      if (!ready) return;
      const t0 = ctxA.currentTime;
      const osc = ctxA.createOscillator();
      const g = ctxA.createGain();
      osc.connect(g).connect(master);
      g.gain.setValueAtTime(0, t0);

      if (kind === 'bird') {
        osc.type = 'sine';
        const f0 = rand(1400, 2600);
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(f0 * rand(0.6, 1.4), t0 + 0.12);
        g.gain.linearRampToValueAtTime(0.09, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.22);
        osc.start(t0); osc.stop(t0 + 0.25);
      } else if (kind === 'cricket') {
        osc.type = 'square';
        osc.frequency.value = rand(2600, 3400);
        g.gain.setValueAtTime(0.0001, t0);
        for (let i = 0; i < 4; i++) {
          const st = t0 + i * 0.09;
          g.gain.linearRampToValueAtTime(0.035, st + 0.01);
          g.gain.linearRampToValueAtTime(0.0001, st + 0.05);
        }
        osc.start(t0); osc.stop(t0 + 0.4);
      } else if (kind === 'owl') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t0);
        osc.frequency.exponentialRampToValueAtTime(380, t0 + 0.35);
        g.gain.linearRampToValueAtTime(0.1, t0 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.6);
        osc.start(t0); osc.stop(t0 + 0.65);
      }
    }

    function scheduleCritters(dt, phase) {
      if (!ready) return;
      critterTimer -= dt;
      if (critterTimer <= 0) {
        if (phase === 'Dawn' || phase === 'Day') {
          chirp('bird');
          critterTimer = rand(1.2, 3.2);
        } else if (phase === 'Dusk') {
          chirp(Math.random() < 0.6 ? 'cricket' : 'bird');
          critterTimer = rand(1.5, 3.5);
        } else {
          chirp(Math.random() < 0.75 ? 'cricket' : 'owl');
          critterTimer = rand(1.5, 4.5);
        }
      }
    }

    function step(footIndex) {
      if (!ready) return;
      const t0 = ctxA.currentTime;
      const src = ctxA.createBufferSource();
      src.buffer = noiseBuffer(0.12);
      const filter = ctxA.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300 + (footIndex % 2) * 60;
      const g = ctxA.createGain();
      g.gain.setValueAtTime(0.09, t0);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.14);
      src.connect(filter).connect(g).connect(master);
      src.start(t0); src.stop(t0 + 0.15);
    }

    return { init, setMuted, updateBeds, scheduleCritters, step, get ready() { return ready; } };
  })();

  // ---------------------------------------------------------------------
  // Time of day + weather
  // ---------------------------------------------------------------------

  const METERS_PER_PX = 1 / 14;       // world scale
  const CYCLE_METERS = 480;           // distance per full day/night cycle

  const PHASES = [
    { t: 0.00, name: 'Dawn',  sky: ['#33355f', '#f2a06b'], fog: '#f4c9a4', tint: 'rgba(255,175,130,0.16)' },
    { t: 0.16, name: 'Day',   sky: ['#3f8fdc', '#cdeaff'], fog: '#eef8ff', tint: 'rgba(255,255,255,0.0)'  },
    { t: 0.42, name: 'Day',   sky: ['#4fa8e8', '#d8f0ff'], fog: '#f2fbff', tint: 'rgba(255,250,235,0.04)' },
    { t: 0.58, name: 'Dusk',  sky: ['#2c2150', '#ff8a4c'], fog: '#f7b98a', tint: 'rgba(255,120,60,0.22)'  },
    { t: 0.72, name: 'Dusk',  sky: ['#1b1638', '#7a3f5e'], fog: '#c98aa0', tint: 'rgba(140,60,110,0.30)'  },
    { t: 0.82, name: 'Night', sky: ['#050914', '#131b3a'], fog: '#1c2440', tint: 'rgba(15,20,50,0.55)'    },
    { t: 1.00, name: 'Night', sky: ['#050914', '#0d1226'], fog: '#141a30', tint: 'rgba(10,14,36,0.62)'    },
  ];

  function getPhaseData(t) {
    t = ((t % 1) + 1) % 1;
    let i = 0;
    while (i < PHASES.length - 1 && PHASES[i + 1].t <= t) i++;
    const a = PHASES[i];
    const b = PHASES[(i + 1) % PHASES.length];
    const span = (b.t - a.t + 1) % 1 || 1;
    let local = (t - a.t + 1) % 1;
    const mix = smooth(clamp(local / span, 0, 1));
    return {
      // Named phase always matches the segment's starting keyframe, so it
      // switches exactly at that keyframe's t — kept in lockstep with
      // NIGHT_START below, which the sun/moon arc also reads from.
      name: a.name,
      skyTop: lerpColor(a.sky[0], b.sky[0], mix),
      skyBottom: lerpColor(a.sky[1], b.sky[1], mix),
      fog: lerpColor(a.fog, b.fog, mix),
      tint: mixRgba(a.tint, b.tint, mix),
      isNight: a.name === 'Night',
      raw: t,
    };
  }
  function mixRgba(c1, c2, t) {
    const p1 = c1.match(/[\d.]+/g).map(Number);
    const p2 = c2.match(/[\d.]+/g).map(Number);
    const r = Math.round(lerp(p1[0], p2[0], t));
    const g = Math.round(lerp(p1[1], p2[1], t));
    const b = Math.round(lerp(p1[2], p2[2], t));
    const a = lerp(p1[3], p2[3], t);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  const Weather = {
    kind: 'clear',      // 'clear' | 'misty' | 'rain'
    intensity: 0,        // eased 0..1 toward target
    changeAtMeters: rand(120, 260),
    pick() {
      const roll = Math.random();
      this.kind = roll < 0.55 ? 'clear' : roll < 0.85 ? 'misty' : 'rain';
    },
    update(distanceM, dt) {
      if (distanceM >= this.changeAtMeters) {
        this.pick();
        this.changeAtMeters = distanceM + rand(140, 320);
      }
      const target = this.kind === 'clear' ? 0 : 1;
      this.intensity = lerp(this.intensity, target, dt * 0.6);
    },
    label() {
      if (this.kind === 'clear') return 'Clear';
      if (this.kind === 'misty') return 'Misty';
      return 'Rain';
    },
  };

  // ---------------------------------------------------------------------
  // Procedural scenery layers
  // ---------------------------------------------------------------------

  class ScatterLayer {
    constructor(opts) {
      Object.assign(this, opts);
      // parallax: 0..1 (0 = far/still, 1 = ground speed)
      this.items = [];
      this.cursor = 0;
      this.fill(0);
    }
    fill(cameraWorldX) {
      this.items = [];
      this.cursor = cameraWorldX - 200;
      while (this.cursor < cameraWorldX + W / this.parallax + 400) this.spawnNext();
    }
    spawnNext() {
      this.cursor += rand(this.gapMin, this.gapMax);
      this.items.push(this.make(this.cursor));
    }
    update(cameraWorldX) {
      while (this.items.length && (this.items[0].x - cameraWorldX) * this.parallax < -300) {
        this.items.shift();
      }
      while (this.cursor < cameraWorldX + (W + 400) / this.parallax) this.spawnNext();
    }
    draw(cameraWorldX, groundY) {
      for (const it of this.items) {
        const sx = (it.x - cameraWorldX) * this.parallax + W * 0.32;
        if (sx < -250 || sx > W + 250) continue;
        this.render(ctx, sx, groundY, it);
      }
    }
  }

  function makeMountains() {
    return new ScatterLayer({
      parallax: 0.10, gapMin: 260, gapMax: 420,
      make: (x) => ({ x, h: rand(90, 200), w: rand(260, 420) }),
      render(ctx, sx, groundY, it) {
        ctx.beginPath();
        ctx.moveTo(sx - it.w / 2, groundY);
        ctx.quadraticCurveTo(sx, groundY - it.h, sx + it.w / 2, groundY);
        ctx.closePath();
        ctx.fill();
      },
    });
  }

  function makeTreeLayer(parallax, gapMin, gapMax, scaleMin, scaleMax) {
    return new ScatterLayer({
      parallax, gapMin, gapMax,
      make: (x) => ({
        x,
        s: rand(scaleMin, scaleMax),
        lean: rand(-0.06, 0.06),
        blobs: 3 + randInt(0, 2),
        seedR: rand(0, 1000),
      }),
      render(ctx, sx, groundY, it) {
        const s = it.s;
        const trunkH = 60 * s, trunkW = 9 * s;
        ctx.save();
        ctx.translate(sx, groundY);
        ctx.rotate(it.lean);
        // trunk
        ctx.fillStyle = this.trunkColor || '#4a3626';
        ctx.fillRect(-trunkW / 2, -trunkH, trunkW, trunkH);
        // canopy
        ctx.fillStyle = this.canopyColor || '#2f5233';
        const cx = 0, cy = -trunkH;
        for (let i = 0; i < it.blobs; i++) {
          const ang = (i / it.blobs) * Math.PI * 2 + it.seedR;
          const rx = Math.cos(ang) * 14 * s * 0.5;
          const ry = Math.sin(ang) * 10 * s * 0.5;
          ctx.beginPath();
          ctx.ellipse(cx + rx, cy + ry - 10 * s, 24 * s, 20 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(cx, cy - 16 * s, 30 * s, 24 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    });
  }

  function makeBushLayer(parallax) {
    return new ScatterLayer({
      parallax, gapMin: 70, gapMax: 160,
      make: (x) => ({ x, s: rand(0.7, 1.6), blobs: 2 + randInt(0, 2) }),
      render(ctx, sx, groundY, it) {
        ctx.fillStyle = this.color || '#243d24';
        for (let i = 0; i < it.blobs; i++) {
          ctx.beginPath();
          ctx.ellipse(sx + i * 14 * it.s - it.blobs * 6 * it.s, groundY - 10 * it.s, 16 * it.s, 12 * it.s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  const layerMountains = makeMountains();
  const layerFarTrees = makeTreeLayer(0.22, 90, 160, 0.7, 1.1);
  const layerMidTrees = makeTreeLayer(0.48, 70, 130, 1.0, 1.6);
  const layerNearTrees = makeTreeLayer(0.78, 110, 200, 1.7, 2.4);
  const layerBushes = makeBushLayer(1.05);

  layerFarTrees.trunkColor = '#3c2c22';
  layerFarTrees.canopyColor = '#33543a';
  layerMidTrees.trunkColor = '#4a3626';
  layerMidTrees.canopyColor = '#2c4d30';
  layerNearTrees.trunkColor = '#3a2a1c';
  layerNearTrees.canopyColor = '#254226';
  layerBushes.color = '#213b22';

  // Fireflies (only visible at night)
  const fireflies = Array.from({ length: 26 }, () => ({
    x: rand(0, 1), y: rand(0.55, 0.92), phase: rand(0, Math.PI * 2), speed: rand(0.3, 0.8),
  }));

  // Rain drops (foreground)
  const rainDrops = Array.from({ length: 90 }, () => ({
    x: rand(0, 1), y: rand(0, 1), len: rand(10, 22), speed: rand(600, 1000),
  }));

  // ---------------------------------------------------------------------
  // Sensations
  // ---------------------------------------------------------------------

  const SENSATIONS = {
    base: [
      'A twig snaps softly beneath your feet.',
      'Cool air brushes against your skin.',
      'Moss cushions your next step.',
      'Somewhere close, leaves whisper against each other.',
      'The path curves gently, inviting you further in.',
      'You notice the quiet rhythm of your own breath.',
      'Roots ripple across the trail like old veins.',
      'A faint trail of woodsmoke drifts on the breeze.',
      'The hush of the forest settles around you.',
    ],
    Day: [
      'Sunlight scatters through the canopy in shifting coins of gold.',
      'A woodpecker taps out a steady rhythm nearby.',
      'Warmth settles on your shoulders.',
      'The green smell of crushed grass rises with each step.',
      'A dragonfly hums past, catching the light.',
    ],
    Dawn: [
      'Dew clings cold and bright to every blade of grass.',
      'The forest exhales a thin, silver mist.',
      'Birdsong builds slowly, layer upon layer.',
      'The sky blushes pink between the branches.',
    ],
    Dusk: [
      'Long shadows stretch across the path ahead.',
      'The air cools, carrying the scent of damp earth.',
      'Crickets begin their first hesitant notes.',
      'Gold light pools low between the trunks.',
    ],
    Night: [
      'Fireflies blink lazily between the trees.',
      'The dark hums softly with unseen life.',
      'Moonlight silvers the edges of the leaves.',
      'An owl calls once, and the forest listens.',
      'Your footsteps sound louder in the quiet.',
    ],
    misty: [
      'Fog softens the trees into pale ghosts.',
      'Sound feels muffled, close, intimate.',
      'Droplets bead on your sleeves.',
      'The trail ahead dissolves into white.',
    ],
    rain: [
      'Rain taps a soft rhythm on the leaves above.',
      'The scent of wet bark fills the air.',
      'Puddles ripple quietly beside the path.',
      'Your footsteps grow damp and dark on the trail.',
    ],
  };

  let recentSensations = [];
  function pickSensation(phaseName, weatherKind) {
    let pool = [...SENSATIONS.base, ...(SENSATIONS[phaseName] || [])];
    if (weatherKind === 'misty') pool = pool.concat(SENSATIONS.misty);
    if (weatherKind === 'rain') pool = pool.concat(SENSATIONS.rain);
    let choices = pool.filter((s) => !recentSensations.includes(s));
    if (choices.length === 0) { recentSensations = []; choices = pool; }
    const pick = choices[randInt(0, choices.length - 1)];
    recentSensations.push(pick);
    if (recentSensations.length > 6) recentSensations.shift();
    return pick;
  }

  const sensationBox = document.getElementById('sensationBox');
  const journalList = document.getElementById('journalList');
  let sensationCount = 0;

  function showSensation(text, meta) {
    sensationBox.textContent = text;
    sensationBox.classList.remove('show');
    void sensationBox.offsetWidth; // restart animation
    sensationBox.classList.add('show');

    sensationCount++;
    document.getElementById('statSensations').textContent = String(sensationCount);

    const entry = document.createElement('div');
    entry.className = 'journalEntry';
    entry.innerHTML = `${text}<span class="meta">${meta}</span>`;
    journalList.insertBefore(entry, journalList.firstChild);
  }

  // ---------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------

  const Player = {
    anchorFrac: 0.32,
    walkPhase: 0,
    bob: 0,
    lastStepFoot: 0,
    draw(groundY, isWalking) {
      const x = W * this.anchorFrac;
      const bob = isWalking ? Math.sin(this.walkPhase * 2) * 3.2 : Math.sin(performance.now() * 0.0015) * 1.2;
      const y = groundY - 46 + bob;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1.35, 1.35);

      // contact shadow anchors the figure to the ground
      ctx.beginPath();
      ctx.ellipse(0, 42, 16, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      const legSwing = isWalking ? Math.sin(this.walkPhase) * 16 : 0;
      const armSwing = isWalking ? Math.sin(this.walkPhase + Math.PI) * 12 : 0;

      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';

      // legs — warm rust trousers, outlined for contrast against dark foliage
      ctx.strokeStyle = '#8a4a2a';
      ctx.beginPath();
      ctx.moveTo(-2, 14); ctx.lineTo(-2 + legSwing * 0.5, 40);
      ctx.moveTo(2, 14); ctx.lineTo(2 - legSwing * 0.5, 40);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(20,10,5,0.6)';
      ctx.stroke();

      // torso — cream jacket
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#e8dcc4';
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(0, 14);
      ctx.stroke();

      // backpack
      ctx.beginPath();
      ctx.ellipse(-7, -6, 7, 11, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#c96a3a';
      ctx.fill();

      // arms
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#e8dcc4';
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(armSwing * 0.5, 8);
      ctx.moveTo(0, -12); ctx.lineTo(-armSwing * 0.5, 8);
      ctx.stroke();

      // head
      ctx.beginPath();
      ctx.arc(0, -26, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#e0b88f';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(40,20,10,0.5)';
      ctx.stroke();

      ctx.restore();
    },
  };

  // ---------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------

  const PACE = [
    { name: 'slow', speed: 55 },
    { name: 'normal', speed: 105 },
    { name: 'fast', speed: 170 },
  ];

  const state = {
    started: false,
    paused: false,
    muted: false,
    holding: false,     // walk key/pointer currently held
    isWalking: false,   // effective walking (holding && !paused)
    paceIndex: 1,
    cameraWorldX: 0,
    distanceM: 0,
    idleTimer: 0,
    idleShown: false,
    sensationTimer: rand(3, 5),
    lastTime: 0,
  };

  layerMountains.fill(0);
  layerFarTrees.fill(0);
  layerMidTrees.fill(0);
  layerNearTrees.fill(0);
  layerBushes.fill(0);

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------

  function setHolding(v) {
    if (!state.started) return;
    state.holding = v;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (e.code === 'Space') e.preventDefault();
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        setHolding(true);
        break;
      case 'ArrowUp': case 'KeyW':
        state.paceIndex = clamp(state.paceIndex + 1, 0, PACE.length - 1);
        break;
      case 'ArrowDown': case 'KeyS':
        state.paceIndex = clamp(state.paceIndex - 1, 0, PACE.length - 1);
        break;
      case 'KeyJ':
        toggleJournal();
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyP':
        togglePause();
        break;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') setHolding(false);
  });

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); setHolding(true); });
  window.addEventListener('pointerup', () => setHolding(false));
  window.addEventListener('pointercancel', () => setHolding(false));
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  // ---------------------------------------------------------------------
  // UI wiring
  // ---------------------------------------------------------------------

  const journalPanel = document.getElementById('journalPanel');
  const btnJournal = document.getElementById('btnJournal');
  const btnMute = document.getElementById('btnMute');
  const btnPause = document.getElementById('btnPause');
  const btnCloseJournal = document.getElementById('btnCloseJournal');
  const startScreen = document.getElementById('startScreen');
  const btnStart = document.getElementById('btnStart');

  function toggleJournal() {
    journalPanel.classList.toggle('hidden');
  }
  function toggleMute() {
    state.muted = !state.muted;
    Audio_.setMuted(state.muted);
    btnMute.textContent = state.muted ? '🔇 Sound' : '🔊 Sound';
  }
  function togglePause() {
    if (!state.started) return;
    state.paused = !state.paused;
    btnPause.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  }

  btnJournal.addEventListener('click', toggleJournal);
  btnCloseJournal.addEventListener('click', toggleJournal);
  btnMute.addEventListener('click', toggleMute);
  btnPause.addEventListener('click', togglePause);

  btnStart.addEventListener('click', () => {
    Audio_.init();
    if (Audio_.ready) Audio_.setMuted(state.muted);
    state.started = true;
    startScreen.classList.add('hidden');
  });

  // ---------------------------------------------------------------------
  // Drawing helpers
  // ---------------------------------------------------------------------

  function drawSky(phase) {
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    grad.addColorStop(0, phase.skyTop);
    grad.addColorStop(1, phase.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const NIGHT_START = 0.82; // must match the Night keyframe below

  function drawCelestial(phase, tSec) {
    const t = phase.raw;
    // The sun arcs across its own window (dawn->day->dusk), then the moon
    // arcs across the remaining night window — so the body's height in the
    // sky always agrees with how far along that window we are, instead of
    // drifting out of sync with the sky-color phase.
    const isNight = t >= NIGHT_START;
    const arcT = isNight
      ? (t - NIGHT_START) / (1 - NIGHT_START)
      : t / NIGHT_START;
    const cx = W * (0.1 + arcT * 0.8);
    const cy = H * 0.66 - Math.sin(clamp(arcT, 0, 1) * Math.PI) * H * 0.46;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowColor = isNight ? '255,255,240' : '255,244,214';
    const r = isNight ? 60 : 90;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    glow.addColorStop(0, `rgba(${glowColor},0.55)`);
    glow.addColorStop(1, `rgba(${glowColor},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(cx, cy, isNight ? 16 : 22, 0, Math.PI * 2);
    ctx.fillStyle = isNight ? '#f2f0e8' : '#fff3d6';
    ctx.fill();
    ctx.restore();

    if (isNight) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 70; i++) {
        const sx = (i * 137.5) % W;
        const sy = ((i * 91.3) % (H * 0.5));
        const tw = 0.5 + 0.5 * Math.sin(tSec * 1.5 + i);
        ctx.globalAlpha = 0.25 + tw * 0.5;
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.restore();
    }
  }

  function drawGround(phase, groundY) {
    const g = ctx.createLinearGradient(0, groundY - 10, 0, H);
    const dark = lerpColor('#1c2a16', '#0b120a', phase.isNight ? 0.6 : 0.1);
    g.addColorStop(0, lerpColor('#3a4a28', dark, phase.isNight ? 0.55 : 0.1));
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 10, W, H - groundY + 10);

    // dashed path center-line for motion feedback
    ctx.strokeStyle = 'rgba(230,210,170,0.18)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 34]);
    ctx.lineDashOffset = -state.cameraWorldX * 1.0;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 20);
    ctx.lineTo(W, groundY + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawFireflies(phase, dt) {
    if (!phase.isNight) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fireflies) {
      f.phase += dt * f.speed;
      const drift = Math.sin(f.phase) * 14;
      const sx = ((f.x * W + drift - state.cameraWorldX * 0.9) % (W + 80) + (W + 80)) % (W + 80) - 40;
      const sy = f.y * H + Math.sin(f.phase * 1.7) * 10;
      const alpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(f.phase * 2.3));
      ctx.fillStyle = `rgba(220,255,150,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRain(dt) {
    if (Weather.kind !== 'rain' || Weather.intensity < 0.05) return;
    ctx.save();
    ctx.strokeStyle = `rgba(200,220,255,${0.25 * Weather.intensity})`;
    ctx.lineWidth = 1.4;
    for (const d of rainDrops) {
      d.y += (d.speed * dt) / H;
      if (d.y > 1.05) { d.y = -0.05; d.x = rand(0, 1); }
      const sx = d.x * W - 30;
      const sy = d.y * H;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 6, sy + d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFog(phase) {
    const mistBoost = Weather.kind === 'misty' ? Weather.intensity * 0.5 : 0;
    const rainBoost = Weather.kind === 'rain' ? Weather.intensity * 0.15 : 0;
    const alpha = 0.06 + mistBoost + rainBoost;
    if (alpha <= 0.06) return;
    const g = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.95);
    g.addColorStop(0, rgba(phase.fog, 0));
    g.addColorStop(1, rgba(phase.fog, alpha));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawTint(phase) {
    ctx.fillStyle = phase.tint;
    ctx.fillRect(0, 0, W, H);
    if (Weather.kind === 'rain') {
      ctx.fillStyle = `rgba(20,25,45,${0.28 * Weather.intensity})`;
      ctx.fillRect(0, 0, W, H);
    } else if (Weather.kind === 'misty') {
      ctx.fillStyle = `rgba(210,215,220,${0.14 * Weather.intensity})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------

  let elapsed = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.lastTime) state.lastTime = now;
    let dt = (now - state.lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    state.lastTime = now;

    const groundY = H * 0.74;
    state.isWalking = state.started && !state.paused && state.holding;

    if (!state.paused) elapsed += dt;

    if (state.isWalking) {
      const speed = PACE[state.paceIndex].speed;
      state.cameraWorldX += speed * dt;
      state.distanceM = state.cameraWorldX * METERS_PER_PX;

      Player.walkPhase += dt * (5.2 + state.paceIndex * 1.6);
      const stepThreshold = Math.floor(Player.walkPhase / Math.PI);
      if (stepThreshold !== Player.lastStepFoot) {
        Player.lastStepFoot = stepThreshold;
        Audio_.step(stepThreshold);
      }

      state.idleTimer = 0;
      state.idleShown = false;

      state.sensationTimer -= dt;
      if (state.sensationTimer <= 0) {
        const phase = getPhaseData(state.distanceM / CYCLE_METERS);
        const text = pickSensation(phase.name, Weather.kind);
        const distLabel = state.distanceM >= 1000
          ? (state.distanceM / 1000).toFixed(2) + ' km'
          : Math.round(state.distanceM) + ' m';
        showSensation(text, `${distLabel} · ${phase.name}${Weather.kind !== 'clear' ? ' · ' + Weather.label() : ''}`);
        state.sensationTimer = rand(4.5, 8.5);
      }
    } else if (state.started && !state.paused) {
      state.idleTimer += dt;
      if (state.idleTimer > 6 && !state.idleShown && state.distanceM > 5) {
        state.idleShown = true;
        showSensation('You stand still. The forest keeps its own quiet time.', 'resting');
      }
    }

    if (!state.paused) Weather.update(state.distanceM, dt);
    const phase = getPhaseData(state.distanceM / CYCLE_METERS);

    if (!state.paused) {
      Audio_.updateBeds(dt, elapsed, 0.5, Weather.intensity * (Weather.kind === 'rain' ? 1 : 0));
      if (state.isWalking) Audio_.scheduleCritters(dt, phase.name);
    }

    layerMountains.update(state.cameraWorldX);
    layerFarTrees.update(state.cameraWorldX);
    layerMidTrees.update(state.cameraWorldX);
    layerNearTrees.update(state.cameraWorldX);
    layerBushes.update(state.cameraWorldX);

    // ---- draw ----
    ctx.clearRect(0, 0, W, H);
    drawSky(phase);
    drawCelestial(phase, elapsed);

    ctx.fillStyle = lerpColor(phase.skyBottom, '#101a10', 0.55);
    layerMountains.draw(state.cameraWorldX, groundY - 10);

    ctx.fillStyle = layerFarTrees.canopyColor;
    layerFarTrees.draw(state.cameraWorldX, groundY);
    layerMidTrees.draw(state.cameraWorldX, groundY);

    drawGround(phase, groundY);
    drawFireflies(phase, dt);

    layerNearTrees.draw(state.cameraWorldX, groundY + 6);

    Player.draw(groundY, state.isWalking);

    layerBushes.draw(state.cameraWorldX, groundY + 18);

    drawFog(phase);
    drawRain(dt);
    drawTint(phase);

    // ---- HUD text ----
    document.getElementById('statDistance').textContent = state.distanceM >= 1000
      ? (state.distanceM / 1000).toFixed(2) + ' km'
      : Math.round(state.distanceM) + ' m';
    document.getElementById('statPhase').textContent = phase.name;
    document.getElementById('statWeather').textContent = Weather.label();
  }

  requestAnimationFrame(frame);
})();
