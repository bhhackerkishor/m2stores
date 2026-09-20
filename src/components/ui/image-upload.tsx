"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (data: { url: string; publicId: string } | null) => void;
  folder?: string;
  label?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = "general",
  label = "Upload Image",
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message || "Upload failed");
          return;
        }
        onChange({ url: data.data.url, publicId: data.data.publicId });
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all duration-200 cursor-pointer",
          dragOver
            ? "border-brand-500 bg-brand-500/10 dark:bg-brand-500/20"
            : value
            ? "border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"
            : "border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-500/50 dark:hover:border-brand-400 hover:bg-surface-50 dark:hover:bg-surface-800/40",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-sm text-surface-500 dark:text-surface-400">Uploading...</span>
          </div>
        ) : value ? (
          <div className="relative w-full">
            <Image
              src={value}
              alt="Preview"
              width={200}
              height={200}
              className="mx-auto max-h-48 w-auto rounded-md object-contain"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors shadow-md"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="w-8 h-8 text-surface-400 dark:text-surface-500" />
            <span className="text-sm text-surface-600 dark:text-surface-300">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-surface-400 dark:text-surface-500">
              PNG, JPG, WebP, GIF up to 10MB
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

