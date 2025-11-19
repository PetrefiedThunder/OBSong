/**
 * In-memory data store for compositions
 * In production, this would be replaced with a database (PostgreSQL + Prisma)
 */

import type { Composition } from '@toposonics/types';

/**
 * In-memory composition storage
 */
class CompositionStore {
  private compositions: Map<string, Composition> = new Map();

  /**
   * Get all compositions, optionally filtered by user ID
   */
  async findAll(userId?: string): Promise<Composition[]> {
    const all = Array.from(this.compositions.values());

    if (userId) {
      return all.filter((c) => c.userId === userId);
    }

    return all;
  }

  /**
   * Get a composition by ID
   */
  async findById(id: string): Promise<Composition | null> {
    return this.compositions.get(id) || null;
  }

  /**
   * Create a new composition
   */
  async create(data: Omit<Composition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Composition> {
    const { nanoid } = await import('nanoid');
    const now = new Date();

    const composition: Composition = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    this.compositions.set(composition.id, composition);
    return composition;
  }

  /**
   * Update a composition
   */
  async update(
    id: string,
    data: Partial<Omit<Composition, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Composition | null> {
    const existing = this.compositions.get(id);

    if (!existing) {
      return null;
    }

    const updated: Composition = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.compositions.set(id, updated);
    return updated;
  }

  /**
   * Delete a composition
   */
  async delete(id: string): Promise<boolean> {
    return this.compositions.delete(id);
  }

  /**
   * Get count of compositions
   */
  async count(userId?: string): Promise<number> {
    if (userId) {
      const filtered = await this.findAll(userId);
      return filtered.length;
    }
    return this.compositions.size;
  }

  /**
   * Clear all compositions (for testing)
   */
  async clear(): Promise<void> {
    this.compositions.clear();
  }

  /**
   * Seed with sample data
   */
  async seed(): Promise<void> {
    // Create a few sample compositions for development
    const sampleCompositions = [
      {
        userId: 'user-demo',
        title: 'Mountain Sunrise',
        description: 'A peaceful composition generated from a mountain landscape',
        noteEvents: [],
        mappingMode: 'LINEAR_LANDSCAPE' as const,
        key: 'C' as const,
        scale: 'C_MAJOR' as const,
        presetId: 'sine-soft',
        tempo: 90,
      },
      {
        userId: 'user-demo',
        title: 'City Skyline at Night',
        description: 'Urban soundscape from city lights',
        noteEvents: [],
        mappingMode: 'LINEAR_LANDSCAPE' as const,
        key: 'A' as const,
        scale: 'A_MINOR' as const,
        presetId: 'square-bright',
        tempo: 120,
      },
    ];

    for (const data of sampleCompositions) {
      await this.create(data);
    }

    console.log(`Seeded ${sampleCompositions.length} sample compositions`);
  }
}

// Export singleton instance
export const compositionStore = new CompositionStore();
