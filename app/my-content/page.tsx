'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../contexts/UserContext';
import Navigation from '../components/Navigation';

export default function MyContentPage() {
  const { currentUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      // Redirect to home page with creator filter
      router.push(`/?creator=${encodeURIComponent(currentUser)}&view=search`);
    } else {
      // If not logged in, redirect to login
      router.push('/login');
    }
  }, [currentUser, router]);

  return (
    <div>
      <Navigation />
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading your content...</p>
      </div>
    </div>
  );
}

