# Planify

An app that helps you break down ambitious plans into manageable tasks so you can make steady progress every day.

## Overview

Planify helps users organize tasks, prioritize their time, and stay on track by turning ambitious goals into manageable daily tasks. It features:

- **Goal-to-plan generation** - AI-assisted planning that breaks down goals into structured schedules
- **Interactive timeline** - View and manage tasks across your schedule
- **Task guides** - Detailed guides for completing tasks with step-by-step instructions
- **AI chat assistant** - Context-aware assistant for planning help and schedule modifications
- **Server-side database** - Plans and user data stored in database


## Architecture

The project is split into 4 parts
- `apps/web` - Frontend
- `apps/api` - Backend
- **Ollama** - Generation
- **PostgresSQL** - Database

### Frontend
- **[Next.js 16](https://nextjs.org/)** - App Router with React 19
- **[Tailwind CSS v4](https://tailwindcss.com/)** - CSS-first configuration with OKLCH theme tokens (because of shadcn/ui initiation)
- **[shadcn/ui](https://ui.shadcn.com/)** - UI Components library
- **[Better Auth](https://www.better-auth.com/)** - Authentication
- **[Zod](https://zod.dev/)** - Schema validation

### Shared Packages
- **`@planify/schemas`** - Zod schemas (same schemas used in both frontend and backend)
- **`@planify/types`** - TypeScript types derived from schemas via `z.infer`

### Backend
- **[Hono](https://hono.dev/)** - Fast, lightweight web framework (Express but "lighter")
- **[Better Auth](https://www.better-auth.com/)** - Authentication (served from API)
- **[Drizzle ORM](https://orm.drizzle.team/)** - SQL ORM (Postgres)
- **[Zod](https://zod.dev/)** - Request/response validation

### Generation
- **[Ollama](https://ollama.com/)** - Local LLM runtime for AI features

### Database
- **[Docker Compose](https://docs.docker.com/compose/)** - Used to compose Postgres in a container
- **[PostgreSQL](https://www.postgresql.org/)** - Database

### Monorepo Structure
```
planify/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Hono backend (port 3001)
└── packages/
    ├── schemas/      # Shared Zod schemas (@planify/schemas)
    └── types/        # Shared TypeScript types (@planify/types)
```


## Initilization

### Prerequisites
- [Node.js](https://nodejs.org/) (latest version recommended)
- [pnpm](https://pnpm.io/) package manager (similar to npm)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Ollama](https://ollama.com/)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file from the example `.env.example` (PORT variable is not required)

### 3. Set Up Database

```bash
pnpm --filter @planify/api db:generate
pnpm --filter @planify/api db:migrate
```

### 4. Pull Required Ollama Models

```bash
ollama run gpt-oss:20b
ollama run qwen3:8b
```

### 5. Start Services

Run these in separate terminals:

```bash
# Start infrastructure (Postgres, etc.)
docker compose up

# Start API server
pnpm dev:api

# Build web frontend
pnpm build

# Run the web frontend
pnpm start
```

The app will be available at:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001

## Development Commands

### Run All Services

```bash
# Run both web and API
pnpm dev
```

### Run Individual Services

```bash
pnpm dev:web  # Next.js frontend only
pnpm dev:api  # Hono API only
```

### Code Quality

```bash
pnpm run typecheck  # Type check all 4 projects
pnpm run lint       # Lint all projects
pnpm run format     # Format code with Prettier
```

### Per-Project Commands

```bash
pnpm --filter @planify/web <script>
pnpm --filter @planify/api <script>
```