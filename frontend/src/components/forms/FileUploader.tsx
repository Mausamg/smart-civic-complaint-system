import { cn } from '@/utils/format';
import { AlertCircle,Camera,FileText,Film,ImageIcon,UploadCloud,X } from 'lucide-react';
import { useEffect,useRef,useState,type ChangeEvent,type DragEvent } from 'react';

export interface UploadedFile {
  file: File;
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
  maxFiles?: number;
  imageOnly?: boolean;
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
  maxFiles = Infinity,
  imageOnly = false,
  capture = false,
  label = 'Upload evidence',
  hint = 'Drag and drop photos or videos, or click to browse. Max 25MB per file.',
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isProcessingRef = useRef(false);
  const selectedCountRef = useRef(files.length);

  useEffect(() => {
    selectedCountRef.current = files.length;
  }, [files.length]);

  const processFiles = async (list: FileList | null) => {
    if (!list) return;

    if (isProcessingRef.current) {
      setError('Images are still being processed. Please try again.');
      return;
    }

    isProcessingRef.current = true;

    try {

        const selectedFiles = Array.from(list);
        const valid: UploadedFile[] = [];
        setError('');

        for (const f of selectedFiles) {
          if (selectedCountRef.current + valid.length >= maxFiles) {
            setError(`Maximum of ${maxFiles} files allowed.`);
            break;
          }

          if (f.size === 0) {
            setError(`${f.name} is empty.`);
            continue;
          }

          if (f.size > maxSizeMB * 1048576) {
            setError(`${f.name} exceeds ${maxSizeMB}MB limit.`);
            continue;
          }

          if (imageOnly) {
            const extension =
              f.name.slice(f.name.lastIndexOf('.')).toLowerCase();

            const imageTypes: Record<string, string> = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
            };

            const expectedType = imageTypes[extension];

            if (!expectedType || (f.type && f.type !== expectedType)) {
              setError('Only JPEG, PNG and WebP images are allowed.');
              continue;
            }

            let header: Uint8Array;

            try {
              header = new Uint8Array(
                await f.slice(0, 12).arrayBuffer()
              );
            } catch {
              setError(`Unable to read ${f.name}.`);
              continue;
            }

            const isJpeg =
              header.length >= 3 &&
              header[0] === 0xff &&
              header[1] === 0xd8 &&
              header[2] === 0xff;

            const isPng =
              header.length >= 8 &&
              [137, 80, 78, 71, 13, 10, 26, 10]
                .every((byte, index) => header[index] === byte);

            const isWebP =
              header.length >= 12 &&
              String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
              String.fromCharCode(...header.slice(8, 12)) === 'WEBP';

            const matchesExtension =
              (['.jpg', '.jpeg'].includes(extension) && isJpeg) ||
              (extension === '.png' && isPng) ||
              (extension === '.webp' && isWebP);

            if (!matchesExtension) {
              setError(
                `${f.name}: image content does not match its extension.`
              );
              continue;
            }

            try {
              const bitmap = await createImageBitmap(f);

              const exceedsPixelLimit =
                bitmap.width * bitmap.height > 40_000_000;

              bitmap.close();

              if (exceedsPixelLimit) {
                setError(`${f.name} exceeds the 40-megapixel limit.`);
                continue;
              }
            } catch {
              setError(`${f.name} is not a valid readable image.`);
              continue;
            }
          }

          valid.push({
            file: f,
            id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: f.name,
            size: f.size,
            type: f.type,
            preview: f.type.startsWith('image/')
              ? URL.createObjectURL(f)
              : undefined,
          });
        }

        if (valid.length > 0) {
          selectedCountRef.current += valid.length;
          onAdd(valid);
        }
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    void processFiles(e.target.files);
    e.target.value = '';
  };

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
                onClick={(e) => {
                  e.stopPropagation();
                  if (f.preview) URL.revokeObjectURL(f.preview);
                  onRemove(f.id);
                }}
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
