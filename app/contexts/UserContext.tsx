'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void;
  availableUsers: string[];
  addUser: (username: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  // Load current user from localStorage on mount
  useEffect(() => {
    // Check localStorage directly to avoid hydration issues
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('current-user');
      if (savedUser) {
        setCurrentUserState(savedUser);
      }
      
      // Load list of users who have configurations or have logged in before
      const users = new Set<string>();
      
      // Add current user if exists
      if (savedUser) {
        users.add(savedUser);
      }
      
      // Load users from config keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('excel-config-') || key?.startsWith('trivnow-config-') || key?.startsWith('import-config-')) {
          const username = key.replace('excel-config-', '').replace('trivnow-config-', '').replace(/^import-config-.*?-/, '');
          if (username) users.add(username);
        }
      }
      
      // Also check for users stored in a dedicated list
      const usersList = localStorage.getItem('available-users');
      if (usersList) {
        try {
          const parsed = JSON.parse(usersList);
          parsed.forEach((user: string) => users.add(user));
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      setAvailableUsers(Array.from(users));
    }
  }, []);

  const setCurrentUser = (user: string | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('current-user', user);
      // Add to available users if not already there
      setAvailableUsers(prev => {
        const updated = !prev.includes(user) ? [...prev, user] : prev;
        // Also save to localStorage for persistence
        localStorage.setItem('available-users', JSON.stringify(updated));
        return updated;
      });
    } else {
      localStorage.removeItem('current-user');
    }
  };

  const addUser = (username: string) => {
    if (username) {
      setAvailableUsers(prev => {
        const updated = !prev.includes(username) ? [...prev, username] : prev;
        // Save to localStorage for persistence
        localStorage.setItem('available-users', JSON.stringify(updated));
        return updated;
      });
      setCurrentUser(username);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, availableUsers, addUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}


