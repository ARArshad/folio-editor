import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
export default function NotFound() {
  return (
    <main className="message-page">
      <FileQuestion size={40} />
      <h1>This page isn’t in your workspace.</h1>
      <p>
        The document may not exist, or it hasn’t been shared with your current
        demo profile.
      </p>
      <Link className="button primary" href="/documents">
        Back to documents
      </Link>
    </main>
  );
}
