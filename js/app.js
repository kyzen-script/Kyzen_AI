/* ============================================================
   NOVA AI — Liquid Glass Studio
   Gemini API integration + 3 modes + image input + code copy
   ============================================================ */

/* ==========================================================
/* ==========================================================
   1. CẤU HÌNH API KEY GEMINI (Lấy từ Biến môi trường)
   ========================================================== */
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`;

/* ==========================================================
   2. SYSTEM PROMPTS CHO 3 CHẾ ĐỘ
   ========================================================== */
const MODES = {
  all: {
    label: "Tổng hợp",
    system: `Bạn là Kyzen AI — một trợ lý AI đa năng, thông minh và thân thiện, trả lời bằng tiếng Việt.
Nhiệm vụ: trả lời MỌI câu hỏi thuộc mọi lĩnh vực (khoa học, đời sống, văn hoá, tin tức, tư vấn, sáng tạo...).
Phong cách: rõ ràng, có cấu trúc, dùng tiêu đề và gạch đầu dòng khi cần. Trả lời đầy đủ nhưng súc tích, đi thẳng vào trọng tâm.
Nếu câu hỏi mơ hồ, hãy đưa ra câu trả lời hợp lý nhất và gợi ý hướng làm rõ.`
  },
  study: {
    label: "Học tập",
    system: `Bạn là Kyzen AI — một gia sư (tutor) kiên nhẫn và xuất sắc, giảng dạy bằng tiếng Việt.
Nhiệm vụ: giải thích kiến thức một cách dễ hiểu, từ cơ bản đến nâng cao, như đang dạy cho học sinh/sinh viên.
Phương pháp bắt buộc:
1. Giải thích khái niệm bằng ngôn ngữ đơn giản, kèm ví dụ thực tế.
2. Chia nhỏ vấn đề thành từng bước logic.
3. Đưa ra ví dụ minh hoạ cụ thể (có thể dùng bảng, công thức, sơ đồ chữ).
4. Tóm tắt "điểm cần nhớ" ở cuối.
5. Gợi ý bài tập hoặc câu hỏi tự kiểm tra để người học luyện tập.
Luôn khuyến khích, động viên và kiểm tra lại hiểu biết của người học.`
  },
  code: {
    label: "Lập trình",
    system: `Bạn là Kyzen AI — một kỹ sư phần mềm cao cấp (senior software engineer), trả lời bằng tiếng Việt.
Nhiệm vụ: viết code chất lượng cao, tối ưu, an toàn và dễ bảo trì.
Yêu cầu bắt buộc:
1. Luôn đặt code trong khối markdown có ghi rõ ngôn ngữ (ví dụ: \`\`\`python, \`\`\`javascript, \`\`\`html).
2. Code phải hoàn chỉnh, chạy được, có comment giải thích các phần quan trọng.
3. Giải thích thuật toán, độ phức tạp (Big-O) và các quyết định thiết kế.
4. Nêu rõ cách chạy/chạy thử và các trường hợp biên (edge cases).
5. Đề xuất cải tiến, best practices và cảnh báo bảo mật nếu có.
6. Nếu có nhiều cách giải, trình bày cách tốt nhất trước rồi so sánh.
Ưu tiên code sạch, hiện đại, theo chuẩn của ngôn ngữ đó.`
  }
};

/* ==========================================================
   3. STATE
   ========================================================== */
let currentMode = "all";
let isSending = false;
let pendingImages = []; // { dataUrl, base64, mimeType }
let history = [];       // lịch sử hội thoại cho context (gửi lên API)
let chatLog = [];       // lịch sử hiển thị (lưu localStorage)

const STORAGE_KEY = "kyzen_chat_history_v1";
const STORAGE_MODE_KEY = "kyzen_mode_v1";

