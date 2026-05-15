# Phase 5 — Swarm Orchestration Plan

**Started:** 2026-05-14
**Branch:** `phase-5-swarm` (worktree at `C:\Users\kolto\Desktop\Claude\FlowADE-app-swarm`)
**Source branch:** `feature/glasshouse-tokens` @ `887bd06` (Phase 4m baseline)
**Goal:** Add multi-agent swarm orchestration to FlowADE — natural-language invocation, N+1 topology (orchestrator auto-added), file-lease + contract-first cohesion, end-of-run summary to user pane.

---

## Topology

```
PAGE (16 panes hard cap)
└─ Team A: 👤 User → spawns 👑 Orch + 🤖 W1 ... 🤖 Wn   (n = user-specified, 1 orchestrator auto-added)
└─ Team B: ... (up to 4 teams concurrent, capacity permitting)
```

**Caps:**
- `maxConcurrentSwarmsPerPage` = 4 (default), 1-4 slider
- `maxWorkersPerSwarm` = 8 default, 1-14 hard cap, soft-warn >4
- Total panes per page = 16 hard
- One swarm per user pane; further `/swarm`-equivalents queue
- `requirePlanConfirm` = ON (orchestrator pauses for user yes/no after planning)

---

## Invocation

**No slash command.** User-pane agent maps natural prose → `flowade_swarm_start` MCP call.

Example utterances → tool calls in `mcp-server/prompts/user_pane.md` (Stage 12).

Rule: user says N → tool called with `workerCount: N` → tool internally spawns N+1 panes (orch + N workers). NEVER double-add the +1.

---

## Cohesion mechanics (hard + soft)

| Layer | Mechanism | Strength |
|---|---|---|
| Hard | File-lease registry (global, cross-run aware) | Two workers cannot write the same file |
| Hard | Plan-time `expectedFiles` overlap check (orchestrator must declare upfront) | Plan rejected if any two subtasks share files |
| Hard | Contract-first commits (stubs land BEFORE workers spawn) | Type/signature drift eliminated |
| Hard | Dependency graph dispatch in topological waves (only when deps exist) | Order violations prevented |
| Hard | Parallelism floor ≥0.75 (largest wave / total workers) | Plan rejected if too serial — protects "5 agents working as 1" failure |
| Soft | Shared channel — kind=intent/progress/blocker/diff/done/review-fail | Workers see siblings' work in flight |
| Soft | Orchestrator pre-merge review per worker diff (contract + dedupe + sibling-conflict scan) | Catches semantic drift |
| Soft | Re-plan budget = 1 per run | One mid-run correction if blockers indicate drift |
| Soft | Rate-limit detection in worker prompt | Pause + retry after window, surface to user |

---

## MCP tool surface (additive — zero edits to existing 9 tools)

| # | Tool | Purpose |
|---|---|---|
| 1 | `flowade_swarm_start` | Spawn orch + N workers, return runId + IDs |
| 2 | `flowade_swarm_finish` | Mark run done, post summary to user pane |
| 3 | `flowade_swarm_confirm` | User yes/no decision relay |
| 4 | `flowade_swarm_cancel` | Tear down team, release leases, summary |
| 5 | `flowade_swarm_post` | Append to channel |
| 6 | `flowade_swarm_read` | Tail channel with filters |
| 7 | `flowade_claim_file` | Acquire write lease (returns conflict + runId on collision) |
| 8 | `flowade_release_file` | Release lease |
| 9 | `flowade_list_leases` | Snapshot leases (path / runId filters) |
| 10 | `flowade_validate_plan` | Plan-time overlap + parallelism-floor check |
| 11 | `flowade_spawn_terminal` | Low-level pane spawn (used internally) |
| 12 | `flowade_list_terminals` | Pane snapshot (filters: workspace, ownerType, state) |
| 13 | `flowade_send_to_terminal` | Write text to pane PTY |
| 14 | `flowade_read_terminal` | Tail PTY output (token-paginated) |
| 15 | `flowade_wait_terminal` | Long-poll until state transition |
| 16 | `flowade_kill_terminal` | Terminate pane |

