import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Upload,
  AlertCircle,
  Eye,
  Film,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { WhatsAppMediaItem } from '../../types';
import { whatsappApi } from '../../services/api';

interface WhatsAppMediaSectionProps {
  mediaList: WhatsAppMediaItem[];
  onMediaChange: (media: WhatsAppMediaItem[]) => void;
  sectionNumber?: number;
}

export const WhatsAppMediaSection: React.FC<WhatsAppMediaSectionProps> = ({
  mediaList,
  onMediaChange,
  sectionNumber = 3,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<WhatsAppMediaItem | null>(null);

  // Constants for validations
  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
  const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']; // mp4, mov

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = async (files: FileList | null, expectedType: 'IMAGE' | 'VIDEO') => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const validFiles: File[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const mime = file.type.toLowerCase();
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (expectedType === 'IMAGE') {
        const isValidImageExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        const isValidImageMime = ALLOWED_IMAGE_TYPES.includes(mime);

        if (!isValidImageExt && !isValidImageMime) {
          setUploadError(`"${file.name}" is not a supported image. Please upload JPG, JPEG, PNG, or WEBP.`);
          return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
          setUploadError(`"${file.name}" exceeds the 15 MB image limit.`);
          return;
        }
      } else {
        const isValidVideoExt = ['.mp4', '.mov'].includes(ext);
        const isValidVideoMime = ALLOWED_VIDEO_TYPES.includes(mime);

        if (!isValidVideoExt && !isValidVideoMime) {
          setUploadError(`"${file.name}" is not a supported video. Please upload MP4 or MOV.`);
          return;
        }

        if (file.size > MAX_VIDEO_SIZE) {
          setUploadError(`"${file.name}" exceeds the 30 MB video limit.`);
          return;
        }
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Check total items ceiling
    if (mediaList.length + validFiles.length > 10) {
      setUploadError('You can attach up to 10 photos and videos in total.');
      return;
    }

    setIsUploading(true);

    try {
      const res = await whatsappApi.uploadMedia(validFiles);
      if (res.data?.success && Array.isArray(res.data.data)) {
        onMediaChange([...mediaList, ...res.data.data]);
      } else {
        throw new Error(res.data?.message || 'Failed to upload files.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload selected media files.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      // Reset inputs so user can re-select same file if needed
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = async (indexToRemove: number) => {
    const item = mediaList[indexToRemove];
    if (!item) return;

    // Optimistically remove from state
    const updated = mediaList.filter((_, idx) => idx !== indexToRemove);
    onMediaChange(updated);

    // Call delete endpoint if key exists
    if (item.key) {
      try {
        await whatsappApi.deleteMedia(item.key);
      } catch (err) {
        console.warn('Failed to delete media on server:', err);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold shrink-0">
            {sectionNumber}
          </span>
          <span>Share Photos & Videos on WhatsApp</span>
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#237A3B] bg-[#F1FAF3] border border-[#8BCF9B]/40 px-3 py-1 rounded-full self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#237A3B]" />
          <span>Keepsake & Care Concierge</span>
        </span>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
        Want to share special memories or additional details? Send photos and videos directly to our WhatsApp team.
      </p>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, 'IMAGE')}
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        accept=".mp4,.mov,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, 'VIDEO')}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={isUploading || mediaList.length >= 10}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1FAF3] hover:bg-[#E8F7EC] text-[#237A3B] border border-[#8BCF9B]/60 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <ImageIcon className="w-4 h-4 text-[#237A3B]" />
          <span>Upload Images</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={isUploading || mediaList.length >= 10}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1FAF3] hover:bg-[#E8F7EC] text-[#237A3B] border border-[#8BCF9B]/60 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <VideoIcon className="w-4 h-4 text-[#237A3B]" />
          <span>Upload Videos</span>
        </button>

        {isUploading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#237A3B] bg-emerald-50 px-3 py-1.5 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading media to secure storage...</span>
          </div>
        )}
      </div>

      {/* Specifications & Format Guidance */}
      <div className="text-[11px] text-gray-400 space-y-0.5">
        <p>• Supported image formats: <strong>JPG, JPEG, PNG, WEBP</strong> (up to 15 MB each)</p>
        <p>• Supported video formats: <strong>MP4, MOV</strong> (up to 30 MB each)</p>
        <p>• Select multiple files simultaneously from desktop, iPhone, or Android device.</p>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Previews Grid */}
      {mediaList.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              Attached Media ({mediaList.length}/10):
            </span>
            <span className="text-[11px] text-[#237A3B] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to share with WhatsApp team
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaList.map((item, idx) => {
              const isVideo = item.mediaType === 'VIDEO';

              return (
                <div
                  key={item.id || idx}
                  className="relative group bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-[#8BCF9B]"
                >
                  {/* Thumbnail / Visual */}
                  <div className="aspect-square bg-gray-900/5 relative overflow-hidden flex items-center justify-center">
                    {isVideo ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-2">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover opacity-60"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center text-white">
                            <Film className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white tracking-wider">
                          VIDEO
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.originalName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Quick Preview Overlay Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold"
                      title="Enlarge preview"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMedia(idx);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata label */}
                  <div className="p-2 text-[11px] space-y-0.5 bg-white border-t border-gray-100">
                    <p className="font-semibold text-gray-800 truncate" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{item.mediaType}</span>
                      <span>{formatFileSize(item.fileSize)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal for enlarged image/video preview */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 bg-[#237A3B] text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate max-w-md">
                {previewItem.originalName}
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex items-center justify-center max-h-[70vh] overflow-hidden">
              {previewItem.mediaType === 'VIDEO' ? (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  className="max-h-[65vh] w-auto max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.originalName}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
                />
              )}
            </div>

            <div className="p-4 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
              <span>Size: {formatFileSize(previewItem.fileSize)} • Type: {previewItem.mimeType}</span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-[#237A3B] text-white font-bold rounded-xl hover:bg-[#1c6330]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
