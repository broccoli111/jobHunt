# AGENTS.md

Guidance for AI agents working in the **jobHunt** repository.

## Repository status

This is a **greenfield / skeleton** repository. As of the initial commit, it contains only `README.md` with the project title. There is no application source code, dependency manifests, Docker configuration, CI, or service definitions yet.

## Product intent

**jobHunt** — inferred from the repository name; likely a job-search or job-tracking product. No functional requirements or stack choices are documented in the repo yet.

## Services

| Service | Required | Notes |
|---------|----------|-------|
| *(none)* | — | No services are defined. Nothing to start until the application is scaffolded. |

## Standard commands

Not applicable until a stack is chosen and dependency files are added (e.g. `package.json`, `requirements.txt`, `docker-compose.yml`).

When those exist, document lint, test, build, and dev-server commands here and in `README.md`.

## Cursor Cloud specific instructions

- **No runnable application yet.** Lint, test, build, and dev-server commands do not exist. Agents should scaffold the chosen stack or wait for application code before attempting end-to-end runs.
- **No dependency install step** is required on VM startup until manifests are added; the update script is a no-op (`true`).
- **VM tooling available:** Node.js (v22), npm, pnpm, Python 3.12, and git are installed and usable for future scaffolding.
- **Git:** Single branch `main`; remote `origin` points to `github.com/broccoli111/jobHunt`.
- When adding a stack, update this file with: required services, env vars, dev start command, and replace the update script with the real install command (e.g. `npm install`, `pnpm install`).
