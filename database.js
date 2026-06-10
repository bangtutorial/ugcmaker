const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'ugc.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    api_key TEXT DEFAULT '',
    api_base_url TEXT DEFAULT 'https://ark.ap-southeast.bytepluses.com/api/v3',
    default_resolution TEXT DEFAULT '1080p',
    default_ratio TEXT DEFAULT '9:16',
    default_model TEXT DEFAULT 'seedance-2.0',
    default_duration TEXT DEFAULT '5s'
  );

  INSERT OR IGNORE INTO settings (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('product', 'model', 'background')),
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    resolution TEXT NOT NULL DEFAULT '1080p',
    ratio TEXT NOT NULL DEFAULT '9:16',
    ai_model TEXT NOT NULL DEFAULT 'seedance-2.0',
    duration TEXT NOT NULL DEFAULT '5s',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    job_id TEXT,
    video_url TEXT,
    local_video_path TEXT,
    thumbnail_path TEXT,
    error_message TEXT,
    asset_ids TEXT DEFAULT '[]',
    recipe_data TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT (datetime('now')),
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS queue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled video',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed')),
    payload_json TEXT NOT NULL,
    video_id INTEGER,
    error_message TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    started_at DATETIME,
    completed_at DATETIME
  );
`);

try { db.exec("ALTER TABLE settings ADD COLUMN default_duration TEXT DEFAULT '5s'"); } catch (e) {}
try { db.exec("ALTER TABLE videos ADD COLUMN duration TEXT DEFAULT '5s'"); } catch (e) {}
try { db.exec("ALTER TABLE videos ADD COLUMN recipe_data TEXT DEFAULT '{}'"); } catch (e) {}
try { db.exec("ALTER TABLE videos ADD COLUMN local_video_path TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE videos ADD COLUMN thumbnail_path TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE queue_items ADD COLUMN updated_at DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE queue_items ADD COLUMN started_at DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE queue_items ADD COLUMN completed_at DATETIME"); } catch (e) {}

const getSettings = () => db.prepare('SELECT * FROM settings WHERE id = 1').get();

const updateSettings = (data) => {
  const stmt = db.prepare(`
    UPDATE settings SET
      api_key = COALESCE(?, api_key),
      api_base_url = COALESCE(?, api_base_url),
      default_resolution = COALESCE(?, default_resolution),
      default_ratio = COALESCE(?, default_ratio),
      default_model = COALESCE(?, default_model),
      default_duration = COALESCE(?, default_duration)
    WHERE id = 1
  `);
  return stmt.run(
    data.api_key ?? null,
    data.api_base_url ?? null,
    data.default_resolution ?? null,
    data.default_ratio ?? null,
    data.default_model ?? null,
    data.default_duration ?? null
  );
};

const createAsset = (data) => {
  const stmt = db.prepare('INSERT INTO assets (type, filename, filepath, filesize) VALUES (?, ?, ?, ?)');
  return stmt.run(data.type, data.filename, data.filepath, data.filesize);
};

const getAssetsByType = (type) => {
  return db.prepare('SELECT * FROM assets WHERE type = ? ORDER BY created_at DESC').all(type);
};

const getAllAssets = () => {
  return db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all();
};

const getAssetById = (id) => {
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
};

const deleteAsset = (id) => {
  const asset = getAssetById(id);
  if (asset) {
    const fullPath = path.join(__dirname, asset.filepath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  }
  return asset;
};

const createVideo = (data) => {
  const stmt = db.prepare(`
    INSERT INTO videos (prompt, resolution, ratio, ai_model, duration, status, job_id, asset_ids, recipe_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    data.prompt,
    data.resolution || '1080p',
    data.ratio || '9:16',
    data.ai_model || 'seedance-2.0',
    data.duration || '5s',
    data.status || 'pending',
    data.job_id || null,
    JSON.stringify(data.asset_ids || []),
    JSON.stringify(data.recipe_data || {})
  );
};

const updateVideoStatus = (id, data) => {
  const stmt = db.prepare(`
    UPDATE videos SET
      status = COALESCE(?, status),
      job_id = COALESCE(?, job_id),
      video_url = COALESCE(?, video_url),
      local_video_path = COALESCE(?, local_video_path),
      thumbnail_path = COALESCE(?, thumbnail_path),
      error_message = COALESCE(?, error_message),
      completed_at = CASE WHEN ? IN ('completed', 'failed') THEN datetime('now') ELSE completed_at END
    WHERE id = ?
  `);
  return stmt.run(
    data.status ?? null,
    data.job_id ?? null,
    data.video_url ?? null,
    data.local_video_path ?? null,
    data.thumbnail_path ?? null,
    data.error_message ?? null,
    data.status ?? null,
    id
  );
};

const getVideoById = (id) => {
  return db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
};

const getAllVideos = (search) => {
  if (search) {
    return db.prepare("SELECT * FROM videos WHERE status = 'completed' AND prompt LIKE ? ORDER BY created_at DESC").all(`%${search}%`);
  }
  return db.prepare("SELECT * FROM videos WHERE status = 'completed' ORDER BY created_at DESC").all();
};

const deleteVideo = (id) => {
  return db.prepare('DELETE FROM videos WHERE id = ?').run(id);
};

const getQueueItems = () => {
  return db.prepare('SELECT * FROM queue_items ORDER BY created_at ASC, id ASC').all();
};

const getQueueItemById = (id) => {
  return db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id);
};

const createQueueItem = (data) => {
  const stmt = db.prepare(`
    INSERT INTO queue_items (title, status, payload_json)
    VALUES (?, ?, ?)
  `);
  return stmt.run(
    data.title || 'Untitled video',
    data.status || 'queued',
    JSON.stringify(data.payload || {})
  );
};

const updateQueueItem = (id, data) => {
  const current = getQueueItemById(id);
  if (!current) return null;

  const status = data.status ?? current.status;
  const nextErrorMessage = Object.prototype.hasOwnProperty.call(data, 'error_message')
    ? data.error_message
    : current.error_message;
  const stmt = db.prepare(`
    UPDATE queue_items SET
      title = COALESCE(?, title),
      status = COALESCE(?, status),
      payload_json = COALESCE(?, payload_json),
      video_id = COALESCE(?, video_id),
      error_message = ?,
      updated_at = datetime('now'),
      started_at = CASE WHEN ? = 'running' AND started_at IS NULL THEN datetime('now') ELSE started_at END,
      completed_at = CASE WHEN ? IN ('completed', 'failed') THEN datetime('now') ELSE completed_at END
    WHERE id = ?
  `);
  stmt.run(
    data.title ?? null,
    status,
    data.payload ? JSON.stringify(data.payload) : null,
    data.video_id ?? null,
    nextErrorMessage,
    status,
    status,
    id
  );
  return getQueueItemById(id);
};

const deleteQueueItem = (id) => {
  return db.prepare("DELETE FROM queue_items WHERE id = ? AND status IN ('queued', 'paused', 'failed')").run(id);
};

module.exports = {
  db,
  getSettings,
  updateSettings,
  createAsset,
  getAssetsByType,
  getAllAssets,
  getAssetById,
  deleteAsset,
  createVideo,
  updateVideoStatus,
  getVideoById,
  getAllVideos,
  deleteVideo,
  getQueueItems,
  getQueueItemById,
  createQueueItem,
  updateQueueItem,
  deleteQueueItem
};
