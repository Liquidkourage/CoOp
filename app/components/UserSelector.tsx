'use client';

import { useUser } from '../contexts/UserContext';
import { useState } from 'react';

export default function UserSelector() {
  const { currentUser, setCurrentUser, availableUsers, addUser } = useUser();
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const handleAddUser = () => {
    if (newUsername.trim()) {
      addUser(newUsername.trim());
      setNewUsername('');
      setShowAddUser(false);
    }
  };

  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap'
    }}>
      <div style={{ fontWeight: '600', color: '#333' }}>
        Current User:
      </div>
      
      {currentUser ? (
        <>
          <div style={{
            padding: '8px 16px',
            background: '#0066cc',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: '600'
          }}>
            {currentUser}
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Switch User
          </button>
        </>
      ) : (
        <div style={{ color: '#666', fontStyle: 'italic' }}>No user selected</div>
      )}

      {availableUsers.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>Switch to:</span>
          {availableUsers.map(user => (
            <button
              key={user}
              onClick={() => setCurrentUser(user)}
              disabled={user === currentUser}
              style={{
                padding: '6px 12px',
                background: user === currentUser ? '#ccc' : '#fff',
                color: user === currentUser ? '#666' : '#0066cc',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: user === currentUser ? 'not-allowed' : 'pointer',
                fontSize: '13px'
              }}
            >
              {user}
            </button>
          ))}
        </div>
      )}

      {!showAddUser ? (
        <button
          onClick={() => setShowAddUser(true)}
          style={{
            padding: '8px 16px',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            marginLeft: 'auto'
          }}
        >
          + Add New User
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
            placeholder="Enter username"
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            autoFocus
          />
          <button
            onClick={handleAddUser}
            style={{
              padding: '6px 12px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAddUser(false);
              setNewUsername('');
            }}
            style={{
              padding: '6px 12px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