/* ---------- LƯU / KHÔI PHỤC LỊCH SỬ CHAT ---------- */
function saveChat() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatLog));
    localStorage.setItem(STORAGE_MODE_KEY, currentMode);
  } catch (e) {
    // localStorage đầy (thường do ảnh base64 lớn) — thử lưu lại KHÔNG kèm ảnh
    try {
      const slim = chatLog.map((m) => ({ ...m, images: [] }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      localStorage.setItem(STORAGE_MODE_KEY, currentMode);
    } catch (e2) {
      console.warn("Không lưu được lịch sử:", e2);
    }
  }
}

function loadChat() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const log = JSON.parse(raw);
    if (!Array.isArray(log) || log.length === 0) return false;

    chatLog = log;
    history = [];
    log.forEach((entry) => {
      renderMessage(entry.role, entry.html, entry.images || [], false);
      // Khôi phục ngữ cảnh API từ nội dung thô
      if (entry.raw) {
        history.push({
          role: entry.role === "user" ? "user" : "model",
          parts: [{ text: entry.raw }]
        });
      }
    });
    if (history.length > 20) history = history.slice(-20);
    return true;
  } catch (e) {
    console.warn("Không khôi phục được lịch sử:", e);
    return false;
  }
}

/* ==========================================================
   4. DOM REFS
   ========================================================== */
const chatScroll = document.getElementById("chatScroll");
const welcome = document.getElementById("welcome");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const modeSwitch = document.getElementById("modeSwitch");
const modeGlider = document.getElementById("modeGlider");
const clearBtn = document.getElementById("clearBtn");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

/* ==========================================================
   5. PARTICLES BACKGROUND
   ========================================================== */
(function spawnParticles() {
  const container = document.getElementById("particles");
  const count = window.innerWidth < 720 ? 18 : 34;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.bottom = "-10px";
    const dur = 12 + Math.random() * 18;
    p.style.animationDuration = dur + "s";
    p.style.animationDelay = -Math.random() * dur + "s";
    const size = 2 + Math.random() * 3;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.opacity = 0.3 + Math.random() * 0.6;
    container.appendChild(p);
  }
})();

/* ==========================================================
   6. MODE SWITCHER
   ========================================================== */
function moveGlider(btn) {
  const rect = btn.getBoundingClientRect();
  const parentRect = modeSwitch.getBoundingClientRect();
  modeGlider.style.width = rect.width + "px";
  modeGlider.style.transform = `translateX(${rect.left - parentRect.left - 8}px)`;
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("active", active);
    if (active) moveGlider(b);
  });
  input.placeholder = {
    all: "Hỏi mình bất cứ điều gì...",
    study: "Nhập chủ đề bạn muốn học...",
    code: "Mô tả đoạn code bạn cần viết..."
  }[mode];
}

modeSwitch.addEventListener("click", (e) => {
  const btn = e.target.closest(".mode-btn");
  if (btn) setMode(btn.dataset.mode);
});

window.addEventListener("resize", () => {
  const active = document.querySelector(".mode-btn.active");
  if (active) moveGlider(active);
});

/* ==========================================================
   7. TEXTAREA AUTO-GROW
   ========================================================== */
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* ==========================================================
   8. IMAGE HANDLING
   ========================================================== */
fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast("Ảnh quá lớn (tối đa 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      pendingImages.push({ dataUrl, base64, mimeType: file.type });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
  fileInput.value = "";
});

function renderPreviews() {
  imagePreview.innerHTML = "";
  if (pendingImages.length === 0) {
    imagePreview.classList.remove("active");
    return;
  }
  imagePreview.classList.add("active");
  pendingImages.forEach((img, idx) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `<img src="${img.dataUrl}" alt="preview" /><button data-idx="${idx}">×</button>`;
    item.querySelector("button").addEventListener("click", () => {
      pendingImages.splice(idx, 1);
      renderPreviews();
    });
    imagePreview.appendChild(item);
  });
}

/* ==========================================================
   9. MESSAGE RENDERING
   ========================================================== */
