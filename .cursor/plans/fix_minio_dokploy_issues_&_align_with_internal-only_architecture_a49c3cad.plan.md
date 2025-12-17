---
name: Fix MinIO Dokploy issues & align with internal-only architecture
overview: ""
todos:
  - id: align-bucket-names
    content: Update MinIO bucket name usages so `espacio-files` is used consistently by both the setup container and the app in docker-compose-new.yml (and docker-compose-dokploy.yml if applicable).
    status: completed
  - id: internal-only-downloads
    content: Refactor getDownloadUrl and related UI components to serve downloads via the Next.js /api/files proxy using NEXT_PUBLIC_APP_URL instead of presigned MinIO URLs.
    status: completed
    dependencies:
      - align-bucket-names
  - id: verify-dokploy-env
    content: Review and correct Dokploy environment variables (NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, MINIO_BUCKET_NAME, MINIO_ENDPOINT, MINIO_PORT, MINIO_CORS_ORIGIN) to match the desired domains and internal-only MinIO setup.
    status: completed
    dependencies:
      - align-bucket-names
---

# Fix MinIO Dokploy issues & align with internal-only architecture

## Overview

Align the MinIO configuration in Dokploy with the new internal-only architecture so that uploads, in-app previews, downloads, and share links all work via the main app domain, using `docker-compose-new.yml` as the source of truth.

## Key observations (current status)

- **MinIO services in `docker-compose-new.yml`**
- `espacio-minio` runs MinIO and is only exposed on the internal Docker networks (`docker-network`, `dokploy-network`), not to the public internet.
- `espacio-minio-setup` uses `minio/mc` to:
- Create a bucket `${MINIO_BUCKET_NAME:-startup-mvp-files}`
- Apply anonymous download/upload/public policies to **that** bucket.
- `espacio-app` uses environment variables:
- `MINIO_ENDPOINT=espacio-minio`, `MINIO_PORT=9000`, `MINIO_USE_SSL=false` for internal access.
- `MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-espacio-files}` (note the default bucket name differs from the setup container).
- `MINIO_PUBLIC_URL=${MINIO_PUBLIC_URL:-http://espacio-minio:9000}` (internal Docker hostname, not publicly resolvable).
- **App-side MinIO usage**
- `startup-mvp/lib/minio.ts` builds two S3 clients:
- Internal client using `MINIO_ENDPOINT`/`MINIO_PORT` for uploads and internal operations.
- Presigned client using `MINIO_PUBLIC_URL` for URLs that the browser will call directly.
- `startup-mvp/app/actions/files.ts`:
- `uploadFileServerSide` uploads via the internal client and writes DB records (works as long as MinIO credentials and bucket exist).
- `getPublicUrl` now returns a URL like `NEXT_PUBLIC_APP_URL + '/api/files/' + key`, so previews and share URLs use the **main app domain**.
- `getDownloadUrl` still returns a **presigned MinIO URL** created using `MINIO_PUBLIC_URL`.
- `startup-mvp/app/api/files/[...key]/route.ts` is a server-side proxy:
- Authenticates the user.
- Uses `MINIO_ENDPOINT`, `MINIO_PORT`, and `MINIO_BUCKET_NAME` to fetch from MinIO internally.
- Streams the file back to the browser.
- **Local vs Dokploy difference**
- Local `docker-compose.yml`:
- Exposes MinIO ports to host and uses `MINIO_PUBLIC_URL=http://localhost:9000`.
- Both `espacio-minio-setup` and `espacio-app` default to `MINIO_BUCKET_NAME=startup-mvp-files`, so bucket name is consistent.
- Browser can reach `localhost:9000`, so presigned URLs work.
- Dokploy / `docker-compose-new.yml`:
- MinIO is **not** exposed publicly; only internal Docker networks can reach `espacio-minio:9000`.
- `MINIO_PUBLIC_URL` defaults to `http://espacio-minio:9000`, which the browser **cannot resolve** from the internet.
- `espacio-minio-setup` still targets bucket `startup-mvp-files`, while the app defaults to `espacio-files`.

## Root causes (why Dokploy fails)

