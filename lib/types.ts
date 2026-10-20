import type { JSONContent } from '@tiptap/core';
export type User = { id: string; name: string; email: string };
export type DocumentRecord = {
  id: string;
  ownerId: string;
  title: string;
  content: JSONContent;
  version: number;
  createdAt: number;
  updatedAt: number;
};
export type DocumentSummary = Omit<DocumentRecord, 'content'> & {
  ownerName: string;
};
export type OpenDocument = DocumentRecord & {
  ownerName: string;
  isOwner: boolean;
};