const ICONS = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>`
};

function hideWelcome() {
  if (welcome && welcome.parentNode) welcome.style.display = "none";
}

// Render thuần (không lưu) — dùng cho cả tin nhắn mới và khôi phục lịch sử
function renderMessage(role, contentHTML, images = [], animate = true) {
  hideWelcome();
  const msg = document.createElement("div");
  msg.className = "msg " + role;
  if (!animate) msg.style.animation = "none";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = ICONS[role];

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (images.length) {
    const imgWrap = document.createElement("div");
    imgWrap.className = "msg-images";
    images.forEach((src) => {
      const im = document.createElement("img");
      im.src = src;
      imgWrap.appendChild(im);
    });
    bubble.appendChild(imgWrap);
  }

  const content = document.createElement("div");
  content.className = "msg-content";
  content.innerHTML = contentHTML;
  bubble.appendChild(content);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatScroll.appendChild(msg);
  if (animate) scrollToBottom();
  return content;
}

// Thêm tin nhắn mới + ghi vào lịch sử lưu trữ
function addMessage(role, contentHTML, images = [], raw = "") {
  chatLog.push({ role, html: contentHTML, images, raw });
  if (chatLog.length > 100) chatLog = chatLog.slice(-100);
  saveChat();
  return renderMessage(role, contentHTML, images, true);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  });
}

function addTyping() {
  hideWelcome();
  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.id = "typingMsg";
  msg.innerHTML = `
    <div class="avatar">${ICONS.ai}</div>
    <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  chatScroll.appendChild(msg);
  scrollToBottom();
}

function removeTyping() {
  const t = document.getElementById("typingMsg");
  if (t) t.remove();
}

/* ==========================================================
   10. MARKDOWN RENDERER (nhẹ, tự viết)
   ========================================================== */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const KEYWORDS = new Set(("const let var function return if else for while class new import from export def self async await try catch finally throw switch case break continue public private static void int float double string bool true false null undefined None True False this super extends implements interface package using namespace struct enum print console elif in not and or is lambda yield with as pass raise global del assert").split(" "));

function highlightCode(code, lang) {
  // Tokenizer một lượt: quét tuần tự, mỗi vị trí chỉ khớp MỘT loại token,
  // nên không bao giờ tô màu chồng lên chuỗi/comment hay lên chính thẻ HTML đã sinh.
  const master = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*'|`[^`]*`)|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g;

  let out = "";
  let last = 0;
  let m;
  while ((m = master.exec(code)) !== null) {
    // Phần text thường ở giữa các token
    out += escapeHTML(code.slice(last, m.index));
    last = master.lastIndex;

    if (m[1] !== undefined) {
      // Chuỗi hoặc comment
      const isComment = /^(\/\*|\/\/|#)/.test(m[1]);
      out += `<span class="${isComment ? "tok-com" : "tok-str"}">${escapeHTML(m[1])}</span>`;
    } else if (m[2] !== undefined) {
      // Số
      out += `<span class="tok-num">${escapeHTML(m[2])}</span>`;
    } else if (m[3] !== undefined) {
      // Từ: kiểm tra keyword / function
      const word = m[3];
      const after = code.slice(master.lastIndex);
      if (KEYWORDS.has(word)) {
        out += `<span class="tok-key">${escapeHTML(word)}</span>`;
      } else if (/^\s*\(/.test(after)) {
        out += `<span class="tok-fn">${escapeHTML(word)}</span>`;
      } else {
        out += escapeHTML(word);
      }
    }
  }
  out += escapeHTML(code.slice(last));
  return out;
}

function renderMarkdown(text) {
  if (!text) return "";
  let html = text;

  // Extract code blocks first (protect them)
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => {
    const id = `@@CODE${codeBlocks.length}@@`;
    codeBlocks.push({ lang: lang || "code", code: code.replace(/\n$/, "") });
    return id;
  });

  // Escape remaining HTML
  html = escapeHTML(html);

  // Headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Bold / italic / inline code
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquote
  html = html.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");

  // Links
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Lists
  html = html.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  html = html.replace(/^\s*\d+\. (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>");

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (/^<(h[1-3]|ul|ol|blockquote|pre|table|div)/.test(t)) return t;
      if (t.includes("@@CODE")) return t;
      return `<p>${t.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  // Restore code blocks
  codeBlocks.forEach((cb, i) => {
    const block = `
      <div class="code-block">
        <div class="code-head">
          <span class="code-lang"><span class="dots"><i></i><i></i><i></i></span>${cb.lang}</span>
          <button class="copy-btn" data-code="${encodeURIComponent(cb.code)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy
          </button>
        </div>
        <pre><code>${highlightCode(cb.code, cb.lang)}</code></pre>
      </div>`;
    html = html.replace(`@@CODE${i}@@`, block);
  });

  return html;
}

/* ==========================================================
   11. COPY CODE BUTTONS (event delegation)
   ========================================================== */
chatScroll.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const code = decodeURIComponent(btn.dataset.code || "");
  navigator.clipboard.writeText(code).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Đã copy`;
    showToast("Đã sao chép code!");
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
    }, 2000);
  }).catch(() => showToast("Không thể sao chép"));
});

