import { textToContent } from './editor-schema';
import { AppError } from './server/errors';
import { MAX_FILE_BYTES, validateContent } from './server/validation';
export function importText(name: string, bytes: Uint8Array) {
  if (!name.toLowerCase().endsWith('.txt'))
    throw new AppError(
      400,
      'FILE_TYPE',
      'Choose a UTF-8 .txt file. Other formats are not supported.',
    );
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new AppError(413, 'FILE_SIZE', 'Choose a file no larger than 1 MiB.');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new AppError(
      400,
      'FILE_ENCODING',
      'This file is not valid UTF-8 text.',
    );
  }
  if (text.includes('\0'))
    throw new AppError(400, 'FILE_BINARY', 'Binary files cannot be imported.');
  return {
    title:
      name
        .replace(/\.txt$/i, '')
        .trim()
        .slice(0, 200) || 'Untitled document',
    content: validateContent(textToContent(text)),
  };
}
