import React from 'react';
import { ShieldCheck, Globe, PackageCheck, CreditCard } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const trustItems = [
    {
      icon: ShieldCheck,
      title: 'Certified Healthcare Products',
      description: 'Clinically tested diagnostic monitors and authentic consumables from verified manufacturers.',
    },
    {
      icon: Globe,
      title: 'Direct Multi-Country Delivery',
      description: 'Doorstep fulfillment across India, UAE, and USA with customs clearance and localized tracking.',
    },
    {
      icon: PackageCheck,
      title: 'Hygienic Tamper-Proof Packaging',
      description: 'Carefully sealed with moisture guards and protective cushioning for delicate electronic devices.',
    },
    {
      icon: CreditCard,
      title: 'Country-Specific Secure Payments',
      description: 'Pay smoothly in INR (Razorpay), AED, or USD (Stripe) with server-verified order reconciliation.',
    },
  ];

  return (
    <section className="py-12 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col space-y-2.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-center justify-center text-[#237A3B]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 leading-snug">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
