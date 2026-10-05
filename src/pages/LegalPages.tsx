import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Globe, Truck, RotateCcw } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useToast } from '../context/ToastContext';

export const AboutPage: React.FC = () => {
  return (
    <>
      <SEO title="About Nest Care Connect | Healthcare & Wellness" description="Learn about Nest Care Connect mission and multi-country healthcare fulfillment." />
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <Breadcrumbs items={[{ label: 'About Us' }]} />
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs space-y-6">
            <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-block">
              Our Healthcare Mission
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Connecting Loved Ones with Trusted Healthcare Essentials
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Nest Care Connect was founded to bridge the geographical distance between families and their elders or dependents. We specialize in clinically verified medical diagnostic equipment, daily diabetic and blood pressure management items, incontinence support products, and nutritional wellness hampers delivered seamlessly across India, the UAE, and the USA.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/30 space-y-2">
                <ShieldCheck className="w-6 h-6 text-[#237A3B]" />
                <h3 className="font-bold text-sm text-gray-900">Verified Quality</h3>
                <p className="text-xs text-gray-600">Only genuine devices from AccuCheck, Omron, and verified manufacturers.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/30 space-y-2">
                <Globe className="w-6 h-6 text-[#237A3B]" />
                <h3 className="font-bold text-sm text-gray-900">3-Country Reach</h3>
                <p className="text-xs text-gray-600">Localized operations with doorstep customs clearance in IN, AE, and US.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/30 space-y-2">
                <Truck className="w-6 h-6 text-[#237A3B]" />
                <h3 className="font-bold text-sm text-gray-900">Careful Handling</h3>
                <p className="text-xs text-gray-600">Tamper-proof, climate-safe packaging for sensitive testing supplies.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const ContactPage: React.FC = () => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Thank you! Your message has been received by our healthcare support team.', 'success');
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <>
      <SEO title="Contact Support | Nest Care Connect" description="Contact Nest Care Connect customer support." />
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <Breadcrumbs items={[{ label: 'Contact Us' }]} />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Contact details (5 cols) */}
            <div className="md:col-span-5 bg-[#237A3B] text-white p-8 rounded-3xl space-y-6 shadow-md">
              <h2 className="text-2xl font-bold">Get in Touch</h2>
              <p className="text-xs text-gray-200 leading-relaxed">
                Have questions regarding international delivery, product specifications, or bespoke hampers? Our healthcare support team is available 24/7.
              </p>
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#8BCF9B]" />
                  <span>support@nestcareconnect.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#8BCF9B]" />
                  <span>+91 800 123 4567</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#8BCF9B] mt-0.5" />
                  <span>Nest Healthcare Hub, Indiranagar, Bengaluru, 560038, India</span>
                </div>
              </div>
            </div>

            {/* Form (7 cols) */}
            <div className="md:col-span-7 bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900">Send an Inquiry</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we assist your healthcare requirements?"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#237A3B] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 hover:bg-[#1c6330]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const ShippingPolicyPage: React.FC = () => (
  <div className="bg-gray-50 min-h-screen py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Shipping Policy' }]} />
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs prose prose-sm max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Shipping & Delivery Policy</h1>
        <p>Nest Care Connect provides international fulfillment across India, the United Arab Emirates, and the United States.</p>
        <h3 className="text-base font-bold text-gray-900">Fulfillment Timescales</h3>
        <p>• <strong>India:</strong> 2 to 4 business days via expedited air courier.<br/>• <strong>UAE:</strong> 3 to 5 business days with direct Dubai & Abu Dhabi distribution.<br/>• <strong>USA:</strong> 4 to 7 business days with localized tracking.</p>
        <h3 className="text-base font-bold text-gray-900">Packaging Standards</h3>
        <p>All diagnostic devices and test strips are packed with moisture absorption packets, tamper-evident seals, and protective corner guards.</p>
      </div>
    </div>
  </div>
);

export const ReturnsPolicyPage: React.FC = () => (
  <div className="bg-gray-50 min-h-screen py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Return & Refund Policy' }]} />
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs prose prose-sm max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Return & Refund Policy</h1>
        <p>Given the medical nature of diagnostic and hygiene supplies, items that have been unsealed or used cannot be returned for hygiene compliance. If a device arrives damaged or defective, we provide an immediate free replacement or full refund within 7 days of delivery.</p>
      </div>
    </div>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => (
  <div className="bg-gray-50 min-h-screen py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs prose prose-sm max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Privacy Policy</h1>
        <p>Nest Care Connect is committed to safeguarding customer personal health data, contact details, and payment security. We do not sell or monetize customer data under any circumstances.</p>
      </div>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="bg-gray-50 min-h-screen py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Terms & Conditions' }]} />
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs prose prose-sm max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Terms & Conditions</h1>
        <p>By placing an order on Nest Care Connect, you agree to our terms of commercial service, verified payment procedures, and delivery guidelines.</p>
      </div>
    </div>
  </div>
);
