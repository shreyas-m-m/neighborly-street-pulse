import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_ACCEPT, validatePhoto } from "@/lib/photos";

interface Props {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

/** Choose / preview / remove / replace one photo. Validation errors are shown inline. */
export function PhotoPicker({ label, hint, file, onChange, error, disabled }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!f) return;
    const problem = validatePhoto(f);
    setLocalError(problem);
    if (!problem) onChange(f);
  };

  const shownError = localError ?? error;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        disabled={disabled}
        aria-describedby={shownError ? `${id}-error` : undefined}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview ? (
        <div className="mt-2 flex flex-wrap items-start gap-3">
          <img
            src={preview}
            alt={`Preview of selected photo: ${file?.name ?? ""}`}
            className="h-32 w-44 rounded-lg border object-cover"
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setLocalError(null);
                onChange(null);
              }}
            >
              <X /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus /> Choose photo
        </Button>
      )}
      {shownError && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
          {shownError}
        </p>
      )}
    </div>
  );
}