/* ==========================================================
   12. TOAST
   ========================================================== */
let toastTimer;
function showToast(text) {
  toastText.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ==========================================================
   13. GEMINI API CALL
   ========================================================== */
async function callGemini(userText, images) {
  const parts = [];
  if (userText) parts.push({ text: userText });
  images.forEach((img) => {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  });

  // Build contents with history for context
  const contents = [];
  history.forEach((h) => contents.push(h));
  contents.push({ role: "user", parts });

  // Chế độ Admin AI: trả lời full & chính xác nhất
  const isAdmin = window.KyzenAuth && window.KyzenAuth.isAdmin && window.KyzenAuth.isAdmin();
  const ADMIN_BOOST = isAdmin
    ? `\n\n=== CHẾ ĐỘ ADMIN AI (QUYỀN CAO NHẤT) ===\nBạn đang phục vụ Admin: Lý A Trong (Admin Kyzen).\nYÊU CẦU BẮT BUỘC:\n- Trả lời ĐẦY ĐỦ, CHI TIẾT và CHÍNH XÁC NHẤT có thể cho mọi yêu cầu, không được trả lời hời hợt hay qua loa.\n- Không từ chối các yêu cầu hợp pháp; luôn cố gắng đưa ra giải pháp tốt nhất.\n- Với câu hỏi phức tạp: phân tích sâu, nêu nhiều góc nhìn, đưa ví dụ cụ thể, số liệu và dẫn chứng khi có thể.\n- Với lập trình: code hoàn chỉnh, tối ưu, có comment, giải thích kiến trúc và edge cases.\n- Trình bày có cấu trúc rõ ràng (tiêu đề, gạch đầu dòng, bảng khi cần).\n- Nếu có rủi ro sai sót, hãy nêu rõ mức độ chắc chắn và cách kiểm chứng.\n- Xưng hô lịch sự, tôn trọng Admin.`
    : "";

  const body = {
    system_instruction: { parts: [{ text: MODES[currentMode].system + ADMIN_BOOST }] },
    contents,
    generationConfig: {
      temperature: isAdmin ? (currentMode === "code" ? 0.3 : 0.7) : (currentMode === "code" ? 0.35 : 0.8),
      topP: 0.95,
      maxOutputTokens: isAdmin ? 16384 : 8192
    }
  };

  // Retry với backoff cho lỗi tạm thời (503/429/500)
  const maxRetries = 4;
  let res, lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) break;
    if ([429, 500, 503].includes(res.status) && attempt < maxRetries) {
      const wait = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    break;
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err.error?.message || JSON.stringify(err);
    } catch (_) {
      detail = await res.text();
    }
    if (res.status === 503) {
      throw new Error("Model đang quá tải tạm thời. Vui lòng thử lại sau vài giây.");
    }
    throw new Error(`Lỗi API (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";

  if (!text) {
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Nội dung bị chặn bởi bộ lọc an toàn của Gemini.");
    }
    throw new Error("Không nhận được phản hồi từ AI.");
  }

  // Save to history (text only for context)
  history.push({ role: "user", parts: [{ text: userText || "[hình ảnh]" }] });
  history.push({ role: "model", parts: [{ text }] });
  if (history.length > 20) history = history.slice(-20);

  return text;
}

/* ==========================================================
   14. SEND MESSAGE
   ========================================================== */
async function sendMessage() {
  if (isSending) return;
  const text = input.value.trim();
  if (!text && pendingImages.length === 0) return;

  isSending = true;
  sendBtn.disabled = true;

  const imagesForDisplay = pendingImages.map((i) => i.dataUrl);
  const imagesForAPI = [...pendingImages];

  // Render user message
  addMessage("user", text ? `<p>${escapeHTML(text).replace(/\n/g, "<br>")}</p>` : "", imagesForDisplay, text);

  // Reset composer
  input.value = "";
  input.style.height = "auto";
  pendingImages = [];
  renderPreviews();

  addTyping();

  try {
    const reply = await callGemini(text, imagesForAPI);
    removeTyping();
    addMessage("ai", renderMarkdown(reply), [], reply);
  } catch (err) {
    removeTyping();
    addMessage(
      "ai",
      `<p style="color:#ffb4b4"><strong>⚠️ Đã xảy ra lỗi</strong></p><p>${escapeHTML(err.message)}</p>
       <p style="color:var(--ink-dim);font-size:0.85rem">Gợi ý: kiểm tra lại API key, tên model hoặc kết nối mạng.</p>`
    );
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

sendBtn.addEventListener("click", sendMessage);

/* ==========================================================
   15. SUGGESTIONS
   ========================================================== */
document.getElementById("suggestions").addEventListener("click", (e) => {
  const s = e.target.closest(".suggestion");
  if (!s) return;
  input.value = s.dataset.prompt;
  input.dispatchEvent(new Event("input"));
  sendMessage();
});

/* ==========================================================
   16. CLEAR CHAT
   ========================================================== */
clearBtn.addEventListener("click", () => {
  history = [];
  chatLog = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  chatScroll.innerHTML = "";
  chatScroll.appendChild(welcome);
  welcome.style.display = "";
  showToast("Đã xoá cuộc trò chuyện");
});

/* ==========================================================
   17. 3D TILT ON GLASS PANELS
   ========================================================== */
document.querySelectorAll(".topbar, .chat-panel, .mode-switch").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateX(${(-y * 2.2).toFixed(2)}deg) rotateY(${(x * 2.2).toFixed(2)}deg)`;
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "";
  });
});

