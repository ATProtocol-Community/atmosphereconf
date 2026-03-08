import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";

interface AvatarInputProps {
  currentAvatarUrl?: string | null;
  onChange: (file: File | null) => void;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function AvatarInput({ currentAvatarUrl, onChange }: AvatarInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    onChange(file);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    } else {
      setPreviewUrl(null);
      onChange(null);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="cursor-pointer"
    >
      <div
        className={`relative w-32 h-32 rounded-full transition-all ${dragging ? "ring-2 ring-primary ring-offset-2" : ""}`}
      >
        <Avatar
          size="xl"
          className={`border-2 transition-colors ${dragging ? "border-primary" : "border-gray-200 hover:border-gray-300"}`}
          src={displayUrl || undefined}
          alt="Avatar preview"
        />
        <div className="absolute bottom-1 right-1 bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
