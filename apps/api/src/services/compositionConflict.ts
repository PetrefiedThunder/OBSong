export class CompositionConflictError extends Error {
  constructor() {
    super('Composition changed during update. Please retry.');
    this.name = 'CompositionConflictError';
  }
}
