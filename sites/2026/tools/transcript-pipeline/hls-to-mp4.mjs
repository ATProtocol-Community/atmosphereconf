// Wrapper: downloads HLS audio via hls-to-m4a.mjs, then ffmpeg-remuxes the
// raw fMP4 concat into a clean MP4 so downstream tools (browsers,
// Web Audio API decodeAudioData, HAL Editor) read the correct duration.
import { downloadHlsAudio } from './hls-to-m4a.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

async function ffmpegRemux(inPath, outPath) {
  await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner','-loglevel','error','-y','-i',inPath,'-c','copy',outPath], {stdio:'inherit'});
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
  });
}

export async function downloadAndRemux(audioPlaylistUrl, finalPath) {
  const tmp = finalPath + '.raw-fmp4';
  await downloadHlsAudio(audioPlaylistUrl, tmp);
  await ffmpegRemux(tmp, finalPath);
  await fs.unlink(tmp);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , playlistUrl, outPath] = process.argv;
  if (!playlistUrl || !outPath) {
    console.error('usage: node hls-to-mp4.mjs <audio-playlist-url> <out.mp4>');
    process.exit(1);
  }
  await downloadAndRemux(playlistUrl, outPath);
}
