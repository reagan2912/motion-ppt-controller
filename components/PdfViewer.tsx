'use client';
// react-pdf 렌더러 — 인접 페이지 사전 마운트로 깜빡임 방지
import { useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdf.worker URL — pdfjs.version을 그대로 사용해 버전 불일치 방지
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  blobUrl: string;
  currentPage: number;
  onPageCount: (n: number) => void;
  onError: (msg: string) => void;
  containerWidth: number;
};

export function PdfViewer({ blobUrl, currentPage, onPageCount, onError, containerWidth }: Props) {
  const onLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      onPageCount(numPages);
    },
    [onPageCount],
  );

  const onLoadError = useCallback(
    (err: Error) => {
      onError(`PDF를 읽을 수 없습니다: ${err.message}`);
    },
    [onError],
  );

  // 현재 ±1 페이지를 사전 마운트해 즉시 전환 — 비현재 페이지는 숨김
  const pagesToRender = [currentPage - 1, currentPage, currentPage + 1].filter((p) => p >= 1);

  return (
    <Document
      file={blobUrl}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading={<div className="pdf-loading">PDF 로딩 중...</div>}
      error={<div className="pdf-error">PDF를 불러올 수 없습니다</div>}
    >
      {pagesToRender.map((pageNum) => (
        <div
          key={pageNum}
          style={{
            display: pageNum === currentPage ? 'block' : 'none',
            width: '100%',
          }}
        >
          <Page
            pageNumber={pageNum}
            width={containerWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </div>
      ))}

      <style>{`
        .pdf-loading, .pdf-error {
          color: var(--muted);
          font-size: 1rem;
          padding: 40px;
          text-align: center;
        }
        .react-pdf__Document { display: flex; justify-content: center; }
        .react-pdf__Page { max-width: 100%; }
        .react-pdf__Page canvas { max-width: 100%; height: auto !important; }
      `}</style>
    </Document>
  );
}
