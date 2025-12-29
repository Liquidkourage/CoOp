'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav style={{
      marginBottom: '20px',
      fontSize: '14px',
      color: '#666'
    }}>
      {items.map((item, index) => (
        <span key={index}>
          {item.href ? (
            <Link
              href={item.href}
              style={{
                color: '#0066cc',
                textDecoration: 'none'
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: '#333', fontWeight: '600' }}>{item.label}</span>
          )}
          {index < items.length - 1 && (
            <span style={{ margin: '0 8px', color: '#999' }}>›</span>
          )}
        </span>
      ))}
    </nav>
  );
}

