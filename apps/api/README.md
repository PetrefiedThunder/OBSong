# @toposonics/api

Fastify-based backend API for TopoSonics.

## Features

- **Health checks**: `/health` and `/health/detailed`
- **Stub authentication**: Email-based login with fake tokens
- **Composition CRUD**: Create, read, update, delete compositions
- **In-memory storage**: Development-friendly (replace with database for production)
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

### Authentication (Stub)

- `POST /auth/login` - Login with email, get fake token
  ```json
  {
    "email": "user@example.com"
  }
  ```

### Compositions

All composition endpoints require `Authorization: Bearer <token>` header (except GET endpoints which work with optional auth).

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

This is a **stub implementation** for development:

1. Client POSTs to `/auth/login` with email
2. Server returns fake token and user object
3. Client includes token in `Authorization: Bearer <token>` header
4. Server validates token and extracts user ID

**For production**, replace with:
- Auth0, Clerk, or similar service
- JWT-based authentication
- Proper password hashing and security
- OAuth/social login

## Data Persistence

Currently uses **in-memory storage** (Map).

**For production**, integrate a database:

### Option 1: Prisma + PostgreSQL

```bash
pnpm add prisma @prisma/client
npx prisma init
```

Create schema in `prisma/schema.prisma`:

```prisma
model Composition {
  id          String   @id @default(uuid())
  userId      String
  title       String
  description String?
  noteEvents  Json
  mappingMode String
  key         String
  scale       String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Option 2: MongoDB

```bash
pnpm add mongodb
```

### Option 3: Supabase

```bash
pnpm add @supabase/supabase-js
```

## Future Enhancements

- [ ] Database integration (Prisma recommended)
- [ ] Real authentication (Auth0, Clerk)
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

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Create composition (use token from login)
curl -X POST http://localhost:3001/compositions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-<your-token>" \
  -d '{"title":"Test","noteEvents":[],"mappingMode":"LINEAR_LANDSCAPE","key":"C","scale":"C_MAJOR","userId":"user-demo"}'
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
