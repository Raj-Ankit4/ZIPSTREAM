import React, { useState } from "react";

import { uploadFile } from "./uploader";

export default function App() {
  const [progress, setProgress] = useState(0);
  const [grid, setGrid] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);

  return (
    <div style={{padding:20}}>
      <h2>Large ZIP Uploader</h2>
      <input type="file" onChange={e => uploadFile(e.target.files[0], setProgress, setGrid, setSpeed, setEta)} />
      <progress value={progress} max="100" />
      <p>{progress}%</p>
      <p>Speed: {speed.toFixed(2)} MB/s</p>
      <p>ETA: {eta.toFixed(1)} sec</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:4}}>
        {grid.map((s,i)=>(
          <div key={i} style={{height:20,background:s}}></div>
        ))}
      </div>
    </div>
  );
}