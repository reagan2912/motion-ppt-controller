'use client';
// PDF 상태 관리 훅
import { useState, useEffect, useCallback } from 'react';
import {
  loadPdf,
  disposePdf,
  validatePdf,
  type PdfLoadResult,
  type PdfErrorKind,
} from '@/lib/infrastructure/pdfLoader';

export type PdfState = {
  pdf: PdfLoadResult | null;
  error: PdfErrorKind | null;
  pageCount: number;
  currentPage: number;
};

export function usePdfDocument() {
  const [state, setState] = useState<PdfState>({
    pdf: null,
    error: null,
    pageCount: 0,
    currentPage: 1,
  });

  const open = useCallback((file: File) => {
    const err = validatePdf(file);
    if (err) {
      setState((s) => ({ ...s, error: err, pdf: null }));
      return;
    }
    const pdf = loadPdf(file);
    setState({ pdf, error: null, pageCount: 0, currentPage: 1 });
  }, []);

  const setPageCount = useCallback((n: number) => {
    setState((s) => ({ ...s, pageCount: n }));
  }, []);

  const goNext = useCallback(() => {
    setState((s) => (s.currentPage < s.pageCount ? { ...s, currentPage: s.currentPage + 1 } : s));
  }, []);

  const goPrev = useCallback(() => {
    setState((s) => (s.currentPage > 1 ? { ...s, currentPage: s.currentPage - 1 } : s));
  }, []);

  const goFirst = useCallback(() => setState((s) => ({ ...s, currentPage: 1 })), []);

  const goLast = useCallback(() => setState((s) => ({ ...s, currentPage: s.pageCount })), []);

  const goTo = useCallback((page: number) => {
    setState((s) => {
      if (page < 1 || page > s.pageCount) return s;
      return { ...s, currentPage: page };
    });
  }, []);

  const close = useCallback(() => {
    setState((s) => {
      if (s.pdf) disposePdf(s.pdf.blobUrl);
      return { pdf: null, error: null, pageCount: 0, currentPage: 1 };
    });
  }, []);

  // 언마운트 시 Blob URL 해제 (메모리 누수 방지)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      setState((s) => {
        if (s.pdf) disposePdf(s.pdf.blobUrl);
        return s;
      });
    };
  }, []); // 의도적 빈 의존성 배열 — 언마운트 시만 실행

  return { state, open, setPageCount, goNext, goPrev, goFirst, goLast, goTo, close };
}
