# DockMore project overview

## 1. What DockMore is

DockMore is a web platform and developer CLI intended to bring cloud file management and code project continuity into one product.

The cloud workspace is designed to connect a user's supported cloud accounts in one place. Users can browse, search, upload, create folders, download, rename, move, delete, and transfer files between connected accounts. The intended provider set is Google Drive, OneDrive, MEGA, and Dropbox.

The developer workflow extends the same platform to local code projects. A developer chooses a connected cloud account as the project's backup destination, initializes the project with `dockmore initialize`, and controls scheduled whole-project syncing with `dockmore watch` and `dockmore pause`. The intended interval choices are five or ten minutes. Saved project code should be accessible and downloadable through the web app.

Code delivery is intended to work from both the CLI and web app: prepare a Git diff, run an agentic AI code review, show findings and suggested fixes, then push to GitHub after the developer reviews and approves. Human approval is part of the design.

### Short product statement

**DockMore is one workspace for cloud files, cross-cloud transfers, scheduled project backups, and reviewed code delivery.**

## 2. Current implementation versus product direction

This distinction matters when presenting DockMore or planning implementation work.

| Area | In the current repository | Intended product direction |
|---|---|---|
| Cloud providers | Google Drive backend provider | Google Drive, OneDrive, MEGA, and Dropbox |
| Cloud file operations | Google Drive account and file listing, sync, upload, folders, download, rename/update, move, delete, share, and transfers between connected Drive accounts | Unified CRUD and seamless transfers across supported providers |
| Media | Web app media library for photos, videos, and audio; in-app viewer and controls | Media browsing across supported cloud providers |
| Project initialization | `dockmore initialize` registers a project and creates a local shadow Git repository | Also associate the project with a selected connected cloud backup account |
| Project watcher | Timed local shadow-Git snapshots; current default is 15 minutes and CLI accepts 10–30 minutes | Sync the whole project to its chosen cloud account every 5 or 10 minutes |
| Project data in web app | Snapshot and project metadata is stored in the backend; full project contents are not uploaded as a cloud backup | Access and download the full synced project from the web app |
| Watch controls | CLI supports `watch`, `pause`, and `resume`; website controls call the local CLI bridge | Keep the sync state controllable from both CLI and web app |
| Push | CLI and web UI can prepare a review and request a confirmed push through local CLI controls; stale changes require a fresh review | Push to GitHub from CLI or web after an agentic AI review and developer approval |
| AI | Optional Groq diff warnings and commit message suggestions; deterministic checks also flag possible credentials and merge markers | Agentic reviewer analyzes code context, prioritizes findings, proposes fixes/tests, then re-reviews after developer-approved changes |
| Deployment | No public deployment is configured in this repository | Deploy web app/API and configure production database, auth, OAuth, and provider credentials |

**Do not present planned behavior as already working.** Provider integrations beyond Google Drive, cross-provider file transfers, full project-content cloud backup/download, five-minute sync, and the complete agentic review gate need implementation before they can be described as available features.

## 3. Product goals and user value

### Cloud file workspace

- Reduce the need to switch between separate cloud provider applications.
- Provide one place to find and manage files from connected accounts.
- Support common file operations: create/upload, read/browse/download, update/rename/move, and delete.
- Transfer a file directly from a source cloud account to a destination account, including across providers when both integrations are available.
- Provide a media area to find and open supported photos, videos, and audio inside DockMore.

### Developer project continuity

- Associate a local project with the user's DockMore identity and a chosen connected cloud account.
- Start or pause scheduled project sync using familiar commands.
- Sync the whole project at the developer-selected interval and make the backup accessible in the web app.
- Allow downloading a saved project copy from the web app.
- Track project snapshots locally as a separate recovery/history mechanism.

### Reviewed code delivery