- **Direct-download paths still depend on `MINIO_PUBLIC_URL`**:
- `getDownloadUrl` generates presigned URLs that point at `MINIO_PUBLIC_URL`.
- In Dokploy, this is `http://espacio-minio:9000`, which is only valid inside the Docker network.
- The browser tries to hit that host and fails (DNS/connection error), so downloads and any preview that falls back to `getDownloadUrl` break.
- **Bucket setup mismatch (secondary issue)**:
- The setup container creates and configures `startup-mvp-files`, but the app uses `espacio-files` by default.
- Uploads currently succeed (so the bucket exists and credentials are OK), but the setup container is not applying policies to the actual bucket the app uses, which is confusing and fragile for future changes.

## Recommended implementation plan

### 1. Align bucket names in `docker-compose-new.yml`

- **Goal**: Ensure the same bucket name is used everywhere, and the MinIO setup job initializes the correct bucket.
- **Changes (high level)**:
- In [`docker-compose-new.yml`](docker-compose-new.yml):
- Update `espacio-minio-setup` commands to use `espacio-files` instead of `startup-mvp-files` in the `mc mb` and `mc anonymous set ...` lines.
- Keep `espacio-app`'s `MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME:-espacio-files}` so the default bucket is `espacio-files` across app and setup.
- Mirror the same bucket-name alignment in `docker-compose-dokploy.yml` if you are still using it for Dokploy.

### 2. Fully adopt the internal-only architecture for downloads

- **Goal**: Make all user-facing file access go through the main app domain (e.g. `https://dev.espaciobd.com`) and the `/api/files/[...key]` proxy, so MinIO never needs to be publicly exposed.
- **Changes**:
- In [`startup-mvp/app/actions/files.ts`](startup-mvp/app/actions/files.ts):
- Refactor `getDownloadUrl` so it no longer produces a presigned MinIO URL.
- Instead, have it build a URL using `NEXT_PUBLIC_APP_URL` and the existing API route, e.g. `const url = \\`${appUrl}/api/files/${key}?download=1\\``.
- Adjust logging/comments to reflect that downloads are served via the app.
- In [`startup-mvp/components/files/FilePreviewDialog.tsx`](startup-mvp/components/files/FilePreviewDialog.tsx) and `[startup-mvp/app/(dashboard)/dashboard/files/page.tsx](startup-mvp/app/\\\\\\\(dashboard)/dashboard/files/page.tsx)`:
- Continue to use `getPublicUrl` for previews (already returns `/api/files/...`).
- For explicit downloads, rely on the updated `getDownloadUrl` (which will now also return an app-domain `/api/files/...` URL), so the anchor tag or window open uses the main domain rather than MinIO.
- In [`startup-mvp/lib/minio.ts`](startup-mvp/lib/minio.ts):
- Optionally relax the requirement for `MINIO_PUBLIC_URL` (or document that in the internal-only mode it can safely be set to `http://espacio-minio:9000` and is not used by any browser-facing flows).

### 3. Verify Dokploy environment variables

- **Goal**: Ensure all URLs referenced in code match the real domains used in Dokploy.
- **Checks/adjustments**:
- In Dokploy project settings (or `.env.docker` used by `docker-compose-new.yml`):
- Set `NEXT_PUBLIC_APP_URL=https://dev.espaciobd.com` (or your actual app domain).
- Ensure `NEXTAUTH_URL` matches the same domain.
- Set `MINIO_BUCKET_NAME=espacio-files` (to avoid relying on defaults and keep Dokploy explicit).
- Keep `MINIO_ENDPOINT=espacio-minio`, `MINIO_PORT=9000`, `MINIO_USE_SSL=false` since MinIO is internal.
- For CORS safety if you ever re-introduce direct browser → MinIO calls, ensure `MINIO_CORS_ORIGIN` includes your app domain.

### 4. Optional alternative: expose MinIO publicly (if you prefer presigned URLs)

- **Only if you explicitly want direct MinIO access from the browser** (not recommended for your current goal of “share via main app domain”) you could instead:
- Configure Traefik/Nginx in Dokploy to expose MinIO at a domain like `https://minio.dev.espaciobd.com`.
- Set `MINIO_PUBLIC_URL=https://minio.dev.espaciobd.com` and `MINIO_USE_SSL=true` in Dokploy env.
- Ensure `MINIO_CORS_ORIGIN` includes `https://dev.espaciobd.com`.
- Keep `getDownloadUrl` returning presigned MinIO URLs as it does now.

For your stated requirement (uploads, view, download, and share via the **main app public domain**), step 2 (internal-only with `/api/files` URLs) is the recommended path, with step 1 (bucket name alignment) and step 3 (env sanity check) as prerequisites.