# Architecture

## Product slice

Folio supports a complete document workflow: select a fictional identity, create or import a document, format and save it, grant another profile editing access, and reopen persisted work. One Node.js process uses SQLite on a persistent hosted volume; production authentication and real-time editing remain outside scope.

## Request and data flow

```text
React dashboard / Tiptap editor / native share dialog
                     |
             Next.js route handlers
                     |
      session + origin + validation checks
                     |
           document service (Drizzle)
                     |
           persistent SQLite database file
```

Server Components read initial document data directly through the same service used by API routes. Interactive components handle editing and display recoverable errors. Database/session modules are marked server-only. Session-dependent pages render dynamically and API responses are private/no-store. Profile changes refresh server-rendered data; document links disable prefetching.

`db/schema.ts` describes users, documents, and grants. `db/migrations/0001_initial.sql` creates foreign keys, indexes, JSON validity/title constraints, and a unique document/user share key. Migration application uses SQLite `user_version` inside a transaction. The seed inserts known fictional identities and a sample document without overwriting existing work.

The database file sits outside `.next`, so restarts and rebuilds preserve it. WAL mode, foreign-key enforcement, and a bounded busy timeout support normal single-instance use. Reads/writes use parameterized ORM queries. Database credentials or external storage services are unnecessary.

## Access model

A signed, HTTP-only, SameSite cookie identifies a selectable seeded profile for seven days. HMAC signatures use a generated server-side secret and constant-time comparison. Mutations require a matching Origin. Cookies work over local HTTP; HTTPS enables the Secure flag.

All authorized users can edit document content. Only owners can rename, list grants, or grant access. Unshared users receive 404 for document reads/updates; authorized recipients attempting owner-only actions receive 403. Duplicate grants succeed idempotently. Client-provided identity is never trusted as authentication; an optional expected-user header detects an editor whose session changed in another tab.

Selecting any demo identity is intentionally allowed. These access checks demonstrate permission logic, not production identity assurance.

## Content and import

Tiptap JSON is the canonical stored format. The server validates the supported nodes, marks, attributes, depth, and node count, then checks the editor schema. This preserves formatting without storing arbitrary HTML. Imported text becomes literal text nodes, so markup is not executed. The API bounds streamed requests before parsing and validates file extension, UTF-8, binary/null content, and size. Only the resulting document is stored; there is no attachment/blob subsystem.

## Save protocol

The editor keeps the newest local snapshot and a monotonically increasing local revision. A single in-flight save loop submits snapshots sequentially, coalescing later edits. Saved is shown only when the latest local revision is acknowledged. Title and body share this queue.

Every request carries the last acknowledged database version. The service updates with `WHERE id = ? AND version = ?`, increments the version, and checks the result inside a transaction. A competing save produces 409. The editor retains the draft, pauses automatic saving, and offers text copying plus a confirmed reload. Failed network saves also retain local content and expose Retry. No silent last-write-wins or automatic merging is used.

Navigation controls wait for saves and remain on the editor when saving fails. Browser unload warns for dirty work. The application does not promise to save during tab closure or work offline.

## Verification and tradeoffs

Database-backed integration tests verify access, grants, persistence, stale writes, malformed content, and imports. Playwright runs the actual production app with an isolated local database. Separate contexts model different users; intentional request failures and delays exercise recovery and ordering. A second owned process verifies restart persistence. Core tests run on three browser engines; accessibility checks supplement keyboard and narrow-viewport checks.

Native `<dialog>` supplies focus trapping and Escape dismissal without a component-framework dependency. Local/system fonts and bundled icons avoid runtime network dependencies. The interface uses a deliberately small set of components rather than a general design-system framework.

The application is designed for a single Node.js instance and moderately sized documents. Future work would add real authentication, per-user durable draft recovery, role management/revocation, operational logging, and collaborative editing with an explicit merging protocol. File-format conversion and export should follow core reliability improvements.

## Hosted runtime

The Docker runtime uses a persistent `/data` volume and validates its public `APP_ORIGIN`, database path and signing secret before starting. Migration and idempotent seed operations run after the volume is mounted. `/api/health` verifies database readiness. The configured public origin makes mutation validation and Secure cookies work through an HTTPS reverse proxy. A dedicated E2E scenario verifies initialization, origin rejection, Secure/HTTP-only cookies, grants, and restart persistence. Local setup retains its original behavior. See `DEPLOYMENT.md` for configuration and the single-instance boundary.
