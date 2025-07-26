# Preflight Frontend

## Setup

- `pnpm install`
- `npm run dev`

## Note

- Add "DOM" in "lib" in `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "lib": ["ES2023", "DOM"]
  }
}
```

# Containerization and test

- Make `.env.test` from `.env.test.example`
- `docker compose --env-file ./.env.test up -d --force-recreate --build`

# Push to dockerhub

- `docker tag preflight-frontend [DOCKERHUB_ACCOUNT]/preflight-frontend:latest`
- `docker push [DOCKERHUB_ACCOUNT]/preflight-frontend:latest`
