# OBSong Copilot Agents

This directory contains custom GitHub Copilot Agents, each representing a specialized role within the OBSong monorepo. Select the appropriate agent in Copilot Chat to receive domain-aware assistance!

## Available Agents

### 1. The OBSong Architect
**Role:** Project Lead & Monorepo Guardian  
**Scope:**  
- High-level architecture
- Monorepo and dependency management
- Stack-wide features and integration

### 2. The Soundscaper
**Role:** Audio Engineer & Music Theorist  
**Scope:**  
- Audio DSP, Tone.js, and musical mapping
- Logic in `packages/core-audio`
- Bridging visual <-> audio features

### 3. The Pixel Alchemist
**Role:** Image Processing Specialist  
**Scope:**  
- Pixel analysis and performance
- Algorithms in `packages/core-image`
- Cross-platform image data pipelines

### 4. The Cross-Platform Stylist
**Role:** UI/UX Designer & Frontend Developer  
**Scope:**  
- Shared UI components (React, React Native)
- Styling and design systems (`theme.ts`, Tailwind)
- Responsive and accessible experiences

### 5. The Supabase Sentinel
**Role:** Backend & Database Engineer  
**Scope:**  
- API (Fastify), database (Supabase), authentication
- Schema changes, backend performance, and security

## How to Use

1. Browse `.github/copilot-agents/` for each agent's JSON configuration.
2. Each agent is selectable in the GitHub Copilot Chat sidebar—pick the one that fits your current task for tailored guidance.
3. The agents use strict monorepo-specific guidelines and are deeply familiar with the OBSong folder structure and tech stack.

> _New to the repo? Check each agent's `system_prompt` for their domain-specific best practices!_

---
