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

// Legacy configuration pages (still accessible but configure-import is preferred)
const legacyNavItems: NavItem[] = [
  { href: '/configure-trivnow', label: 'Configure TrivNow (Legacy)', icon: '📋' },
  { href: '/configure-excel', label: 'Configure Excel (Legacy)', icon: '📊' },
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

  const allItems = [...filteredNavItems, ...legacyNavItems];

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
      {allItems.map((item) => {
        const isActive = pathname === item.href;
        const isLegacy = legacyNavItems.some(legacy => legacy.href === item.href);
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
              gap: '6px',
              opacity: isLegacy ? 0.8 : 1,
              fontSize: isLegacy ? '0.9em' : '1em'
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
            title={isLegacy ? 'Legacy page - Use Configure Import Format instead' : undefined}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

