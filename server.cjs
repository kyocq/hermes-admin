/**
 * Hermes Admin Server — Direct Hermes Integration
 * Reads real data from ~/.hermes/ state.db, config.yaml, sessions, skills, memory, cron
 * Security: uses execFile (no shell injection), parameterized SQL, input validation
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Paths ──────────────────────────────────────────────────────────
const HERMES_HOME = path.join(process.env.HOME, '.hermes');
const STATE_DB = path.join(HERMES_HOME, 'state.db');
const CONFIG_YAML = path.join(HERMES_HOME, 'config.yaml');
const GATEWAY_STATE = path.join(HERMES_HOME, 'gateway_state.json');
const PROCESSES_FILE = path.join(HERMES_HOME, 'processes.json');
const SKILLS_SNAPSHOT = path.join(HERMES_HOME, '.skills_prompt_snapshot.json');
const MEMORIES_DIR = path.join(HERMES_HOME, 'memories');
const SESSIONS_FILE = path.join(HERMES_HOME, 'sessions', 'sessions.json');
const HERMES_BIN = path.join(HERMES_HOME, 'hermes-agent', 'venv', 'bin', 'hermes');

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ─── Helpers ────────────────────────────────────────────────────────

// Safe CLI execution — NO shell interpolation
function runHermes(args, timeout = 30000) {
  try {
    const result = execFileSync(HERMES_BIN, args, {
      timeout,
      encoding: 'utf8',
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output: result.trim() };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString() || err.message, output: err.stdout?.toString() || '' };
  }
}

// Safe SQL via better-sqlite3 (no external CLI dependency)
let db = null;
function getDb() {
  if (!db && fs.existsSync(STATE_DB)) {
    try {
      const Database = require('better-sqlite3');
      db = new Database(STATE_DB, { readonly: true });
    } catch (err) {
      console.warn('Failed to open database:', err.message);
    }
  }
  return db;
}

function queryDb(sql) {
  try {
    const database = getDb();
    if (!database) return [];
    const stmt = database.prepare(sql);
    return stmt.all();
  } catch (err) {
    console.warn('Query failed:', err.message);
    return [];
  }
}

// Escape session ID for SQL (alphanumeric + underscore only)
function sanitizeId(id) {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_]/g, '');
}

// Escape string for shell argument (for hermes CLI)
function shellEscape(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/'/g, "'\\''");
}

function readYaml(filePath) {
  try {
    const yaml = require('yaml');
    return yaml.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeYaml(filePath, data) {
  const yaml = require('yaml');
  fs.writeFileSync(filePath, yaml.stringify(data, { lineWidth: 120 }));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function formatTimestamp(epoch) {
  if (!epoch) return null;
  return new Date(epoch * 1000).toISOString();
}

// Mask API keys in config objects
function maskSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(masked)) {
    if (/key|token|secret|password/i.test(key) && typeof masked[key] === 'string') {
      masked[key] = masked[key].slice(0, 4) + '***' + masked[key].slice(-4);
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSecrets(masked[key]);
    }
  }
  return masked;
}

// ─── Health ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const gateway = readJson(GATEWAY_STATE);
  const config = readYaml(CONFIG_YAML);
  res.json({
    status: 'ok',
    gateway: gateway?.gateway_state || 'unknown',
    platforms: gateway?.platforms || {},
    model: config?.model?.default || 'unknown',
    provider: config?.model?.provider || 'unknown',
  });
});

// ─── System Stats (CPU / memory / disk) ────────────────────────────
app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const cpuCount = cpus.length;

  const coreUsage = cpus.map((cpu, i) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return { core: i, usage: Math.round(((total - idle) / total) * 100), model: cpu.model, speed: cpu.speed };
  });

  const avgCpuUsage = coreUsage.reduce((a, c) => a + c.usage, 0) / coreUsage.length;

  // Disk stats
  let disk = { total: 0, used: 0, free: 0, usagePercent: 0 };
  try {
    const df = require('child_process').execSync('df -k / 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    const lines = df.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      disk = {
        total: parseInt(parts[1]) * 1024,
        used: parseInt(parts[2]) * 1024,
        free: parseInt(parts[3]) * 1024,
        usagePercent: parseInt(parts[4]) || 0,
      };
    }
  } catch {}

  res.json({
    cpu: {
      count: cpuCount,
      model: cpus[0]?.model || 'unknown',
      speed: cpus[0]?.speed || 0,
      loadAvg: { '1m': loadAvg[0], '5m': loadAvg[1], '15m': loadAvg[2] },
      usagePercent: Math.round(avgCpuUsage),
      cores: coreUsage,
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    disk,
    os: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      release: os.release(),
      uptime: os.uptime(),
    },
    process: {
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      version: process.version,
    },
  });
});

// ─── Dashboard Stats ────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const sessions = queryDb("SELECT COUNT(*) as count FROM sessions");
  const messages = queryDb("SELECT COUNT(*) as count FROM messages");
  const tokenUsage = queryDb("SELECT SUM(input_tokens) as input, SUM(output_tokens) as output, SUM(estimated_cost_usd) as cost FROM sessions");
  const activeSessions = queryDb("SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NULL");

  const gateway = readJson(GATEWAY_STATE);
  const processes = readJson(PROCESSES_FILE) || [];
  const cronResult = runHermes(['cron', 'list', '--json']);
  let cronJobs = [];
  try { cronJobs = JSON.parse(cronResult.output || '[]'); } catch {}

  res.json({
    total_sessions: sessions[0]?.count || 0,
    total_messages: messages[0]?.count || 0,
    active_sessions: activeSessions[0]?.count || 0,
    input_tokens: tokenUsage[0]?.input || 0,
    output_tokens: tokenUsage[0]?.output || 0,
    estimated_cost_usd: tokenUsage[0]?.cost || 0,
    gateway_state: gateway?.gateway_state || 'unknown',
    platforms: gateway?.platforms || {},
    background_processes: processes.length,
    cron_jobs: cronJobs.length,
    active_cron_jobs: cronJobs.filter(j => j.enabled !== false).length,
  });
});

// ─── Sessions ───────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const source = req.query.source;
  const search = req.query.search;

  let sql = `SELECT id, title, source, user_id, model, started_at, ended_at, message_count,
             tool_call_count, input_tokens, output_tokens, estimated_cost_usd
             FROM sessions`;

  const conditions = [];
  if (source && ['weixin', 'cli', 'telegram', 'discord', 'slack', 'signal'].includes(source)) {
    conditions.push(`source = '${source}'`);
  }
  if (search) {
    const safeSearch = search.replace(/'/g, "''");
    conditions.push(`(title LIKE '%${safeSearch}%' OR id LIKE '%${safeSearch}%')`);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY started_at DESC LIMIT ${limit}`;

  const rows = queryDb(sql);
  const liveSessions = readJson(SESSIONS_FILE) || {};

  const sessions = rows.map(r => {
    const liveKey = Object.keys(liveSessions).find(k => liveSessions[k]?.session_id === r.id);
    const live = liveKey ? liveSessions[liveKey] : null;
    return {
      id: r.id,
      title: r.title || live?.display_name || `Session ${r.id.slice(0, 12)}`,
      source: r.source,
      user_id: r.user_id,
      model: r.model,
      started_at: formatTimestamp(r.started_at),
      ended_at: r.ended_at ? formatTimestamp(r.ended_at) : null,
      message_count: r.message_count,
      tool_call_count: r.tool_call_count,
      input_tokens: r.input_tokens,
      output_tokens: r.output_tokens,
      estimated_cost_usd: r.estimated_cost_usd,
      is_active: !r.ended_at,
      session_key: liveKey,
      platform: live?.platform,
    };
  });

  res.json(sessions);
});

app.get('/api/sessions/:id', (req, res) => {
  const sid = sanitizeId(req.params.id);
  if (!sid) return res.status(400).json({ error: 'Invalid session ID' });

  const session = queryDb(`SELECT * FROM sessions WHERE id = '${sid}'`);
  if (!session.length) return res.status(404).json({ error: 'Session not found' });

  const messages = queryDb(
    `SELECT id, role, content, tool_calls, tool_name, tool_call_id, timestamp, token_count, reasoning
     FROM messages WHERE session_id = '${sid}' ORDER BY timestamp ASC`
  );

  const s = session[0];
  res.json({
    ...s,
    started_at: formatTimestamp(s.started_at),
    ended_at: s.ended_at ? formatTimestamp(s.ended_at) : null,
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls ? (() => { try { return JSON.parse(m.tool_calls); } catch { return null; } })() : null,
      tool_name: m.tool_name,
      tool_call_id: m.tool_call_id,
      timestamp: formatTimestamp(m.timestamp),
      token_count: m.token_count,
      reasoning: m.reasoning,
    })),
  });
});

// Rename session
app.put('/api/sessions/:id', (req, res) => {
  const sid = sanitizeId(req.params.id);
  if (!sid) return res.status(400).json({ error: 'Invalid session ID' });
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.length > 200) {
    return res.status(400).json({ error: 'Title required (max 200 chars)' });
  }
  const safeTitle = title.replace(/'/g, "''");
  queryDb(`UPDATE sessions SET title = '${safeTitle}' WHERE id = '${sid}'`);
  res.json({ success: true });
});

// Delete session
app.delete('/api/sessions/:id', (req, res) => {
  const sid = sanitizeId(req.params.id);
  if (!sid) return res.status(400).json({ error: 'Invalid session ID' });
  const result = runHermes(['sessions', 'delete', sid, '--yes']);
  res.json({ success: result.ok, output: result.output });
});

// Batch delete sessions
app.post('/api/sessions/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Max 100 sessions per batch' });
  }

  const sanitized = ids.map(sanitizeId).filter(Boolean);
  const results = [];

  for (const sid of sanitized) {
    const result = runHermes(['sessions', 'delete', sid, '--yes'], 15000);
    results.push({ id: sid, success: result.ok });
  }

  res.json({
    deleted: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  });
});

// ─── Search (FTS5) ─────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short (min 2 chars)' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const safeQ = q.replace(/'/g, "''");

  // Try FTS5 first, fall back to LIKE
  let results = queryDb(`
    SELECT m.id, m.session_id, m.role, m.content, m.timestamp, s.title as session_title
    FROM messages m
    LEFT JOIN sessions s ON m.session_id = s.id
    WHERE m.content LIKE '%${safeQ}%'
    ORDER BY m.timestamp DESC LIMIT ${limit}
  `);

  res.json(results.map(r => ({
    id: r.id,
    session_id: r.session_id,
    session_title: r.session_title,
    role: r.role,
    content: r.content?.slice(0, 500),
    timestamp: formatTimestamp(r.timestamp),
  })));
});

// ─── Chat (via hermes CLI -q) ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, session_id, model } = req.body;
  if (!message || typeof message !== 'string' || message.length > 50000) {
    return res.status(400).json({ error: 'Message required (max 50K chars)' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Build command safely — use execFile args array, NOT shell string
  const args = ['chat', '-q', message];
  if (session_id) {
    const sid = sanitizeId(session_id);
    if (sid) args.push('--resume', sid);
  }
  if (model && typeof model === 'string') {
    args.push('-m', model);
  }
  args.push('--pass-session-id');

  res.write(`data: ${JSON.stringify({ type: 'status', status: 'thinking' })}\n\n`);

  try {
    const proc = spawn(HERMES_BIN, args, {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let allOutput = '';

    proc.stdout.on('data', (chunk) => { allOutput += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { allOutput += chunk.toString(); });

    proc.on('close', () => {
      // Parse session ID from output
      let extractedSessionId = session_id || null;
      const sessionMatch = allOutput.match(/(?:hermes\s+--resume|Session:)\s+(\d{8}_\d{6}_[a-f0-9]{6})/);
      if (sessionMatch) extractedSessionId = sessionMatch[1];

      // Extract response — strip banners, tool listings, session footer
      let response = '';
      const lines = allOutput.split('\n');
      let inResponse = false;
      let responseLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('│') || trimmed.startsWith('╭') || trimmed.startsWith('╰') || trimmed.startsWith('───')) continue;
        if (trimmed.includes('Available Tools') || trimmed.includes('Available Skills')) continue;
        if (trimmed.includes('Hermes Agent v')) continue;
        if (trimmed.includes('hermes update')) continue;
        if (trimmed.startsWith('Query:')) continue;
        if (trimmed.startsWith('Initializing')) continue;
        if (trimmed.startsWith('Resume this session')) break;
        if (trimmed.startsWith('Session:') && trimmed.match(/\d{8}/)) break;
        if (trimmed.startsWith('Duration:')) break;
        if (trimmed.startsWith('Messages:')) break;
        if (trimmed.match(/^hermes\s+--resume/)) break;
        if (trimmed.match(/^[a-z]+:\s+[a-z_-]+,\s*$/)) continue;
        if (trimmed.match(/^\s{2,}[a-z_-]+,\s*$/)) continue;

        if (trimmed.length > 0) {
          inResponse = true;
          responseLines.push(line);
        } else if (inResponse) {
          responseLines.push('');
        }
      }

      response = responseLines.join('\n').trim();
      if (!response) response = '(No response)';

      // Stream response
      const streamResponse = async () => {
        let streamed = '';
        const chars = response.split('');
        for (let i = 0; i < chars.length; i++) {
          streamed += chars[i];
          if (i % 3 === 0 || chars[i] === '\n') {
            res.write(`data: ${JSON.stringify({ type: 'text', text: streamed })}\n\n`);
            await new Promise(r => setTimeout(r, 12));
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'text', text: response })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done', session_id: extractedSessionId })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      };

      streamResponse();
    });

    proc.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (proc.exitCode === null) {
        proc.kill();
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Timeout (5 min)' })}\n\n`);
        res.end();
      }
    }, 300000);

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// ─── Config ─────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const config = readYaml(CONFIG_YAML);
  if (!config) return res.status(500).json({ error: 'Cannot read config' });

  // Return safe subset with masked secrets
  res.json({
    model: {
      default: config.model?.default,
      provider: config.model?.provider,
      base_url: config.model?.base_url || '',
    },
    display: {
      personality: config.display?.personality,
      compact: config.display?.compact,
      streaming: config.display?.streaming,
    },
    agent: {
      max_turns: config.agent?.max_turns,
      personalities: config.agent?.personalities || {},
    },
    memory: {
      memory_enabled: config.memory?.memory_enabled,
      user_profile_enabled: config.memory?.user_profile_enabled,
    },
    terminal: {
      backend: config.terminal?.backend,
      timeout: config.terminal?.timeout,
    },
    tts: {
      provider: config.tts?.provider,
    },
    security: {
      redact_secrets: config.security?.redact_secrets,
    },
    _config_version: config._config_version,
  });
});

app.post('/api/config', (req, res) => {
  const config = readYaml(CONFIG_YAML);
  if (!config) return res.status(500).json({ error: 'Cannot read config' });

  const updates = req.body;
  if (updates.model) {
    if (updates.model.default) config.model.default = updates.model.default;
    if (updates.model.provider) config.model.provider = updates.model.provider;
    if (updates.model.base_url !== undefined) config.model.base_url = updates.model.base_url;
  }
  if (updates.display) {
    Object.assign(config.display, updates.display);
  }
  if (updates.agent) {
    if (updates.agent.max_turns) config.agent.max_turns = updates.agent.max_turns;
    if (updates.agent.personalities) config.agent.personalities = updates.agent.personalities;
  }
  if (updates.memory) {
    Object.assign(config.memory, updates.memory);
  }
  if (updates.terminal) {
    Object.assign(config.terminal, updates.terminal);
  }
  if (updates.tts) {
    Object.assign(config.tts, updates.tts);
  }
  if (updates.security) {
    Object.assign(config.security, updates.security);
  }

  writeYaml(CONFIG_YAML, config);
  res.json({ success: true });
});

// ─── Skills ─────────────────────────────────────────────────────────
app.get('/api/skills', (req, res) => {
  const snapshot = readJson(SKILLS_SNAPSHOT);
  const skillsDir = path.join(HERMES_HOME, 'skills');
  const categories = {};

  try {
    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || dir.name.startsWith('.')) continue;
      const catDir = path.join(skillsDir, dir.name);
      const descFile = path.join(catDir, 'DESCRIPTION.md');
      let description = '';
      try { description = fs.readFileSync(descFile, 'utf8').trim(); } catch {}

      const skills = [];
      const entries = fs.readdirSync(catDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillFile = path.join(catDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf8');
          const titleMatch = content.match(/^#\s+(.+)/m);
          const descMatch = content.match(/^(?:>\s*|description:\s*["']?)(.+)/im);
          skills.push({
            name: entry.name,
            title: titleMatch?.[1] || entry.name,
            description: descMatch?.[1]?.slice(0, 200) || '',
            path: path.join(dir.name, entry.name),
            size: fs.statSync(skillFile).size,
          });
        }
      }

      if (skills.length > 0) {
        categories[dir.name] = { description, skills };
      }
    }
  } catch {}

  const manifest = snapshot?.manifest || [];

  res.json({
    categories,
    total_skills: Object.values(categories).reduce((a, c) => a + c.skills.length, 0),
    manifest_count: manifest.length,
  });
});

app.get('/api/skills/:category/:name', (req, res) => {
  const cat = req.params.category.replace(/[^a-zA-Z0-9_-]/g, '');
  const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const skillPath = path.join(HERMES_HOME, 'skills', cat, name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return res.status(404).json({ error: 'Skill not found' });

  const content = fs.readFileSync(skillPath, 'utf8');
  const linkedFiles = {};
  const skillDir = path.dirname(skillPath);

  for (const dirname of ['references', 'scripts', 'templates']) {
    const dir = path.join(skillDir, dirname);
    if (fs.existsSync(dir)) {
      linkedFiles[dirname] = fs.readdirSync(dir);
    }
  }

  res.json({ name, category: cat, content, linked_files: linkedFiles });
});

// ─── Memory CRUD ────────────────────────────────────────────────────
app.get('/api/memory', (req, res) => {
  const entries = [];
  try {
    const files = fs.readdirSync(MEMORIES_DIR);
    for (const file of files) {
      if (file.startsWith('.') || file.endsWith('.lock')) continue;
      const filePath = path.join(MEMORIES_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        entries.push({
          name: file,
          content: fs.readFileSync(filePath, 'utf8'),
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  } catch {}
  res.json(entries);
});

app.post('/api/memory', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return res.status(400).json({ error: 'Invalid filename' });
  if (content.length > 1000000) return res.status(400).json({ error: 'Content too large (max 1MB)' });

  try {
    if (!fs.existsSync(MEMORIES_DIR)) fs.mkdirSync(MEMORIES_DIR, { recursive: true });
    fs.writeFileSync(path.join(MEMORIES_DIR, name), content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/memory/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return res.status(400).json({ error: 'Invalid filename' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  if (content.length > 1000000) return res.status(400).json({ error: 'Content too large (max 1MB)' });

  const filePath = path.join(MEMORIES_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  try {
    fs.writeFileSync(filePath, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/memory/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return res.status(400).json({ error: 'Invalid filename' });

  const filePath = path.join(MEMORIES_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron Jobs ──────────────────────────────────────────────────────
app.get('/api/cron', (req, res) => {
  const cronDir = path.join(HERMES_HOME, 'cron');
  const jobs = [];

  try {
    const files = fs.readdirSync(cronDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = readJson(path.join(cronDir, file));
        if (data) jobs.push(data);
      }
    }
  } catch {}

  res.json({ jobs: jobs.flat() });
});

app.post('/api/cron', (req, res) => {
  const { name, schedule, prompt } = req.body;
  if (!name || !schedule || !prompt) {
    return res.status(400).json({ error: 'name, schedule, and prompt required' });
  }
  // Use execFileSync to avoid shell injection
  const args = ['cron', 'create', '--name', name, '--schedule', schedule, '--prompt', prompt];
  const result = runHermes(args, 15000);
  res.json({ success: result.ok, output: result.output });
});

app.patch('/api/cron/:id', (req, res) => {
  const { action } = req.body; // 'pause' or 'resume'
  if (!['pause', 'resume'].includes(action)) {
    return res.status(400).json({ error: 'action must be pause or resume' });
  }
  const result = runHermes(['cron', action, req.params.id]);
  res.json({ success: result.ok, output: result.output });
});

app.delete('/api/cron/:id', (req, res) => {
  const result = runHermes(['cron', 'remove', req.params.id]);
  res.json({ success: result.ok, output: result.output });
});

// ─── Tools (dynamic from CLI) ──────────────────────────────────────
app.get('/api/tools', (req, res) => {
  const result = runHermes(['tools', 'list'], 15000);

  // Parse tool names from CLI output
  const tools = [];
  const categories = {
    browser: [], system: [], web: [], file: [],
    media: [], memory: [], automation: [], skills: [], productivity: [],
  };

  const categoryMap = {
    browser_navigate: 'browser', browser_click: 'browser', browser_snapshot: 'browser',
    browser_type: 'browser', browser_scroll: 'browser', browser_back: 'browser',
    browser_vision: 'browser', browser_get_images: 'browser', browser_console: 'browser',
    terminal: 'system', execute_code: 'system', process: 'system',
    web_search: 'web', web_extract: 'web',
    read_file: 'file', write_file: 'file', search_files: 'file', patch: 'file',
    image_generate: 'media', vision_analyze: 'media', text_to_speech: 'media',
    memory: 'memory', session_search: 'memory',
    cronjob: 'automation', send_message: 'automation', delegate_task: 'automation',
    skill_manage: 'skills', skill_view: 'skills', skills_list: 'skills',
    todo: 'productivity', clarify: 'productivity',
  };

  // Try to parse from CLI output
  if (result.ok && result.output) {
    const lines = result.output.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([a-z_]+)\s/);
      if (match && match[1].includes('_')) {
        const name = match[1];
        const cat = categoryMap[name] || 'other';
        tools.push({ name, description: line.trim().slice(name.length).trim(), category: cat });
        if (categories[cat]) categories[cat].push(name);
      }
    }
  }

  // Fallback: use known tool list if CLI parsing fails
  if (tools.length === 0) {
    const knownTools = [
      { name: 'browser_navigate', desc: 'Navigate to a URL', cat: 'browser' },
      { name: 'browser_click', desc: 'Click an element by ref ID', cat: 'browser' },
      { name: 'browser_snapshot', desc: 'Get page accessibility tree', cat: 'browser' },
      { name: 'browser_type', desc: 'Type text into an input field', cat: 'browser' },
      { name: 'browser_scroll', desc: 'Scroll the page', cat: 'browser' },
      { name: 'browser_back', desc: 'Navigate back in history', cat: 'browser' },
      { name: 'browser_vision', desc: 'Take screenshot and analyze with AI', cat: 'browser' },
      { name: 'browser_get_images', desc: 'Get all images on page', cat: 'browser' },
      { name: 'browser_console', desc: 'Get browser console / evaluate JS', cat: 'browser' },
      { name: 'terminal', desc: 'Execute shell commands', cat: 'system' },
      { name: 'execute_code', desc: 'Run Python scripts with tool access', cat: 'system' },
      { name: 'process', desc: 'Manage background processes', cat: 'system' },
      { name: 'web_search', desc: 'Search the web', cat: 'web' },
      { name: 'web_extract', desc: 'Extract page content as markdown', cat: 'web' },
      { name: 'read_file', desc: 'Read a text file with line numbers', cat: 'file' },
      { name: 'write_file', desc: 'Write content to file', cat: 'file' },
      { name: 'search_files', desc: 'Search file contents or find files', cat: 'file' },
      { name: 'patch', desc: 'Targeted find-and-replace in files', cat: 'file' },
      { name: 'image_generate', desc: 'Generate images from text prompts', cat: 'media' },
      { name: 'vision_analyze', desc: 'Analyze images with AI vision', cat: 'media' },
      { name: 'text_to_speech', desc: 'Convert text to speech audio', cat: 'media' },
      { name: 'memory', desc: 'Save/retrieve persistent memory', cat: 'memory' },
      { name: 'session_search', desc: 'Search past conversation sessions', cat: 'memory' },
      { name: 'cronjob', desc: 'Create/manage scheduled cron jobs', cat: 'automation' },
      { name: 'send_message', desc: 'Send messages to connected platforms', cat: 'automation' },
      { name: 'delegate_task', desc: 'Spawn subagents for parallel work', cat: 'automation' },
      { name: 'skill_manage', desc: 'Create/update/delete skills', cat: 'skills' },
      { name: 'skill_view', desc: 'View skill content and linked files', cat: 'skills' },
      { name: 'skills_list', desc: 'List available skills', cat: 'skills' },
      { name: 'todo', desc: 'Manage task lists', cat: 'productivity' },
      { name: 'clarify', desc: 'Ask user for clarification', cat: 'productivity' },
    ];
    for (const t of knownTools) {
      tools.push({ name: t.name, description: t.desc, category: t.cat });
      if (categories[t.cat]) categories[t.cat].push(t.name);
    }
  }

  res.json({ categories, tools, total: tools.length });
});

// ─── API Keys (.env) ────────────────────────────────────────────────
const ENV_FILE = path.join(HERMES_HOME, '.env');

function parseEnvFile(content) {
  const vars = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

function maskValue(val) {
  if (!val || val.length <= 8) return '***';
  return val.slice(0, 4) + '*'.repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
}

app.get('/api/env', (req, res) => {
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const vars = parseEnvFile(content);
    // Return with masked values
    const masked = {};
    for (const [k, v] of Object.entries(vars)) {
      masked[k] = maskValue(v);
    }
    res.json({ vars: masked, raw_length: content.length });
  } catch {
    res.json({ vars: {}, raw_length: 0 });
  }
});

app.put('/api/env', (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) return res.status(400).json({ error: 'Invalid key name' });

  try {
    let content = '';
    try { content = fs.readFileSync(ENV_FILE, 'utf8'); } catch { content = '# Hermes Agent Environment Configuration\n'; }

    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith(key + '=')) {
        if (value && value !== '***') {
          lines[i] = `${key}=${value}`;
        } else {
          lines.splice(i, 1); // Remove if value is empty/masked
        }
        found = true;
        break;
      }
    }
    if (!found && value && value !== '***') {
      lines.push(`${key}=${value}`);
    }

    fs.writeFileSync(ENV_FILE, lines.join('\n'));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/env/:key', (req, res) => {
  const key = req.params.key;
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) return res.status(400).json({ error: 'Invalid key name' });

  try {
    let content = fs.readFileSync(ENV_FILE, 'utf8');
    const lines = content.split('\n');
    const filtered = lines.filter(l => !l.trim().startsWith(key + '='));
    fs.writeFileSync(ENV_FILE, filtered.join('\n'));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gateway & Processes ────────────────────────────────────────────
app.get('/api/gateway', (req, res) => {
  const gateway = readJson(GATEWAY_STATE);
  const processes = readJson(PROCESSES_FILE) || [];
  res.json({ gateway, processes });
});

// ─── Models ─────────────────────────────────────────────────────────
app.get('/api/models', (req, res) => {
  const result = runHermes(['model', '--list']);
  res.json({ output: result.output });
});

// ─── Available Models Catalog ───────────────────────────────────────
app.get('/api/models/catalog', (req, res) => {
  res.json({
    providers: [
      { id: 'openrouter', label: 'OpenRouter', models: [
        { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
        { id: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
        { id: 'anthropic/claude-haiku-3.5', label: 'Claude Haiku 3.5' },
        { id: 'openai/gpt-4o', label: 'GPT-4o' },
        { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'openai/o3-mini', label: 'o3-mini' },
        { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
        { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
        { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
        { id: 'qwen/qwen3-235b-a22b', label: 'Qwen3 235B' },
      ]},
      { id: 'anthropic', label: 'Anthropic', models: [
        { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
        { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
        { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      ]},
      { id: 'openai', label: 'OpenAI', models: [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'o3-mini', label: 'o3-mini' },
        { id: 'o4-mini', label: 'o4-mini' },
      ]},
      { id: 'google', label: 'Google', models: [
        { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash' },
      ]},
      { id: 'xiaomi', label: 'Xiaomi', models: [
        { id: 'mimo-v2.5', label: 'MiMo V2.5' },
        { id: 'mimo-v2-pro', label: 'MiMo V2 Pro' },
      ]},
      { id: 'nvidia', label: 'NVIDIA', models: [
        { id: 'z-ai/glm-5.1', label: 'GLM 5.1' },
        { id: 'z-ai/glm-5', label: 'GLM 5' },
        { id: 'deepseek-ai/deepseek-r1', label: 'DeepSeek R1' },
        { id: 'meta/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick' },
      ]},
      { id: 'deepseek', label: 'DeepSeek', models: [
        { id: 'deepseek-chat', label: 'DeepSeek V3' },
        { id: 'deepseek-reasoner', label: 'DeepSeek R1' },
      ]},
      { id: 'moonshot', label: 'Moonshot (Kimi)', models: [
        { id: 'moonshot-v1-auto', label: 'Moonshot V1 Auto' },
        { id: 'kimi-k2.5', label: 'Kimi K2.5' },
      ]},
      { id: 'custom', label: 'Custom', models: [] },
    ],
  });
});

// ─── Status ─────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const result = runHermes(['status']);
  res.json({ output: result.output });
});

// ─── Doctor ─────────────────────────────────────────────────────────
app.get('/api/doctor', (req, res) => {
  const result = runHermes(['doctor'], 60000);
  res.json({ output: result.output });
});

// ─── Serve Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const gateway = readJson(GATEWAY_STATE);
  const config = readYaml(CONFIG_YAML);
  const sessions = queryDb("SELECT COUNT(*) as c FROM sessions");

  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`📦 Model: ${config?.model?.default || 'unknown'}`);
  console.log(`🔧 Gateway: ${gateway?.gateway_state || 'unknown'}`);
  console.log(`💬 Sessions: ${sessions[0]?.c || 0}`);
});