- Start a GitHub push from the CLI or the web app.
- Review the exact proposed diff, changed files, branch, remote, and warnings.
- Use an agentic AI reviewer to explain risks and suggest fixes or tests.
- Require developer approval before committing and pushing.
- If code changes after review, repeat the review before push.

## 4. Web application

The frontend is a React single-page app built with Vite. React Router handles page navigation; Tailwind CSS provides utility styling; Framer Motion and GSAP are used for interface motion.

### Main areas

- **Home:** storage and account overview, recent folders/files, and entry points into files and transfers.
- **All Files:** browse accounts and folders; search, sort, and change grid/list views; perform file actions and bulk operations.
- **Media:** filter photos, videos, and audio; search media; open content in DockMore's media viewer.
- **Transfers:** view transfer records and create or cancel transfers between available accounts.
- **Code:** view tracked projects, snapshot history, watcher status, and the review/push interface.
- **Cloud Accounts:** connect, sync, reconnect, or disconnect cloud accounts.
- **Settings:** account and application preferences.
- **Sign in / Sign up:** user authentication through Supabase Auth.
- **CLI Auth:** browser approval flow used to sign the CLI into the user's DockMore account.

### Frontend integration

The frontend API client reads `VITE_API_BASE_URL` and obtains the current Supabase access token for authenticated API requests. Supabase frontend configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Website code actions that touch local project files require the DockMore CLI bridge on the developer's computer. The bridge listens on loopback (`127.0.0.1:45771`) and checks the browser origin and user identity. A hosted web app cannot directly read a developer's local project when the local bridge/CLI is unavailable.

## 5. Backend and data

The backend is a Node.js/Express API. PostgreSQL is accessed through Knex migrations. The project is configured to use Supabase Postgres and Supabase Auth.

### API areas

- **Health:** API health and database connectivity checks.
- **Google OAuth:** start the connection flow and handle its callback.
- **Accounts and files:** list accounts, sync account files, list/browse files, upload, download content, create folders, update file metadata, delete, and share.
- **Transfers:** list transfer records, create a transfer, and remove a transfer record.
- **Media:** issue short-lived media source tokens and serve authorized content.
- **Code projects:** create/list/update/remove tracked projects, record snapshot metadata and commits, report watcher heartbeat, and coordinate local watch/pause/push actions.
- **CLI authentication:** start/poll/claim browser login sessions, issue or refresh CLI credentials, report identity, and revoke credentials.
- **AI assistance:** generate a commit message and run the focused diff warning review when Groq is configured.

### Main database entities

- `users`: DockMore user records linked to authentication.
- `cloud_accounts`: provider, account identity, encrypted OAuth tokens, status, scopes, and sync timestamps.
- `files_cache`: provider file IDs and file metadata for connected accounts.
- `transfers`: source and destination accounts, filename, status, progress, and timestamps.
- `code_projects`: project metadata, local path, selected backup account field, snapshot interval, watch status, and recent commit/snapshot information.
- `snapshots`: snapshot metadata such as time and number of changed files. In the current implementation, the repository contents themselves remain in the local shadow Git repository.
- CLI session and credential tables: browser login handoff and separately managed CLI credentials.
- Google OAuth state table: short-lived state/nonce records for OAuth request validation.

## 6. CLI and code workflow

The CLI is a Node.js package with Git operations and file watching. Its current commands include:

| Command | Purpose in the current implementation |
|---|---|
| `dockmore login` | Authenticate the CLI using the browser flow |
| `dockmore logout` | Revoke the CLI credential |
| `dockmore status` | Check CLI login state |
| `dockmore -accounts` | List connected cloud accounts |
| `dockmore initialize` | Register the current project and create its local shadow Git repository |
| `dockmore watch --interval <minutes>` | Run the background local snapshot watcher; current allowed interval is 10–30 minutes, default 15 |
| `dockmore pause` / `dockmore resume` | Stop or restart the watcher |
| `dockmore gitpush` | Review local changes, request confirmation, commit, and push to a configured Git remote |
| `dockmore gitpush --dry-run` | Preview a proposed push without committing or pushing |
| `dockmore gitpush-retry` | Retry a pending push/metadata update |
| `dockmore snapshots list` | List local snapshot history |
| `dockmore snapshots restore <hash> --output <dir>` | Restore a selected local snapshot into an output directory |
| `dockmore projects` | List linked projects |
| `dockmore untrack`, `relink`, `repair` | Manage or repair the local/backend project association |
| `dockmore doctor` | Check CLI environment and project health |
| `dockmore bridge` | Start local website controls for the current computer |

