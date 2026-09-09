// Dirt underside for the lifted map piece.
// Usage:
//   import { buildDirtIsland } from './dirt.js';
//   import config from './dirt-config.json' with { type: 'json' };
//   scene.add(buildDirtIsland(config));
//
// Output is a pure function of the config (all randomness is seeded from
// config.seed), so the same config always yields the identical mesh.
// The chosen config lives in dirt-config.json; explore new ones in dirt-lab.html.

import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// periodic in theta so the mesh seam is invisible
function makeAngularNoise(rand, harmonics, amplitude) {
  const terms = [];
  for (let i = 0; i < harmonics; i++) {
    terms.push({
      freq: 1 + Math.floor(rand() * 6),
      phase: rand() * Math.PI * 2,
      amp: amplitude * (0.4 + rand() * 0.6) / harmonics,
    });
  }
  return (theta, t) => {
    let v = 0;
    for (const { freq, phase, amp } of terms) {
      v += Math.sin(theta * freq + phase + t * 3.1) * amp;
    }
    return v;
  };
}

// hue/sat/light anchors for the dirt ramp; darkness and warmth bend them
function makeRamp(cfg) {
  const hue = 0.055 + cfg.warmth * 0.035;
  const sat = 0.28 + cfg.warmth * 0.24;
  const lTop = 0.5 - cfg.darkness * 0.3;
  const lBot = 0.3 - cfg.darkness * 0.22;
  return (t) => {
    const l = THREE.MathUtils.lerp(lTop, Math.max(0.04, lBot), t);
    const s = sat * (1 - t * 0.35);
    return new THREE.Color().setHSL(hue, s, Math.max(0.03, l));
  };
}

function colorAt(cfg, ramp, t, theta, bandNoise) {
  if (cfg.pattern === 'strata') {
    const wobble = bandNoise(theta, 0) * 0.05;
    const band = Math.min(cfg.bands - 1, Math.floor(THREE.MathUtils.clamp(t + wobble, 0, 0.999) * cfg.bands));
    const c = ramp((band + 0.5) / cfg.bands);
    // alternate bands get a lightness kick so the layering reads
    if (band % 2 === 1) c.offsetHSL(0.01, 0.03, 0.07);
    return c;
  }
  return ramp(t);
}

