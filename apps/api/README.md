# @toposonics/api

Fastify API for TopoSonics with Supabase-backed authentication and Postgres persistence.

## What It Does

- Exposes health and status endpoints
- Validates Supabase access tokens
- Stores private user compositions
- Enforces ownership for composition reads/writes

## Development

```bash
pnpm dev
```

Other useful commands:

```bash
pnpm build
pnpm start
pnpm typecheck
```

## Environment

Create `apps/api/.env` from the example file:

```bash
cp apps/api/.env.example apps/api/.env
```

## Endpoints

### Health

- `GET /health`
- `GET /health/detailed`

### Auth

- `POST /auth/login`

```json
{
  "accessToken": "<supabase-access-token>"
}
```

### Compositions

All composition routes require `Authorization: Bearer <accessToken>`.

- `GET /compositions` lists the authenticated user's private compositions
- `GET /compositions/:id` returns one owned composition
- `POST /compositions` creates a composition for the authenticated user
- `PUT /compositions/:id` updates an owned composition
- `DELETE /compositions/:id` deletes an owned composition

Example payload:

```json
{
  "title": "My Composition",
  "description": "Generated from mountain image",
  "noteEvents": [],
  "mappingMode": "LINEAR_LANDSCAPE",
  "key": "C",
  "scale": "C_MAJOR",
  "presetId": "sine-soft",
  "tempo": 90
}
```

## Product Contract

- There is no public gallery route in this API pass.
- Composition storage is private-only in v1.
- Public/demo discovery is handled by static client-side demos, not anonymous composition API access.

## Validation

```bash
pnpm --filter @toposonics/api typecheck
```

## License

MIT