### Current snapshot and push safeguards

- The watcher creates commits in a separate local shadow Git repository using the project folder as its work tree.
- Snapshot metadata is posted to the backend; an outbox supports retry when the API is unavailable.
- Push review uses a temporary Git index to include the proposed working changes without rewriting the user's real index during review.
- Review reports the branch, remote, changed files, diff, and warnings.
- The local scanner checks added lines for patterns that may contain credentials and flags unresolved merge markers. Binary content cannot be scanned for credentials.
- A review identifier is recomputed before the push; if the project diff or index changed, the operation requires a fresh review.
- The developer confirms before commit and push. A failed remote push can be retried.
- The website's code controls invoke local CLI actions through the loopback bridge; Git operations remain on the developer's machine.

## 7. AI code review

### Available AI assistance

When Groq is configured, the current backend can:

- Review diff chunks for possible hard-coded secrets, debug statements, and unresolved TODO/FIXME/HACK/XXX markers.
- Suggest a Git commit message from a diff.
- Return concise warnings for the developer to consider.

The CLI asks the developer before sending the diff to the external AI provider. This is optional assistance, not a fully autonomous coding agent. The static scanner and model output cannot guarantee that all vulnerabilities or secrets will be found.

### Intended agentic review flow

1. Read the proposed diff and relevant surrounding files.
2. Identify and rank potential security, correctness, and reliability issues.
3. Explain each finding with file and line context.
4. Suggest a fix and relevant tests.
5. Wait for developer approval before applying any change.
6. Review the updated diff again.
7. Present the final review and require explicit developer approval before the GitHub push.

The full agentic workflow is a product goal unless and until implemented. It must not silently modify or push code.

## 8. Cloud provider strategy

### Intended provider scope

- Google Drive
- Microsoft OneDrive
- MEGA
- Dropbox

DockMore's long-term aim is to normalize provider-specific files and operations behind a shared account/file model. Each provider needs its own authorization, token lifecycle, API adapter, error handling, permissions, and transfer behavior.

### Current provider support

The backend provider registry currently contains Google Drive. The app includes provider-oriented UI assets, but an icon is not evidence of a functioning integration. OneDrive, MEGA, and Dropbox must be treated as planned until their backend adapters and workflows are implemented.

Cross-provider transfer requires both a working source adapter and destination adapter. A transfer should preserve file names and content, report progress/failure, and handle provider limits and revoked credentials. Current transfer capability is limited to supported Google Drive accounts.

## 9. Security and reliability considerations

- Browser/API access is authenticated through Supabase Auth bearer tokens.
- Google OAuth state and nonce values protect the callback flow.
- Cloud provider access and refresh tokens are encrypted at rest using an AES-256-GCM key configured outside source control.
- The CLI uses separate credentials; Windows credential storage is protected with DPAPI. Credential storage behavior differs on other operating systems.
- The backend enforces user ownership for account and project records.
- The local bridge binds to loopback and validates the caller origin and authenticated DockMore user.
- OAuth credentials can expire or be revoked; reconnect is required when refresh is no longer possible.
- Full-project cloud syncing will need clear exclusion rules, secret handling, encryption in transit/at rest, retries, integrity checks, and safe restore behavior.
- AI review should be opt-in with a clear disclosure of which code is sent to the configured provider.
- Keep explicit human approval before applying AI suggestions or pushing code.

