# Kyzen AI — Liquid Glass Studio

Trợ lý AI đa năng (Google Gemini) với giao diện Liquid Glass 3D.
**Tác giả:** Lý A Trong

---

## ✨ Tính năng

- 🎨 Giao diện **Liquid Glass 3D** + hiệu ứng chuyển động khi vào web
- 🧠 **3 chế độ**: Tổng hợp · Học tập · Lập trình cao cấp
- 🖼️ Gửi **hình ảnh** cho AI phân tích (multimodal)
- 📋 Nút **Copy code** cho lập trình
- 💾 **Lưu lịch sử chat** (localStorage)
- 🔐 **Đăng nhập / Đăng ký / Google / Khách**
- 👑 **Chế độ Admin AI** — trả lời đầy đủ & chính xác nhất
- 🎬 **Video AI 4 giây** chuyển cảnh màn hình đăng nhập

---

## 🚀 Deploy lên Railway

### Cách 1 — Deploy từ GitHub (khuyến nghị)

1. Tạo repo mới trên GitHub và upload toàn bộ thư mục này lên.
2. Vào [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Chọn repo vừa tạo. Railway tự nhận diện Node.js.
4. Vào tab **Settings → Networking → Generate Domain** để lấy link public.

### Cách 2 — Deploy bằng Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway domain
```

### Cách 3 — Upload trực tiếp file ZIP

1. Giải nén file ZIP.
2. Vào Railway → **New Project** → **Empty Project**.
3. Cài Railway CLI rồi chạy `railway up` trong thư mục vừa giải nén.

---

## 💻 Chạy local

```bash
npm install
npm start
# Mở http://localhost:3000
```

Hoặc không cần Node, chỉ cần mở `index.html` bằng trình duyệt
(hoặc dùng `python3 -m http.server 8080`).

---

> Trên màn hình đăng nhập có nút **"Điền nhanh tài khoản Admin"** để đăng nhập nhanh.

---

## ⚙️ Cấu hình API Gemini

Mở `js/app.js`, sửa 2 dòng đầu:

```js
const API_KEY = "API_KEY_CUA_BAN";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + API_KEY;
```

---

## 📁 Cấu trúc

```
.
├── index.html          # Trang chính + màn hình đăng nhập
├── server.js           # Static server (Railway)
├── package.json
├── css/
│   ├── style.css       # Liquid Glass 3D
│   └── auth.css        # Auth screen + user chip
├── js/
│   ├── auth.js         # Logic đăng nhập/đăng ký/admin
│   └── app.js          # Gemini API + chat + markdown
└── assets/
    ├── kyzen-logo.jpeg # Logo AI
    ├── ai-bg.png       # Ảnh nền AI
    └── ai-intro.mp4    # Video AI 4 giây
```

---

© 2025 Kyzen AI — Được tạo bởi **Lý A Trong**
