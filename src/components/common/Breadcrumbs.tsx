import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  url?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-xs text-gray-500 py-3 overflow-x-auto whitespace-nowrap">
      <Link
        to="/"
        className="flex items-center hover:text-[#237A3B] transition-colors"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            {item.url && !isLast ? (
              <Link
                to={item.url}
                className="hover:text-[#237A3B] transition-colors max-w-[160px] truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-900 max-w-[200px] truncate">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
