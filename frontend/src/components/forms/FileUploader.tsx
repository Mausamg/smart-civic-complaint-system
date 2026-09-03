import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, X, FileText, Camera, ImageIcon, Film, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/format';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onAdd: (files: UploadedFile[]) => void;
  onRemove: (id: string) => void;
  accept?: string;
  maxSizeMB?: number;
  capture?: boolean;
  label?: string;
  hint?: string;
}

const formatSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export function FileUploader({
  files,
  onAdd,
  onRemove,
  accept = 'image/*,video/*',
  maxSizeMB = 25,
  capture = false,
  label = 'Upload evidence',
  hint = 'Drag and drop photos or videos, or click to browse. Max 25MB per file.',
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (list: FileList | null) => {
    if (!list) return;
    setError('');
    const valid: UploadedFile[] = [];
    Array.from(list).forEach((f) => {
      if (f.size > maxSizeMB * 1048576) {
        setError(`${f.name} exceeds ${maxSizeMB}MB limit`);
        return;
      }
      const isImg = f.type.startsWith('image/');
      valid.push({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        preview: isImg ? URL.createObjectURL(f) : undefined,
      });
    });
    if (valid.length) onAdd(valid);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => processFiles(e.target.files);

  return (
    <div>
      {label && <span className="label-base">{label}</span>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-ink-300 hover:border-primary-400 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50'
        )}
        aria-label="Upload files"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
          <span className="text-primary-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
        {capture && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800">
            <Camera className="h-3.5 w-3.5" /> Camera capture supported on mobile
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          capture={capture ? 'environment' : undefined}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-error-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-800">
              {f.preview ? (
                <img src={f.preview} alt={f.name} className="h-24 w-full object-cover" />
              ) : f.type.startsWith('video/') ? (
                <div className="flex h-24 w-full items-center justify-center bg-ink-100 text-ink-400 dark:bg-ink-800">
                  <Film className="h-8 w-8" />
                </div>
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center bg-ink-100 text-ink-400 dark:bg-ink-800">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white opacity-0 transition hover:bg-error-600 group-hover:opacity-100"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="p-2">
                <p className="truncate text-[11px] font-medium text-ink-700 dark:text-ink-200">{f.name}</p>
                <p className="flex items-center gap-1 text-[10px] text-ink-400">
                  {f.preview ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {formatSize(f.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
