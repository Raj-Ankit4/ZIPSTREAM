import express from "express";
import fs from "fs";
import crypto from "crypto";
import unzipper from "unzipper";
import { db } from "./db.js";

const router = express.Router();
const CHUNK_SIZE = 5 * 1024 * 1024;

router.post("/handshake", async (req, res) => {
  const { filename, size } = req.body;
  const [rows] = await db.query("SELECT * FROM uploads WHERE filename=? AND total_size=?", [filename, size]);
  if (!rows.length) {
    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    const [r] = await db.query(
      "INSERT INTO uploads(filename,total_size,total_chunks,status) VALUES (?,?,?,?)",
      [filename, size, totalChunks, "UPLOADING"]
    );
    return res.json({ uploadId: r.insertId, uploadedChunks: [] });
  }
  const [chunks] = await db.query("SELECT chunk_index FROM chunks WHERE upload_id=?", [rows[0].id]);
  res.json({ uploadId: rows[0].id, uploadedChunks: chunks.map(c => c.chunk_index) });
});

router.post("/chunk", async (req, res) => {
  const { uploadId, index } = req.query;
  const uploadDir = "backend/uploads";
  const filePath = `${uploadDir}/${uploadId}.zip`;
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const flags = index === "0" ? "w" : "r+";

  const ws = fs.createWriteStream(filePath, {
    flags,
    start: Number(index) * CHUNK_SIZE
  });

  req.pipe(ws);

  ws.on("finish", async () => {
    await db.query(
      "INSERT IGNORE INTO chunks(upload_id, chunk_index, status, received_at) VALUES (?, ?, 'RECEIVED', NOW())",
      [uploadId, index]
    );
    res.json({ ok: true });
  });

  ws.on("error", (err) => {
    console.error("Write error:", err);
    res.status(500).json({ error: "Chunk write failed" });
  });
});

router.post("/finalize/:id", async (req, res) => {
  const id = req.params.id;
  const filePath = `backend/uploads/${id}.zip`;

  try {
    const [[upload]] = await db.query(
      "SELECT status FROM uploads WHERE id=?",
      [id]
    );

    if (!upload || upload.status !== "UPLOADING") {
      return res.json({ status: "already finalized" });
    }

    await db.query(
      "UPDATE uploads SET status='PROCESSING' WHERE id=?",
      [id]
    );


    const hash = crypto.createHash("sha256");
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .on("data", chunk => hash.update(chunk))
        .on("end", resolve)
        .on("error", reject);
    });

    const finalHash = hash.digest("hex");

    const files = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(unzipper.Parse())
        .on("entry", entry => {
          files.push(entry.path);
          entry.autodrain();
        })
        .on("close", resolve)
        .on("error", reject);
    });


    await db.query(
      "UPDATE uploads SET status='COMPLETED', final_hash=? WHERE id=?",
      [finalHash, id]
    );

    res.json({ finalHash, files });
  } catch (err) {
    console.error("Finalize error:", err);
    await db.query(
      "UPDATE uploads SET status='FAILED' WHERE id=?",
      [id]
    );
    res.status(500).json({ error: "Finalize failed" });
  }
});


export default router;
