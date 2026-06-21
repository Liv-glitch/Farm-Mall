# Docker (development only)

These files (`Dockerfile`, `docker-compose.yml`, `.dockerignore`) are kept for **local development** convenience only. They are **not** used by the Namecheap cPanel deployment and should **not** be uploaded as deployment artifacts.

Note: `docker-compose.yml` may still reference the old PostgreSQL/Redis dev services. The production stack is MySQL with Redis disabled — see the root `DEPLOYMENT.md`. Update these compose services to MySQL if you want a local stack that mirrors production.

To use from the backend root, point Docker at this path, e.g.:

```bash
docker compose -f deploy/docker/docker-compose.yml up
```
