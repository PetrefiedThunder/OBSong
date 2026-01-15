'use client';

import { useState } from 'react';
import { Button } from '@toposonics/ui';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<void>;
  isLoggingIn: boolean;
}

export function LoginModal({
  isOpen,
  onClose,
  onLogin,
  isLoggingIn,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-surface-primary p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-white">Sign In to Save</h2>
        <p className="text-gray-400 mb-6">Enter your credentials to save your composition.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isLoggingIn} fullWidth>
              Sign In
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
