const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const DOWNLOAD_ROOT = path.join(__dirname, '..', 'downloads');
const VIDEO_DIR = path.join(DOWNLOAD_ROOT, 'videos');
const THUMB_DIR = path.join(DOWNLOAD_ROOT, 'thumbnails');

const ensureDirs = () => {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.mkdirSync(THUMB_DIR, { recursive: true });
};

const toPublicPath = (fullPath) => {
  return path.relative(path.join(__dirname, '..'), fullPath).replace(/\\/g, '/');
};

const downloadVideo = async (videoId, videoUrl) => {
  ensureDirs();
  const outputPath = path.join(VIDEO_DIR, `video-${videoId}.mp4`);

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return toPublicPath(outputPath);
  }

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video with status ${response.status}`);
  }

  await pipeline(response.body, fs.createWriteStream(outputPath));
  return toPublicPath(outputPath);
};

const saveThumbnail = (videoId, dataUrl) => {
  ensureDirs();
  const match = String(dataUrl || '').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid thumbnail data');
  }

  const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpg' : match[1];
  const outputPath = path.join(THUMB_DIR, `video-${videoId}.${ext}`);
  fs.writeFileSync(outputPath, Buffer.from(match[2], 'base64'));
  return toPublicPath(outputPath);
};

module.exports = {
  downloadVideo,
  saveThumbnail
};
