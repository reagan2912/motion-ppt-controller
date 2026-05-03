'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  blobUrl: string;
  currentPage: number;
  onPageCount: (n: number) => void;
  onError: (msg: string) => void;
  containerWidth: number;
};

export function PdfViewer({ blobUrl, currentPage, onPageCount, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // 창 크기 변경 시 재계산
  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const onLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => onPageCount(numPages),
    [onPageCount],
  );

  const onLoadError = useCallback(
    (err: Error) => onError(`PDF를 읽을 수 없습니다: ${err.message}`),
    [onError],
  );

  const pagesToRender = [currentPage - 1, currentPage, currentPage + 1].filter((p) => p >= 1);

  return (
    <div ref={containerRef} className="pdf-wrapper">
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
            style={{ display: pageNum === currentPage ? 'block' : 'none' }}
          >
            <Page
              pageNumber={pageNum}
              width={size.width}
              height={size.height}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </div>
        ))}
      </Document>

      <style>{`
        .pdf-wrapper {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .pdf-loading, .pdf-error {
          color: var(--muted);
          font-size: 1rem;
          padding: 40px;
          text-align: center;
        }
        .react-pdf__Document {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .react-pdf__Page canvas {
          max-width: 100vw !important;
          max-height: 100vh !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}
