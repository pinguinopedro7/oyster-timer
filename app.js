/* Pearl Point Oyster Freshness Tracker – single-page offline PWA */

const STORAGE_KEY = "pearl_point_freshness_v2";

const el = (id) => document.getElementById(id);

const appEl = el("app");
const topbarEl = el("topbar");
const footerEl = el("footer");

const appTitleEl = el("appTitle");
const liveTimerEl = el("liveTimer");
const pulledAtTextEl = el("pulledAtText");
const timerLabelEl = el("timerLabel");
const statusEl = el("status");

const toggleSettingsBtn = el("toggleSettings");
const settingsPanel = el("settingsPanel");

const pulledAtInputEl = el("pulledAtInput");
const setNowBtn = el("setNow");
const saveTimeBtn = el("saveTime");
const clearTimeBtn = el("clearTime");

const titleInputEl = el("titleInput");
const labelInputEl = el("labelInput");

const borderlessToggleEl = el("borderlessToggle");
const hideHeaderToggleEl = el("hideHeaderToggle");
const hidePulledAtToggleEl = el("hidePulledAtToggle");

const bgTypeEl = el("bgType");
const bgSolidControls = el("bgSolidControls");
const bgGradientControls = el("bgGradientControls");
const bgPhotoControls = el("bgPhotoControls");

const bgSolidColorEl = el("bgSolidColor");
const bgGradAEl = el("bgGradA");
const bgGradBEl = el("bgGradB");
const bgGradAngleEl = el("bgGradAngle");
const bgPhotoFileEl = el("bgPhotoFile");
const removePhotoBtn = el("removePhoto");

const fontScaleEl = el("fontScale");
const fontFamilyEl = el("fontFamily");
const stylePresetEl = el("stylePreset");
const glowEl = el("glow");
const resetSettingsBtn = el("resetSettings");

const DEFAULT_STATE = {
  pulledAtISO: "",

  text: {
    title: "Pearl Point Oyster Freshness Tracker",
    label: "TIME SINCE PULLED"
  },

  display: {
    borderless: false,
    hideHeader: false,
    hidePulledAtLine: false
  },

  ui: {
    bg: {
      type: "solid", // solid | gradient | photo
      solid: "#0b1220",
      gradA: "#0b1220",
      gradB: "#163257",
      gradAngle: 135,
      photoDataUrl: ""
    },
    fontScale: 120,
    fontFamily: "system",
    stylePreset: "clean",
    glow: 25
  }
};

let state = loadState();