## 10. Technology summary

| Component | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Tailwind CSS |
| Animation and interaction | Framer Motion, GSAP |
| Backend | Node.js, Express |
| Database | PostgreSQL, Knex, Supabase Postgres |
| User authentication | Supabase Auth |
| Current cloud API | Google OAuth, Google Drive API |
| CLI | Node.js, Commander, Chokidar, simple-git |
| Optional AI | Groq SDK |

OneDrive, MEGA, Dropbox, and the full agentic AI orchestration technology should only be added to the “implemented stack” after they are selected and built.

## 11. Local development setup

The repository has separate root frontend, `server/`, and `cli/` packages. Configure values locally; never commit secrets.

### Frontend

1. Install root dependencies with `npm install`.
2. Configure `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in the local frontend environment.
3. Run `npm run dev` from the repository root.

### Backend

1. Install backend dependencies from `server/` with `npm install`.
2. Copy `server/.env.example` to a local `server/.env` and provide database, Supabase, Google OAuth, token encryption, and allowed frontend URL settings.
3. Run database migrations from `server/` with `npm run migrate`.
4. Start the API with `npm run dev` from `server/`.

### CLI

1. Install CLI dependencies from `cli/` with `npm install`.
2. Configure `DOCKMORE_API_URL` to use a non-local API if required; the current default is `http://localhost:5000`.
3. Use the CLI's login flow, then run commands from the project directory being linked.

## 12. Repository map

```text
src/                         React frontend, pages, components, contexts, API clients
  pages/                     Home, Files, Media, Transfers, Code, Accounts, Settings, Auth
  components/                Shared layout and UI components
  context/                   Auth, files, accounts, transfers, code projects, toast state
  api/                       Frontend API modules
server/src/
  index.js                   Express app, middleware, route registration
  routes/                    Auth, accounts/files, transfers, media, code projects, CLI, health
  providers/                 CloudProvider abstraction and Google Drive adapter
  auth/                      Token encryption, refresh, and CLI/media auth utilities
  db/                        Knex configuration, connection, and migrations
  agents/                    Optional code review and commit message AI helpers
cli/src/
  cli.js                     Command registration and CLI help
  commands/                  Login, initialize, watch, push, snapshots, repair, diagnostics
  daemon.js                  Background local snapshot watcher and metadata outbox
  bridge.js                  Local website-to-CLI action bridge
```

## 13. Product milestones

1. **Cloud hub:** finish and validate CRUD operations for each provider; add account connection/reconnection for OneDrive, MEGA, and Dropbox.
2. **Cross-cloud transfer:** stream file content from source to destination, show progress, retry safely, and handle quotas and provider-specific limits.
3. **Project backup account selection:** make `dockmore initialize` associate the project with a connected account chosen in the web app.
4. **Whole-project sync:** upload project contents on the chosen 5- or 10-minute schedule, provide watch/pause controls from CLI and web, and ensure retries do not lose local state.
5. **Web restore/download:** browse available project backups and download a complete, verified copy.
6. **Agentic code review:** review code context, produce cited findings and suggestions, support developer-approved fixes, re-review, and only then permit push from either surface.
7. **Production deployment:** deploy API and web app, configure production database migrations, OAuth callback URLs, CORS, secrets, observability, and end-to-end validation.

## 14. One-paragraph pitch

DockMore is designed to bring supported cloud accounts into one platform for file access, everyday file operations, and cross-cloud transfers. It also gives developers a continuous path from local work to cloud backup: choose a connected account, initialize the project, and control scheduled full-project sync with `dockmore watch` and `dockmore pause`. The web app makes the saved code accessible and downloadable. For delivery, developers can start a GitHub push from CLI or web, review an agentic AI report, and approve the push themselves. Google Drive and the CLI snapshot foundation exist today; additional cloud providers, full project-content backup, and the full agentic review gate remain implementation milestones.
