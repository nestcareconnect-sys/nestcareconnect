import React from 'react';
import { MessageSquare, Paperclip, ExternalLink, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { WhatsAppMediaItem } from '../../types';

interface WhatsAppContinueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOpenWhatsApp: () => void;
  mediaList: WhatsAppMediaItem[];
  businessPhone: string;
}

export const WhatsAppContinueModal: React.FC<WhatsAppContinueModalProps> = ({
  isOpen,
  onClose,
  onConfirmOpenWhatsApp,
  mediaList,
  businessPhone,
}) => {
  if (!isOpen) return null;

  const hasMedia = mediaList.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#237A3B] to-[#1e6833] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Continue on WhatsApp</h3>
              <p className="text-white/80 text-xs">Official Nest Care Connect Business Concierge</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40">
            <CheckCircle2 className="w-5 h-5 text-[#237A3B] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700 space-y-1">
              <p className="font-bold text-gray-900">Order Summary Ready</p>
              <p>
                Your buyer information, recipient address in India, and care package details have been formatted for our business WhatsApp (+{businessPhone.replace(/\D/g, '')}).
              </p>
            </div>
          </div>

          {hasMedia && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Paperclip className="w-4 h-4 text-amber-700" />
                <span>Media Attachment Notice ({mediaList.length} files selected)</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                WhatsApp security policies do not allow web browsers to automatically attach files from your device.
              </p>
              <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/60 text-amber-900 font-medium">
                👉 <strong>How to send:</strong> Once WhatsApp opens with your prefilled order message, tap the <strong>📎 (attachment)</strong> icon in WhatsApp and send your photos/videos directly to our concierge.
              </div>
              <p className="text-[11px] text-amber-700">
                (Your files have also been uploaded to our secure servers with preview links included in your message).
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#237A3B]" />
            <span>End-to-end encrypted direct connection to Nest Care Connect support.</span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-xs text-center cursor-pointer order-2 sm:order-1"
            >
              Back to Checkout
            </button>

            <button
              type="button"
              onClick={onConfirmOpenWhatsApp}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer order-1 sm:order-2"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Open WhatsApp Chat Now</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
