# Prefight - Deployment

> Note: This version allow multiple instances of the app to be deployed on the same VM.

## Get started

- Make `.env` from `.env.example` (Make necessary changes.)
- Take care of `./_entrypoint/init.sh`
  - Windows: Make sure that you save with LF option.
  - Mac: `chmod +x ./\_entrypoint/init.sh`
- `docker compose up -d --force-recreate`
