# Karaoke Pitch Detector

Pitch detection project (karaoke) separated into backend (Rust + Axum) and frontend (Vue 3 + Vite).

## Project Setup

The project is fully dockerized. Use Docker Compose to run it.

### First Run / After Dependency Changes

If you modified `package.json` or `Cargo.toml`, or if you are running the project for the first time, use the `-V` flag (recreate volumes) and `--build`:

```bash
docker-compose up --build -V
```

### Regular Run

For a simple restart (without updating dependencies):

```bash
docker-compose up
```

### Remote Access (Cloudflare Tunnel)

To forward ports using Cloudflare Quick Tunnel:

```bash
cloudflared tunnel --url http://localhost:8080
```

## Development

*   **Frontend**: Available at [http://localhost:8080](http://localhost:8080).
    *   Hot Reload is enabled (changes in the `frontend` folder are immediately visible in the browser).
*   **Backend**: API is available within the Docker network (proxied by Nginx).
    *   `cargo-watch` is enabled (changes in the `backend` folder trigger recompilation).

## Structure

*   `backend/` - Server-side code in Rust.
*   `frontend/` - Client-side code in Vue 3.
*   `nginx.conf` - Nginx configuration (Gateway).
*   `docker-compose.yml` - Service definitions.