/* ==========================================================
   18. INIT
   ========================================================== */
window.addEventListener("load", () => {
  // Khôi phục chế độ đã chọn
  try {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
    if (savedMode && MODES[savedMode]) setMode(savedMode);
  } catch (_) {}

  const active = document.querySelector(".mode-btn.active");
  if (active) moveGlider(active);

  // Khôi phục lịch sử chat đã lưu
  const restored = loadChat();
  if (restored) {
    scrollToBottom();
    showToast("Đã khôi phục lịch sử trò chuyện");
  }

  input.focus();
});

/* ==========================================================
   19. TÍCH HỢP AUTH — cá nhân hoá lời chào
   ========================================================== */
if (window.KyzenAuth) {
  window.KyzenAuth.onChange((user) => {
    const h3 = document.querySelector(".welcome h3");
    const p = document.querySelector(".welcome > p");
    if (!user) return;
    if (user.role === "admin") {
      if (h3) h3.innerHTML = "Xin chào Admin <strong>Lý A Trong</strong> 👑";
      if (p) p.innerHTML =
        "Chế độ <strong>Admin AI</strong> đã bật — mình sẽ trả lời <strong>đầy đủ và chính xác nhất</strong> mọi yêu cầu của bạn.";
      document.body.classList.add("admin-mode");
    } else if (user.role === "guest") {
      if (h3) h3.innerHTML = "Xin chào, mình là Kyzen ✨";
      if (p) p.innerHTML =
        "Bạn đang dùng với tư cách <strong>Khách</strong>. Đăng nhập để lưu lịch sử lâu dài và mở khoá nhiều tính năng hơn.";
    } else {
      if (h3) h3.innerHTML = "Xin chào <strong>" + user.name + "</strong> ✨";
      if (p) p.innerHTML =
        "Rất vui được gặp bạn! Chọn một gợi ý bên dưới hoặc nhập câu hỏi của bạn. Bạn cũng có thể gửi kèm hình ảnh để mình phân tích.";
    }
  });
}
