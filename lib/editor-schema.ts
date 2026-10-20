import StarterKit from '@tiptap/starter-kit';
import { getSchema, type JSONContent } from '@tiptap/core';
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2] },
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
    strike: false,
  }),
];
export const editorSchema = getSchema(editorExtensions);
export const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
export function textToContent(text: string): JSONContent {
  return {
    type: 'doc',
    content: text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => ({
        type: 'paragraph',
        ...(line ? { content: [{ type: 'text', text: line }] } : {}),
      })),
  };
}
