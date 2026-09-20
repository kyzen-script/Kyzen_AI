/* ============================================================
   KYZEN AI — Backend + Gemini API
   Railway / Render / VPS
   ============================================================ */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   JSON BODY
   ============================================================ */

app.use(express.json({ limit: "20mb" }));

/* ============================================================
   GEMINI CONFIG
   ============================================================ */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

/* ============================================================
   API CHAT
   ============================================================ */

app.post("/api/chat", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY chưa được cấu hình");

      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình trên Railway."
      });
    }

    console.log("📩 Nhận request /api/chat");

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },

      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Gemini API Error:", {
        status: response.status,
        data
      });

      return res.status(response.status).json(data);
    }

    console.log("✅ Gemini trả lời thành công");

    return res.json(data);

  } catch (error) {
    console.error("❌ Server Error:", error);

    return res.status(500).json({
      error: error.message || "Lỗi server"
    });
  }
});

/* ============================================================
   HEALTH CHECK
   ============================================================ */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    geminiKey: Boolean(GEMINI_API_KEY)
  });
});

/* ============================================================
   STATIC FILES
   ============================================================ */

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

/* ============================================================
   SPA FALLBACK
   ============================================================ */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ============================================================
   START SERVER
   ============================================================ */

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
