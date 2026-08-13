"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoDropzone({ currentFileName }: { currentFileName?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function setFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (inputRef.current) inputRef.current.files = files;
    setFileName(files[0].name);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        setFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors",
        dragOver ? "border-sapphire bg-sapphire-light/30" : "border-input hover:bg-secondary/40"
      )}
    >
      <UploadCloud className="size-5 text-muted-foreground" />
      {fileName ? (
        <span className="font-medium text-onyx">{fileName}</span>
      ) : currentFileName ? (
        <span className="text-muted-foreground">
          Current: <span className="font-medium text-onyx">{currentFileName}</span> — drop a new
          file to replace it
        </span>
      ) : (
        <span className="text-muted-foreground">Drag and drop a video file here, or click to browse</span>
      )}
      <input
        ref={inputRef}
        type="file"
        name="videoFile"
        accept="video/*"
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
