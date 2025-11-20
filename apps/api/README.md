# @toposonics/api

Fastify-based backend API for TopoSonics with Supabase-backed authentication and Postgres persistence.

## Features

- **Health checks**: `/health` and `/health/detailed`
- **JWT authentication**: Validates Supabase access tokens and surfaces user profile data
- **Composition CRUD**: Create, read, update, delete compositions stored in Postgres
- **Persistent storage**: Supabase Postgres table `compositions` (JSON payload per row)
- **CORS support**: Configurable cross-origin access
- **Type-safe**: Full TypeScript with shared types

## Development

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck
```

## API Endpoints

### Health

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information

### Authentication (Supabase)

- `POST /auth/login` - Validate an existing Supabase access token and return the associated user
  ```json
  {
    "accessToken": "<supabase-access-token>"
  }
  ```

### Compositions

All composition endpoints require `Authorization: Bearer <accessToken>` using a valid Supabase access token for the authenticated user.

- `GET /compositions` - List all compositions (filtered by user if authenticated)
- `GET /compositions/:id` - Get specific composition
- `POST /compositions` - Create new composition (requires auth)
  ```json
  {
    "title": "My Composition",
    "description": "Generated from mountain image",
    "noteEvents": [...],
    "mappingMode": "LINEAR_LANDSCAPE",
    "key": "C",
    "scale": "C_MAJOR",
    "presetId": "sine-soft",
    "tempo": 90
  }
  ```
- `PUT /compositions/:id` - Update composition (requires auth + ownership)
- `DELETE /compositions/:id` - Delete composition (requires auth + ownership)

## Environment Variables

See `.env.example` for configuration options.

## Authentication Flow

Supabase issues JWT access tokens to clients. The API validates these tokens using the Supabase Admin client, returning the hydrated `User` payload and attaching the user ID to downstream requests:

1. Client authenticates with Supabase (email/password, OAuth, or magic link) and receives an access token.
2. Client POSTs the access token to `/auth/login` to validate and receive a normalized payload.
3. Authenticated requests include `Authorization: Bearer <accessToken>`.
4. The API verifies the token with Supabase and attaches `request.user` for route handlers.

## Data Persistence

Compositions are stored in Supabase Postgres using the `compositions` table. Each row contains a JSON payload of the full composition alongside metadata fields for ownership and timestamps. The service uses the Supabase service role key to perform CRUD operations securely on behalf of authenticated users.

## Future Enhancements

- [ ] Optional Auth0/Clerk adapters
- [ ] File upload for images
- [ ] Image storage (S3, Cloudinary)
- [ ] Rate limiting
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Composition sharing/public galleries
- [ ] Analytics and usage tracking
- [ ] WebSocket support for real-time collaboration

## Testing

```bash
# Run tests (when implemented)
pnpm test

# Manual testing with curl
curl http://localhost:3001/health

# Validate an existing Supabase access token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"<supabase-access-token>"}'

# Create composition (use a real Supabase token from your client session)
curl -X POST http://localhost:3001/compositions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-access-token>" \
  -d '{"title":"Test","noteEvents":[],"mappingMode":"LINEAR_LANDSCAPE","key":"C","scale":"C_MAJOR"}'
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure environment variables
3. Set up database connection
4. Enable real authentication
5. Configure CORS for your domain
6. Set up monitoring (Datadog, New Relic, etc.)
7. Enable HTTPS/TLS
8. Set up rate limiting and DDoS protection

## License

MIT
