import { randomUUID } from 'crypto';
import { paneRegistry } from './paneRegistry.js';
import { leaseRegistry } from './leaseRegistry.js';
import { swarmChannel } from './swarmChannel.js';
import {
  auditSpawn,
  auditKill,
  auditCancel,
  auditConfirm,
  recordRunStart,
  recordRunFinish,
} from './swarmAudit.js';

const TEAM_LETTERS = ['A', 'B', 'C', 'D'];
const MAX_PANES_PER_WORKSPACE = 16;

const runs = new Map();

function pickTeamId(workspace) {
  const orchestrators = paneRegistry.list({ workspace, ownerType: 'orchestrator' });
  const used = new Set();
  for (const rec of orchestrators) {
    if (rec.teamId) used.add(rec.teamId);
  }
  for (const letter of TEAM_LETTERS) {
    if (!used.has(letter)) return letter;
  }
  throw new Error('All 4 teams in use for this workspace');
}

function checkCapacity({ workspace, workerCount }) {
  const panesInUse = paneRegistry.list({ workspace }).length;
  const need = workerCount + 1;
  if (panesInUse + need > MAX_PANES_PER_WORKSPACE) {
    throw new Error(`not enough free panes: need ${need}, have ${MAX_PANES_PER_WORKSPACE - panesInUse}`);
  }
}

function requirePty(ptyManager) {
  if (!ptyManager) throw new Error('ptyManager not wired');
  return ptyManager;
}

function paneIdFromSpawn(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && result.id) return result.id;
  return null;
}

async function spawnPane(ptyManager, { provider, workspace, sessionName, ownerType, teamId, spawnedBy }) {
  const res = await ptyManager.spawn({ provider, workspace, sessionName });
  const paneId = paneIdFromSpawn(res);
  if (!paneId) throw new Error('ptyManager.spawn did not return a pane id');
  paneRegistry.register(paneId, { provider, sessionName, workspace, ownerType, teamId, spawnedBy });
  return paneId;
}

async function start(params, { ptyManager }) {
  const pty = requirePty(ptyManager);
  const task = params && params.task;
  const workerCount = params && params.workerCount;
  const workspace = params && params.workspace;
  const provider = (params && params.provider) || 'claude';
  const userTerminalId = (params && params.userTerminalId) || null;

  checkCapacity({ workspace, workerCount });
  const chosenTeamId = (params && params.teamId) || pickTeamId(workspace);
  const runId = randomUUID();
  const startedAt = new Date().toISOString();

  const orchestratorTerminalId = await spawnPane(pty, {
    provider,
    workspace,
    sessionName: 'orch',
    ownerType: 'orchestrator',
    teamId: chosenTeamId,
    spawnedBy: userTerminalId,
  });
  await auditSpawn({
    runId,
    terminalId: orchestratorTerminalId,
    ownerType: 'orchestrator',
    teamId: chosenTeamId,
    provider,
    workspace,
    sessionName: 'orch',
    spawnedBy: userTerminalId,
  });

  const workerTerminalIds = [];
  for (let i = 1; i <= workerCount; i++) {
    const sessionName = `W${i}`;
    const wid = await spawnPane(pty, {
      provider,
      workspace,
      sessionName,
      ownerType: 'agent',
      teamId: chosenTeamId,
      spawnedBy: orchestratorTerminalId,
    });
    workerTerminalIds.push(wid);
    await auditSpawn({
      runId,
      terminalId: wid,
      ownerType: 'agent',
      teamId: chosenTeamId,
      provider,
      workspace,
      sessionName,
      spawnedBy: orchestratorTerminalId,
    });
  }

  runs.set(runId, {
    runId,
    teamId: chosenTeamId,
    task,
    workerCount,
    provider,
    workspace,
    orchestratorTerminalId,
    workerTerminalIds,
    userTerminalId,
    status: 'awaiting-confirm',
    startedAt,
  });

  await recordRunStart({
    runId,
    task,
    workerCount,
    teamId: chosenTeamId,
    orchestratorTerminalId,
    workerTerminalIds,
  });

  await swarmChannel.post({
    runId,
    workerId: 'system',
    kind: 'plan',
    payload: { task, workerCount, teamId: chosenTeamId, status: 'awaiting-confirm' },
  });

  return { runId, teamId: chosenTeamId, orchestratorTerminalId, workerTerminalIds };
}

