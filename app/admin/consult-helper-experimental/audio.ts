/**
 * 녹음된 오디오 Blob을 Whisper가 요구하는 16kHz 모노 Float32Array로
 * 변환합니다. 이 실험 페이지 전용 — 기존 consult-helper와 공유하지 않습니다.
 */

const WHISPER_SAMPLE_RATE = 16000;

export async function decodeToFloat32Mono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    await decodeCtx.close();
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE)),
    WHISPER_SAMPLE_RATE,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}
