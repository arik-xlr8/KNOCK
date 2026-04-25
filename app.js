const TILE_COUNT = 256;
const GRID_SIZE = 16;

const mosaic = document.getElementById("mosaic");
const promptInput = document.getElementById("prompt");
const imageToggle = document.getElementById("imageToggle");
const generateButton = document.getElementById("generate");
const interpretation = document.getElementById("interpretation");
const meta = document.getElementById("meta");
const referenceImage = document.getElementById("referenceImage");
const imageStatus = document.getElementById("imageStatus");
const title = document.getElementById("title");
const mood = document.getElementById("mood");
const songSelect = document.getElementById("songSelect");
const songPrompts = document.getElementById("songPrompts");
const loaderOverlay = document.getElementById("loaderOverlay");

const songPromptSets = {
  knockin: [
    { label: "Heavy Badge", prompt: "a heavy brass badge" },
    { label: "Heaven's Door", prompt: "a glowing door in darkness" },
    { label: "Farewell", prompt: "a farewell silhouette" },
    { label: "Mother", prompt: "a mother figure as a soft icon" }
  ],
  blowin: [
    { label: "Wind", prompt: "wind over an empty road" },
    { label: "Dove", prompt: "a white dove" },
    { label: "Question", prompt: "a question mark in the sky" },
    { label: "Open Road", prompt: "an open road under wind" }
  ],
  times: [
    { label: "Clock", prompt: "a cracked clock" },
    { label: "Rising Wave", prompt: "a rising wave" },
    { label: "Changing Road", prompt: "a road splitting in two" },
    { label: "New Sign", prompt: "a protest sign without text" }
  ],
  hardrain: [
    { label: "Hard Rain", prompt: "heavy rain clouds" },
    { label: "Storm Eye", prompt: "an eye inside a storm" },
    { label: "Broken Branch", prompt: "a broken tree branch" },
    { label: "Dark River", prompt: "a dark river under rain" }
  ],
  rolling: [
    { label: "Rolling Stone", prompt: "a rolling stone" },
    { label: "Lonely Road", prompt: "a lonely road" },
    { label: "Lost Crown", prompt: "a fallen crown" },
    { label: "No Direction", prompt: "a compass with no direction" }
  ]
};

function makeTiles() {
  mosaic.innerHTML = "";
  for (let i = 0; i < TILE_COUNT; i++) {
    const tile = document.createElement("div");
    tile.className = "tile ghost";
    tile.style.setProperty("--dx", "0px");
    tile.style.setProperty("--dy", "0px");
    tile.style.setProperty("--rot", "0deg");
    tile.style.setProperty("--scale", ".58");
    tile.style.setProperty("--tile-color", "#d0a342");
    tile.dataset.role = "";
    mosaic.appendChild(tile);
  }
}

function renderTiles(tiles, plan) {
  document.documentElement.style.setProperty("--bg-a", plan.palette?.backgroundA || "#111111");
  document.documentElement.style.setProperty("--bg-b", plan.palette?.backgroundB || "#252525");
  document.documentElement.style.setProperty("--accent", plan.palette?.accent || "#d0a342");
  title.textContent = plan.title || plan.subject || "prompt mosaic";
  mood.textContent = plan.mood || "generated";

  const elements = [...mosaic.children];
  for (let i = 0; i < TILE_COUNT; i++) {
    const tile = elements[i];
    const cell = tiles[i] || {};
    const on = Boolean(cell.on);
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    tile.className = `tile ${on ? "on" : "ghost"} ${cell.role || "shape"}`;
    tile.style.setProperty("--tile-color", cell.color || "#d0a342");
    tile.style.setProperty("--dx", `${on ? 0 : (col - 7.5) * 1.2}px`);
    tile.style.setProperty("--dy", `${on ? 0 : (row - 7.5) * 1.2}px`);
    tile.style.setProperty("--rot", `${cell.rotate || 0}deg`);
    tile.style.setProperty("--scale", on ? .72 + (cell.intensity || .5) * .35 : .5);
    tile.dataset.role = on ? "img" : "";
  }
}

