# Deployment

Folio runs as one Node.js instance with a persistent SQLite database. The Dockerfile pins Node 24.22.0 LTS. Keep one replica; independent SQLite files do not provide shared state across replicas.

## Required configuration

- Mount a persistent writable volume at `/data`.
- Set `DATABASE_PATH=/data/folio.sqlite`.
- Set a random, persistent `SESSION_SECRET` with at least 32 characters. Keep it in the hosting provider's secret store and preserve it across restarts.
- Set `APP_ORIGIN` to the exact public HTTPS origin, without a path.
- Set `PORT=3000` and route HTTPS traffic to that port.
- Use `/api/health` as the readiness check.

`npm run start:hosted` validates configuration, migrates and idempotently seeds the mounted database, then starts Next.js on `0.0.0.0`. Initialization happens at startup after the volume is mounted and preserves existing documents and grants. The public origin controls mutation validation and secure cookies behind a reverse proxy.

The image defaults to the unprivileged Node user. Ensure the volume is writable by that user. Railway volumes mount as root; the existing Railway demo uses `RAILWAY_RUN_UID=0` for that provider's volume permissions.

## Docker on localhost

```bash
docker build -t folio-editor .
docker volume create folio-data
# Generate a signing secret in your shell, without committing it.
export SESSION_SECRET="$(openssl rand -hex 48)"
docker run --rm --name folio-editor -p 3115:3000 \
  -v folio-data:/data \
  -e SESSION_SECRET \
  -e DATABASE_PATH=/data/folio.sqlite \
  -e APP_ORIGIN=http://127.0.0.1:3115 \
  folio-editor
```

For a root-owned local volume, grant the container's Node user write access before starting it. Open http://127.0.0.1:3115. Restart with the same volume and signing secret to verify persisted documents, grants, and sessions. Back up the database consistently before maintenance; removing the volume discards its data.

## Demo and security boundary

The [public demo](https://folio-production-2ec9.up.railway.app) needs no password or hosting account. Select Alex Morgan, Sam Taylor, or Jordan Lee. All profiles are selectable, so use fictional content. Add real authentication before storing private information.

See the official [Next.js deployment guide](https://nextjs.org/docs/app/getting-started/deploying) and [Railway volume documentation](https://docs.railway.com/volumes).
