'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../contexts/UserContext';
import Navigation from '../components/Navigation';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, availableUsers, addUser } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Check localStorage directly on mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('current-user');
    if (savedUser) {
      // User is already logged in, redirect immediately
      window.location.href = '/';
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    const trimmedUsername = username.trim();
    
    // Set user in localStorage first (this is the source of truth)
    localStorage.setItem('current-user', trimmedUsername);
    
    // Update available users list
    const existingUsers = JSON.parse(localStorage.getItem('available-users') || '[]');
    if (!existingUsers.includes(trimmedUsername)) {
      existingUsers.push(trimmedUsername);
      localStorage.setItem('available-users', JSON.stringify(existingUsers));
    }
    
    // Update context (for immediate UI feedback)
    addUser(trimmedUsername);
    
    // Use window.location.replace to prevent back button issues
    window.location.replace('/');
  };

  const handleSelectUser = (user: string) => {
    // Set user in localStorage first (this is the source of truth)
    localStorage.setItem('current-user', user);
    
    // Update context (for immediate UI feedback)
    setCurrentUser(user);
    
    // Use window.location.replace to prevent back button issues
    window.location.replace('/');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Navigation />
      
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '32px',
            color: '#333',
            textAlign: 'center'
          }}>
            Welcome
          </h1>
          <p style={{
            margin: '0 0 30px 0',
            color: '#666',
            textAlign: 'center',
            fontSize: '16px'
          }}>
            Enter your username to continue
          </p>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee',
              color: '#c33',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Login
            </button>
          </form>

          {availableUsers.length > 0 && (
            <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #eee' }}>
              <p style={{
                margin: '0 0 15px 0',
                color: '#666',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Or select a previous user:
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {availableUsers.map(user => (
                  <button
                    key={user}
                    onClick={() => handleSelectUser(user)}
                    style={{
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      color: '#333',
                      border: '2px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e9ecef';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {user}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p style={{
            margin: '30px 0 0 0',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}>
            No password required. Your username will be remembered.
          </p>
        </div>
      </div>
    </div>
  );
}

