"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PhotoUploadProps {
  jobId: string;
}

export function PhotoUpload({ jobId }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("caption", caption);

      const response = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Reset form
        setPreviewUrl(null);
        setCaption("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Refresh the page to show new photo
        router.refresh();
      } else {
        alert("Failed to upload photo");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-8 text-brand-600 transition-colors hover:bg-brand-100"
        >
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="font-semibold">Add Photo</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a description..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="rounded-xl bg-brand-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