function setStatus(msg) {
  statusEl.textContent = msg || "";
  if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 2500);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return mergeDeep(structuredClone(DEFAULT_STATE), parsed);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mergeDeep(target, source) {
  for (const k of Object.keys(source || {})) {
    if (source[k] && typeof source[k] === "object" && !Array.isArray(source[k])) {
      target[k] = mergeDeep(target[k] ?? {}, source[k]);
    } else {
      target[k] = source[k];
    }
  }
  return target;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function fmtPulledAtLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function tick() {
  const iso = state.pulledAtISO;
  if (!iso) {
    liveTimerEl.textContent = "—";
    pulledAtTextEl.textContent = "Pulled at: —";
    return;
  }
  const t0 = new Date(iso).getTime();
  if (Number.isNaN(t0)) {
    liveTimerEl.textContent = "—";
    pulledAtTextEl.textContent = "Pulled at: —";
    return;
  }
  liveTimerEl.textContent = formatDuration(Date.now() - t0);
  pulledAtTextEl.textContent = `Pulled at: ${fmtPulledAtLabel(iso)}`;
}

/* datetime-local helpers */
function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromDatetimeLocalValue(val) {
  const d = new Date(val); // interpreted as local time
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/* Photo handling (compress) */
async function fileToCompressedDataUrl(file, maxW = 1800, quality = 0.78) {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ratio = img.width / img.height;

  let w = img.width;
  let h = img.height;
  if (w > maxW) { w = maxW; h = Math.round(w / ratio); }

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* UI apply */
function updateBgControlVisibility() {
  const t = bgTypeEl.value;
  bgSolidControls.classList.toggle("hidden", t !== "solid");
  bgGradientControls.classList.toggle("hidden", t !== "gradient");
  bgPhotoControls.classList.toggle("hidden", t !== "photo");
}

function applyUI() {
  // Text
  document.title = state.text.title || DEFAULT_STATE.text.title;
  appTitleEl.textContent = state.text.title || DEFAULT_STATE.text.title;
  timerLabelEl.textContent = state.text.label || DEFAULT_STATE.text.label;

  // Display toggles
  document.body.classList.toggle("borderless", !!state.display.borderless);
  topbarEl.classList.toggle("hidden", !!state.display.hideHeader);
  footerEl.classList.toggle("hidden", !!state.display.hideHeader);
  pulledAtTextEl.classList.toggle("hidden", !!state.display.hidePulledAtLine);

  // Style preset
  appEl.classList.remove("style-clean", "style-dock", "style-bold");
  appEl.classList.add(`style-${state.ui.stylePreset}`);

  // Font scale + glow
  document.documentElement.style.setProperty("--scale", String(state.ui.fontScale));
  document.documentElement.style.setProperty("--glow", String(state.ui.glow));

  // Font family
  const ff = state.ui.fontFamily;
  let font;
  if (ff === "mono") {
    font = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  } else if (ff === "serif") {
    font = 'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  } else if (ff === "round") {
    font = 'ui-sans-serif, system-ui, -apple-system, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
  } else {
    font = 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  }
  document.documentElement.style.setProperty("--font", font);

  // Background
  const bg = state.ui.bg;
  if (bg.type === "solid") {
    appEl.style.backgroundImage = "none";
    document.documentElement.style.setProperty("--bg", bg.solid);
  } else if (bg.type === "gradient") {
    const ang = Number(bg.gradAngle) || 135;
    appEl.style.backgroundImage = `linear-gradient(${ang}deg, ${bg.gradA}, ${bg.gradB})`;
    document.documentElement.style.setProperty("--bg", "#0b1220");
  } else if (bg.type === "photo") {
    appEl.style.backgroundImage = bg.photoDataUrl ? `url("${bg.photoDataUrl}")` : "none";
    document.documentElement.style.setProperty("--bg", "#0b1220");
  }

  // Inputs reflect state
  pulledAtInputEl.value = state.pulledAtISO ? toDatetimeLocalValue(state.pulledAtISO) : "";

  titleInputEl.value = state.text.title || "";
  labelInputEl.value = state.text.label || "";

  borderlessToggleEl.checked = !!state.display.borderless;
  hideHeaderToggleEl.checked = !!state.display.hideHeader;
  hidePulledAtToggleEl.checked = !!state.display.hidePulledAtLine;

  bgTypeEl.value = bg.type;
  bgSolidColorEl.value = bg.solid;
  bgGradAEl.value = bg.gradA;
  bgGradBEl.value = bg.gradB;
  bgGradAngleEl.value = String(bg.gradAngle);

  fontScaleEl.value = String(state.ui.fontScale);
  fontFamilyEl.value = state.ui.fontFamily;
  stylePresetEl.value = state.ui.stylePreset;
  glowEl.value = String(state.ui.glow);

  updateBgControlVisibility();
}

/* Events */
toggleSettingsBtn.addEventListener("click", () => {
  const isHidden = settingsPanel.classList.toggle("hidden");
  toggleSettingsBtn.setAttribute("aria-expanded", String(!isHidden));
});

setNowBtn.addEventListener("click", () => {
  const now = new Date();
  pulledAtInputEl.value = toDatetimeLocalValue(now.toISOString());
  setStatus("Set to now.");
});

saveTimeBtn.addEventListener("click", () => {
  const v = pulledAtInputEl.value;
  if (!v) { setStatus("Pick a time first."); return; }
  state.pulledAtISO = fromDatetimeLocalValue(v);
  saveState();
  tick();
  setStatus("Saved.");
});

clearTimeBtn.addEventListener("click", () => {
  state.pulledAtISO = "";
  saveState();
  tick();
  setStatus("Cleared.");
});

// Editable text
titleInputEl.addEventListener("input", () => {
  state.text.title = titleInputEl.value.trim() || DEFAULT_STATE.text.title;
  saveState();
  applyUI();
});

labelInputEl.addEventListener("input", () => {
  state.text.label = labelInputEl.value.trim() || DEFAULT_STATE.text.label;
  saveState();
  applyUI();
});

// Display toggles
borderlessToggleEl.addEventListener("change", () => {
  state.display.borderless = borderlessToggleEl.checked;
  saveState();
  applyUI();
});

hideHeaderToggleEl.addEventListener("change", () => {
  state.display.hideHeader = hideHeaderToggleEl.checked;
  saveState();
  applyUI();
});

hidePulledAtToggleEl.addEventListener("change", () => {
  state.display.hidePulledAtLine = hidePulledAtToggleEl.checked;
  saveState();
  applyUI();
});

// Background controls
bgTypeEl.addEventListener("change", () => {
  state.ui.bg.type = bgTypeEl.value;
  updateBgControlVisibility();
  saveState();
  applyUI();
});

bgSolidColorEl.addEventListener("input", () => {
  state.ui.bg.solid = bgSolidColorEl.value;
  saveState();
  applyUI();
});

bgGradAEl.addEventListener("input", () => {
  state.ui.bg.gradA = bgGradAEl.value;
  saveState();
  applyUI();
});

bgGradBEl.addEventListener("input", () => {
  state.ui.bg.gradB = bgGradBEl.value;
  saveState();
  applyUI();
});

bgGradAngleEl.addEventListener("input", () => {
  state.ui.bg.gradAngle = Number(bgGradAngleEl.value);
  saveState();
  applyUI();
});

bgPhotoFileEl.addEventListener("change", async () => {
  const f = bgPhotoFileEl.files?.[0];
  if (!f) return;
  try {
    const dataUrl = await fileToCompressedDataUrl(f);
    state.ui.bg.photoDataUrl = dataUrl;
    state.ui.bg.type = "photo";
    bgTypeEl.value = "photo";
    saveState();
    applyUI();
    setStatus("Photo saved for offline use.");
  } catch {
    setStatus("Could not load that photo.");
  } finally {
    bgPhotoFileEl.value = "";
  }
});

removePhotoBtn.addEventListener("click", () => {
  state.ui.bg.photoDataUrl = "";
  saveState();
  applyUI();
  setStatus("Photo removed.");
});

// Look & feel
fontScaleEl.addEventListener("input", () => {
  state.ui.fontScale = Number(fontScaleEl.value);
  saveState();
  applyUI();
});

fontFamilyEl.addEventListener("change", () => {
  state.ui.fontFamily = fontFamilyEl.value;
  saveState();
  applyUI();
});

stylePresetEl.addEventListener("change", () => {
  state.ui.stylePreset = stylePresetEl.value;
  saveState();
  applyUI();
});

glowEl.addEventListener("input", () => {
  state.ui.glow = Number(glowEl.value);
  saveState();
  applyUI();
});

resetSettingsBtn.addEventListener("click", () => {
  const keepPulled = state.pulledAtISO;
  state = structuredClone(DEFAULT_STATE);
  state.pulledAtISO = keepPulled;
  saveState();
  applyUI();
  setStatus("Settings reset.");
});

/* Init */
applyUI();
tick();
setInterval(tick, 1000);

/* Register service worker */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
