const express = require('express');
const router = express.Router();
const {
  getQueueItems,
  getQueueItemById,
  createQueueItem,
  updateQueueItem,
  deleteQueueItem
} = require('../database');

const parseQueueItem = (item) => {
  if (!item) return null;
  let payload = {};
  try {
    payload = JSON.parse(item.payload_json || '{}');
  } catch (e) {}
  return {
    ...item,
    payload
  };
};

router.get('/', (req, res) => {
  res.json({ items: getQueueItems().map(parseQueueItem) });
});

router.post('/', (req, res) => {
  const { title, payload } = req.body;

  if (!payload || !payload.prompt) {
    return res.status(400).json({ error: 'Queue item payload is required.' });
  }

  const result = createQueueItem({ title, payload });
  res.json({ item: parseQueueItem(getQueueItemById(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = getQueueItemById(id);
  if (!item) return res.status(404).json({ error: 'Queue item not found.' });
  const editsPayload = Object.prototype.hasOwnProperty.call(req.body, 'payload') || Object.prototype.hasOwnProperty.call(req.body, 'title');
  if (item.status === 'running' && editsPayload) {
    return res.status(400).json({ error: 'Running queue item cannot be edited.' });
  }

  const { title, payload, status, video_id, error_message } = req.body;
  const updated = updateQueueItem(id, { title, payload, status, video_id, error_message });
  res.json({ item: parseQueueItem(updated) });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = getQueueItemById(id);
  if (!item) return res.status(404).json({ error: 'Queue item not found.' });
  if (item.status === 'running' || item.status === 'completed') {
    return res.status(400).json({ error: 'Only queued, paused, or failed items can be deleted.' });
  }

  deleteQueueItem(id);
  res.json({ success: true });
});

module.exports = router;
