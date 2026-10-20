'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, HardDrive, Users } from 'lucide-react';
import type { User } from '@/lib/types';
import { api } from '@/lib/client-api';
import { Avatar, Brand } from './brand';
export function UserPicker({
  users,
  activeId,
}: {
  users: User[];
  activeId?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(activeId ?? users[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function enter() {
    setPending(true);
    setError('');
    try {
      await api('/api/session', {
        method: 'POST',
        body: JSON.stringify({ userId: selected }),
      });
      router.push('/documents');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not select user.',
      );
      setPending(false);
    }
  }
  return (
    <main className="welcome">
      <div className="welcome-brand">
        <Brand />
        <span className="tag">
          <span className="status-dot" /> DEMO WORKSPACE
        </span>
      </div>
      <div className="welcome-layout">
        <section className="welcome-story">
          <span className="eyebrow">LESS FRICTION. MORE FLOW.</span>
          <h1>
            A little space for
            <br />
            your next <em>big idea.</em>
          </h1>
          <p>
            Write it down. Make it better. Bring someone along.
            <br />
            Good work starts with a clear page.
          </p>
          <div className="paper-art" aria-hidden="true">
            <div className="art-tab">A thought worth keeping</div>
            <div className="art-heading">Make room for what matters.</div>
            <div className="art-line" />
            <div className="art-line short" />
            <div className="art-note">one idea at a time ↗</div>
          </div>
          <div className="local-note">
            <HardDrive size={16} />
            <span>Your documents stay saved in this workspace.</span>
          </div>
        </section>
        <section className="welcome-card">
          <span className="eyebrow">
            <Users size={15} /> A SHARED SPACE
          </span>
          <h2>Who’s writing today?</h2>
          <p>
            Choose a demo profile to explore documents and try sharing ideas
            with your team.
          </p>
          <fieldset className="user-options">
            <legend className="sr-only">Choose a demo user</legend>
            {users.map((user) => (
              <label
                className={`user-option ${selected === user.id ? 'selected' : ''}`}
                key={user.id}
              >
                <input
                  type="radio"
                  name="user"
                  value={user.id}
                  checked={selected === user.id}
                  onChange={() => setSelected(user.id)}
                />
                <Avatar name={user.name} />
                <span className="user-info">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </span>
                <span className="selection-mark">
                  {selected === user.id && <Check size={14} />}
                </span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="error" role="alert" aria-label="Profile error">
              {error}
            </p>
          )}
          <button
            className="button primary wide"
            onClick={enter}
            disabled={pending || !selected}
          >
            {pending ? 'Opening your workspace…' : 'Enter workspace'}
            <ArrowRight size={17} />
          </button>
          <p className="demo-disclosure">
            Demo profiles are intentionally selectable. No password is required.
            All demo profiles are shared. Use fictional content only.
          </p>
        </section>
      </div>
      <footer className="welcome-footer">
        A calmer place to create.<span>Made for focused work.</span>
      </footer>
    </main>
  );
}
