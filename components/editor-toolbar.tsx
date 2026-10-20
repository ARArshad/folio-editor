'use client';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from 'lucide-react';
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      heading: editor.isActive('heading', { level: 1 })
        ? '1'
        : editor.isActive('heading', { level: 2 })
          ? '2'
          : '0',
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    }),
  });
  const tools = [
    {
      label: 'Bold',
      icon: Bold,
      active: state.bold,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      active: state.italic,
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      active: state.underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Bulleted list',
      icon: List,
      active: state.bullet,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      active: state.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          aria-label="Undo"
          disabled={!state.undo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="toolbar-button"
          aria-label="Redo"
          disabled={!state.redo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </button>
      </div>
      <div className="toolbar-divider" />
      <label className="sr-only" htmlFor="text-style">
        Text style
      </label>
      <select
        id="text-style"
        value={state.heading}
        onChange={(event) => {
          const level = event.target.value;
          if (level === '0') editor.chain().focus().setParagraph().run();
          else
            editor
              .chain()
              .focus()
              .setHeading({ level: level === '1' ? 1 : 2 })
              .run();
        }}
      >
        <option value="0">Normal text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
      </select>
      <div className="toolbar-divider" />
      {tools.map(({ label, icon: Icon, active, action }) => (
        <button
          key={label}
          className={`toolbar-button ${active ? 'active' : ''}`}
          aria-label={label}
          title={label}
          aria-pressed={active}
          onMouseDown={(event) => event.preventDefault()}
          onClick={action}
        >
          <Icon size={17} />
        </button>
      ))}
      <span className="toolbar-tip">Make a little room for your thoughts.</span>
    </div>
  );
}
