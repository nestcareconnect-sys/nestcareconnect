import React from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CustomHamperBuilder } from '../components/hamper/CustomHamperBuilder';

export const CustomHamperPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Build Your Custom Healthcare Hamper | Nest Care Connect"
        description="Select specific diagnostic monitors, strips, diapers, and nutrition items to assemble a bespoke healthcare hamper for delivery to India, UAE, or USA."
      />

      <div className="bg-gray-50 min-h-screen py-8 pb-28 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Breadcrumbs items={[{ label: 'Build Your Own Hamper' }]} />
          <CustomHamperBuilder />
        </div>
      </div>
    </>
  );
};
