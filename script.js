const STORAGE_KEY = "prompt-presets-v2";
const THEME_KEY = "prompt-theme-v1";
const DRAFT_KEY = "prompt-draft-v1";

const state = {
  presets: [],
  editingId: null,
};

const el = {
  form: document.getElementById("preset-form"),
  saveBtn: document.getElementById("save-btn"),
  duplicateBtn: document.getElementById("duplicate-btn"),
  resetBtn: document.getElementById("reset-btn"),
  clearStorageBtn: document.getElementById("clear-storage-btn"),
  themeBtn: document.getElementById("theme-btn"),
  name: document.getElementById("name"),
  category: document.getElementById("category"),
  tags: document.getElementById("tags"),
  positive: document.getElementById("positive"),
  negative: document.getElementById("negative"),
  notes: document.getElementById("notes"),
  model: document.getElementById("model"),
  aspect: document.getElementById("aspect"),
  seed: document.getElementById("seed"),
  steps: document.getElementById("steps"),
  cfg: document.getElementById("cfg"),
  sampler: document.getElementById("sampler"),
  list: document.getElementById("preset-list"),
  search: document.getElementById("search"),
  sortBy: document.getElementById("sort-by"),
  includeNegative: document.getElementById("include-negative"),
  includeParams: document.getElementById("include-params"),
  includeNotes: document.getElementById("include-notes"),
  combined: document.getElementById("combined"),
  status: document.getElementById("status"),
  copyBtn: document.getElementById("copy-btn"),
  copyJsonBtn: document.getElementById("copy-json-btn"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  template: document.getElementById("preset-item-template"),
};

const required = ["name", "positive"];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx);
}

function serializeForm() {
  return {
    id: state.editingId || uid(),
    name: el.name.value.trim(),
    category: el.category.value,
    tags: parseTags(el.tags.value),
    positive: el.positive.value.trim(),
    negative: el.negative.value.trim(),
    notes: el.notes.value.trim(),
    model: el.model.value.trim(),
    aspect: el.aspect.value.trim(),
    seed: el.seed.value.trim(),
    steps: el.steps.value.trim(),
    cfg: el.cfg.value.trim(),
    sampler: el.sampler.value.trim(),
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizePreset(input) {
  return {
    id: input.id || uid(),
    name: String(input.name || "").trim(),
    category: String(input.category || "General"),
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).toLowerCase()) : [],
    positive: String(input.positive || "").trim(),
    negative: String(input.negative || "").trim(),
    notes: String(input.notes || "").trim(),
    model: String(input.model || "").trim(),
    aspect: String(input.aspect || "").trim(),
    seed: String(input.seed || "").trim(),
    steps: String(input.steps || "30").trim(),
    cfg: String(input.cfg || "7").trim(),
    sampler: String(input.sampler || "").trim(),
    favorite: Boolean(input.favorite),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

function isValidPreset(p) {
  return required.every((key) => Boolean(String(p[key] || "").trim()));
}

function setStatus(message) {
  el.status.textContent = message;
  setTimeout(() => {
    if (el.status.textContent === message) el.status.textContent = "";
  }, 2400);
}

function savePresets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.presets));
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.presets = parsed.map(normalizePreset).filter(isValidPreset);
  } catch {
    state.presets = [];
  }
}

function saveDraft() {
  const draft = serializeForm();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = normalizePreset(JSON.parse(raw));
    if (d.name || d.positive || d.negative || d.notes) {
      fillForm(d, false);
      setStatus("Черновик восстановлен.");
    }
  } catch {
    // ignore
  }
}

function buildCombinedPrompt(p) {
  const lines = [p.positive];
  if (el.includeNegative.checked && p.negative) lines.push(`Negative: ${p.negative}`);
  if (el.includeParams.checked) {
    const params = [
      p.model && `Model=${p.model}`,
      p.aspect && `Aspect=${p.aspect}`,
      p.seed && `Seed=${p.seed}`,
      p.steps && `Steps=${p.steps}`,
      p.cfg && `CFG=${p.cfg}`,
      p.sampler && `Sampler=${p.sampler}`,
    ].filter(Boolean);
    if (params.length) lines.push(`Params: ${params.join(" | ")}`);
  }
  if (el.includeNotes.checked && p.notes) lines.push(`Notes: ${p.notes}`);
  return lines.join("\n");
}

function renderOutputFromForm() {
  const draft = normalizePreset(serializeForm());
  el.combined.value = buildCombinedPrompt(draft);
}

