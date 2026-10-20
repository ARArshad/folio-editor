'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import {
  ArrowLeft,
  Check,
  CloudOff,
  Copy,
  FileText,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
} from 'lucide-react';
import type { OpenDocument, User } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';
import { editorExtensions } from '@/lib/editor-schema';
import { Avatar, Brand } from './brand';
import { EditorToolbar } from './editor-toolbar';
import { ShareDialog } from './share-dialog';
type Snapshot = { title: string; content: JSONContent; revision: number };
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';
export function DocumentEditor({
  document,
  user,
}: {
  document: OpenDocument;
  user: User;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [state, setState] = useState<SaveState>('saved');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const latest = useRef<Snapshot>({
    title: document.title,
    content: document.content,
    revision: 0,
  });
  const acknowledged = useRef(0);
  const version = useRef(document.version);
  const saving = useRef<Promise<boolean> | null>(null);
  const blocked = useRef(false);
  const alive = useRef(true);
  const editor = useEditor({
    extensions: editorExtensions,
    immediatelyRender: false,
    content: document.content,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Document content',
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
    },
    onCreate: ({ editor }) =>
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length),
    onUpdate: ({ editor }) => {
      const next = {
        ...latest.current,
        content: editor.getJSON(),
        revision: latest.current.revision + 1,
      };
      latest.current = next;
      setRevision(next.revision);
      if (!blocked.current) setState('unsaved');
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
    },
  });
  const save = useCallback(
    async (retry = false): Promise<boolean> => {
      if (saving.current) return saving.current;
      if (blocked.current && !retry) return false;
      if (acknowledged.current === latest.current.revision) return true;
      blocked.current = false;
      setError('');
      setState('saving');
      const work = async () => {
        try {
          while (acknowledged.current !== latest.current.revision) {
            const snapshot = latest.current;
            if (
              document.isOwner &&
              (!snapshot.title.trim() || snapshot.title.trim().length > 200)
            )
              throw new ApiError(
                400,
                'TITLE',
                'Enter a title between 1 and 200 characters.',
              );
            const data = await api<{ document: OpenDocument }>(
              `/api/documents/${document.id}`,
              {
                method: 'PATCH',
                headers: { 'X-Folio-User': user.id },
                body: JSON.stringify({
                  content: snapshot.content,
                  ...(document.isOwner ? { title: snapshot.title } : {}),
                  version: version.current,
                }),
              },
            );
            version.current = data.document.version;
            acknowledged.current = snapshot.revision;
          }
          if (alive.current) setState('saved');
          return true;
        } catch (error) {
          blocked.current = true;
          if (alive.current) {
            setError(
              error instanceof Error
                ? error.message
                : 'Could not save. Your draft is still here.',
            );
            setState(
              error instanceof ApiError && error.code === 'VERSION_CONFLICT'
                ? 'conflict'
                : 'error',
            );
          }
          return false;
        }
      };
      saving.current = work();
      try {
        return await saving.current;
      } finally {
        saving.current = null;
      }
    },
    [document.id, document.isOwner, user.id],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!revision || blocked.current) return;
    const timer = setTimeout(() => {
      void save();
    }, 800);
    return () => clearTimeout(timer);
  }, [revision, save]);
  useEffect(() => {
    function unload(event: BeforeUnloadEvent) {
      if (acknowledged.current !== latest.current.revision)
        event.preventDefault();
    }
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save(true);
      }
    }
    window.addEventListener('beforeunload', unload);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('keydown', shortcut);
    };
  }, [save]);
  async function navigate(path: string) {
    if (await save()) {
      router.push(path);
      router.refresh();
    }
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(
        `${latest.current.title}\n\n${editor?.getText() ?? ''}`,
      );
      setCopied(true);
    } catch {
      setError(
        'Clipboard unavailable. Select the text in the editor and copy it before reloading.',
      );
    }
  }
  const labels = {
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    saving: 'Saving…',
    error: 'Not saved',
    conflict: 'Save conflict',
  };
  return (
    <div className="editor-layout">
      <header className="editor-header">
        <button
          className="brand-link"
          onClick={() => void navigate('/documents')}
          aria-label="Folio documents"
        >
          <Brand />
        </button>
        <span className="editor-header-divider" />
        <span className="editor-header-label">
          <FileText size={15} />
          {document.isOwner ? 'My documents' : 'Shared with me'}
        </span>
        <div className="editor-header-right">
          <span className="tag">
            <span className="status-dot" />
            DEMO WORKSPACE
          </span>
          <button
            className="profile-button"
            onClick={() => void navigate('/?switch=1')}
            aria-label="Switch demo user"
          >
            <Avatar name={user.name} small />
            <span>{user.name}</span>
          </button>
        </div>
      </header>
      <div className="editor-document-bar">
        <div className="editor-document-left">
          <button
            className="icon-button"
            aria-label="Back to documents"
            onClick={() =>
              void navigate(
                document.isOwner ? '/documents' : '/documents?scope=shared',
              )
            }
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <label className="sr-only" htmlFor="document-title">
              Document title
            </label>
            <input
              id="document-title"
              className="document-title-input"
              value={title}
              readOnly={!document.isOwner}
              maxLength={200}
              onChange={(event) => {
                setTitle(event.target.value);
                const next = {
                  ...latest.current,
                  title: event.target.value,
                  revision: latest.current.revision + 1,
                };
                latest.current = next;
                setRevision(next.revision);
                if (!blocked.current) setState('unsaved');
              }}
            />
            <div className="document-meta">
              <span>
                {document.isOwner
                  ? 'Owned by you'
                  : `Shared by ${document.ownerName}`}
              </span>
              <span>·</span>
              <span>Can edit</span>
            </div>
          </div>
        </div>
        <div className="editor-actions">
          <span
            className={`save-status ${state}`}
            role="status"
            aria-live="polite"
          >
            {state === 'saving' ? (
              <Loader2 className="spin" size={15} />
            ) : state === 'saved' ? (
              <Check size={15} />
            ) : state === 'error' || state === 'conflict' ? (
              <CloudOff size={15} />
            ) : (
              <span className="unsaved-dot" />
            )}
            {labels[state]}
          </span>
          <button
            className="button secondary compact"
            disabled={state === 'saving' || state === 'conflict'}
            onClick={() => void save(true)}
          >
            <Save size={15} />
            {state === 'error' ? 'Retry save' : 'Save'}
          </button>
          {document.isOwner && (
            <ShareDialog documentId={document.id} owner={user} />
          )}
        </div>
      </div>
      {editor && <EditorToolbar editor={editor} />}
      {error && (
        <div className="editor-alert" role="alert" aria-label="Save error">
          <div>
            <strong>
              {state === 'conflict'
                ? 'A newer version is available.'
                : 'Your changes have not been saved.'}
            </strong>
            <p>{error}</p>
          </div>
          <div className="recovery-actions">
            <button className="button secondary compact" onClick={copyDraft}>
              <Copy size={15} />
              {copied ? 'Draft copied' : 'Copy local text'}
            </button>
            {state === 'conflict' && (
              <button
                className="button secondary compact"
                onClick={() => {
                  if (
                    window.confirm(
                      'Reload the latest version? Unsaved local edits will be discarded. Copy your local text first.',
                    )
                  ) {
                    acknowledged.current = latest.current.revision;
                    window.location.reload();
                  }
                }}
              >
                <RotateCcw size={15} />
                Reload latest
              </button>
            )}
          </div>
        </div>
      )}
      <main className="editor-canvas">
        <div className="page-context">
          <span>YOUR SPACE TO MAKE PROGRESS</span>
          <span>DOCUMENT</span>
        </div>
        <div className="writing-page">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <p className="editor-loading" role="status">
              Opening your document…
            </p>
          )}
        </div>
        <div className="page-bottom-note">A little focus goes a long way.</div>
      </main>
      <footer className="editor-footer">
        <span>
          <LockKeyhole size={13} />
          {document.isOwner
            ? 'Access managed by you'
            : `Shared by ${document.ownerName}`}
        </span>
        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
          <span className="footer-divider">·</span>Saved in this workspace
        </span>
      </footer>
    </div>
  );
}