function makeRimRadius(cfg, rand, R) {
  if (cfg.outline === 'cut') {
    // straight-edged polygon: the piece was sliced out of the map
    const n = 5 + Math.floor(rand() * 4);
    const corners = [];
    const start = rand() * Math.PI * 2;
    const spacing = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const a = start + (i + (rand() - 0.5) * 0.7) * spacing;
      const r = R * (0.82 + rand() * 0.32);
      corners.push({ a, x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    return (theta) => {
      const base = corners[0].a;
      let th = theta;
      while (th < base) th += Math.PI * 2;
      let i = corners.length - 1;
      for (let k = 0; k < corners.length; k++) {
        const next = k + 1 < corners.length ? corners[k + 1].a : corners[0].a + Math.PI * 2;
        if (th >= corners[k].a && th < next) { i = k; break; }
      }
      const p1 = corners[i];
      const p2 = corners[(i + 1) % corners.length];
      // ray (cos th, sin th) vs segment p1→p2
      const dx = Math.cos(th), dz = Math.sin(th);
      const ex = p2.x - p1.x, ez = p2.z - p1.z;
      const denom = dx * ez - dz * ex;
      if (Math.abs(denom) < 1e-6) return Math.hypot(p1.x, p1.z);
      return (p1.x * ez - p1.z * ex) / denom;
    };
  }
  const noise = makeAngularNoise(rand, 4, 0.28);
  return (theta) => R * (1 + noise(theta, 0) * (0.4 + cfg.jag));
}

function makeProfile(cfg) {
  switch (cfg.silhouette) {
    case 'cone':
      return (t) => Math.pow(1 - t, 1.4);
    case 'slab':
      // near-vertical torn sides, then a fast chamfer to the bottom
      return (t) => t < 0.7
        ? 1 - t * 0.1
        : 0.93 * Math.pow(Math.max(0, 1 - (t - 0.7) / 0.3), 0.65);
    case 'spiky':
      // shallow body; the depth is carried by the spikes added after
      return (t) => t < 0.55
        ? 1 - t * 0.12
        : 0.934 * Math.pow(Math.max(0, 1 - (t - 0.55) / 0.45), 0.8);
  }
}

/**
 * Build the island group: dirt underside + flat top cap.
 * @param {object} cfg  full config (see dirt-config.json)
 * @param {object} [opts]
 * @param {number|null} [opts.topColor=0x8aa86a]  top cap color; pass null to
 *   skip the cap entirely (when the real map surface sits on top).
 * @param {number} [opts.radius=1.6]  nominal rim radius in world units.
 * @returns {THREE.Group}
 */
export function buildDirtIsland(cfg, { topColor = 0x8aa86a, radius = 1.6 } = {}) {
  const rand = mulberry32(cfg.seed);
  const surfNoise = makeAngularNoise(rand, 6, cfg.jag);
  const bandNoise = makeAngularNoise(rand, 3, 1);
  const ramp = makeRamp(cfg);
  const profile = makeProfile(cfg);
  const rimRadius = makeRimRadius(cfg, rand, radius);

  const bodyDepth = cfg.silhouette === 'spiky' ? cfg.depth * 0.45 : cfg.depth;
  const segs = Math.round(cfg.facets);
  const rings = THREE.MathUtils.clamp(Math.round(segs * 0.4), 6, 26);

  const group = new THREE.Group();
  const positions = [], colors = [], indices = [], ringStart = [];
  // keep vertical noise below the ring spacing so rings never fold into slits
  const yAmp = Math.min(cfg.jag * 0.4, (bodyDepth / rings) * 0.35);

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    ringStart.push(positions.length / 3);
    const prof = profile(t);
    for (let j = 0; j < segs; j++) {
      const theta = (j / segs) * Math.PI * 2;
      const jitter = i === 0 ? 0 : (rand() - 0.5) * cfg.jag * 0.5;
      const noise = i === 0 ? 0 : surfNoise(theta, t) * (0.3 + t);
      const r = Math.max(0.02, rimRadius(theta) * prof * (1 + noise + jitter));
      const yOff = i === 0 ? 0
        : THREE.MathUtils.clamp(surfNoise(theta + 9, t) * 0.4 + jitter * 0.3, -yAmp, yAmp);
      const y = -bodyDepth * t + yOff;
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      const c = colorAt(cfg, ramp, t, theta, bandNoise);
      colors.push(c.r, c.g, c.b);
    }
  }

  const tipIndex = positions.length / 3;
  positions.push(
    surfNoise(0, 1) * 0.2,
    -bodyDepth * (1 + rand() * 0.1),
    surfNoise(3, 1) * 0.2
  );
  const tipColor = colorAt(cfg, ramp, 1, 0, bandNoise);
  colors.push(tipColor.r, tipColor.g, tipColor.b);

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const jn = (j + 1) % segs;
      const a = ringStart[i] + j, b = ringStart[i] + jn;
      const c = ringStart[i + 1] + j, d = ringStart[i + 1] + jn;
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let j = 0; j < segs; j++) {
    const jn = (j + 1) % segs;
    indices.push(ringStart[rings] + j, ringStart[rings] + jn, tipIndex);
  }

  const topC = topColor === null ? null : new THREE.Color(topColor);
  if (topC) {
    const capCenter = positions.length / 3;
    positions.push(0, 0.02, 0);
    colors.push(topC.r, topC.g, topC.b);
    const capRing = positions.length / 3;
    for (let j = 0; j < segs; j++) {
      const theta = (j / segs) * Math.PI * 2;
      const r = rimRadius(theta);
      positions.push(Math.cos(theta) * r, 0.02, Math.sin(theta) * r);
      colors.push(topC.r, topC.g, topC.b);
    }
    for (let j = 0; j < segs; j++) {
      const jn = (j + 1) % segs;
      indices.push(capCenter, capRing + j, capRing + jn);
    }
  }

  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo = geo.toNonIndexed();

  // per-face shading variation; speckled pattern drops in darker stones
  const col = geo.getAttribute('color');
  const stone = new THREE.Color().setHSL(0.08, 0.08, Math.max(0.06, 0.2 - cfg.darkness * 0.1));
  for (let f = 0; f < col.count; f += 3) {
    const isTop = topC
      && Math.abs(col.getX(f) - topC.r) < 0.001
      && Math.abs(col.getY(f) - topC.g) < 0.001;
    const shade = 1 + (rand() - 0.5) * (isTop ? 0.03 : cfg.pattern === 'strata' ? 0.07 : 0.14);
    let mix = 0;
    if (!isTop && cfg.pattern === 'speckled' && rand() < 0.1) mix = 0.55 + rand() * 0.35;
    for (let v = 0; v < 3; v++) {
      const c = new THREE.Color(col.getX(f + v), col.getY(f + v), col.getZ(f + v));
      c.multiplyScalar(shade);
      if (mix) c.lerp(stone, mix);
      col.setXYZ(f + v,
        THREE.MathUtils.clamp(c.r, 0, 1),
        THREE.MathUtils.clamp(c.g, 0, 1),
        THREE.MathUtils.clamp(c.b, 0, 1));
    }
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0,
  });
  group.add(new THREE.Mesh(geo, mat));

  if (cfg.silhouette === 'spiky') addSpikes(group, cfg, rand, ramp, rimRadius, bodyDepth);
  if (cfg.extras === 'roots') addRoots(group, cfg, rand, rimRadius, profile, bodyDepth);
  if (cfg.extras === 'debris') addDebris(group, cfg, rand, ramp);

  return group;
}

