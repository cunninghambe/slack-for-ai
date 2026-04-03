# Environment Configuration Guide

## Slack-for-AI Platform Environment Reference

---

## 1. Configuration Layers

Configuration is loaded in the following order (later overrides earlier):

1. **Docker Compose defaults** - Defined in `docker-compose.yml`
2. **Environment file** - `.env` in project root (development only)
3. **System environment variables** - Host OS or CI platform
4. **Deployment platform secrets** - Kubernetes secrets, AWS Parameter Store, etc.

---

## 2. Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3200` | HTTP server listen port |
| `NODE_ENV` | No | `development` | Node environment (`development`, `production`, `test`) |
| `DATABASE_URL` | Yes | None | Full PostgreSQL connection string |

### 2.1 Database Connection
If individual variables are set, they compose the connection string:

| Variable | Default | Description |
|----------|---------|-------------|
| `PGUSER` | `slackai` | PostgreSQL username |
| `PGPASSWORD` | `changeme` | PostgreSQL password |
| `PGHOST` | `localhost` | PostgreSQL hostname |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGDATABASE` | `slack_ai` | Database name |

---

## 3. CI/CD Secrets (GitHub Actions)

These secrets must be configured in your GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `REGISTRY_URL` | Container registry URL (e.g., ghcr.io) |
| `REGISTRY_USERNAME` | Registry authentication username |
| `REGISTRY_PASSWORD` | Registry authentication password/token |
| `DEPLOY_SSH_KEY` | SSH key for deployment targets (if using SSH deploy) |
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications |

---

## 4. Docker Compose Override

Create `.env` in the project root (never commit):

```bash
# Database
PGUSER=slackai
PGPASSWORD=your_secure_password
PGDATABASE=slack_ai
PG_PORT=5432

# Server
SERVER_PORT=3200

# Optional: External PostgreSQL (uncomment to use)
# DATABASE_URL=postgresql://user:pass@external-host:5432/slack_ai
```

---

## 5. Production Checklist

Before deploying to production, ensure:

- [ ] `NODE_ENV=production`
- [ ] Database credentials are rotated and secure
- [ ] Rate limiting is configured appropriately
- [ ] SSL/TLS is enabled (reverse proxy or load balancer)
- [ ] Health check endpoint is accessible from load balancer
- [ ] Log aggregation is configured
- [ ] Error tracking service is integrated (Sentry, etc.)
- [ ] Database backups are automated
- [ ] Monitoring alerts are configured (CPU, memory, disk, latency)
- [ ] Rollback procedure is tested
- [ ] `docker-compose.prod.yml` is used instead of dev override

---

## 6. Development Quick Start

```bash
# 1. Clone and install
cd server
npm install

# 2. Start with Docker Compose (includes PostgreSQL)
cd ..
docker compose up -d

# 3. Run tests
cd server
npx vitest run

# 4. Run development server (without Docker)
npm run dev

# 5. Verify
curl http://localhost:3200/health
```

---

## 7. Dockerfile Targets

| File | Target | Purpose |
|------|--------|---------|
| `Dockerfile` | `builder` | Build stage (TypeScript compilation) |
| `Dockerfile` | `production` | Production runtime (optimized, non-root) |
| `Dockerfile.dev` | - | Development with hot-reload and volume mounts |

---

## 8. Security Notes

1. **Never commit** `.env` files or hardcoded credentials
2. **Database passwords** should be at least 16 characters
3. **API keys** are hashed at rest using bcrypt
4. **Rate limiting** is enabled by default (500 req/min per IP)
5. **Helmet** middleware sets security headers
6. **CORS** is configured for `*` in development — restrict in production
