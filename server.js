const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
loadEnv(path.join(root, ".env"));

const port = Number(process.env.PORT || 3000);
const pollinationsTextModel = process.env.POLLINATIONS_TEXT_MODEL || "openai";
const pollinationsImageModel = process.env.POLLINATIONS_IMAGE_MODEL || "flux";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 160)}`));
        } else {
          resolve(data);
        }
      });
    }).on("error", reject);
  });
}

function httpsBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.toString("utf8", 0, 160)}`));
        } else {
          resolve({ body, contentType: res.headers["content-type"] || "image/jpeg" });
        }
      });
    }).on("error", reject);
  });
}

function commonSubject(prompt) {
  const text = prompt.toLowerCase();
  const pairs = [
    [/\bbear\b/, "bear"],
    [/\bbird\b/, "bird"],
    [/\bdoor\b/, "door"],
    [/\bbadge\b/, "badge"],
    [/\bskull\b/, "skull"],
    [/\bmama\b|\bmother\b/, "mother"],
    [/\bfarewell\b/, "farewell symbol"],
    [/\bflower\b/, "flower"],
    [/\bcar\b/, "car"],
    [/\bhouse\b/, "house"]
  ];
  return pairs.find(([pattern]) => pattern.test(text))?.[1] || prompt;
}

function hasLocalSubject(prompt) {
  return commonSubject(prompt) !== prompt;
}

async function analyzePrompt(prompt) {
  if (hasLocalSubject(prompt)) {
    const subject = commonSubject(prompt);
    return {
      subject,
      title: subject,
      mood: "generated",
      interpretation: `"${prompt}" was recognized as "${subject}", so the image and 256 CSS tiles follow the requested subject.`
    };
  }

  const instruction = [
    "Extract the visual subject from the user's prompt.",
    "Translate it to concise English for image generation.",
    "Do not add extra people, story, history, artist names, or unrelated context.",
    "Return only raw JSON with keys: subject, title, mood, interpretation.",
    `User prompt: ${prompt}`
  ].join("\n");
  const url = `https://text.pollinations.ai/${encodeURIComponent(instruction)}?model=${encodeURIComponent(pollinationsTextModel)}`;
  const text = await httpsGet(url);
  const parsed = JSON.parse(text.replace(/^```json|```$/g, "").trim());
  return {
    subject: String(parsed.subject || commonSubject(prompt)).slice(0, 120),
    title: String(parsed.title || parsed.subject || prompt).slice(0, 80),
    mood: String(parsed.mood || "generated").slice(0, 40),
    interpretation: String(parsed.interpretation || `"${prompt}" was converted into a visual subject for a 256-tile mosaic.`).slice(0, 500)
  };
}

async function buildDylanNotes(prompt, analysis) {
  const instruction = [
    "Write concise artwork notes for a creative AI project based on Bob Dylan's Knockin' on Heaven's Door.",
    "Do not alter the visual subject. The image generation must remain about the user's subject.",
    "Connect the subject symbolically to: threshold, badge/burden, farewell/mortality, and 1973 historical context including Vietnam-era counterculture and the western film context.",
    "Return only raw JSON with keys: subject, threshold, badge, farewell, historical.",
    `User prompt: ${prompt}`,
    `Visual subject: ${analysis.subject}`
  ].join("\n");
  const url = `https://text.pollinations.ai/${encodeURIComponent(instruction)}?model=${encodeURIComponent(pollinationsTextModel)}`;
  const text = await httpsGet(url);
  const parsed = JSON.parse(text.replace(/^```json|```$/g, "").trim());
  return {
    subject: String(parsed.subject || `The visual subject remains ${analysis.subject}.`).slice(0, 260),
    threshold: String(parsed.threshold || "").slice(0, 260),
    badge: String(parsed.badge || "").slice(0, 260),
    farewell: String(parsed.farewell || "").slice(0, 260),
    historical: String(parsed.historical || "").slice(0, 320)
  };
}

function localDylanNotes(prompt, analysis) {
  return {
    subject: `The visual subject remains "${analysis.subject}" so the free prompt is respected.`,
    threshold: `The subject is treated as something encountered at a symbolic door: an image at the moment before crossing.`,
    badge: `The badge idea appears as burden: the object can stand for something carried, named, or finally put down.`,
    farewell: `The mosaic frames the subject as a farewell image, echoing transition, mortality, and release.`,
    historical: `The notes connect the work to 1973, the Vietnam-era anti-war atmosphere, and the western film context without forcing those themes into the generated image.`
  };
}

function localAnalysis(prompt) {
  const subject = commonSubject(prompt);
  return {
    subject,
    title: subject,
    mood: "generated",
    interpretation: `"${prompt}" was interpreted as "${subject}". The 256 CSS tiles sample the generated reference image and imitate its colors.`
  };
}

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return h;
}

function pollinationsImageUrl(subject) {
  const imagePrompt = [
    `MAIN SUBJECT: ${subject}.`,
    "Create only this subject as a centered, recognizable pixel-art icon.",
    "Simple plain background. No text. No extra objects. No extra people unless the subject is a person.",
    "High contrast silhouette, clean edges, square composition, 16-bit pixel art."
  ].join(" ");
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    nologo: "true",
    model: pollinationsImageModel,
    seed: String(Math.abs(hash(subject)) % 100000)
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?${params.toString()}`;
}

function localImageProxyUrl(subject) {
  const params = new URLSearchParams({ subject });
  return `/api/image?${params.toString()}`;
}

async function design(req, res) {
  const raw = await readBody(req);
  const body = JSON.parse(raw || "{}");
  const prompt = String(body.prompt || "").slice(0, 500);
  const wantsImage = Boolean(body.generateImage);
  const wantsDylanContext = Boolean(body.dylanContext);

  let analysis;
  let source = `Pollinations LLM (${pollinationsTextModel})`;
  try {
    analysis = await analyzePrompt(prompt);
  } catch (error) {
    analysis = localAnalysis(prompt);
    source = `local subject fallback - LLM failed: ${error.message}`;
  }

  let notes = {};
  if (wantsDylanContext) {
    try {
      notes = await buildDylanNotes(prompt, analysis);
    } catch {
      notes = localDylanNotes(prompt, analysis);
    }
  }

  const result = {
    source,
    plan: {
      title: analysis.title,
      mood: analysis.mood,
      interpretation: analysis.interpretation,
      subject: analysis.subject,
      notes,
      palette: { backgroundA: "#111111", backgroundB: "#252525", accent: "#d0a342" },
      tiles: []
    }
  };

  if (wantsImage) {
    result.imageUrl = localImageProxyUrl(analysis.subject);
    result.source += ` + Pollinations image (${pollinationsImageModel})`;
  }

  sendJson(res, result);
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/design") {
      await design(req, res);
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/image")) {
      const parsed = new URL(req.url, `http://localhost:${port}`);
      const subject = String(parsed.searchParams.get("subject") || "").slice(0, 500);
      const upstream = await httpsBuffer(pollinationsImageUrl(subject));
      res.writeHead(200, {
        "Content-Type": upstream.contentType,
        "Cache-Control": "no-store"
      });
      res.end(upstream.body);
      return;
    }

    const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(port, () => {
  console.log(`KNOCK running at http://localhost:${port}`);
});
