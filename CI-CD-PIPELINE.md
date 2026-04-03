# CI/CD Pipeline - Slack for AI Platform

## Pipeline Architecture

We use GitHub Actions for CI/CD with a 4-job pipeline:

```
push/PR -> [1. Lint] -> [2. Test] -> [3. Security Scan] -> [4. Build] -> Deploy
```

## Branching Strategy

| Branch | Trigger | Deployment |
|--------|---------|------------|
| feature/* | PR → develop | CI checks only |
| develop | push | Staging (auto) |
| main | push | Production (auto) |

## Quality Gates

Every code change passes these checks before CI succeeds:

1. **ESLint** - 0 errors, 0 warnings
2. **Prettier** - Formatting check passes
3. **TypeScript** - `tsc --noEmit` passes
4. **Unit Tests** - Vitest tests pass (target: 60% coverage)
5. **Integration Tests** - API tests against real PostgreSQL
6. **Security** - `npm audit` (no high/critical), no hardcoded secrets
7. **Build** - Project builds without errors

## Environment Configuration

### Required Environment Variables

```bash
# .env.staging
DATABASE_URL=postgres://user:pass@staging-db:5432/slack_ai
JWT_SECRET=<staging-secret>
NODE_ENV=staging
PORT=3000

# .env.production
DATABASE_URL=postgres://user:pass@prod-db:5432/slack_ai
JWT_SECRET=<production-secret>
NODE_ENV=production
PORT=3000
```

### GitHub Secrets Required

- `STAGING_DEPLOY_KEY` - SSH key for staging server
- `PRODUCTION_DEPLOY_KEY` - SSH key for production server
- `STAGING_DB_URL` - Staging database connection string
- `PRODUCTION_DB_URL` - Production database connection string

## Deployment Runbook

### Staging Deployment (develop branch)

1. GitHub Actions automatically triggers on push to develop
2. Pipeline runs: lint -> test -> security -> build
3. On success, Docker image is built and pushed to registry
4. Staging server pulls new image and restarts
5. Health check verifies `/api/health` returns 200
6. Database migrations are applied automatically

### Production Deployment (main branch)

1. PR from develop → main, reviewed and merged
2. GitHub Actions automatically triggers on push to main
3. Pipeline runs: lint -> test -> security -> build
4. On success, blue-green deployment:
   - New version deploys to green slot
   - Health checks run against green
   - Traffic switches from blue to green
   - Old version kept for 15 min rollback window

### Rollback Procedure

1. If health checks fail post-deployment, automatic rollback triggers
2. Manual rollback: `git revert HEAD` and push to trigger redeploy of previous version
3. Database rollback: migration scripts include down() methods

## Monitoring Setup

### Health Check Endpoints

- `GET /api/health` - Basic health (liveness)
- `GET /api/health/ready` - Readiness check (database connection, dependencies)

### Application Metrics (PM2)

```bash
pm2 start ecosystem.config.js
pm2 monit          # Real-time monitoring
pm2 logs           # Aggregated logs
pm2 logs --json    # Machine-readable logs for aggregation
```

### Alerting

Critical alerts fire when:
- Health check fails (2 consecutive failures)
- Error rate exceeds 5% over 5 minutes
- Memory usage exceeds 80%
- CPU usage exceeds 90% for 10 minutes

## Incident Response

1. **Detect**: Monitoring alerts or user reports
2. **Assess**: Check `GET /api/health/ready`, review PM2 logs
3. **Contain**: If needed, scale down or switch to previous deployment
4. **Fix**: Apply hotfix or rollback
5. **Verify**: Run smoke tests, confirm health checks pass
6. **Document**: Post-incident report in project folder
