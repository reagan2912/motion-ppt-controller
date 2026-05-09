'use client';
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

type PdfErrorKind = 'too_large' | 'invalid_type' | 'read_failed';

const ERROR_MESSAGES: Record<PdfErrorKind, string> = {
  too_large: '파일이 너무 큽니다 (최대 200MB)',
  invalid_type: 'PDF 파일만 업로드 가능합니다',
  read_failed: 'PDF를 읽을 수 없습니다',
};

type Props = {
  onFile: (file: File) => void;
  fileName?: string;
  pageCount?: number;
  error?: PdfErrorKind | null;
};

export function PdfDropzone({ onFile, fileName, pageCount, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => { if (file) onFile(file); };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => { handleFile(e.target.files?.[0]); e.target.value = ''; };

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}${fileName ? ' has-file' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="application/pdf" onChange={onChange} style={{ display: 'none' }} />
      <div className="dropzone-icon">📄</div>
      {fileName ? (
        <div className="dropzone-info">
          <span className="dropzone-filename">{fileName}</span>
          {pageCount && pageCount > 0 ? <span className="dropzone-pages">{pageCount}페이지 ✓</span> : null}
        </div>
      ) : (
        <div className="dropzone-hint">
          PDF 파일을 끌어다 놓거나<br />
          <strong>클릭하여 선택</strong>하세요
        </div>
      )}
      {error ? <div className="dropzone-error">{ERROR_MESSAGES[error]}</div> : null}

      <style>{`
        .dropzone {
          border: 1.5px dashed #CBD1D6;
          border-radius: 6px;
          padding: 28px 20px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          text-align: center;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #F5F7F8;
        }
        .dropzone:hover, .dropzone.dragging {
          border-color: #FD5108;
          background: #FFF5ED;
        }
        .dropzone.has-file {
          border-color: #FD5108;
          border-style: solid;
          background: #FFF5ED;
        }
        .dropzone-icon { font-size: 1.8rem; }
        .dropzone-hint { color: #A1A8B3; font-size: 0.88rem; line-height: 1.6; font-family: Arial, Noto Sans KR, sans-serif; }
        .dropzone-hint strong { color: #FD5108; }
        .dropzone-info { display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .dropzone-filename { font-size: 0.88rem; word-break: break-all; color: #000; font-family: Arial, sans-serif; }
        .dropzone-pages { color: #FD5108; font-size: 0.8rem; font-weight: 700; }
        .dropzone-error { color: #DC2626; font-size: 0.8rem; margin-top: 4px; }
      `}</style>
    </div>
  );
}