async function confirm(params) {
  const runId = params && params.runId;
  const decision = params && params.decision;
  const notes = params && params.notes;
  const run = runs.get(runId);
  if (!run) throw new Error('unknown run');

  await auditConfirm({ runId, decision, by: 'user' });

  const kind = decision === 'cancel' ? 'cancel' : 'progress';
  await swarmChannel.post({
    runId,
    workerId: 'user',
    kind,
    payload: { confirm: decision, notes },
  });

  if (decision === 'cancel') {
    return cancel({ runId, reason: notes || 'user cancelled at plan' }, { ptyManager: null });
  }

  run.status = 'planning';
  return { ok: true };
}

async function cancel(params, { ptyManager }) {
  const runId = params && params.runId;
  const reason = params && params.reason;
  const run = runs.get(runId);
  if (!run) return { ok: true, missing: true };

  const killedTerminalIds = [];
  const terminals = [run.orchestratorTerminalId, ...run.workerTerminalIds].filter(Boolean);
  for (const terminalId of terminals) {
    try {
      if (ptyManager && typeof ptyManager.kill === 'function') {
        await ptyManager.kill(terminalId);
      }
      paneRegistry.unregister(terminalId);
      killedTerminalIds.push(terminalId);
      await auditKill({ runId, terminalId, reason: reason || 'cancelled' });
    } catch (_) {
      // continue
    }
  }

  const releaseRes = leaseRegistry.releaseAll({ runId }) || {};
  const releasedLeases = releaseRes.released || [];

  run.status = 'cancelled';
  const durationMs = Date.now() - new Date(run.startedAt).getTime();
  await recordRunFinish({
    runId,
    summary: 'cancelled: ' + (reason || ''),
    durationMs,
    status: 'cancelled',
  });
  await auditCancel({ runId, reason, by: 'system' });
  await swarmChannel.post({
    runId,
    workerId: 'system',
    kind: 'cancel',
    payload: { reason },
  });

  runs.delete(runId);
  return { ok: true, killedTerminalIds, releasedLeases };
}

async function finish(params, { ptyManager }) {
  const runId = params && params.runId;
  const summary = params && params.summary;
  const durationMs = params && params.durationMs;
  const run = runs.get(runId);
  if (!run) throw new Error('unknown run');

  await recordRunFinish({ runId, summary, durationMs, status: 'done' });
  await swarmChannel.post({
    runId,
    workerId: 'orchestrator',
    kind: 'finish',
    payload: { summary },
  });

  if (run.userTerminalId && ptyManager && typeof ptyManager.write === 'function') {
    try {
      await ptyManager.write(run.userTerminalId, '\n\n[swarm summary]\n' + summary + '\n');
    } catch (_) {
      // best effort
    }
  }

  run.status = 'done';
  runs.delete(runId);
  return { ok: true };
}

export function buildHandlers({ ptyManager } = {}) {
  return {
    'swarm.start':   async (p) => start(p, { ptyManager }),
    'swarm.confirm': async (p) => confirm(p),
    'swarm.cancel':  async (p) => cancel(p, { ptyManager }),
    'swarm.finish':  async (p) => finish(p, { ptyManager }),
  };
}

export function registerOrchestrationHandlers(bridge, deps) {
  const handlers = buildHandlers(deps);
  if (bridge && typeof bridge.registerMethod === 'function') {
    for (const [n, fn] of Object.entries(handlers)) bridge.registerMethod(n, fn);
  }
  return handlers;
}

export function _runsForTest() { return runs; }
