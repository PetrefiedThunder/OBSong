# @toposonics/shared

Shared utilities for TopoSonics applications. This package contains common code that is used across multiple apps (web, mobile, API) to reduce duplication and maintain consistency.

## Contents

- **API Client**: Unified API request handling with authentication support
- Additional shared utilities as needed

## Usage

```typescript
import { createApiClient } from '@toposonics/shared';

const apiClient = createApiClient({
  baseUrl: 'http://localhost:3001',
});

const compositions = await apiClient.fetchCompositions(token);
```

## Architecture

This package follows the TopoSonics architecture principles:
- Environment-agnostic (works in browser, React Native, and Node.js)
- Pure TypeScript with no runtime-specific dependencies
- Type-safe interfaces from `@toposonics/types`
