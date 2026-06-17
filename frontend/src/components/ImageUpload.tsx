"use client";

import { useState, useRef } from "react";
import { Upload, ImageIcon, X, AlertCircle, CheckCircle } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

const MAX_SIZE = 200 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const HELP_TEXT = "Maximum image size: 200 KB (JPG, PNG, WEBP)";

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  preview: string;
  accept?: string;
  maxSize?: number;
  helperText?: string;
  showSize?: boolean;
  disabled?: boolean;
  label?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function compressImage(file: File, maxSize: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; resolve(file); }, 5000);

    img.onload = () => {
      if (timedOut) return;
      clearTimeout(timer);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const MAX_DIM = 1200;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) { resolve(file); return; }
        const compressed = new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
        resolve(compressed);
      }, "image/webp", 0.8);
    };
    img.onerror = () => { clearTimeout(timer); resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({
  onFileSelect,
  preview,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = MAX_SIZE,
  helperText = HELP_TEXT,
  showSize = true,
  disabled = false,
  label,
}: ImageUploadProps) {
  const notif = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState(preview);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const displayPreview = localPreview || preview;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    const extMatch = ALLOWED_EXTENSIONS.test(file.name);
    const mimeMatch = ALLOWED_TYPES.includes(file.type);

    if (!extMatch || !mimeMatch) {
      const msg = "Only JPG, JPEG, PNG and WEBP images are allowed.";
      notif.error("Invalid File", msg);
      setError(msg);
      e.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      const msg = "Image size exceeds 200 KB. Please upload a smaller image.";
      notif.error("File Too Large", msg);
      setError(msg);
      e.target.value = "";
      return;
    }

    try {
      setProcessing(true);

      let processedFile = file;

      if (file.type !== "image/webp") {
        processedFile = await compressImage(file, maxSize);
      }

      setProcessing(false);
      const objectUrl = URL.createObjectURL(processedFile);
      setLocalPreview(objectUrl);
      setSelectedFile(processedFile);
      onFileSelect(processedFile);
    } catch {
      setProcessing(false);
      notif.error("Error", "Failed to process image.");
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setLocalPreview("");
    setError("");
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displaySize = selectedFile ? formatSize(selectedFile.size) : "";

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
          {label}
        </label>
      )}

      <div className="grid grid-cols-5 gap-4 items-center">
        <div className="col-span-3">
          <label className="flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-orange-500/50 rounded-xl p-4 cursor-pointer bg-gray-900/40 hover:bg-gray-900/60 transition-all text-center relative">
            {processing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold text-gray-400">Processing...</span>
              </div>
            ) : (
              <>
                <Upload size={18} className="text-gray-500 mb-1.5" />
                <span className="text-[10px] font-bold text-gray-400">
                  {selectedFile ? "Change Image" : "Choose Image File"}
                </span>
                <span className="text-[8px] text-gray-650 mt-0.5">
                  {selectedFile ? displaySize : helperText}
                </span>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || processing}
            />
          </label>

          {selectedFile && showSize && (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle size={10} className="text-emerald-500" />
              <span className="text-[9px] font-semibold text-emerald-500">{displaySize}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertCircle size={10} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-[9px] font-semibold text-red-500 leading-relaxed">{error}</span>
            </div>
          )}
        </div>

        <div className="col-span-2 aspect-[4/3] rounded-xl bg-gray-900 border border-gray-850 overflow-hidden flex items-center justify-center text-gray-650 relative">
          {displayPreview ? (
            <>
              <img
                src={displayPreview}
                alt="Upload Preview"
                className="w-full h-full object-cover"
              />
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </>
          ) : (
            <ImageIcon size={20} />
          )}
        </div>
      </div>

      <p className="text-[9px] text-gray-600 font-medium">{helperText}</p>
    </div>
  );
}