function sampleImageToTiles(img) {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
  const data = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
  const pixels = [];
  const brightness = [];

  for (let i = 0; i < TILE_COUNT; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    pixels.push({ r, g, b, luma });
    brightness.push(luma);
  }

  const sorted = [...brightness].sort((a, b) => a - b);
  const darkCut = sorted[Math.floor(sorted.length * .62)];

  return pixels.map((px, i) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const edge = row === 0 || col === 0 || row === GRID_SIZE - 1 || col === GRID_SIZE - 1;
    const contrastOn = px.luma < darkCut || px.luma > .78;
    const on = !edge && contrastOn;
    const intensity = Math.max(.15, Math.min(1, Math.abs(px.luma - .5) * 1.8));
    return {
      on,
      role: "image",
      color: `rgb(${px.r}, ${px.g}, ${px.b})`,
      intensity,
      rotate: on ? (col - 7.5) * .7 : 0
    };
  });
}

function setReferenceImage(src, plan) {
  return new Promise(resolve => {
    referenceImage.style.display = "none";
    imageStatus.textContent = "Loading image; sampling the reference into mosaic tiles...";
    referenceImage.onload = () => {
      referenceImage.style.display = "block";
      imageStatus.textContent = "Image generation complete; the 256 tiles imitate this reference.";
      const tiles = sampleImageToTiles(referenceImage);
      renderTiles(tiles, plan);
      resolve();
    };
    referenceImage.onerror = () => {
      referenceImage.style.display = "none";
      imageStatus.textContent = "The image could not be loaded; the mosaic could not be sampled.";
      resolve();
    };
    referenceImage.src = src;
  });
}

function setLoading(isLoading) {
  loaderOverlay.classList.toggle("active", isLoading);
  loaderOverlay.setAttribute("aria-hidden", String(!isLoading));
}

async function generate() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  if (window.location.protocol === "file:") {
    meta.textContent = "This project must run through the Node server: node server.js";
    return;
  }

  generateButton.disabled = true;
  setLoading(true);
  generateButton.textContent = "Generating image and mosaic...";
  meta.textContent = "Analyzing prompt.";
  imageStatus.textContent = imageToggle.checked ? "Waiting for image reference." : "Image generation is disabled.";

  try {
    const response = await fetch("/api/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        generateImage: imageToggle.checked
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI request failed.");

    interpretation.textContent = data.plan.interpretation || "The prompt was converted into a visual subject.";
    meta.textContent = `${data.source} | subject: ${data.plan.subject || prompt}`;

    if (data.imageUrl) {
      await setReferenceImage(data.imageUrl, data.plan);
    } else {
      referenceImage.style.display = "none";
      imageStatus.textContent = "Image generation is disabled, so the mosaic was not sampled.";
    }
  } catch (error) {
    meta.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    setLoading(false);
    generateButton.textContent = "Generate Mosaic";
  }
}

document.querySelectorAll(".preset").forEach(button => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    generate();
  });
});

function renderSongPrompts(songKey) {
  songPrompts.innerHTML = "";
  for (const item of songPromptSets[songKey] || []) {
    const button = document.createElement("button");
    button.className = "preset";
    button.type = "button";
    button.textContent = item.label;
    button.dataset.prompt = item.prompt;
    button.addEventListener("click", () => {
      promptInput.value = item.prompt;
      generate();
    });
    songPrompts.appendChild(button);
  }
}

songSelect.addEventListener("change", () => {
  renderSongPrompts(songSelect.value);
});

makeTiles();
generateButton.addEventListener("click", generate);
renderSongPrompts(songSelect.value);
renderTiles(Array.from({ length: TILE_COUNT }, (_, i) => {
  const row = Math.floor(i / GRID_SIZE);
  const col = i % GRID_SIZE;
  const on = row === 0 || row === 15 || col === 0 || col === 15 || (row > 3 && row < 12 && col > 6 && col < 9);
  return { on, role: "shape", color: "#d0a342", intensity: on ? .8 : .1, rotate: 0 };
}), {
  title: "waiting for prompt",
  mood: "256 tiles",
  palette: { backgroundA: "#111111", backgroundB: "#312923", accent: "#d0a342" }
});
