const STORAGE_KEY = "prompt-presets-v1";
let presets = [];
let editingId = null;

const form = document.getElementById("preset-form");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const positiveInput = document.getElementById("positive");
const negativeInput = document.getElementById("negative");
const notesInput = document.getElementById("notes");
const list = document.getElementById("preset-list");
const searchInput = document.getElementById("search");
const combinedOutput = document.getElementById("combined");
const status = document.getElementById("status");

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    presets = JSON.parse(raw);
  } catch {
    presets = [];
  }
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function buildCombinedPrompt(preset) {
  const lines = [preset.positive.trim()];
  if (preset.negative.trim()) lines.push(`Negative: ${preset.negative.trim()}`);
  if (preset.notes.trim()) lines.push(`Notes: ${preset.notes.trim()}`);
  return lines.join("\n");
}

function setStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    if (status.textContent === message) status.textContent = "";
  }, 2000);
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  list.innerHTML = "";

  const filtered = presets.filter((p) => {
    const hay = `${p.name} ${p.category} ${p.positive} ${p.negative} ${p.notes}`.toLowerCase();
    return hay.includes(query);
  });

  filtered.forEach((preset) => {
    const template = document.getElementById("preset-item-template");
    const li = template.content.firstElementChild.cloneNode(true);
    li.querySelector(".title").textContent = preset.name;
    li.querySelector(".meta").textContent = `${preset.category} • ${new Date(preset.updatedAt).toLocaleString()}`;
    li.querySelector(".snippet").textContent = preset.positive.slice(0, 90) + (preset.positive.length > 90 ? "…" : "");

    li.querySelector(".load").addEventListener("click", () => loadPreset(preset.id));
    li.querySelector(".delete").addEventListener("click", () => deletePreset(preset.id));

    list.appendChild(li);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No presets yet. Create one on the left.";
    empty.style.color = "var(--muted)";
    list.appendChild(empty);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("save-btn").textContent = "Save preset";
}

function loadPreset(id) {
  const preset = presets.find((p) => p.id === id);
  if (!preset) return;
  editingId = id;
  nameInput.value = preset.name;
  categoryInput.value = preset.category;
  positiveInput.value = preset.positive;
  negativeInput.value = preset.negative;
  notesInput.value = preset.notes;
  combinedOutput.value = buildCombinedPrompt(preset);
  document.getElementById("save-btn").textContent = "Update preset";
}

function deletePreset(id) {
  presets = presets.filter((p) => p.id !== id);
  saveToStorage();
  render();
  if (editingId === id) resetForm();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: editingId || uid(),
    name: nameInput.value.trim(),
    category: categoryInput.value,
    positive: positiveInput.value.trim(),
    negative: negativeInput.value.trim(),
    notes: notesInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name || !payload.positive) {
    setStatus("Name and positive prompt are required.");
    return;
  }

  if (editingId) {
    presets = presets.map((p) => (p.id === editingId ? payload : p));
    setStatus("Preset updated.");
  } else {
    presets.unshift(payload);
    setStatus("Preset saved.");
  }

  saveToStorage();
  combinedOutput.value = buildCombinedPrompt(payload);
  render();
  resetForm();
});

document.getElementById("reset-btn").addEventListener("click", resetForm);
searchInput.addEventListener("input", render);

document.getElementById("copy-btn").addEventListener("click", async () => {
  if (!combinedOutput.value.trim()) {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(combinedOutput.value);
    setStatus("Prompt copied to clipboard.");
  } catch {
    combinedOutput.select();
    document.execCommand("copy");
    setStatus("Prompt copied (fallback). ");
  }
});

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prompt-presets.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    presets = parsed.filter((p) => p.name && p.positive).map((p) => ({
      id: p.id || uid(),
      name: p.name,
      category: p.category || "General",
      positive: p.positive,
      negative: p.negative || "",
      notes: p.notes || "",
      updatedAt: p.updatedAt || new Date().toISOString(),
    }));
    saveToStorage();
    render();
    setStatus("Presets imported.");
  } catch {
    setStatus("Import failed. Use a valid presets JSON file.");
  } finally {
    event.target.value = "";
  }
});

loadFromStorage();
render();
