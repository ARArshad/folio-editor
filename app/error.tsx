'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="message-page">
      <h1>Let’s try that again.</h1>
      <p>
        Folio couldn’t open this page. Check that the local database is
        initialized with <code>npm run setup</code> and the server is running.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link href="/documents">Back to documents</Link>
    </main>
  );
}
