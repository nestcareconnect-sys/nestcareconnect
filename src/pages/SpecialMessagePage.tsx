import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Play, Film, Image, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { ordersApi } from '../services/api';
import { SpecialMessagePayload } from '../types';

export const SpecialMessagePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [messageData, setMessageData] = useState<SpecialMessagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpecialMessage() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await ordersApi.getSpecialMessage(token);
        if (res.data.success) {
          setMessageData(res.data.data);
        } else {
          setError('Special message could not be loaded.');
        }
      } catch (err: any) {
        // Fallback for demo token
        if (token === 'demo-love-video-2026') {
          setMessageData({
            token: 'demo-love-video-2026',
            orderNumber: 'NCC-2026-98102',
            buyerName: 'Rajesh & Ananya Sharma (California, USA)',
            recipientName: 'Mum & Dad (Bengaluru)',
            hamperName: 'Premium Care Hamper',
            message:
              'Happy 45th Anniversary Mum & Dad! We miss you so much and cannot wait to visit home soon. Sending you this special care package with all our love and blessings. Stay healthy and smiling always! ❤️',
            photos: [
              'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80',
            ],
            videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
            videoStatus: 'VIDEO_READY',
            createdAt: new Date().toISOString(),
          });
        } else {
          setError('Special message not found or link has expired.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSpecialMessage();
  }, [token]);

  // Helper to extract YouTube embed URL
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const vid = url.split('watch?v=')[1]?.split('&')[0];
      return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=0&rel=0`;
    }
    if (url.includes('youtu.be/')) {
      const vid = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=0&rel=0`;
    }
    if (url.includes('vimeo.com/')) {
      const vid = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${vid}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1FAF3] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#237A3B]">Opening your special family greeting...</p>
        </div>
      </div>
    );
  }

  if (error || !messageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Message Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">
            The special video message link could not be verified or is still being prepared by our concierge team.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#237A3B] text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const embedUrl = messageData.videoUrl ? getEmbedUrl(messageData.videoUrl) : null;
  const isDirectVideo = messageData.videoUrl?.endsWith('.mp4') || messageData.videoUrl?.endsWith('.webm');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1FAF3] via-white to-[#F1FAF3] py-8 sm:py-14 px-4 sm:px-6">
      <SEO
        title="Your Special Family Message | Nest Care Connect"
        description="A private, heartfelt video and greeting card from your family across the miles."
      />

      <div className="max-w-3xl mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#8BCF9B] flex items-center justify-center text-[#237A3B]">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="font-extrabold text-lg text-[#237A3B] tracking-tight">NESTCARE CONNECT</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-[#8BCF9B]/60 text-[#237A3B] text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#237A3B]" />
            <span>With Love From Your Family ❤️</span>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden">
          {/* Greeting Banner */}
          <div className="bg-gradient-to-r from-[#237A3B] to-[#2e944a] text-white p-6 sm:p-8 text-center">
            <span className="text-xs font-semibold text-[#8BCF9B] uppercase tracking-wider block mb-1">
              A Personal Note For
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {messageData.recipientName}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1">
              Sent with love by <span className="font-bold text-white">{messageData.buyerName}</span>
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* 1. Video Player Section */}
            {messageData.videoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <Film className="w-4 h-4 text-[#237A3B]" />
                  <span>Personalised Family Video</span>
                </div>

                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-gray-100 relative">
                  {isDirectVideo ? (
                    <video
                      src={messageData.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                      poster={messageData.photos?.[0]}
                    />
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title="Personalised Family Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#F1FAF3] rounded-2xl border border-[#8BCF9B]/40 text-center">
                <Heart className="w-8 h-8 text-[#237A3B] mx-auto mb-2 fill-current" />
                <h3 className="font-bold text-gray-900 text-sm">Video Greeting Being Processed</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Our concierge team is finalizing the high-definition video link. Please check back shortly.
                </p>
              </div>
            )}

            {/* 2. Personal Note / Message Card */}
            {messageData.message && (
              <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-200/60 relative">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-current text-amber-600" />
                  <span>Personal Message Card</span>
                </div>
                <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-serif italic whitespace-pre-line">
                  "{messageData.message}"
                </p>
              </div>
            )}

            {/* 3. Family Photo Gallery */}
            {messageData.photos && messageData.photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <Image className="w-4 h-4 text-[#237A3B]" />
                  <span>Cherished Family Moments ({messageData.photos.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {messageData.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhoto(photo)}
                      className="aspect-square rounded-2xl overflow-hidden border border-gray-200 hover:border-[#8BCF9B] transition-all hover:scale-[1.02] shadow-xs group relative"
                    >
                      <img
                        src={photo}
                        alt={`Family memory ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        View Photo
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hamper details footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#237A3B]" />
                <span>Delivered with care by Nest Care Connect</span>
              </div>
              <span className="font-semibold text-gray-700">{messageData.hamperName}</span>
            </div>
          </div>
        </div>

        {/* Bottom Home link */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#237A3B]"
          >
            <span>Visit Nest Care Connect Home</span>
          </Link>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white p-2">
            <img src={selectedPhoto} alt="Zoomed memory" className="w-full h-full max-h-[80vh] object-contain rounded-2xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
