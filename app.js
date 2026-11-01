// ===== إعدادات =====
const API_KEY = "123";          // مفتاح تجريبي مجاني من TheSportsDB، حط مفتاحك الخاص هنا لو عندك
const TEAM_ID = "133739";       // FC Barcelona
const REFRESH_MS = 60 * 1000;   // تحديث كل دقيقة

const API = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const $ = (id) => document.getElementById(id);


// ===== الساعة =====
function tickClock() {
  const now = new Date();
  $("time").textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const s = $("seconds"); if (s) s.textContent = String(now.getSeconds()).padStart(2, "0");
  const dt = $("date");
  if (dt) dt.textContent = now.toLocaleDateString("ar-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
setInterval(tickClock, 1000); tickClock();

// ===== جلب البيانات =====
async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }

function kickoff(e) {
  // TheSportsDB يرجّع الوقت بتوقيت UTC
  return new Date(`${e.dateEvent}T${(e.strTime || "00:00:00").slice(0, 8)}Z`);
}
const isBarca = (n) => /barcelona/i.test(n || "");
const hasScore = (e) => e.intHomeScore !== null && e.intHomeScore !== undefined && e.intHomeScore !== "";
const LIVE_STATUS = /1H|2H|HT|ET|live|in play|break/i;

function stateOf(e) {
  const k = kickoff(e), now = Date.now();
  const st = e.strStatus || "";
  if (/FT|AET|PEN|finished|match finished/i.test(st)) return "ft";
  if (LIVE_STATUS.test(st)) return "live";
  // احتياط: لو بدأت المباراة قبل أقل من ساعتين ونص ومعاها نتيجة نعتبرها مباشرة
  if (hasScore(e) && now >= k && now - k < 2.5 * 36e5) return "live";
  if (now >= k && now - k < 2.5 * 36e5) return "live";
  return now < k ? "upcoming" : "ft";
}

const AR = { "Barcelona": "برشلونة", "Real Madrid": "ريال مدريد", "Bayern Munich": "بايرن ميونخ", "Sevilla": "إشبيلية", "Atletico Madrid": "أتلتيكو مدريد", "Valencia": "فالنسيا", "Aston Villa": "أستون فيلا", "Deportivo Alavés": "ديبورتيفو ألافيس" };
const ar = (n) => AR[n] || n;
const LEAGUE_AR = { "Spanish La Liga": "الدوري الإسباني", "La Liga": "الدوري الإسباني", "UEFA Champions League": "دوري أبطال أوروبا", "Copa del Rey": "كأس الملك", "Spanish Super Cup": "كأس السوبر الإسباني" };
const lg = (n) => LEAGUE_AR[n] || n || "";

let EVENTS = [];

async function load() {
  let next = [], last = [], offline = false;
  try {
    const [n, l] = await Promise.all([
      getJSON(`${API}/eventsnext.php?id=${TEAM_ID}`),
      getJSON(`${API}/eventslast.php?id=${TEAM_ID}`),
    ]);
    next = n.events || []; last = l.results || [];
  } catch (_) { offline = true; }

  if (!next.length && !last.length) offline = true;
  EVENTS = [...last.slice(-1), ...next].filter((e) => isBarca(e.strHomeTeam) || isBarca(e.strAwayTeam));
  EVENTS.sort((a, b) => kickoff(a) - kickoff(b));
  render(offline);
}

// ===== العرض =====
function timeLabel(e) {
  return kickoff(e).toLocaleString("ar-u-ca-gregory-nu-latn", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function card(e) {
  const st = stateOf(e);
  const score = hasScore(e) ? `${e.intHomeScore} - ${e.intAwayScore}` : "vs";
  const badge = st === "live" ? `<span class="badge live">● مباشر</span>` : st === "ft" ? `<span class="badge ft">انتهت</span>` : `<span class="badge up">${timeLabel(e)}</span>`;
  return `<button class="match ${st}" data-id="${e.idEvent}">
    <div class="lg">${lg(e.strLeague)}</div>
    <div class="teams"><span>${ar(e.strHomeTeam)}</span><b class="score">${score}</b><span>${ar(e.strAwayTeam)}</span></div>
    ${badge}
  </button>`;
}

function render(offline) {
  $("matches").innerHTML = EVENTS.map(card).join("") || `<p class="empty">لا توجد مباريات قادمة حالياً</p>`;
  document.querySelectorAll(".match").forEach((b) => (b.onclick = () => openStreams(b.dataset.id)));
  const note = $("note"); if (note) note.textContent = offline ? "⚠ تعذر جلب المباريات من الإنترنت" : "";
  updateHero();
}

function updateHero() {
  const e = EVENTS.find((x) => stateOf(x) !== "ft") || EVENTS[EVENTS.length - 1];
  if (!e) return;
  const st = stateOf(e);
  $("heroLeague").textContent = lg(e.strLeague);
  $("heroDate").textContent = (st === "live" ? "● مباشر الآن · " : "") + timeLabel(e);
  $("heroHome").textContent = ar(e.strHomeTeam);
  $("heroAway").textContent = ar(e.strAwayTeam);
  $("heroScore").textContent = hasScore(e) ? `${e.intHomeScore} - ${e.intAwayScore}` : "VS";
  const cd = $("countdown");
  if (st === "live") { cd.textContent = "● المباراة جارية الآن"; cd.className = "live"; }
  else if (st === "ft") { cd.textContent = "انتهت المباراة"; cd.className = ""; }
  else {
    const ms = kickoff(e) - Date.now();
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    cd.textContent = `تبدأ بعد ${d} يوم ${h} ساعة ${m} دقيقة`; cd.className = "";
  }
  $("hero").onclick = () => openStreams(e.idEvent);
}
setInterval(updateHero, 30 * 1000);

// ===== روابط البث =====
// روابط رسمية فقط (القنوات الناقلة). تختلف الناقلة حسب بلدك.
function streams(e) {
  const q = encodeURIComponent(`${e.strHomeTeam} vs ${e.strAwayTeam} live`);
  const qa = encodeURIComponent(`بث مباشر ${ar(e.strHomeTeam)} ${ar(e.strAwayTeam)}`);
  // كلها مجانية وقانونية: بث رسمي على يوتيوب، إذاعة مباشرة، نتائج لحظية
  return [
    ["📺 قناة برشلونة على يوتيوب (بث/برامج ما قبل المباراة)", "https://www.youtube.com/@fcbarcelona/streams", "مجاني"],
    ["🎙 تعليق إذاعي مباشر · RAC1", "https://www.rac1.cat/", "مجاني · صوت"],
    ["🎙 تعليق إذاعي مباشر · كاتالونيا راديو", "https://www.ccma.cat/catalunya-radio/", "مجاني · صوت"],
    ["⚡ النتيجة والأحداث لحظة بلحظة · Sofascore", "https://www.sofascore.com/team/football/fc-barcelona/2817", "مجاني"],
    ["🏆 UEFA.tv (مباريات مختارة وملخصات)", "https://www.uefa.tv/", "مجاني جزئياً"],
    ["🔎 ابحث في يوتيوب عن بث المباراة", `https://www.youtube.com/results?search_query=${q}&sp=EgJAAQ%253D%253D`, "بث مباشر"],
    ["🔎 قناة مجانية تنقلها في بلدك", `https://www.google.com/search?q=${qa}`, "قوقل"],
  ];
}

function openStreams(id) {
  const e = EVENTS.find((x) => String(x.idEvent) === String(id)); if (!e) return;
  $("modalTitle").textContent = `${ar(e.strHomeTeam)} × ${ar(e.strAwayTeam)}`;
  $("modalSub").textContent = `${lg(e.strLeague)} · ${timeLabel(e)}`;
  $("streamHint").textContent = "ملاحظة: النقل الكامل لمباريات برشلونة غالباً مدفوع حسب البلد. هذي أفضل الخيارات المجانية القانونية.";
  $("streamList").innerHTML =streams(e).map(([n, u, d]) => `<a href="${u}" target="_blank" rel="noopener"><b>${n}</b><small>${d}</small><i>↗</i></a>`).join("");
  $("modal").classList.add("open");
}
$("modal").onclick = (ev) => { if (ev.target.id === "modal" || ev.target.id === "closeBtn") $("modal").classList.remove("open"); };
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") $("modal").classList.remove("open"); });

load(); setInterval(load, REFRESH_MS);
