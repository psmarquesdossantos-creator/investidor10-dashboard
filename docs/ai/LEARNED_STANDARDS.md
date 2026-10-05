# Learned Standards from Previous Projects

Extracted from three operational manuals to ensure continuity, evidence, and safety in agent-driven development.

## 1. IDENTITY GATE (From Playbook de Desenvolvimento com Agentes de IA)
**Before any write operation, execute:**
- Confirm directory, Git root, remote, branch, HEAD, origin/main, worktree and staging
- If identity fails, STOP writes and report HUMAN_BLOCKER_WRONG_PROJECT
- Never use reset, stash, clean or branch switching to "correct" identity issues

## 2. REPOSITORY AS CANONICAL MEMORY (From Manual de Projeto Autossuficiente)
**The repository (not chat history) must contain:**
- AGENTS.md: Operational constitution
- PROJECT_STATE.md: Current phase, branch, head, blockers
- PROJECT_MEMORY.md: Durable rules between sessions (architecture, decisions, limits)
- DECISIONS.md: Durable decisions with context and consequences
- ROADMAP.md: Priorities and dependencies
- Essential files must be versioned and verifiable
- A new agent must be able to continue work without chat history

## 3. SOURCE OF TRUTH HIERARCHY (From Guia Operacional de Agentes para Projetos Web)
**When resolving divergences, follow this order:**
1. Authoritative raw data/source
2. Current production/business contract
3. Persisted schema
4. Implementation
5. Tests
6. Browser/runtime evidence
7. Documentation
8. Agent report
9. Chat history
**Never treat:**
- Chat history as source of truth
- Coherent arithmetic as proof without semantic verification
- Screenshots as logic proof (separate appearance from semantics)
- Global CSS overrides that break other components