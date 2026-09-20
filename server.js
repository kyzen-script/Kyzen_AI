/* ============================================================
   KYZEN AI — Backend + Gemini API
   Railway / Render / VPS
   ============================================================ */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Cho phép nhận JSON từ app.js
app.use(express.json({ limit: "20mb" }));

// ============================================================
// GEMINI CONFIG
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

// ============================================================
// API CHAT
// ============================================================

app.post("/api/chat", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình trên Railway."
      });
    }

    const body = req.body;

    const response = await fetch(
      `${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);

      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Server Error:", error);

    res.status(500).json({
      error: error.message || "Lỗi server"
    });
  }
});

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  express.static(path.join(__dirname), {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(png|jpe?g|gif|webp|mp4|svg|ico)$/i.test(filePath)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=604800"
        );
      } else {
        res.setHeader(
          "Cache-Control",
          "no-cache"
        );
      }
    }
  })
);

// ============================================================
// SPA FALLBACK
// ============================================================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ============================================================
// START
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `✅ Kyzen AI đang chạy tại http://0.0.0.0:${PORT}`
  );

  console.log(
    GEMINI_API_KEY
      ? "✅ GEMINI_API_KEY đã được nạp"
      : "❌ GEMINI_API_KEY chưa được cấu hình"
  );
});
