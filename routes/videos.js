const express = require('express');
const router = express.Router();
const { createVideo, updateVideoStatus, getVideoById, getAllVideos, deleteVideo, getSettings, getAllAssets } = require('../database');
const { createVideoTask, pollTaskStatus } = require('../services/seedance');
const { downloadVideo, saveThumbnail } = require('../services/localMedia');

const publicVideo = (video) => {
  if (!video) return video;
  const localVideoUrl = video.local_video_path ? '/' + video.local_video_path : null;
  const thumbnailUrl = video.thumbnail_path ? '/' + video.thumbnail_path : null;
  return {
    ...video,
    remote_video_url: video.video_url,
    local_video_url: localVideoUrl,
    thumbnail_url: thumbnailUrl,
    video_url: localVideoUrl || video.video_url
  };
};

router.post('/generate', async (req, res) => {
  const { prompt, resolution, ratio, duration, ai_model, asset_ids, recipe_data } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const settings = getSettings();
  if (!settings.api_key) {
    return res.status(400).json({ error: 'API key not configured. Go to Settings to add your API key.' });
  }

  const result = createVideo({
    prompt,
    resolution: resolution || settings.default_resolution,
    ratio: ratio || settings.default_ratio,
    duration: duration || settings.default_duration,
    ai_model: ai_model || settings.default_model,
    status: 'generating',
    asset_ids: asset_ids || [],
    recipe_data: recipe_data || {}
  });

  const videoId = result.lastInsertRowid;

  try {
    const selectedAssetIds = (asset_ids || []).map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
    const selectedAssets = getAllAssets().filter((asset) => selectedAssetIds.includes(asset.id));

    const taskOptions = {
      resolution: resolution || settings.default_resolution,
      ratio: ratio || settings.default_ratio,
      duration: duration || settings.default_duration,
      ai_model: ai_model || settings.default_model
    };

    let jobId;
    let usedPatternFallback = false;
    try {
      jobId = await createVideoTask(prompt, selectedAssets, taskOptions);
    } catch (err) {
      if (err.code !== 'REAL_PERSON_IMAGE_REJECTED' || selectedAssets.length === 0) {
        throw err;
      }
      usedPatternFallback = true;
      jobId = await createVideoTask(prompt, selectedAssets, {
        ...taskOptions,
        patternReferences: true
      });
    }

    updateVideoStatus(videoId, { job_id: jobId, status: 'generating' });

    startPolling(videoId, jobId);

    res.json({ id: videoId, job_id: jobId, status: 'generating', reference_fallback: usedPatternFallback });
  } catch (err) {
    const errorMessage = err.requestId ? `${err.message} Request ID: ${err.requestId}` : err.message;
    updateVideoStatus(videoId, {
      status: 'failed',
      error_message: errorMessage
    });
    res.status(err.statusCode === 422 ? 200 : 500).json({
      id: videoId,
      error: err.message,
      error_code: err.code || null,
      request_id: err.requestId || null,
      status: 'failed'
    });
  }
});

const startPolling = (videoId, jobId) => {
  let attempts = 0;
  const maxAttempts = 120;
  const delays = [3000, 3000, 5000, 5000, 10000];

  const poll = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      updateVideoStatus(videoId, { status: 'failed', error_message: 'Generation timed out' });
      return;
    }

    try {
      const result = await pollTaskStatus(jobId);

      if (result.status === 'completed' && result.video_url) {
        const localVideoPath = await downloadVideo(videoId, result.video_url);
        updateVideoStatus(videoId, {
          status: 'completed',
          video_url: result.video_url,
          local_video_path: localVideoPath
        });
        return;
      }

      if (result.status === 'failed') {
        updateVideoStatus(videoId, {
          status: 'failed',
          error_message: result.error || 'Generation failed'
        });
        return;
      }

      const delay = delays[Math.min(attempts - 1, delays.length - 1)];
      setTimeout(poll, delay);
    } catch (err) {
      updateVideoStatus(videoId, { status: 'failed', error_message: err.message });
    }
  };

  setTimeout(poll, 3000);
};

router.get('/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const video = getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json({
    id: video.id,
    status: video.status,
    video_url: video.local_video_path ? '/' + video.local_video_path : video.video_url,
    local_video_url: video.local_video_path ? '/' + video.local_video_path : null,
    thumbnail_url: video.thumbnail_path ? '/' + video.thumbnail_path : null,
    error_message: video.error_message
  });
});

router.get('/', (req, res) => {
  const search = req.query.search || '';
  const videos = getAllVideos(search).map(publicVideo);
  res.json({ videos });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const video = getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json({ video: publicVideo(video) });
});

router.post('/:id/thumbnail', (req, res) => {
  const id = parseInt(req.params.id);
  const video = getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  try {
    const thumbnailPath = saveThumbnail(id, req.body.thumbnail);
    updateVideoStatus(id, { thumbnail_path: thumbnailPath });
    res.json({ thumbnail_url: '/' + thumbnailPath });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to save thumbnail' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const video = getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  deleteVideo(id);
  res.json({ success: true });
});

module.exports = router;
