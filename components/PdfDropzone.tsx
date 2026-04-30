'use client';
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

type PdfErrorKind = 'too_large' | 'invalid_type' | 'read_failed';

type Props = {
  onFile: (file: File) => void;
  fileName?: string;
  pageCount?: number;
  error?: PdfErrorKind | null;
};

const ERROR_MESSAGES: Record<PdfErrorKind, string> = {
  too_large: '파일이 너무 큽니다 (최대 200MB)',
  invalid_type: 'PDF 파일만 업로드 가능합니다',
  read_failed: 'PDF를 읽을 수 없습니다. 다른 파일을 선택해주세요',
};

export function PdfDropzone({ onFile, fileName, pageCount, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    // 같은 파일 재선택 가능하도록 value 초기화
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}${fileName ? ' has-file' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <div className="dropzone-icon">📄</div>
      {fileName ? (
        <div className="dropzone-info">
          <span className="dropzone-filename">{fileName}</span>
          {pageCount && pageCount > 0 ? (
            <span className="dropzone-pages">{pageCount}페이지 ✓</span>
          ) : null}
        </div>
      ) : (
        <div className="dropzone-hint">
          PDF 파일을 끌어다 놓거나
          <br />
          <strong>클릭하여 선택</strong>하세요
        </div>
      )}
      {error ? <div className="dropzone-error">{ERROR_MESSAGES[error]}</div> : null}

      <style>{`
        .dropzone {
          border: 2px dashed var(--muted);
          border-radius: 12px;
          padding: 32px 24px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          text-align: center;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .dropzone:hover, .dropzone.dragging {
          border-color: var(--accent);
          background: rgba(0, 217, 192, 0.06);
        }
        .dropzone.has-file {
          border-color: var(--accent);
          border-style: solid;
        }
        .dropzone-icon { font-size: 2rem; }
        .dropzone-hint { color: var(--muted); font-size: 0.95rem; line-height: 1.6; }
        .dropzone-info { display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .dropzone-filename { font-size: 0.95rem; word-break: break-all; color: var(--fg); }
        .dropzone-pages { color: var(--accent); font-size: 0.85rem; }
        .dropzone-error { color: var(--error); font-size: 0.85rem; margin-top: 4px; }
      `}</style>
    </div>
  );
}
