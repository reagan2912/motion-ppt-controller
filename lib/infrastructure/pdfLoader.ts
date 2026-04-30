// PDF 파일 로드/검증 어댑터
import { PDF_MAX_BYTES } from '@/lib/domain/config';

export type PdfLoadResult = {
  blobUrl: string;
  name: string;
  bytes: number;
};

export type PdfErrorKind = 'too_large' | 'invalid_type' | 'read_failed';

/**
 * PDF 파일을 검증한다.
 * 문제 없으면 null, 문제 있으면 에러 종류 반환.
 */
export function validatePdf(file: File): PdfErrorKind | null {
  if (file.type !== 'application/pdf') return 'invalid_type';
  if (file.size > PDF_MAX_BYTES) return 'too_large';
  return null;
}

/**
 * File을 Blob URL로 변환한다.
 * 사용 후 반드시 disposePdf()를 호출해 메모리 누수를 방지해야 한다.
 */
export function loadPdf(file: File): PdfLoadResult {
  const blobUrl = URL.createObjectURL(file);
  return { blobUrl, name: file.name, bytes: file.size };
}

/**
 * Blob URL을 해제한다. 발표 종료 또는 컴포넌트 언마운트 시 호출.
 */
export function disposePdf(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}
