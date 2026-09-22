# How to deploy (In development enviroment)
Init:
- `pnpm i`
- `pnpm build`
- `pnpm --filter @planify/api db:generate`
- `pnpm --filter @planify/api db:migrate`

Run these in seperate terminals:
- `pnpm dev:web`
- `pnpm dev:api`
- `docker compose up`
- `ollama run gpt-oss:20b`
- `ollama run qwen3:8b`