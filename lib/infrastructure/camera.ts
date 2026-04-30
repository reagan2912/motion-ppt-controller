// 카메라 어댑터 — getUserMedia 래퍼
export type CameraHandle = {
  stream: MediaStream;
  stop: () => void;
};

export type CameraErrorKind = 'permission_denied' | 'not_found' | 'in_use' | 'unknown';

/**
 * 웹캠 스트림을 시작한다.
 * 성공 시 CameraHandle 반환 (stop()으로 정리 가능).
 */
export async function startCamera(constraints?: MediaTrackConstraints): Promise<CameraHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user', ...constraints },
    audio: false,
  });
  return {
    stream,
    stop: () => stream.getTracks().forEach((t) => t.stop()),
  };
}

/**
 * getUserMedia 에러를 분류한다.
 * 도메인은 이 타입만 알면 됨 — DOMException 이름은 알 필요 없음.
 */
export function classifyCameraError(err: unknown): CameraErrorKind {
  if (!(err instanceof Error)) return 'unknown';
  if (err.name === 'NotAllowedError') return 'permission_denied';
  if (err.name === 'NotFoundError') return 'not_found';
  if (err.name === 'NotReadableError') return 'in_use';
  return 'unknown';
}
