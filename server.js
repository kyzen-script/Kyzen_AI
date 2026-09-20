/* ============================================================
   KYZEN AI — Static server cho Railway / Render / VPS
   Tác giả: Lý A Trong
   ============================================================ */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Phục vụ toàn bộ file tĩnh (index.html, css, js, assets)
app.use(
  express.static(path.join(__dirname), {
    extensions: ["html"],
    setHeaders(res, filePath) {
      // Cache ảnh/video lâu dài, HTML/JS/CSS luôn mới
      if (/\.(png|jpe?g|gif|webp|mp4|svg|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  })
);

// SPA fallback → index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Kyzen AI đang chạy tại http://0.0.0.0:${PORT}`);
});
