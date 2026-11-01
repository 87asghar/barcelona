// تفاعل الخلفيات: لمس / ماوس / ميلان الجوال + شعار + تأثيرات canvas
(() => {
  const phone = document.querySelector(".phone");
  const mode = phone.dataset.fx || "none";
  const colors = (phone.dataset.colors || "#004d98,#a50044,#edbb00").split(",");

  // ---------- شعار (تصميم مودرن مستوحى، مو الشعار الرسمي) ----------
  let n = 0;
  const crest = () => {
    const id = "cl" + n++;
    const st = Array.from({ length: 6 }, (_, i) => `<rect x="${8 + i * 14}" y="40" width="14" height="90" fill="${i % 2 ? "#a50044" : "#004d98"}"/>`).join("");
    const shield = "M8 8H92V62C92 92 70 108 50 116C30 108 8 92 8 62Z";
    return `<svg viewBox="0 0 100 124"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath></defs>
      <g clip-path="url(#${id})"><rect width="100" height="42" fill="#0b2a5e"/>${st}
      <circle cx="50" cy="75" r="15" fill="#fff" opacity=".92"/><path d="M50 62l9 7-3 11H44l-3-11z" fill="#14213d" opacity=".85"/>
      <text x="50" y="31" text-anchor="middle" font-size="21" font-weight="800" fill="#edbb00" font-family="Arial,sans-serif" letter-spacing="2">FCB</text></g>
      <path d="${shield}" fill="none" stroke="#edbb00" stroke-width="4"/></svg>`;
  };
  document.querySelectorAll(".crest").forEach((el) => {
    el.innerHTML = crest();
    el.addEventListener("click", () => { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); });
  });

  // ---------- مدخلات ----------
  const S = { x: 0, y: 0, tx: 0, ty: 0, mx: -999, my: -999, down: false, t: 0 };
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const taps = [];
  const local = (e) => { const r = phone.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  addEventListener("pointermove", (e) => { const [x, y] = local(e); S.tx = clamp((x - .5) * 2); S.ty = clamp((y - .5) * 2); S.mx = x; S.my = y; });
  addEventListener("pointerdown", (e) => { const [x, y] = local(e); S.down = true; S.mx = x; S.my = y; taps.push({ x, y, t: S.t }); });
  addEventListener("pointerup", () => (S.down = false));
  addEventListener("pointerleave", () => { S.mx = S.my = -999; });
  addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; S.tx = clamp(e.gamma / 25); S.ty = clamp((e.beta - 50) / 25); });

  // ---------- canvas ----------
  const cv = document.getElementById("fx");
  const ctx = cv && cv.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { if (!cv) return; W = cv.width = phone.clientWidth * dpr; H = cv.height = phone.clientHeight * dpr; };
  new ResizeObserver(size).observe(phone); size();

  const rnd = (a, b) => a + Math.random() * (b - a);
  const blobs = colors.map((c, i) => ({ c, x: rnd(.2, .8), y: rnd(.2, .8), vx: rnd(-1, 1) * .0004, vy: rnd(-1, 1) * .0004, r: rnd(.35, .6) }));
  const parts = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(1, 3.4), vy: rnd(.0002, .0009), a: rnd(.25, .8), c: colors[(Math.random() * colors.length) | 0], vx: 0, vv: 0 }));

  function ringsDraw() {
    for (let i = taps.length - 1; i >= 0; i--) {
      const age = S.t - taps[i].t; if (age > 1.4) { taps.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(taps[i].x * W, taps[i].y * H, age * 0.5 * W, 0, 7);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - age / 1.4) * .35})`; ctx.lineWidth = 2 * dpr; ctx.stroke();
    }
  }

  function drawBlobs() {
    ctx.globalCompositeOperation = "lighter";
    blobs.forEach((b) => {
      b.x += b.vx * 16; b.y += b.vy * 16;
      if (b.x < 0 || b.x > 1) b.vx *= -1; if (b.y < 0 || b.y > 1) b.vy *= -1;
      if (S.mx > -5) { b.x += (S.mx - b.x) * (S.down ? .02 : .004); b.y += (S.my - b.y) * (S.down ? .02 : .004); }
      const x = (b.x + S.x * .03) * W, y = (b.y + S.y * .03) * H, r = b.r * W * (1 + (S.down ? .15 : 0));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, b.c + "aa"); g.addColorStop(1, b.c + "00");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function drawStripes() {
    const N = 10, bw = W / N, step = 28 * dpr;
    for (let i = 0; i < N; i++) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      const c = i % 2 ? colors[1] : colors[0];
      g.addColorStop(0, c + "00"); g.addColorStop(.35, c + "66"); g.addColorStop(1, c + "d0");
      ctx.fillStyle = g; ctx.beginPath();
      const off = (y, x) => {
        let o = Math.sin(y * .0035 + S.t * .9 + i * .55) * W * .018 + S.x * W * .02 * (y / H);
        taps.forEach((t) => { const age = S.t - t.t, d = Math.hypot(x - t.x * W, y - t.y * H);
          o += Math.sin(d * .03 - age * 9) * Math.exp(-age * 1.6) * Math.exp(-d / (W * .7)) * W * .035; });
        return o;
      };
      for (let y = 0; y <= H + step; y += step) ctx[y ? "lineTo" : "moveTo"](i * bw + off(y, i * bw), y);
      for (let y = H + step; y >= 0; y -= step) ctx.lineTo((i + 1) * bw + off(y, (i + 1) * bw), y);
      ctx.closePath(); ctx.fill();
    }
    for (let i = taps.length - 1; i >= 0; i--) if (S.t - taps[i].t > 2) taps.splice(i, 1);
  }

  function drawParticles() {
    const burst = taps.splice(0);
    burst.forEach((t) => { for (let k = 0; k < 18; k++) { const a = rnd(0, 6.28), s = rnd(.002, .008); parts.push({ x: t.x, y: t.y, r: rnd(1.5, 3.8), vy: Math.sin(a) * s, vx: Math.cos(a) * s * .55, a: 1, c: colors[(Math.random() * colors.length) | 0], life: 1 }); } });
    ctx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.life !== undefined) { p.life -= .012; p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy *= .97; if (p.life <= 0) { parts.splice(i, 1); continue; } }
      else {
        p.y -= p.vy * 16; p.x += (p.vx || 0);
        if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        if (S.mx > -5) { const dx = p.x - S.mx, dy = (p.y - S.my) * (H / W), d = Math.hypot(dx, dy); if (d < .18) { p.x += dx / (d + .01) * .004; p.y += dy / (d + .01) * .004; } }
      }
      const x = (p.x + S.x * .01 * p.r) * W, y = p.y * H, r = p.r * dpr * 4, al = (p.life ?? 1) * p.a;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, p.c + Math.round(al * 255).toString(16).padStart(2, "0")); g.addColorStop(1, p.c + "00");
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(ts) {
    S.t = ts / 1000;
    S.x += (S.tx - S.x) * .07; S.y += (S.ty - S.y) * .07;
    phone.style.setProperty("--px", S.x.toFixed(3)); phone.style.setProperty("--py", S.y.toFixed(3));
    if (ctx && mode !== "none") {
      ctx.clearRect(0, 0, W, H);
      if (mode === "blobs") { drawBlobs(); ringsDraw(); }
      if (mode === "stripes") drawStripes();
      if (mode === "particles") drawParticles();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
