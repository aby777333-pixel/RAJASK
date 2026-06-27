<div align="center">
  <img src="logo.png" alt="RAJASK" width="140" />
  <h1>RAJASK™</h1>
  <p><strong>The AI CEO Operating System</strong> · Executive Command Center · Digital Chief of Staff</p>
</div>

---

RAJASK is the sovereign command center from which a founder, CEO, chairman, family
office, or multi-company operator runs their entire realm — admitting people into
their court, investing them with rights, commanding every channel of communication,
delegating and approving work, generating every report, and watching the live pulse
of the whole operation.

> The CEO never forgets, never misses, never loses visibility, and never becomes the bottleneck.

## Architecture

Turborepo monorepo on a single locked stack (Next.js 14 · Expo · Tauri · Supabase ·
LiveKit · Claude · Sarvam). The system is organized as a set of permission-gated
subsystems — **the Regalia** — composed under one shell.

```
rajask/
├─ apps/
│  ├─ web/            # Next.js 14 HQ + PWA          (active)
│  ├─ mobile/         # Expo (iOS / Android / Tablet) (stub — Phase 1+)
│  ├─ desktop/        # Tauri shell                   (stub — Phase 4)
│  └─ watch/          # Smartwatch companion          (stub — Phase 4)
├─ packages/
│  ├─ core/           # types, money (Decimal), result types, errors
│  ├─ db/             # schema, migrations, RLS, generated types
│  ├─ auth/           # COURT identity + permission resolver
│  ├─ ui/             # design system, regal theme tokens
│  └─ config/         # shared tsconfig, eslint, tailwind
└─ turbo.json
```

### Architectural law

1. **Money is never a float.** `Decimal.js` in app code, `NUMERIC` in Postgres.
2. **Default-deny RLS** on every table, written in the same migration as the table.
3. **Multi-tenant isolation** — every domain row carries `realm_id` (and `company_id` where relevant), enforced in RLS.
4. **Append-only audit** — every state-changing action writes an immutable audit event.
5. **Adapter pattern** for all external services.
6. **PII boundary** — member personal data and the CEO's PRIVY sphere are scoped tightly.
7. **Idempotency + signed webhooks** for every inbound integration.
8. **Offline-first mobile**, i18n from day one, WCAG 2.2 AA.
9. **India-first compliance** — DPDP Act 2023 alignment, data-residency option, audit-ready exports.

## Build status

| Phase | Scope | Status |
| ----- | ----- | ------ |
| **0** | Foundation: monorepo, core, DB+RLS, permission resolver, WARD baseline, THRONE shell | 🚧 in progress |
| 1 | People & Comms: COURT, COURIER, HERALD, ALMANAC | ⬜ |
| 2 | Execution: WRIT, SEAL, COUNCIL, VAULT, EDICT | ⬜ |
| 3 | Intelligence: CHANCERY, CHRONICLE, CODEX, TREASURY, VIZIER | ⬜ |
| 4 | Reach & Polish: REALM, CONDUIT, PRIVY, watch/voice, offline, i18n, compliance | ⬜ |

## Local development

```bash
pnpm install
pnpm dev          # all apps
pnpm --filter @rajask/web dev
pnpm typecheck
pnpm test
```

Requires Node ≥ 20 and pnpm. Copy `.env.example` → `.env.local` in `apps/web`.