function fillForm(preset, updateOutput = true) {
  state.editingId = preset.id;
  el.name.value = preset.name;
  el.category.value = preset.category;
  el.tags.value = (preset.tags || []).join(", ");
  el.positive.value = preset.positive;
  el.negative.value = preset.negative;
  el.notes.value = preset.notes;
  el.model.value = preset.model;
  el.aspect.value = preset.aspect;
  el.seed.value = preset.seed;
  el.steps.value = preset.steps;
  el.cfg.value = preset.cfg;
  el.sampler.value = preset.sampler;
  el.saveBtn.textContent = "Обновить пресет";
  if (updateOutput) el.combined.value = buildCombinedPrompt(preset);
}

function resetForm(full = false) {
  state.editingId = null;
  el.form.reset();
  el.steps.value = "30";
  el.cfg.value = "7";
  el.saveBtn.textContent = "Сохранить пресет";
  if (full) {
    localStorage.removeItem(DRAFT_KEY);
    el.combined.value = "";
  } else {
    renderOutputFromForm();
  }
}

function deletePreset(id) {
  state.presets = state.presets.filter((p) => p.id !== id);
  savePresets();
  if (state.editingId === id) resetForm();
  renderList();
  setStatus("Пресет удалён.");
}

function toggleFavorite(id) {
  state.presets = state.presets.map((p) => (p.id === id ? { ...p, favorite: !p.favorite, updatedAt: new Date().toISOString() } : p));
  savePresets();
  renderList();
}

function selectedSort() {
  return el.sortBy.value;
}

