# Contributing to TopoSonics

Thank you for your interest in contributing to TopoSonics!

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/toposonics.git
   cd toposonics
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build packages**

   ```bash
   pnpm build
   ```

4. **Start development**

   ```bash
   # Terminal 1: API
   pnpm dev:api

   # Terminal 2: Web
   pnpm dev:web

   # Terminal 3 (optional): Mobile
   pnpm dev:mobile
   ```

## Project Structure

```
toposonics/
├── apps/
│   ├── web/          # Next.js web app
│   ├── mobile/       # Expo mobile app
│   └── api/          # Fastify backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── core-image/   # Image analysis
│   ├── core-audio/   # Audio mapping
│   └── ui/           # Shared UI components
└── [config files]
```

## Making Changes

### Branching Strategy

- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes
- `docs/*` - documentation

### Commit Messages

Follow conventional commits:

- `feat: add depth-ridge mapping mode`
- `fix: resolve Tone.js initialization race condition`
- `docs: update API documentation`
- `refactor: simplify brightness calculation`
- `test: add unit tests for scale generation`

### Code Style

- **TypeScript**: Strict mode, no `any`
- **Formatting**: Prettier (run `pnpm format`)
- **Linting**: ESLint (run `pnpm lint`)
- **Naming**: camelCase for variables, PascalCase for components

### Testing

Before submitting a PR:

1. Run type checking: `pnpm typecheck`
2. Run linting: `pnpm lint`
3. Format code: `pnpm format`
4. Test manually (see TESTING.md)

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write clean, documented code
   - Follow existing patterns
   - Add comments for complex logic

3. **Test your changes**

   - Verify all affected apps still work
   - Run relevant tests from TESTING.md
   - No console errors

4. **Commit and push**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create pull request**

   - Describe what changed and why
   - Reference any related issues
   - Include screenshots if UI changes
   - Request review

6. **Address feedback**

   - Respond to review comments
   - Make requested changes
   - Push updates

7. **Merge**

   - Squash and merge when approved
   - Delete branch after merge

## Areas for Contribution

### High Priority

- [ ] Complete DEPTH_RIDGE mapping implementation
- [ ] Add unit tests for core packages
- [ ] Implement real authentication
- [ ] Add database persistence (Prisma)
- [ ] Complete mobile pixel extraction

### Medium Priority

- [ ] More sound presets
- [ ] MIDI export functionality
- [ ] Advanced visualization options
- [ ] User account system
- [ ] Composition sharing

### Documentation

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Tutorial videos
- [ ] Architecture diagrams
- [ ] Component documentation

### Good First Issues

- [ ] Add more musical scales
- [ ] Improve error messages
- [ ] Add loading states
- [ ] Improve mobile UI
- [ ] Add more presets

## Package-Specific Guidelines

### @toposonics/core-image

- Must remain environment-agnostic (no DOM/browser APIs)
- Pure functions only
- Well-documented algorithms
- Performance-focused

### @toposonics/core-audio

- Musical accuracy is critical
- Document scale/mode theory
- Provide usage examples
- Test with real images

### apps/web

- Responsive design
- Accessibility (WCAG 2.1 AA)
- Performance (Lighthouse score >90)
- Cross-browser compatible

### apps/mobile

- Follow React Native best practices
- Test on both iOS and Android
- Handle permissions gracefully
- Offline-capable where possible

## Questions?

- Open an issue for bugs
- Discussions for feature ideas
- Email: dev@toposonics.com (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to TopoSonics! 🎵