---

## Auth + cost model

Each pane is a real `claude` CLI process. Inherits whatever auth the user logged Claude Code in with — Pro/Max subscription or API key. FlowADE does not proxy inference. User-parity guaranteed.

Internal automation (memory categorization, embeddings) keeps using `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` from keychain — untouched by swarm.

---

## Stage table

Each stage: build → unit/sanity check → `npx vite build` smoke → commit on green → next.

| # | Stage | Status | Gate | Last good commit |
|---|---|---|---|---|
| 1 | Pre-flight (commit 4m, worktree, baseline) | ✓ DONE | `887bd06` Phase 4m pushed. vite build green 2.92s. Worktree created. | `887bd06` |
| 2 | Pane registry + ring buffer (`electron/paneRegistry.js`) | ✓ DONE | vite build green 2.38s; node --check passes; ESM module; not yet wired into ptyManager | `f74531f` |
| 3 | WS bridge server + auth token (`electron/swarmBridge.js`) | pending | App boots with toggle OFF (no bridge); toggle ON writes port file + keytar token | — |
| 4 | MCP swarm client (`mcp-server/swarmClient.js`) | pending | Existing MCP tools still respond when bridge down; client surfaces "swarm unavailable" cleanly | — |
| 5 | MCP terminal tools (6) (`mcp-server/tools/terminal.js`) | pending | CLI: spawn → list → send → read → wait → kill round-trip green | — |
| 6 | File-lease registry + claim/release/list/validate_plan | pending | Claim/conflict/release unit script green; overlap plan rejected | — |
| 7 | Swarm channel + post/read + migration 009 | pending | Post → read round-trip green; realtime fires | — |
| 8 | Audit + migration 010 | pending | Spawn writes audit row visible in Swarm/Audit category | — |
| 9 | swarm_start / _finish / _confirm / _cancel | pending | CLI: start spawns N+1 panes with correct teamId + ownerType; cancel tears down clean | — |
| 10 | Orchestrator prompt template | pending | Dry-run produces valid plan JSON with parallelism factor ≥0.75 | — |
| 11 | Worker prompt template | pending | Dry-run claims + releases + posts channel events in order | — |
| 12 | User-pane agent prompt snippet | pending | Dry-run: prose 'launch 3 agents to X' produces correct swarm_start call (workerCount=3) | — |
| 13 | Frontend badges + tints + Reclaim | pending | Existing panes unchanged; spawned panes show correct badge + tint | — |
| 13b | Settings toggle + caps + SwarmOverlay | pending | Toggle OFF = bridge dead = swarm_start clean error | — |
| 14 | End-to-end DRY smoke (no real worker code) | pending | flowade_swarm_start spawns 3 panes (1 orch + 2 workers), channel receives kind=plan post, cancel tears down, audit rows present | — |

---

## Stop conditions (loop halts → silent)

- `npx vite build` red after any stage
- Two consecutive build/test reds on same stage
- Bridge or MCP startup error not recovered in 3 retries
- Total wall time > 6h from first tick
- Stage 14 smoke fails
- User-pane / orchestrator / worker prompt validation fails

On halt: append reason + last-good commit + recent stderr to `## Halt log` section below. Push branch. Stop.

---

## Halt log

_(empty — append on halt)_

---

## Operator notes (after run)

- Worktree path: `C:\Users\kolto\Desktop\Claude\FlowADE-app-swarm`
- Branch: `phase-5-swarm` (off `feature/glasshouse-tokens` @ `887bd06`)
- Resume: `cd FlowADE-app-swarm && git log --oneline` to see progress, `cat SWARM_PLAN.md` to see current stage status
- If green through Stage 14: PR `phase-5-swarm` → `main` opened automatically (gh authed)
- Halt: branch pushed, PR NOT opened, see Halt log above
