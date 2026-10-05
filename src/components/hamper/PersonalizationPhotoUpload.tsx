import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  X,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Heart,
} from 'lucide-react';
import { uploadApi } from '../../services/api';

export interface PersonalizationPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  isRequired?: boolean;
  instructions?: string;
  cardEnabled?: boolean;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const PersonalizationPhotoUpload: React.FC<PersonalizationPhotoUploadProps> = ({
  photos,
  onChange,
  maxPhotos = 3,
  isRequired = false,
  instructions = 'Add a special photo to make your gift even more meaningful.',
  cardEnabled = true,
  disabled = false,
  title = 'Make It Personal  ',
  subtitle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return `"${file.name}" is an unsupported file format. Please upload JPG, JPEG, PNG, or WEBP images.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `"${file.name}" is too large (${sizeMB}MB). Maximum file size is 5 MB.`;
    }
    return null;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const availableSlots = maxPhotos - photos.length;
    if (availableSlots <= 0) {
      setErrorMessage(`Maximum limit of ${maxPhotos} photo${maxPhotos > 1 ? 's' : ''} already reached.`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setErrorMessage(
        `Only ${availableSlots} more photo${availableSlots > 1 ? 's' : ''} can be attached (maximum ${maxPhotos}).`
      );
    }

    // Validate each file
    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const res = await uploadApi.uploadHamperPhoto(file);
        if (res.data?.success && res.data.data?.url) {
          uploadedUrls.push(res.data.data.url);
        } else {
          throw new Error((res.data as any)?.message || 'Upload failed');
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...photos, ...uploadedUrls]);
      }
    } catch (err: any) {
      console.error('Hamper photo upload error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to upload photo. Please try again.'
      );
    } finally {
      setIsUploading(false);
      // Reset inputs so user can upload the same file again if desired
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && photos.length < maxPhotos) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || photos.length >= maxPhotos) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-3 p-4 sm:p-5 bg-[#F8FCF9] rounded-2xl border border-[#8BCF9B]/40 shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#237A3B] fill-current" />
              <span>{title}</span>
            </span>
            {isRequired && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Required
              </span>
            )}
            {cardEnabled && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/70 text-[#237A3B] text-[10px] font-bold">
                <Sparkles className="w-3 h-3" /> Keepsake Card
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-600 mt-1 leading-relaxed">
            {subtitle || instructions}
          </p>
        </div>

        {/* Counter Pill */}
        <div className="text-right shrink-0">
          <span className="inline-block px-2.5 py-1 rounded-full bg-white border border-[#8BCF9B]/50 text-xs font-bold text-[#237A3B] shadow-2xs">
            {photos.length}/{maxPhotos} Photos
          </span>
        </div>
      </div>

      {/* Upload Dropzone (Desktop & Mobile) */}
      {photos.length < maxPhotos && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all bg-white ${
            isDragging
              ? 'border-[#237A3B] bg-[#E3F5E8]/40 ring-2 ring-[#8BCF9B]/50'
              : 'border-[#8BCF9B]/60 hover:border-[#237A3B]'
          } ${disabled || isUploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {/* Hidden standard file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={maxPhotos > 1}
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden"
            id="hamper-photo-upload-input"
          />

          {/* Hidden camera capture input for mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            className="hidden"
            id="hamper-camera-upload-input"
          />

          {isUploading ? (
            <div className="py-4 space-y-2 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#237A3B] animate-spin" />
              <p className="text-xs font-bold text-gray-800">Uploading your high-resolution photo...</p>
              <span className="text-[11px] text-gray-500">Securing & preparing keepsake print quality</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto border border-[#8BCF9B]/30 shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="sm:hidden px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#237A3B]" />
                    <span>Take Photo</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 pt-1">
                  Drag and drop here, or browse from device • Supported: <strong>JPG, JPEG, PNG, WEBP</strong> (Max 5MB each)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploaded Thumbnails Grid */}
      {photos.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
            <span>Attached Family Photos ({photos.length}/{maxPhotos}):</span>
            <span className="text-[10px] text-[#237A3B] font-bold">✓ Printed in high-definition keepsake card</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {photos.map((url, idx) => (
              <div
                key={idx}
                className="group relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-[#8BCF9B] shadow-xs"
              >
                <img
                  src={url}
                  alt={`Personal keepsake photo ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback placeholder if image load fails
                    (e.target as HTMLElement).setAttribute(
                      'src',
                      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80'
                    );
                  }}
                />

                {/* Overlay with View and Delete actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(url)}
                    className="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white transition-colors"
                    title="Enlarge preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Always-visible top-right badge */}
                <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  #{idx + 1}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="sm:hidden absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#8BCF9B]" />
                <span>Personal Keepsake Photo Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewModalUrl}
                alt="Enlarged photo preview"
                className="max-h-[65vh] w-auto object-contain rounded-2xl border border-gray-200 shadow-md"
              />
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">This photo will be formatted and printed with your gift.</span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="px-4 py-1.5 bg-[#237A3B] text-white font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
