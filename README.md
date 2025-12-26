# Large ZIP Chunked Upload System

## How to Run
docker compose up

## Features
- 5MB chunked uploads
- 3 concurrent workers
- Resume after refresh
- Retry with exponential backoff
- Chunk status grid
- Live speed & ETA
- Streaming backend
- SHA-256 integrity check
- ZIP peek without extraction
- Crash recovery via DB

## Tech Stack
React, Node.js, MySQL, Docker
