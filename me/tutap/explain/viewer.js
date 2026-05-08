const TXT_URL = "./explainKinhChuyenPhapLuan26seg.txt";
const JSON_URL = "./explainKinhChuyenPhapLuan26seg.json";

let mergedSegments = [];
let selectedId = 1;

function parseSegmentText(input) {
  const regex = /^\[SEGMENT\s+(\d+)\]\s*(.+)$/gm;
  const matches = [...input.matchAll(regex)];
  const segments = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const id = Number(match[1]);
    const title = match[2].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end =
      i + 1 < matches.length ? matches[i + 1].index ?? input.length : input.length;
    const pali = input.slice(start, end).trim();

    segments.push({ id, title, pali });
  }

  return segments;
}

function mergeData(textSegments, jsonData) {
  const jsonMap = new Map();
  (jsonData.segments || []).forEach((seg) => jsonMap.set(seg.id, seg));

  return textSegments.map((txt) => {
    const meta = jsonMap.get(txt.id);
    return {
      id: txt.id,
      title: txt.title,
      pali: txt.pali || meta?.pali || "",
      gloss: meta?.gloss || [],
      structure: meta?.structure || "",
      hasJson: !!meta,
    };
  });
}

function renderSegmentList() {
  const list = document.getElementById("segment-list");
  const count = document.getElementById("segment-count");

  count.textContent = `${mergedSegments.length} segment`;

  list.innerHTML = "";

  mergedSegments.forEach((seg) => {
    const btn = document.createElement("button");
    btn.className = "segment-btn" + (seg.id === selectedId ? " active" : "");
    btn.innerHTML = `
      <div class="seg-id">Segment ${seg.id}</div>
      <div class="seg-title">${seg.title}</div>
    `;

    btn.addEventListener("click", () => {
      selectedId = seg.id;
      renderSegmentList();
      renderViewer();
    });

    list.appendChild(btn);
  });
}

function renderViewer() {
  const segment = mergedSegments.find((s) => s.id === selectedId);
  const titleEl = document.getElementById("viewer-title");
  const subtitleEl = document.getElementById("viewer-subtitle");
  const contentEl = document.getElementById("viewer-content");
  const showGloss = document.getElementById("toggle-gloss").checked;
  const showStructure = document.getElementById("toggle-structure").checked;

  if (!segment) {
    titleEl.textContent = "Không có dữ liệu";
    subtitleEl.textContent = "";
    contentEl.innerHTML = `<p class="error">Không tìm thấy segment.</p>`;
    return;
  }

  titleEl.textContent = `Segment ${segment.id}: ${segment.title}`;
  subtitleEl.textContent = segment.hasJson
    ? "Đã ghép TXT với JSON theo id"
    : "Segment này chưa có dữ liệu JSON đi kèm";

  let html = `
    <div class="viewer-section">
      <h3>Pāli</h3>
      <div class="pali-text">${escapeHtml(segment.pali)}</div>
    </div>
  `;

  if (showGloss) {
    html += `
      <div class="viewer-section">
        <h3>Dịch sát nghĩa theo cụm</h3>
        ${
          segment.gloss.length
            ? `<div class="gloss-list">
                ${segment.gloss
                  .map(
                    ([paliChunk, meaning]) => `
                  <div class="gloss-item">
                    <div class="gloss-pali">${escapeHtml(paliChunk)}</div>
                    <div class="gloss-meaning">→ ${escapeHtml(meaning)}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : `<p class="muted">Đoạn này chưa có gloss trong JSON.</p>`
        }
      </div>
    `;
  }

  if (showStructure) {
    html += `
      <div class="viewer-section structure-box">
        <h3>Cấu trúc câu</h3>
        ${
          segment.structure
            ? `<div>${escapeHtml(segment.structure)}</div>`
            : `<p class="muted">Đoạn này chưa có mô tả cấu trúc.</p>`
        }
      </div>
    `;
  }

  contentEl.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadData() {
  const contentEl = document.getElementById("viewer-content");

  try {
    const [txtRes, jsonRes] = await Promise.all([fetch(TXT_URL), fetch(JSON_URL)]);

    if (!txtRes.ok) {
      throw new Error(`Không đọc được file TXT: ${txtRes.status}`);
    }
    if (!jsonRes.ok) {
      throw new Error(`Không đọc được file JSON: ${jsonRes.status}`);
    }

    const txt = await txtRes.text();
    const json = await jsonRes.json();

    const textSegments = parseSegmentText(txt);
    mergedSegments = mergeData(textSegments, json);

    if (!mergedSegments.length) {
      throw new Error("Không tách được segment nào từ file TXT.");
    }

    selectedId = mergedSegments[0].id;

    renderSegmentList();
    renderViewer();
  } catch (error) {
    console.error(error);
    contentEl.innerHTML = `<p class="error">Lỗi tải dữ liệu: ${escapeHtml(error.message)}</p>`;
    document.getElementById("segment-count").textContent = "Tải thất bại";
    document.getElementById("viewer-title").textContent = "Lỗi tải dữ liệu";
    document.getElementById("viewer-subtitle").textContent = "";
  }
}

document.getElementById("toggle-gloss").addEventListener("change", renderViewer);
document.getElementById("toggle-structure").addEventListener("change", renderViewer);

loadData();
