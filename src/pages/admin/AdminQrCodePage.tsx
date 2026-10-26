import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Youtube,
  Download,
  Printer,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  FileImage,
  Layers,
  Heart,
  X,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { QrCodeItem } from '../../types';
import { qrCodeApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { parseAndValidateYouTubeUrl } from '../../utils/youtube';

const SAMPLE_YOUTUBE_URLS = [
  {
    label: 'Welcome to Nest Care Connect',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    label: 'Elderly Wellness Hamper Guide',
    url: 'https://youtu.be/dQw4w9WgXcQ',
  },
  {
    label: 'New Mum Blessing Message',
    url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  },
];

const PRESET_LABELS = [
  'Welcome Video',
  'Thank You Video',
  'Premium Care Hamper',
  'Elderly Care Guide',
  'New Mum Celebration',
  'Family Blessing Message',
];

export const AdminQrCodePage: React.FC = () => {
  const { showToast } = useToast();

  // Generator Form State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [label, setLabel] = useState('');
  const [includeBranding, setIncludeBranding] = useState(true);
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live Preview State
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [activeItem, setActiveItem] = useState<QrCodeItem | null>(null);

  // History List State
  const [qrCodes, setQrCodes] = useState<QrCodeItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [zoomedItem, setZoomedItem] = useState<QrCodeItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printItem, setPrintItem] = useState<{
    qrDataUrl: string;
    label?: string | null;
    youtubeUrl: string;
    includeBranding: boolean;
    includeInstructions: boolean;
  } | null>(null);

  // Printable card ref
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Validate YouTube URL in real-time
  const validation = parseAndValidateYouTubeUrl(youtubeUrl);
  const hasTypedUrl = youtubeUrl.trim().length > 0;
  const isValidYouTubeUrl = validation.isValid;

  // Load previously generated QR codes on mount
  useEffect(() => {
    loadQrCodes();
  }, []);

  const loadQrCodes = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await qrCodeApi.getAll();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setQrCodes(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Re-generate client preview whenever URL changes
  useEffect(() => {
    const urlToEncode = isValidYouTubeUrl && validation.normalizedUrl
      ? validation.normalizedUrl
      : 'https://www.youtube.com/@nestcareconnect';

    QRCode.toDataURL(urlToEncode, {
      width: 800,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setPreviewQrDataUrl(dataUrl))
      .catch(() => {});

    QRCode.toString(urlToEncode, {
      type: 'svg',
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => setPreviewSvg(svg))
      .catch(() => {});
  }, [youtubeUrl, isValidYouTubeUrl, validation.normalizedUrl]);

  // Handle Form Submit to Generate & Persist in Database
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasTypedUrl) {
      showToast('Please enter a YouTube video URL.', 'error');
      return;
    }

    if (!isValidYouTubeUrl) {
      showToast(validation.error || 'Please enter a valid YouTube video address.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await qrCodeApi.create({
        youtubeUrl: validation.normalizedUrl || youtubeUrl.trim(),
        label: label.trim() || undefined,
      });

      if (res.data?.success && res.data.data) {
        const created = res.data.data;
        setQrCodes((prev) => [created, ...prev]);
        setActiveItem(created);
        setPreviewQrDataUrl(created.qrDataUrl);
        if (created.svg) setPreviewSvg(created.svg);
        showToast('QR Code generated and saved to history!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to generate QR code.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'An error occurred while generating the QR code.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download QR as PNG
  const handleDownloadPng = (
    dataUrl: string,
    filename: string = 'nest-care-hamper-qr'
  ) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const cleanName = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    a.download = `${cleanName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('PNG QR code downloaded successfully!', 'success');
  };

  // Download QR as SVG
  const handleDownloadSvg = (
    targetUrl: string,
    filename: string = 'nest-care-hamper-qr'
  ) => {
    QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 4,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svgString) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        a.download = `${cleanName}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('High-quality SVG QR code downloaded!', 'success');
      })
      .catch(() => {
        showToast('Failed to generate SVG.', 'error');
      });
  };

  // Download Printable Hamper Insert Card as a high-res Composite Image
  const handleDownloadCardPng = async (
    qrUrl: string,
    cardLabel?: string | null,
    filename: string = 'nest-care-card'
  ) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Header Banner Accent
      ctx.fillStyle = '#F4FAF5';
      ctx.fillRect(40, 40, canvas.width - 80, 220);

      // Rounded border around card
      ctx.strokeStyle = '#D1E7D8';
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Brand Title
      ctx.fillStyle = '#237A3B';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Nest Care Connect', canvas.width / 2, 135);

      // Subtitle
      ctx.fillStyle = '#555555';
      ctx.font = '500 32px sans-serif';
      ctx.fillText('CARE HAMPER VIDEO MESSAGE', canvas.width / 2, 195);

      // Draw QR Code Image centered
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrUrl;

      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      const qrSize = 750;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 320;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Label Below QR Code
      const displayLabel = cardLabel || 'A Special Message for You';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(displayLabel, canvas.width / 2, 1150);

      // Scan Instructions
      ctx.fillStyle = '#4B5563';
      ctx.font = '32px sans-serif';
      ctx.fillText('Scan with your phone camera to watch video', canvas.width / 2, 1220);

      // Footer
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '26px sans-serif';
      ctx.fillText('www.nestcareconnect.com  •  Healthcare & NRI Gifting Hub', canvas.width / 2, 1370);

      // Trigger download
      const compositeDataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = compositeDataUrl;
      const cleanName = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      a.download = `${cleanName}-insert-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Hamper Insert Card PNG downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to create composite card image.', 'error');
    }
  };

  // Trigger Native Print Dialog for Hamper Card
  const handlePrint = (item: {
    qrDataUrl: string;
    label?: string | null;
    youtubeUrl: string;
  }) => {
    setPrintItem({
      ...item,
      includeBranding,
      includeInstructions,
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Copy YouTube URL with feedback
  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('YouTube URL copied to clipboard!', 'success');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Delete QR Code
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await qrCodeApi.delete(deletingId);
      if (res.data?.success) {
        setQrCodes((prev) => prev.filter((item) => item.id !== deletingId));
        if (activeItem?.id === deletingId) {
          setActiveItem(null);
        }
        showToast('QR Code removed from history.', 'success');
      } else {
        showToast(res.data?.message || 'Failed to delete QR code.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error deleting QR code.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // Filtered QR codes list
  const filteredCodes = qrCodes.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchLabel = item.label?.toLowerCase().includes(query);
    const matchUrl = item.youtubeUrl.toLowerCase().includes(query);
    return matchLabel || matchUrl;
  });

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SEO
        title="QR Code Generator | Nest Care Connect Admin"
        description="Generate printable YouTube video QR codes to place inside Nest Care Connect care hampers."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF5EE] text-[#237A3B] flex items-center justify-center shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Code Generator</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate high-resolution printable QR codes for YouTube videos to place inside care hamper boxes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadQrCodes}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync History</span>
          </button>
        </div>
      </div>

      {/* Main Generator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Presets */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">1. Enter Video Link & Label</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                The QR code will directly encode this YouTube URL with error correction for clean scanning.
              </p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAF5EE] text-[#237A3B] rounded-full">
              Hamper Insert Ready
            </span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* YouTube URL Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube Video URL <span className="text-red-500">*</span>
                </label>
                {hasTypedUrl && isValidYouTubeUrl && (
                  <span className="text-[11px] font-semibold text-[#237A3B] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid YouTube Link
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    hasTypedUrl
                      ? isValidYouTubeUrl
                        ? 'border-[#237A3B] focus:ring-[#8BCF9B]/40 bg-[#F4FAF5]/40'
                        : 'border-red-400 focus:ring-red-200 bg-red-50/20'
                      : 'border-gray-300 focus:ring-[#8BCF9B]/40 focus:border-[#237A3B]'
                  }`}
                />
                {hasTypedUrl && (
                  <button
                    type="button"
                    onClick={() => setYoutubeUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Validation Warning or Success Banner */}
              {hasTypedUrl && !isValidYouTubeUrl && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Invalid YouTube link: </span>
                    {validation.error}
                  </div>
                </div>
              )}

              {/* Detected Video Preview Banner */}
              {hasTypedUrl && isValidYouTubeUrl && validation.videoId && (
                <div className="mt-2.5 p-3 bg-[#EAF5EE] border border-[#C5E5CF] rounded-xl flex items-center justify-between text-xs text-[#1C6330]">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${validation.videoId}/mqdefault.jpg`}
                      alt="Thumbnail preview"
                      className="w-16 h-10 object-cover rounded-lg shadow-xs shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-semibold truncate">YouTube Video ID: {validation.videoId}</p>
                      <p className="text-[11px] text-gray-600 truncate">{validation.normalizedUrl}</p>
                    </div>
                  </div>
                  <a
                    href={validation.normalizedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow-2xs shrink-0 flex items-center gap-1"
                  >
                    <span>Test</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Quick Sample Links */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="text-[11px] font-medium text-gray-400">Sample URLs:</span>
                {SAMPLE_YOUTUBE_URLS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setYoutubeUrl(sample.url);
                      setLabel(sample.label);
                    }}
                    className="text-[11px] font-medium text-[#237A3B] hover:text-[#1c6330] hover:underline"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Label */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-800">
                  QR Code Label <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <span className="text-[11px] text-gray-400">{label.length}/60 chars</span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Premium Care Hamper, Welcome Video, or Thank You Video"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8BCF9B]/40 focus:border-[#237A3B]"
              />

              {/* Preset Label Pills */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRESET_LABELS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLabel(preset)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                      label === preset
                        ? 'bg-[#237A3B] text-white border-[#237A3B]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Design & Print Layout Customizations */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
              <h3 className="text-xs font-bold text-gray-800">Packaging Print Options</h3>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBranding}
                    onChange={(e) => setIncludeBranding(e.target.checked)}
                    className="w-4 h-4 text-[#237A3B] rounded-sm focus:ring-[#237A3B]"
                  />
                  <span className="text-gray-700">
                    Include <strong>Nest Care Connect</strong> brand header on insert cards
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInstructions}
                    onChange={(e) => setIncludeInstructions(e.target.checked)}
                    className="w-4 h-4 text-[#237A3B] rounded-sm focus:ring-[#237A3B]"
                  />
                  <span className="text-gray-700">
                    Include scan instruction <em>"Scan with your phone's camera to watch"</em>
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating || !hasTypedUrl || !isValidYouTubeUrl}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#237A3B] hover:bg-[#1C6330] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating & Saving to Database...</span>
                  </>
                ) : (
                  <>
                    
                    <span>Generate & Save QR Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive QR Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">2. Hamper Box Insert Preview</h2>
                <p className="text-xs text-gray-500 mt-0.5">High-contrast, scannable format</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Scannable
              </span>
            </div>

            {/* Physical Insert Card Mockup */}
            <div
              id="qr-preview-card"
              className="relative mx-auto bg-white rounded-2xl border-2 border-dashed border-[#D1E7D8] p-6 shadow-sm text-center flex flex-col items-center justify-center transition-all hover:border-[#237A3B]/60"
              style={{ maxWidth: '340px' }}
            >
              {/* Optional Brand Name */}
              {includeBranding && (
                <div className="mb-3">
                  <div className="flex items-center justify-center gap-1.5 text-[#237A3B] font-bold text-sm tracking-tight">
                    <Heart className="w-4 h-4 fill-[#237A3B]" />
                    <span>Nest Care Connect</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-0.5">
                    Care Hamper Video Message
                  </p>
                </div>
              )}

              {/* Scannable QR Code */}
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs my-2">
                {previewQrDataUrl ? (
                  <img
                    src={previewQrDataUrl}
                    alt="YouTube Video QR Code"
                    className="w-56 h-56 object-contain block mx-auto"
                  />
                ) : (
                  <div className="w-56 h-56 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                    Generating QR Preview...
                  </div>
                )}
              </div>

              {/* Custom Label */}
              <div className="mt-3 space-y-1 w-full px-2">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {label.trim() || 'Hamper Video Message'}
                </p>

                {includeInstructions && (
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Scan with your phone's camera to watch your video
                  </p>
                )}
              </div>

              {/* Link test chip */}
              <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1 text-[11px] text-gray-400">
                <span className="truncate max-w-[200px]">
                  {isValidYouTubeUrl ? validation.normalizedUrl : 'https://youtube.com/...'}
                </span>
                {isValidYouTubeUrl && validation.normalizedUrl && (
                  <a
                    href={validation.normalizedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#237A3B] hover:underline"
                    title="Open YouTube video in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Download & Print Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadPng(
                      previewQrDataUrl,
                      label.trim() ? `qr-${label.trim()}` : 'nestcare-video-qr'
                    )
                  }
                  disabled={!previewQrDataUrl}
                  className="w-full py-2.5 px-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadSvg(
                      isValidYouTubeUrl && validation.normalizedUrl
                        ? validation.normalizedUrl
                        : 'https://youtube.com',
                      label.trim() ? `qr-${label.trim()}` : 'nestcare-video-qr'
                    )
                  }
                  className="w-full py-2.5 px-3 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 transition-all shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <FileImage className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download SVG</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadCardPng(
                      previewQrDataUrl,
                      label.trim() || 'Hamper Video Message',
                      label.trim() ? `hamper-card-${label.trim()}` : 'nestcare-hamper-card'
                    )
                  }
                  disabled={!previewQrDataUrl}
                  className="w-full py-2.5 px-3 bg-[#EAF5EE] hover:bg-[#D4EBDC] text-[#237A3B] text-xs font-bold rounded-xl border border-[#C5E5CF] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Download complete card with Nest Care Connect branding"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Card PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePrint({
                      qrDataUrl: previewQrDataUrl,
                      label: label.trim() || 'Hamper Video Message',
                      youtubeUrl: isValidYouTubeUrl && validation.normalizedUrl
                        ? validation.normalizedUrl
                        : 'https://youtube.com',
                    })
                  }
                  disabled={!previewQrDataUrl}
                  className="w-full py-2.5 px-3 bg-[#237A3B] hover:bg-[#1C6330] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated QR Codes History Section */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900">Generated QR Codes</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                {qrCodes.length} {qrCodes.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanent history of all generated hamper QR codes stored in your database.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by label or URL..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8BCF9B]/40 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table of Generated QR Codes */}
        {isLoadingHistory ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#237A3B]" />
            Loading QR Code records from database...
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="py-14 text-center text-gray-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {searchQuery ? 'No matching QR codes found' : 'No QR codes generated yet'}
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Enter a YouTube video link above to generate and save your first hamper QR code.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/60">
                  <th className="py-3 px-4 rounded-l-xl">QR Preview</th>
                  <th className="py-3 px-4">QR Code Label</th>
                  <th className="py-3 px-4">YouTube Video URL</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCodes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => setZoomedItem(item)}
                        className="relative w-14 h-14 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs cursor-pointer group-hover:border-[#237A3B] transition-colors"
                        title="Click to enlarge"
                      >
                        <img
                          src={item.qrDataUrl}
                          alt={item.label || 'QR Code'}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </td>

                    {/* Label & Meta */}
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.label || 'Hamper Video Message'}</span>
                      </div>
                      <span className="text-[10px] font-normal text-gray-400 block mt-0.5">
                        ID: {item.id.substring(0, 8)}...
                      </span>
                    </td>

                    {/* YouTube Video URL */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 max-w-xs">
                        <span className="truncate text-gray-700 font-mono text-[11px]" title={item.youtubeUrl}>
                          {item.youtubeUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item.youtubeUrl, item.id)}
                          className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors shrink-0"
                          title="Copy YouTube URL"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors shrink-0"
                          title="Open YouTube video"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      <div>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadPng(item.qrDataUrl, `qr-${item.label || item.id}`)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Download PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSvg(item.youtubeUrl, `qr-${item.label || item.id}`)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Download SVG"
                        >
                          <FileImage className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handlePrint({
                              qrDataUrl: item.qrDataUrl,
                              label: item.label,
                              youtubeUrl: item.youtubeUrl,
                            })
                          }
                          className="p-1.5 text-[#237A3B] hover:text-[#1c6330] bg-[#EAF5EE] hover:bg-[#D4EBDC] rounded-lg transition-colors"
                          title="Print Hamper Card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-1"
                          title="Delete QR code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enlarged QR Code Modal */}
      {zoomedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setZoomedItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                {zoomedItem.label || 'Hamper Video QR Code'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{zoomedItem.youtubeUrl}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-inner inline-block">
              <img
                src={zoomedItem.qrDataUrl}
                alt={zoomedItem.label || 'QR Code'}
                className="w-64 h-64 object-contain mx-auto"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadPng(zoomedItem.qrDataUrl, `qr-${zoomedItem.label || 'code'}`)}
                className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSvg(zoomedItem.youtubeUrl, `qr-${zoomedItem.label || 'code'}`)}
                className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <FileImage className="w-3.5 h-3.5 text-blue-600" />
                <span>SVG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomedItem(null);
                  handlePrint(zoomedItem);
                }}
                className="flex-1 py-2.5 bg-[#237A3B] hover:bg-[#1C6330] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Delete QR Code?</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to delete this QR code from your permanent history? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Layout (Used by @media print) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-center" ref={printAreaRef}>
        {printItem && (
          <div className="max-w-md mx-auto border-2 border-dashed border-gray-400 p-8 rounded-3xl space-y-4 bg-white">
            {printItem.includeBranding && (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nest Care Connect</h1>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
                  Care Hamper Video Message
                </p>
              </div>
            )}

            <div className="p-4 bg-white inline-block">
              <img
                src={printItem.qrDataUrl}
                alt="QR Code"
                className="w-72 h-72 object-contain mx-auto"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                {printItem.label || 'A Special Message for You'}
              </h2>
              {printItem.includeInstructions && (
                <p className="text-sm text-gray-600">
                  Scan with your phone's camera to watch your video
                </p>
              )}
            </div>

            <p className="text-[11px] text-gray-400 pt-3 border-t border-gray-200">
              www.nestcareconnect.com  •  NRI Healthcare & Gifting Hub
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
