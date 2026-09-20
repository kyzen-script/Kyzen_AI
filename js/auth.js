/* ============================================================
   KYZEN AI — AUTH SYSTEM
   Đăng nhập / Đăng ký / Google / Guest / Admin
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     1. HẰNG SỐ & TÀI KHOẢN ADMIN
     ---------------------------------------------------------- */
  const SESSION_KEY = "kyzen_session_v1";
  const USERS_KEY = "kyzen_users_v1";

  const ADMIN = {
    gmail: "trongezzz@gmail.com",
    username: "Admin Kyzen",
    password: "admin123@",
    phone: "0832094441",
    realName: "Lý A Trong",
    role: "admin"
  };

  /* ----------------------------------------------------------
     2. STATE
     ---------------------------------------------------------- */
  let currentUser = null;
  let onAuthChange = null;

  /* ----------------------------------------------------------
     3. HELPERS
     ---------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (_) { return false; }
  }

  function normEmail(s) { return String(s || "").trim().toLowerCase(); }

  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function getUsers() { return readJSON(USERS_KEY, []); }
  function saveUsers(list) { writeJSON(USERS_KEY, list); }

  /* ----------------------------------------------------------
     4. SESSION
     ---------------------------------------------------------- */
  function saveSession(user, remember) {
    currentUser = user;
    const persist = remember !== false; // mặc định ghi nhớ
    try {
      if (persist) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (_) {}
  }

  function clearSession() {
    currentUser = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function loadSession() {
    let s = readJSON(SESSION_KEY, null);
    if (!s) {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        s = raw ? JSON.parse(raw) : null;
      } catch (_) { s = null; }
    }
    if (s && s.role) { currentUser = s; return s; }
    return null;
  }

  function rememberChecked() {
    const cb = $("rememberMe");
    return cb ? cb.checked : true;
  }

  /* ----------------------------------------------------------
     5. AUTH ACTIONS
     ---------------------------------------------------------- */
  function login(identifier, password) {
    const id = String(identifier || "").trim();
    const pw = String(password || "");

    // Admin check (gmail HOẶC username)
    const isAdminId =
      normEmail(id) === normEmail(ADMIN.gmail) ||
      id.toLowerCase() === ADMIN.username.toLowerCase();

    if (isAdminId) {
      if (pw === ADMIN.password) {
        return {
          ok: true,
          user: {
            name: ADMIN.username,
            realName: ADMIN.realName,
            email: ADMIN.gmail,
            phone: ADMIN.phone,
            role: "admin",
            provider: "password",
            since: Date.now()
          }
        };
      }
      return { ok: false, error: "Mật khẩu Admin không đúng. Vui lòng thử lại." };
    }

    // Normal user check
    const users = getUsers();
    const found = users.find(
      (u) => normEmail(u.email) === normEmail(id) || (u.name || "").toLowerCase() === id.toLowerCase()
    );
    if (!found) return { ok: false, error: "Không tìm thấy tài khoản. Hãy đăng ký trước nhé!" };
    if (found.password !== pw) return { ok: false, error: "Mật khẩu không đúng. Vui lòng thử lại." };

    return {
      ok: true,
      user: {
        name: found.name,
        realName: found.name,
        email: found.email,
        phone: found.phone || "",
        role: "user",
        provider: "password",
        since: Date.now()
      }
    };
  }

  function register(name, email, password) {
    const nm = String(name || "").trim();
    const em = normEmail(email);
    const pw = String(password || "");

    if (nm.length < 2) return { ok: false, error: "Tên hiển thị cần ít nhất 2 ký tự." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, error: "Email không hợp lệ." };
    if (pw.length < 6) return { ok: false, error: "Mật khẩu cần tối thiểu 6 ký tự." };

    if (em === normEmail(ADMIN.gmail)) {
      return { ok: false, error: "Email này đã được đăng ký cho Admin. Hãy đăng nhập." };
    }

    const users = getUsers();
    if (users.some((u) => normEmail(u.email) === em)) {
      return { ok: false, error: "Email này đã được đăng ký. Hãy đăng nhập." };
    }

    users.push({ name: nm, email: em, password: pw, phone: "", createdAt: Date.now() });
    saveUsers(users);

    return {
      ok: true,
      user: {
        name: nm,
        realName: nm,
        email: em,
        phone: "",
        role: "user",
        provider: "password",
        since: Date.now()
      }
    };
  }

  function googleLogin(email, name) {
    const em = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return { ok: false, error: "Email Google không hợp lệ." };
    }
    // Nếu là gmail admin → cấp quyền admin
    if (em === normEmail(ADMIN.gmail)) {
      return {
        ok: true,
        user: {
          name: ADMIN.username,
          realName: ADMIN.realName,
          email: ADMIN.gmail,
          phone: ADMIN.phone,
          role: "admin",
          provider: "google",
          since: Date.now()
        }
      };
    }
    const nm = String(name || "").trim() || em.split("@")[0];
    return {
      ok: true,
      user: {
        name: nm,
        realName: nm,
        email: em,
        phone: "",
        role: "user",
        provider: "google",
        since: Date.now()
      }
    };
  }

  function guestLogin() {
    return {
      ok: true,
      user: {
        name: "Khách",
        realName: "Khách",
        email: "guest@kyzen.ai",
        phone: "",
        role: "guest",
        provider: "guest",
        since: Date.now()
      }
    };
  }

  /* ----------------------------------------------------------
     6. UI — AUTH SCREEN
     ---------------------------------------------------------- */
  const authScreen = () => $("authScreen");
  const authMsg = () => $("authMsg");

  function showMsg(text, type) {
    const el = authMsg();
    if (!el) return;
    el.textContent = text;
    el.className = "auth-msg show " + (type || "error");
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "auth-msg"; }, 5200);
  }

  function switchTab(tab) {
    const tabs = document.querySelectorAll(".auth-tab");
    const glider = $("authGlider");
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    if (glider) glider.classList.toggle("right", tab === "register");
    const lf = $("loginForm"), rf = $("registerForm");
    if (lf) lf.classList.toggle("active", tab === "login");
    if (rf) rf.classList.toggle("active", tab === "register");
    const el = authMsg();
    if (el) el.className = "auth-msg";
  }

  /* --- Cinematic 4s transition using the AI video --- */
  function playIntroTransition(cb) {
    const screen = authScreen();
    const loading = $("authLoading");
    const txt = $("authLoadingText");
    const video = $("authVideo");

    if (!screen) { cb && cb(); return; }

    // Fullscreen cinematic overlay
    const cine = document.createElement("div");
    cine.className = "auth-cinema";
    cine.innerHTML =
      '<video class="cine-video" autoplay muted playsinline poster="assets/ai-bg.png">' +
      '<source src="assets/ai-intro.mp4" type="video/mp4" /></video>' +
      '<div class="cine-veil"></div>' +
      '<div class="cine-core">' +
      '<div class="cine-ring"></div>' +
      '<div class="cine-text" id="cineText">Đang kết nối Kyzen Neural Core…</div>' +
      '<div class="cine-bar"><span></span></div>' +
      "</div>";
    screen.appendChild(cine);

    const cv = cine.querySelector(".cine-video");
    if (cv) { cv.currentTime = 0; cv.play().catch(() => {}); }

    const steps = [
      "Đang kết nối Kyzen Neural Core…",
      "Đang xác thực danh tính…",
      "Đang đồng bộ dữ liệu…",
      "Sẵn sàng! Chào mừng bạn ✨"
    ];
    const ct = cine.querySelector("#cineText");
    let i = 0;
    const stepTimer = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      if (ct) ct.textContent = steps[i];
    }, 1000);

    // 4 giây
    setTimeout(() => {
      clearInterval(stepTimer);
      cine.classList.add("out");
      setTimeout(() => {
        cine.remove();
        if (loading) loading.classList.remove("show");
        cb && cb();
      }, 620);
    }, 4000);
  }

  function enterApp(user) {
    const screen = authScreen();
    const loading = $("authLoading");
    if (loading) loading.classList.add("show");

    playIntroTransition(() => {
      if (screen) screen.classList.add("hidden");
      document.body.classList.add("authed");
      renderUserChip(user);
      if (typeof onAuthChange === "function") onAuthChange(user);
      setTimeout(() => { if (screen) screen.style.display = "none"; }, 800);
    });
  }

  function showAuthScreen() {
    const screen = authScreen();
    if (!screen) return;
    screen.style.display = "";
    screen.classList.remove("hidden");
    document.body.classList.remove("authed");
    const chip = $("userChip");
    if (chip) chip.hidden = true;
  }

  /* ----------------------------------------------------------
     7. USER CHIP
     ---------------------------------------------------------- */
  function renderUserChip(user) {
    const chip = $("userChip");
    if (!chip || !user) return;
    chip.hidden = false;

    const roleLabel = user.role === "admin" ? "Admin AI" : user.role === "guest" ? "Khách" : "Thành viên";
    const av = initials(user.name);

    const set = (id, val) => { const e = $(id); if (e) e.textContent = val; };
    set("ucAvatar", av);
    set("ucName", user.name);
    set("ucRole", roleLabel);
    set("umAvatar", av);
    set("umName", user.name);
    set("umEmail", user.email);

    const avEl = $("ucAvatar"), umAv = $("umAvatar");
    [avEl, umAv].forEach((e) => {
      if (!e) return;
      e.classList.remove("admin", "guest");
      if (user.role === "admin") e.classList.add("admin");
      if (user.role === "guest") e.classList.add("guest");
    });

    const roleEl = $("ucRole");
    if (roleEl) roleEl.classList.toggle("admin", user.role === "admin");

    // Info block
    const info = $("umInfo");
    if (info) {
      const badgeCls = user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user";
      const rows = [];
      rows.push(
        '<div class="umi"><span>Vai trò</span><span class="um-badge ' + badgeCls + '">' + roleLabel + "</span></div>"
      );
      if (user.realName && user.realName !== user.name) {
        rows.push('<div class="umi"><span>Tên thật</span><span>' + esc(user.realName) + "</span></div>");
      }
      if (user.phone) {
        rows.push('<div class="umi"><span>SĐT</span><span>' + esc(user.phone) + "</span></div>");
      }
      rows.push(
        '<div class="umi"><span>Đăng nhập</span><span>' +
          (user.provider === "google" ? "Google" : user.provider === "guest" ? "Khách" : "Tài khoản") +
          "</span></div>"
      );
      if (user.role === "admin") {
        rows.push(
          '<div class="umi"><span>Quyền AI</span><span style="color:#fbbf24">Trả lời full &amp; chính xác nhất</span></div>'
        );
      }
      info.innerHTML = rows.join("");
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ----------------------------------------------------------
     8. GOOGLE ACCOUNT PICKER (mô phỏng)
     ---------------------------------------------------------- */
  function openGooglePicker() {
    const screen = authScreen();
    if (!screen) return;

    const overlay = document.createElement("div");
    overlay.className = "g-overlay";
    overlay.innerHTML =
      '<div class="g-modal">' +
      '<div class="g-head">' +
      '<svg viewBox="0 0 48 48" width="26" height="26"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
      "<div><strong>Đăng nhập bằng Google</strong><small>Chọn tài khoản để tiếp tục với Kyzen AI</small></div>" +
      "</div>" +
      '<div class="g-body">' +
      '<label class="g-field"><span>Email Google</span>' +
      '<input type="email" id="gEmail" placeholder="tenban@gmail.com" /></label>' +
      '<label class="g-field"><span>Tên hiển thị (tuỳ chọn)</span>' +
      '<input type="text" id="gName" placeholder="Nguyễn Văn A" /></label>' +
      '<div class="g-msg" id="gMsg"></div>' +
      "</div>" +
      '<div class="g-foot">' +
      '<button class="g-cancel" id="gCancel">Huỷ</button>' +
      '<button class="g-ok" id="gOk">Tiếp tục</button>' +
      "</div>" +
      "</div>";
    screen.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector("#gCancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    const submit = () => {
      const em = overlay.querySelector("#gEmail").value;
      const nm = overlay.querySelector("#gName").value;
      const res = googleLogin(em, nm);
      if (!res.ok) {
        const m = overlay.querySelector("#gMsg");
        m.textContent = res.error;
        m.className = "g-msg show";
        return;
      }
      close();
      saveSession(res.user, true);
      enterApp(res.user);
    };
    overlay.querySelector("#gOk").addEventListener("click", submit);
    overlay.querySelector("#gEmail").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    overlay.querySelector("#gName").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    setTimeout(() => { const i = overlay.querySelector("#gEmail"); if (i) i.focus(); }, 120);
  }

  /* ----------------------------------------------------------
     9. WIRE UP EVENTS
     ---------------------------------------------------------- */
  function init() {
    // Tabs
    document.querySelectorAll(".auth-tab").forEach((t) => {
      t.addEventListener("click", () => switchTab(t.dataset.tab));
    });

    // Password toggles
    document.querySelectorAll(".pw-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = $(btn.dataset.target);
        if (!inp) return;
        inp.type = inp.type === "password" ? "text" : "password";
        btn.classList.toggle("on", inp.type === "text");
      });
    });

    // Login form
    const lf = $("loginForm");
    if (lf) {
      lf.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = $("loginUser").value;
        const pw = $("loginPass").value;
        const res = login(id, pw);
        if (!res.ok) { showMsg(res.error, "error"); return; }
        saveSession(res.user, rememberChecked());
        showMsg("Đăng nhập thành công! Đang vào Kyzen AI…", "success");
        enterApp(res.user);
      });
    }

    // Register form
    const rf = $("registerForm");
    if (rf) {
      rf.addEventListener("submit", (e) => {
        e.preventDefault();
        const res = register($("regName").value, $("regEmail").value, $("regPass").value);
        if (!res.ok) { showMsg(res.error, "error"); return; }
        saveSession(res.user, true);
        showMsg("Tạo tài khoản thành công! Đang vào Kyzen AI…", "success");
        enterApp(res.user);
      });
    }

    // Google
    const gb = $("googleBtn");
    if (gb) gb.addEventListener("click", openGooglePicker);

    // Guest
    const gub = $("guestBtn");
    if (gub) {
      gub.addEventListener("click", () => {
        const res = guestLogin();
        saveSession(res.user, false);
        showMsg("Đang vào với tư cách Khách…", "success");
        enterApp(res.user);
      });
    }

    // Admin quick fill
    const af = $("adminFill");
    if (af) {
      af.addEventListener("click", () => {
        switchTab("login");
        $("loginUser").value = ADMIN.gmail;
        $("loginPass").value = ADMIN.password;
        showMsg("Đã điền tài khoản Admin. Nhấn Đăng nhập để tiếp tục.", "success");
      });
    }

    // Forgot password
    const fb = $("forgotBtn");
    if (fb) {
      fb.addEventListener("click", () => {
        showMsg("Vui lòng liên hệ Admin: " + ADMIN.gmail + " — SĐT " + ADMIN.phone, "success");
      });
    }

    // User chip dropdown
    const ucBtn = $("ucBtn");
    const chip = $("userChip");
    if (ucBtn && chip) {
      ucBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chip.classList.toggle("open");
      });
      document.addEventListener("click", () => chip.classList.remove("open"));
    }

    // Logout
    const lo = $("umLogout");
    if (lo) {
      lo.addEventListener("click", () => {
        clearSession();
        if (chip) chip.classList.remove("open");
        showAuthScreen();
        switchTab("login");
        const lf2 = $("loginForm");
        if (lf2) lf2.reset();
        const rf2 = $("registerForm");
        if (rf2) rf2.reset();
        showMsg("Bạn đã đăng xuất.", "success");
        if (typeof onAuthChange === "function") onAuthChange(null);
      });
    }

    // Restore session
    const s = loadSession();
    if (s) {
      const screen = authScreen();
      if (screen) screen.style.display = "none";
      document.body.classList.add("authed");
      renderUserChip(s);
      if (typeof onAuthChange === "function") onAuthChange(s);
    } else {
      showAuthScreen();
    }
  }

  /* ----------------------------------------------------------
     10. PUBLIC API
     ---------------------------------------------------------- */
  window.KyzenAuth = {
    getUser: () => currentUser,
    isAdmin: () => !!currentUser && currentUser.role === "admin",
    isGuest: () => !!currentUser && currentUser.role === "guest",
    onChange: (fn) => { onAuthChange = fn; },
    logout: () => { clearSession(); showAuthScreen(); },
    ADMIN
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
