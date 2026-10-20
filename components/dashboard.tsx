'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  FileText,
  FolderClosed,
  Plus,
  Users,
  HardDrive,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import type { DocumentSummary, User, OpenDocument } from '@/lib/types';
import { api } from '@/lib/client-api';
import { Avatar, Brand } from './brand';
export function Dashboard({
  user,
  documents,
  scope,
}: {
  user: User;
  documents: DocumentSummary[];
  scope: 'owned' | 'shared';
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    setPending(true);
    setError('');
    try {
      const data = await api<{ document: OpenDocument }>('/api/documents', {
        method: 'POST',
        headers: { 'X-Folio-User': user.id },
      });
      router.push(`/documents/${data.document.id}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not create document.',
      );
      setPending(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Choose a UTF-8 .txt file. Other formats are not supported.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Choose a file no larger than 1 MiB.');
      return;
    }
    setPending(true);
    const body = new FormData();
    body.set('file', file);
    try {
      const data = await api<{ document: OpenDocument }>(
        '/api/documents/import',
        { method: 'POST', body, headers: { 'X-Folio-User': user.id } },
      );
      router.push(`/documents/${data.document.id}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not import file.',
      );
      setPending(false);
    }
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link prefetch={false} href="/documents" aria-label="Folio home">
          <Brand />
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Documents">
          <Link
            prefetch={false}
            className={`nav-item ${scope === 'owned' ? 'active' : ''}`}
            href="/documents"
          >
            <FolderClosed size={18} />
            My documents
          </Link>
          <Link
            prefetch={false}
            className={`nav-item ${scope === 'shared' ? 'active' : ''}`}
            href="/documents?scope=shared"
          >
            <Users size={18} />
            Shared with me
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <HardDrive size={18} />
            <strong>Your ideas, saved.</strong>
            <p>
              Saved in this workspace.
              <br />
              Ready when you are.
            </p>
          </div>
          <Link
            prefetch={false}
            href="/?switch=1"
            className="profile"
            aria-label="Switch demo user"
          >
            <Avatar name={user.name} small />
            <span>
              <strong>{user.name}</strong>
              <small>Demo profile · Switch user</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span>
            Your workspace <span className="breadcrumb-slash">/</span>{' '}
            <strong>
              {scope === 'owned' ? 'My documents' : 'Shared with me'}
            </strong>
          </span>
          <span className="tag">
            <span className="status-dot" />
            DEMO WORKSPACE
          </span>
        </header>
        <main className="dashboard">
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">A SPACE TO THINK CLEARLY</span>
              <h1>
                {scope === 'owned'
                  ? 'Your words. Your workspace.'
                  : 'Good ideas, shared.'}
              </h1>
              <p>
                {scope === 'owned'
                  ? 'A home for the things you’re thinking, making, and moving forward.'
                  : 'Pick up where your team left off. Shared documents are ready to edit.'}
              </p>
            </div>
            <div className="dashboard-actions">
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept=".txt,text/plain"
                aria-label="Import text file"
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                className="button secondary"
                disabled={pending}
                onClick={() => fileRef.current?.click()}
              >
                <ArrowDownToLine size={17} />
                Import .txt
              </button>
              <button
                className="button primary"
                disabled={pending}
                onClick={create}
              >
                <Plus size={18} />
                {pending ? 'Working…' : 'New document'}
              </button>
            </div>
          </div>
          {scope === 'owned' && (
            <section className="start-card">
              <div className="start-illustration" aria-hidden="true">
                <FileText size={34} strokeWidth={1.2} />
                <span>+</span>
              </div>
              <div>
                <span className="eyebrow">EVERY IDEA STARTS SOMEWHERE</span>
                <h2>A blank page. A fresh perspective.</h2>
                <p>
                  Start something new, or bring a text file into your workspace.
                </p>
              </div>
              <button
                className="text-button"
                disabled={pending}
                onClick={create}
              >
                Start writing <ArrowRight size={17} />
              </button>
            </section>
          )}
          {error && (
            <div
              className="error-banner"
              role="alert"
              aria-label="Import error"
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <section className="documents-section">
            <div className="section-heading">
              <h2>
                {scope === 'owned' ? 'My documents' : 'Shared with me'}
                <span className="count">{documents.length}</span>
              </h2>
              <span className="muted">Last updated first</span>
            </div>
            {documents.length ? (
              <div className="document-table">
                <div className="table-labels">
                  <span>DOCUMENT NAME</span>
                  <span>OWNER</span>
                  <span>LAST UPDATED</span>
                  <span />
                </div>
                {documents.map((doc) => (
                  <Link
                    prefetch={false}
                    key={doc.id}
                    className="document-row"
                    href={`/documents/${doc.id}`}
                  >
                    <span className="document-title">
                      <span className="document-icon">
                        <FileText size={21} strokeWidth={1.5} />
                      </span>
                      <span>
                        <strong>{doc.title}</strong>
                        <small>
                          {scope === 'owned'
                            ? 'Owned by you'
                            : 'Shared with you · Can edit'}
                        </small>
                      </span>
                    </span>
                    <span className="document-owner">
                      <Avatar name={doc.ownerName} small />
                      <span>
                        {doc.ownerId === user.id ? 'You' : doc.ownerName}
                      </span>
                    </span>
                    <time dateTime={new Date(doc.updatedAt).toISOString()}>
                      {new Date(doc.updatedAt).toLocaleDateString('en', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <ArrowUpRight className="row-arrow" size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  {scope === 'owned' ? (
                    <FileText size={30} />
                  ) : (
                    <Users size={30} />
                  )}
                </span>
                <h3>
                  {scope === 'owned'
                    ? 'Your next idea belongs here.'
                    : 'A little quiet, for now.'}
                </h3>
                <p>
                  {scope === 'owned'
                    ? 'Create a document or import a .txt file to get started.'
                    : 'Documents shared with this demo profile will appear here.'}
                </p>
                {scope === 'owned' && (
                  <button
                    className="button primary"
                    disabled={pending}
                    onClick={create}
                  >
                    <Plus size={16} />
                    Create your first document
                  </button>
                )}
              </div>
            )}
          </section>
          <div className="dashboard-footnote">
            <span>
              <span className="status-dot" /> Local SQLite storage
            </span>
            <span>Plain-text imports · UTF-8 .txt · Up to 1 MiB</span>
          </div>
        </main>
      </div>
    </div>
  );
}
