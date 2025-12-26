import { API } from "./api";

export async function uploadFile(file, setProgress, setGrid, setSpeed, setEta) {
  const CHUNK = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / CHUNK);
  let grid = Array(totalChunks).fill("lightgray");
  setGrid([...grid]);

  const start = Date.now();

  const handshake = await fetch(`${API}/handshake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, size: file.size })
  }).then(r => r.json());

  const uploaded = new Set(handshake.uploadedChunks);
  let completed = uploaded.size;
  uploaded.forEach(i => grid[i] = "green");

  const queue = [];
  for (let i = 0; i < totalChunks; i++) if (!uploaded.has(i)) queue.push(i);

  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      grid[index] = "orange";
      setGrid([...grid]);

      const blob = file.slice(index * CHUNK, (index + 1) * CHUNK);
      let retries = 0;

      while (retries < 3) {
        try {
          await fetch(`${API}/chunk?uploadId=${handshake.uploadId}&index=${index}`, {
            method: "POST",
            body: blob
          });

          completed++;
          grid[index] = "green";
          setGrid([...grid]);

          const elapsed = (Date.now() - start) / 1000;
          const mb = (completed * CHUNK) / (1024 * 1024);
          const speed = mb / elapsed;

          setSpeed(speed);
          setEta(((totalChunks - completed) * 5) / speed);
          setProgress(Math.floor((completed / totalChunks) * 100));
          break;
        } catch {
          retries++;
          grid[index] = "red";
          setGrid([...grid]);
          await new Promise(r => setTimeout(r, 2 ** retries * 1000));
        }
      }
    }
  }

  await Promise.all([worker(), worker(), worker()]);
  await fetch(`${API}/finalize/${handshake.uploadId}`, { method: "POST" });
}