/**
 * Resample a closed outline ([[x, z], ...]) to n evenly spaced points by arc length.
 */
export function resampleOutline(points, n) {
  const L = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1], b = points[i % points.length];
    L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = L[L.length - 1];
  const out = [];
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    let i = 1;
    while (L[i] < d) i++;
    const a = points[i - 1], b = points[i % points.length];
    const f = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * Dirt underside for an arbitrary footprint (e.g. a borough lifted out of the
 * map). Same visual language as buildDirtIsland, but the top ring traces the
 * given outline exactly, so it tucks under an extruded slab of the same shape.
 * All sizes scale with the outline: proportions match the lab at rim radius 1.6.
 *
 * @param {Array<[number, number]>} outlineIn  closed outline in world [x, z]
 * @param {object} cfg  full config (see dirt-config.json)
 * @param {object} [opts]
 * @param {number} [opts.yTop=0]  world y of the outline / slab underside
 * @param {boolean} [opts.resample=true]  arc-length resample the outline to
 *   cfg.facets points; pass false if it is already resampled (guarantees the
 *   top ring matches your slab geometry vertex-for-vertex)
 * @returns {THREE.Group}  vertices in world coordinates (centroid baked in)
 */
export function buildDirtForOutline(outlineIn, cfg, { yTop = 0, resample = true } = {}) {
  const segs = Math.round(cfg.facets);
  let pts = resample ? resampleOutline(outlineIn, segs) : outlineIn.map((p) => [p[0], p[1]]);

  // match the radial builder's winding so face normals point outward
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    area += x1 * z2 - x2 * z1;
  }
  if (area < 0) pts = pts.slice().reverse();

  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= pts.length; cz /= pts.length;
  let charR = 0;
  for (const [x, z] of pts) charR += Math.hypot(x - cx, z - cz);
  charR /= pts.length;
  const scale = charR / 1.6;

  const rand = mulberry32(cfg.seed);
  const surfNoise = makeAngularNoise(rand, 6, cfg.jag);
  const bandNoise = makeAngularNoise(rand, 3, 1);
  const ramp = makeRamp(cfg);
  const profile = makeProfile(cfg);

  const bodyDepth = (cfg.silhouette === 'spiky' ? 0.45 : 1) * cfg.depth * scale;
  const rings = THREE.MathUtils.clamp(Math.round(segs * 0.4), 6, 26);

  const group = new THREE.Group();
  const positions = [], colors = [], indices = [], ringStart = [];
  const yAmp = Math.min(cfg.jag * 0.4 * scale, (bodyDepth / rings) * 0.35);

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    ringStart.push(positions.length / 3);
    const prof = profile(t);
    for (let j = 0; j < segs; j++) {
      const theta = (j / segs) * Math.PI * 2;
      const jitter = i === 0 ? 0 : (rand() - 0.5) * cfg.jag * 0.5;
      const noise = i === 0 ? 0 : surfNoise(theta, t) * (0.3 + t);
      // never bulge past the cut outline — a lifted piece erodes inward,
      // and tapers as it deepens so the silhouette stays crisp under the slab
      const taper = 1 - 0.15 * t;
      const mult = Math.min(taper, Math.max(0.012, prof * (1 + noise + jitter)));
      const yOff = i === 0 ? 0
        : THREE.MathUtils.clamp((surfNoise(theta + 9, t) * 0.4 + jitter * 0.3) * scale, -yAmp, yAmp);
      positions.push(
        cx + (pts[j][0] - cx) * mult,
        yTop - bodyDepth * t + yOff,
        cz + (pts[j][1] - cz) * mult
      );
      const c = colorAt(cfg, ramp, t, theta, bandNoise);
      colors.push(c.r, c.g, c.b);
    }
  }

  const tipIndex = positions.length / 3;
  positions.push(
    cx + surfNoise(0, 1) * 0.2 * scale,
    yTop - bodyDepth * (1 + rand() * 0.1),
    cz + surfNoise(3, 1) * 0.2 * scale
  );
  const tipColor = colorAt(cfg, ramp, 1, 0, bandNoise);
  colors.push(tipColor.r, tipColor.g, tipColor.b);

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const jn = (j + 1) % segs;
      const a = ringStart[i] + j, b = ringStart[i] + jn;
      const c = ringStart[i + 1] + j, d = ringStart[i + 1] + jn;
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let j = 0; j < segs; j++) {
    const jn = (j + 1) % segs;
    indices.push(ringStart[rings] + j, ringStart[rings] + jn, tipIndex);
  }

  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo = geo.toNonIndexed();

  const col = geo.getAttribute('color');
  const stone = new THREE.Color().setHSL(0.08, 0.08, Math.max(0.06, 0.2 - cfg.darkness * 0.1));
  for (let f = 0; f < col.count; f += 3) {
    const shade = 1 + (rand() - 0.5) * (cfg.pattern === 'strata' ? 0.07 : 0.14);
    let mix = 0;
    if (cfg.pattern === 'speckled' && rand() < 0.1) mix = 0.55 + rand() * 0.35;
    for (let v = 0; v < 3; v++) {
      const c = new THREE.Color(col.getX(f + v), col.getY(f + v), col.getZ(f + v));
      c.multiplyScalar(shade);
      if (mix) c.lerp(stone, mix);
      col.setXYZ(f + v,
        THREE.MathUtils.clamp(c.r, 0, 1),
        THREE.MathUtils.clamp(c.g, 0, 1),
        THREE.MathUtils.clamp(c.b, 0, 1));
    }
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0,
  });
  group.add(new THREE.Mesh(geo, mat));

  if (cfg.silhouette === 'spiky') {
    const spikeGroup = new THREE.Group();
    addSpikes(spikeGroup, { ...cfg, depth: cfg.depth * scale }, rand, ramp, () => charR, bodyDepth);
    spikeGroup.position.set(cx, yTop, cz);
    group.add(spikeGroup);
  }

  return group;
}

