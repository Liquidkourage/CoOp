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
    const savedUser = localStorage.getItem('current-user');
    if (savedUser) {
      setCurrentUserState(savedUser);
    }
    
    // Load list of users who have configurations
    const users = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('excel-config-') || key?.startsWith('trivnow-config-')) {
        const username = key.replace('excel-config-', '').replace('trivnow-config-', '');
        if (username) users.add(username);
      }
    }
    setAvailableUsers(Array.from(users));
  }, []);

  const setCurrentUser = (user: string | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('current-user', user);
      // Add to available users if not already there
      setAvailableUsers(prev => {
        if (!prev.includes(user)) {
          return [...prev, user];
        }
        return prev;
      });
    } else {
      localStorage.removeItem('current-user');
    }
  };

  const addUser = (username: string) => {
    if (username && !availableUsers.includes(username)) {
      setAvailableUsers(prev => [...prev, username]);
    }
    setCurrentUser(username);
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

