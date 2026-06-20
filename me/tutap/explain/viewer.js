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
      phrase_explanations: meta?.phrase_explanations || [],
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
      <div class="seg-title">${escapeHtml(seg.title)}</div>
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
  const showDeep = document.getElementById("toggle-deep").checked;

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

  if (showDeep) {
    html += renderPhraseExplanations(segment.phrase_explanations);
  }

  contentEl.innerHTML = html;
}

function renderPhraseExplanations(items) {
  if (!items || !items.length) {
    return `
      <div class="viewer-section deep-box">
        <h3>Giải thích sâu từ vựng & ngữ pháp</h3>
        <p class="muted">Segment này chưa có phân tích sâu.</p>
      </div>
    `;
  }

  return `
    <div class="viewer-section deep-box">
      <h3>Giải thích sâu từ vựng & ngữ pháp</h3>
      <div class="deep-list">
        ${items.map(renderPhraseCard).join("")}
      </div>
    </div>
  `;
}

function renderPhraseCard(item) {
  const breakdown = Array.isArray(item.breakdown) ? item.breakdown : [];
  const morphology = item.morphology || {};

  return `
    <article class="phrase-card">
      <div class="phrase-head">
        <div>
          <div class="phrase-pali">${escapeHtml(item.phrase || "")}</div>
          <div class="phrase-label">→ ${escapeHtml(item.label_vi || item.meaning_vi || "")}</div>
        </div>
      </div>

      ${
        breakdown.length
          ? `<div class="breakdown-table-wrap">
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th>Thành phần</th>
                    <th>Loại</th>
                    <th>Ngữ pháp</th>
                    <th>Nghĩa</th>
                    <th>Ghi chú vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  ${breakdown.map(renderBreakdownRow).join("")}
                </tbody>
              </table>
            </div>`
          : ""
      }

      ${
        morphology.formula || morphology.sandhi_or_sound_change
          ? `<div class="morphology-box">
              ${morphology.formula ? `<div><strong>Công thức ghép:</strong> ${escapeHtml(morphology.formula)}</div>` : ""}
              ${morphology.sandhi_or_sound_change ? `<div><strong>Biến âm / nối âm:</strong> ${escapeHtml(morphology.sandhi_or_sound_change)}</div>` : ""}
            </div>`
          : ""
      }

      ${item.grammar_note ? `<p class="deep-note"><strong>Grammar note:</strong> ${escapeHtml(item.grammar_note)}</p>` : ""}
      ${item.memory_hint ? `<p class="deep-note"><strong>Mẹo nhớ:</strong> ${escapeHtml(item.memory_hint)}</p>` : ""}
      ${item.dhamma_note ? `<p class="deep-note dhamma-note"><strong>Ý pháp:</strong> ${escapeHtml(item.dhamma_note)}</p>` : ""}
    </article>
  `;
}

function renderBreakdownRow(part) {
  return `
    <tr>
      <td class="token-cell">${escapeHtml(part.token || "")}</td>
      <td>${escapeHtml(part.kind || "")}</td>
      <td>${escapeHtml(part.grammar || "")}</td>
      <td>${escapeHtml(part.meaning_vi || "")}</td>
      <td>${escapeHtml(part.role_note || "")}</td>
    </tr>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
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
document.getElementById("toggle-deep").addEventListener("change", renderViewer);

loadData();
