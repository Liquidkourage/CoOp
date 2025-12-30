'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '../contexts/UserContext';

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/stats', label: 'Statistics', icon: '📊' },
  { href: '/rounds', label: 'Rounds', icon: '📋' },
  { href: '/sets', label: 'Sets', icon: '📚' },
  { href: '/submit', label: 'Submit Content', icon: '➕' },
  { href: '/import', label: 'Import CSV/Excel', icon: '📥' },
  { href: '/configure-import', label: 'Configure Import Format', icon: '⚙️' },
  { href: '/admin/delete', label: 'Delete Content', icon: '🗑️' },
  { href: '/login', label: 'Login', icon: '🔐' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { currentUser } = useUser();

  // Filter out login link if already logged in
  const filteredNavItems = navItems.filter(item => {
    if (item.href === '/login') {
      return !currentUser; // Only show login if not logged in
    }
    return true;
  });

  return (
    <nav style={{ 
      marginTop: '20px', 
      display: 'flex', 
      gap: '15px', 
      flexWrap: 'wrap',
      padding: '15px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    }}>
      {filteredNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              color: isActive ? '#ff6600' : '#0066cc',
              textDecoration: 'none',
              fontWeight: isActive ? '600' : '500',
              padding: '8px 12px',
              borderRadius: '4px',
              background: isActive ? '#fff3e0' : 'transparent',
              border: isActive ? '1px solid #ff6600' : '1px solid transparent',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#e3f2fd';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