function addSpikes(group, cfg, rand, ramp, rimRadius, bodyDepth) {
  const n = Math.round(cfg.spikes);
  for (let i = 0; i < n; i++) {
    const theta = rand() * Math.PI * 2;
    const rFrac = Math.sqrt(rand()) * 0.75;
    const r = rimRadius(theta) * rFrac;
    const px = Math.cos(theta) * r;
    const pz = Math.sin(theta) * r;
    // longer spikes near the middle
    const len = (cfg.depth - bodyDepth) * (0.4 + rand() * 0.6) * (1.2 - rFrac * 0.6);
    const rad = 0.1 + rand() * 0.22;
    const geo = new THREE.ConeGeometry(rad, len, 4 + Math.floor(rand() * 3), 1, true);
    const c = ramp(0.45 + rand() * 0.4);
    c.multiplyScalar(0.9 + rand() * 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI; // point down
    mesh.rotation.z = (rand() - 0.5) * 0.35;
    mesh.rotation.y = rand() * Math.PI;
    // embed the base inside the body so the joint is hidden
    mesh.position.set(px, -bodyDepth * (0.45 + rFrac * 0.4) - len / 2 + 0.12, pz);
    group.add(mesh);
  }
}

function addRoots(group, cfg, rand, rimRadius, profile, bodyDepth) {
  const n = 5 + Math.floor(rand() * 4);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.07, 0.35, Math.max(0.05, 0.16 - cfg.darkness * 0.06)),
    roughness: 1,
  });
  for (let i = 0; i < n; i++) {
    const theta = rand() * Math.PI * 2;
    const t = 0.1 + rand() * 0.35;
    const startR = rimRadius(theta) * profile(t) * (0.55 + rand() * 0.2);
    const sx = Math.cos(theta) * startR;
    const sz = Math.sin(theta) * startR;
    const startY = -bodyDepth * t + 0.06;
    const len = 0.3 + rand() * 0.45;
    const pts = [];
    for (let k = 0; k <= 3; k++) {
      const f = k / 3;
      pts.push(new THREE.Vector3(
        sx + (rand() - 0.5) * 0.14 * f,
        startY - len * f,
        sz + (rand() - 0.5) * 0.14 * f
      ));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.014 + rand() * 0.012, 5, false);
    group.add(new THREE.Mesh(geo, mat));
  }
}

function addDebris(group, cfg, rand, ramp) {
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const size = 0.06 + rand() * 0.12;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const pos = geo.getAttribute('position');
    for (let v = 0; v < pos.count; v++) {
      const k = 1 + (rand() - 0.5) * 0.5;
      pos.setXYZ(v, pos.getX(v) * k, pos.getY(v) * k, pos.getZ(v) * k);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: ramp(0.3 + rand() * 0.5),
      flatShading: true,
      roughness: 0.95,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const theta = rand() * Math.PI * 2;
    const r = 0.4 + rand() * 1.1;
    mesh.position.set(Math.cos(theta) * r, -cfg.depth * (0.55 + rand() * 0.7), Math.sin(theta) * r);
    mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    mesh.userData.bobPhase = rand() * Math.PI * 2;
    mesh.userData.bobBase = mesh.position.y;
    group.add(mesh);
  }
}