function sortPresets(items) {
  const copy = [...items];
  const mode = selectedSort();
  if (mode === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === "category") return copy.sort((a, b) => a.category.localeCompare(b.category));
  if (mode === "favorite") {
    return copy.sort((a, b) => Number(b.favorite) - Number(a.favorite) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }
  return copy.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function renderList() {
  const query = el.search.value.trim().toLowerCase();
  el.list.innerHTML = "";

  const filtered = sortPresets(state.presets).filter((p) => {
    const hay = `${p.name} ${p.category} ${p.tags.join(" ")} ${p.positive} ${p.negative} ${p.model} ${p.sampler}`.toLowerCase();
    return hay.includes(query);
  });

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.textContent = "Пока нет пресетов. Добавьте первый в редакторе.";
    empty.style.color = "var(--muted)";
    el.list.appendChild(empty);
    return;
  }

  filtered.forEach((preset) => {
    const li = el.template.content.firstElementChild.cloneNode(true);
    li.querySelector(".title").textContent = preset.name;
    li.querySelector(".meta").textContent = `${preset.category} • ${new Date(preset.updatedAt).toLocaleString()}`;
    li.querySelector(".tags").textContent = preset.tags.length ? `#${preset.tags.join(" #")}` : "";
    li.querySelector(".snippet").textContent = preset.positive.slice(0, 100) + (preset.positive.length > 100 ? "…" : "");

    const favBtn = li.querySelector(".favorite");
    favBtn.textContent = preset.favorite ? "★" : "☆";
    favBtn.addEventListener("click", () => toggleFavorite(preset.id));

    li.querySelector(".load").addEventListener("click", () => {
      fillForm(preset);
      setStatus("Пресет загружен в редактор.");
    });

    li.querySelector(".delete").addEventListener("click", () => {
      if (confirm(`Удалить пресет "${preset.name}"?`)) deletePreset(preset.id);
    });

    el.list.appendChild(li);
  });
}

async function copyText(value, successMessage) {
  if (!value.trim()) return setStatus("Копировать нечего.");
  try {
    await navigator.clipboard.writeText(value);
    setStatus(successMessage);
  } catch {
    el.combined.select();
    document.execCommand("copy");
    setStatus(`${successMessage} (fallback)`);
  }
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem(THEME_KEY, theme);
  el.themeBtn.textContent = theme === "light" ? "☀️ Тема" : "🌙 Тема";
}

function loadTheme() {
  const t = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(t);
}

function bindEvents() {
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = normalizePreset(serializeForm());

    if (!isValidPreset(payload)) {
      setStatus("Нужно заполнить минимум: название и positive prompt.");
      return;
    }

    if (state.editingId) {
      const current = state.presets.find((p) => p.id === state.editingId);
      payload.favorite = current?.favorite || false;
      payload.createdAt = current?.createdAt || payload.createdAt;
      state.presets = state.presets.map((p) => (p.id === state.editingId ? payload : p));
      setStatus("Пресет обновлён.");
    } else {
      state.presets.unshift(payload);
      setStatus("Пресет сохранён.");
    }

    savePresets();
    localStorage.removeItem(DRAFT_KEY);
    el.combined.value = buildCombinedPrompt(payload);
    renderList();
    resetForm();
  });

  el.duplicateBtn.addEventListener("click", () => {
    const payload = normalizePreset(serializeForm());
    if (!isValidPreset(payload)) return setStatus("Сначала заполните форму для дублирования.");
    payload.id = uid();
    payload.name = `${payload.name} (Copy)`;
    payload.createdAt = new Date().toISOString();
    payload.updatedAt = payload.createdAt;
    state.presets.unshift(payload);
    savePresets();
    renderList();
    setStatus("Сделана копия пресета.");
  });

  el.resetBtn.addEventListener("click", () => resetForm(true));

  el.search.addEventListener("input", debounce(renderList, 120));
  el.sortBy.addEventListener("change", renderList);

  [el.includeNegative, el.includeParams, el.includeNotes].forEach((node) => {
    node.addEventListener("change", renderOutputFromForm);
  });

  [el.name, el.category, el.tags, el.positive, el.negative, el.notes, el.model, el.aspect, el.seed, el.steps, el.cfg, el.sampler].forEach((node) => {
    node.addEventListener("input", () => {
      renderOutputFromForm();
      saveDraft();
    });
  });

  el.copyBtn.addEventListener("click", () => copyText(el.combined.value, "Prompt скопирован."));
  el.copyJsonBtn.addEventListener("click", () => {
    const payload = normalizePreset(serializeForm());
    copyText(JSON.stringify(payload, null, 2), "JSON скопирован.");
  });

  el.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.presets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt-presets-pro.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  el.importFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("invalid format");

      const incoming = parsed.map(normalizePreset).filter(isValidPreset);
      const byId = new Map(state.presets.map((p) => [p.id, p]));
      incoming.forEach((p) => byId.set(p.id, p));
      state.presets = [...byId.values()];

      savePresets();
      renderList();
      setStatus(`Импортировано: ${incoming.length}.`);
    } catch {
      setStatus("Ошибка импорта: нужен корректный JSON-массив пресетов.");
    } finally {
      event.target.value = "";
    }
  });

  el.themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.contains("light");
    applyTheme(isLight ? "dark" : "light");
  });

  el.clearStorageBtn.addEventListener("click", () => {
    if (!confirm("Точно удалить все сохранённые пресеты и черновики?")) return;
    state.presets = [];
    savePresets();
    localStorage.removeItem(DRAFT_KEY);
    resetForm(true);
    renderList();
    setStatus("Локальное хранилище очищено.");
  });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      el.form.requestSubmit();
    }
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      el.search.focus();
      el.search.select();
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copyText(el.combined.value, "Prompt скопирован.");
    }
  });
}

function debounce(fn, wait = 100) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function seedDefaultPresets() {
  if (state.presets.length) return;
  const defaults = [
    {
      name: "Cinematic Night Portrait",
      category: "Photo Realistic",
      tags: ["portrait", "cinematic", "rim-light"],
      positive: "cinematic portrait in neon city at night, wet streets, dramatic rim light, ultra detailed skin, 85mm lens",
      negative: "blurry, overexposed, bad anatomy, extra limbs, watermark, text artifacts",
      notes: "Хорошо работает с realistic моделями + hi-res fix.",
      model: "SDXL",
      aspect: "2:3",
      steps: "35",
      cfg: "6.5",
      sampler: "DPM++ 2M Karras",
    },
    {
      name: "Anime Dynamic Scene",
      category: "Anime",
      tags: ["anime", "dynamic", "motion"],
      positive: "dynamic anime action scene, speed lines, dramatic perspective, rich cel shading, studio quality",
      negative: "muddy colors, low detail, bad hands, jpeg artifacts",
      notes: "Добавляй имя студии/художника для стилизации.",
      model: "Pony",
      aspect: "16:9",
      steps: "28",
      cfg: "7",
      sampler: "Euler a",
    },
  ].map((p) => normalizePreset({ ...p, id: uid() }));

  state.presets = defaults;
  savePresets();
}

function init() {
  loadTheme();
  loadPresets();
  seedDefaultPresets();
  loadDraft();
  bindEvents();
  renderList();
  renderOutputFromForm();
}

init();
