import { useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AvatarInputProps {
  currentAvatarUrl?: string | null;
  fallback: string;
  onChange: (file: File | null) => void;
}

export function AvatarInput({ currentAvatarUrl, fallback, onChange }: AvatarInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onChange(file);
    } else {
      setPreviewUrl(null);
      onChange(null);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div>
      <label htmlFor="avatar" className="cursor-pointer inline-block">
        <div className="relative w-20 h-20">
          <Avatar className="w-20 h-20 border-2 border-gray-200 hover:border-gray-300 transition-colors">
            {displayUrl && <AvatarImage src={displayUrl} alt="Avatar preview" />}
            <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </label>
      <input
        type="file"
        id="avatar"
        name="avatar"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
