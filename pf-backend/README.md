# Setup

- Make sure that you already have DB running from `pf-db` project.
- Make `.env` from `.env.example` (fillin the password)
- Make `.npmrc` from `.npmrc.example` (adjust your shell accordingly)
- `pnpm install`
- `pnpm run dev`

# Setup from scratch

- See https://cmu.to/fullstack68

# Containerization and test

- Make `.env.test` from `.env.test.example`
- `docker compose --env-file ./.env.test up -d --force-recreate --build`

# Push to dockerhub

- `docker tag preflight-backend [DOCKERHUB_ACCOUNT]/preflight-backend:latest`
- `docker push [DOCKERHUB_ACCOUNT]/preflight-backend:latest`
