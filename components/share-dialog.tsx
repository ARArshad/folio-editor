'use client';
import { useRef, useState } from 'react';
import { Check, LockKeyhole, Share2, X } from 'lucide-react';
import type { User } from '@/lib/types';
import { api } from '@/lib/client-api';
import { Avatar } from './brand';
export function ShareDialog({
  documentId,
  owner,
}: {
  documentId: string;
  owner: User;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recipients, setRecipients] = useState<User[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const headers = { 'X-Folio-User': owner.id };
  async function open() {
    dialog.current?.showModal();
    setLoading(true);
    setError('');
    setSuccess('');
    setSelected('');
    try {
      const [all, shared] = await Promise.all([
        api<{ users: User[] }>('/api/demo-users'),
        api<{ users: User[] }>(`/api/documents/${documentId}/shares`, {
          headers,
        }),
      ]);
      setUsers(all.users);
      setRecipients(shared.users);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not load sharing.',
      );
    } finally {
      setLoading(false);
    }
  }
  async function grant() {
    setPending(true);
    setError('');
    setSuccess('');
    try {
      await api(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: selected }),
      });
      const shared = await api<{ users: User[] }>(
        `/api/documents/${documentId}/shares`,
        { headers },
      );
      setRecipients(shared.users);
      setSelected('');
      setSuccess('Access granted. Switch to their demo profile to try it.');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not share document.',
      );
    } finally {
      setPending(false);
    }
  }
  const available = users.filter(
    (user) =>
      user.id !== owner.id &&
      !recipients.some((recipient) => recipient.id === user.id),
  );
  return (
    <>
      <button className="button primary" onClick={open}>
        <Share2 size={16} />
        Share
      </button>
      <dialog
        ref={dialog}
        className="share-dialog"
        aria-labelledby="share-title"
      >
        <div className="dialog-heading">
          <span className="dialog-icon">
            <Share2 size={21} />
          </span>
          <button
            className="icon-button"
            aria-label="Close sharing"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="share-title">Good work travels.</h2>
        <p>Give a teammate a place at the page.</p>
        {loading ? (
          <p role="status">Loading access…</p>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void grant();
              }}
            >
              <label className="field-label" htmlFor="recipient">
                Share with a demo user
              </label>
              <div className="share-controls">
                <select
                  id="recipient"
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                  disabled={pending || !available.length}
                >
                  <option value="">
                    {available.length
                      ? 'Choose a teammate'
                      : 'Everyone already has access'}
                  </option>
                  {available.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <button
                  className="button primary"
                  disabled={pending || !selected}
                >
                  {pending ? 'Sharing…' : 'Grant access'}
                </button>
              </div>
            </form>
            <div className="access-heading">PEOPLE WITH ACCESS</div>
            {[owner, ...recipients].map((user) => (
              <div className="access-person" key={user.id}>
                <Avatar name={user.name} small />
                <span>
                  <strong>
                    {user.name}
                    {user.id === owner.id && ' (you)'}
                  </strong>
                  <small>{user.email}</small>
                </span>
                <span className="access-role">
                  {user.id === owner.id ? 'Owner' : 'Can edit'}
                </span>
              </div>
            ))}
          </>
        )}
        {error && (
          <p className="error" role="alert" aria-label="Sharing error">
            {error}
          </p>
        )}
        {success && (
          <p className="success" role="status">
            <Check size={16} />
            {success}
          </p>
        )}
        <div className="sharing-note">
          <LockKeyhole size={15} />
          <span>
            Only these profiles can open this document. Demo profiles are
            selectable; no invitation email is sent.
          </span>
        </div>
      </dialog>
    </>
  );
}
