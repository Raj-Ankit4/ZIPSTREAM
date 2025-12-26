import { db } from "./db.js";
setInterval(async () => {
  await db.query("DELETE FROM uploads WHERE status='UPLOADING' AND created_at < NOW() - INTERVAL 1 DAY");
}, 3600000);