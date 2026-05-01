'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@toposonics/ui';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<void>;
  isLoggingIn: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function LoginModal({
  isOpen,
  onClose,
  onLogin,
  isLoggingIn,
  title = 'Sign In',
  description = 'Enter your credentials to continue.',
  submitLabel = 'Sign In',
}: LoginModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const emailId = useId();
  const passwordId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      emailInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;

      if (previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('aria-hidden'));

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-surface-primary p-8 rounded-xl shadow-lg w-full max-w-sm"
        onKeyDown={handleDialogKeyDown}
      >
        <h2 id={titleId} className="text-2xl font-bold mb-4 text-white">
          {title}
        </h2>
        <p id={descriptionId} className="text-gray-400 mb-6">
          {description}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={emailId} className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id={emailId}
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-secondary border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id={passwordId}
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
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
