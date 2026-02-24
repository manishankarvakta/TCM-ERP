"use client";

import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import tippy from "tippy.js";
import { SlashMenu } from "./SlashMenu";

interface DocEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export const DocEditor = ({
  content,
  onChange,
  editable = true,
  className,
}: DocEditorProps) => {
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
            if (node.type.name === 'heading') {
                return `Heading ${node.attrs.level}`
            }
            return "Press '/' for commands..."
        },
        emptyNodeClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-slate-300 before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    content: content,
    editable: editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
          "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-p:leading-6 prose-li:marker:text-slate-400",
           className
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // Only trigger if at start of line or preceded by space
          const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "\0");
          if (textBefore.endsWith(" ") || textBefore.length === 0) {
              const coords = view.coordsAtPos(selection.from);
              
              // Calculate relative position to the editor container
              let top = coords.top;
              let left = coords.left;

              if (editorRef.current) {
                const editorRect = editorRef.current.getBoundingClientRect();
                top = coords.top - editorRect.top;
                left = coords.left - editorRect.left;
              }

              setSlashPosition({ 
                  top: top + 24, // Offset for line height
                  left: left 
              });
              setIsSlashOpen(true);
              // Let the slash be typed for now, we'll remove it on selection
              return false; 
          }
        }
        
        if (isSlashOpen && event.key === "Escape") {
            setIsSlashOpen(false);
            return true;
        }

        return false;
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      
      // Close menu if user deletes the slash or types something else valid
      if (isSlashOpen) {
           const selection = editor.state.selection;
           const range = editor.state.doc.textBetween(selection.from - 1, selection.from);
           if (range !== "/") {
               // Simple check: if cursor moved away or slash deleted, close it
               // A more robust check would track the slash position
               // For MVP, letting it stay open until selection or escape is okay, 
               // but verifying the slash exists is better.
           }
      }
    },
  });

  // Sync content updates from parent (e.g. loaded data)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
        // Only update if content is significantly different to avoid cursor jumps
        // For new docs starting empty, this is fine. 
        // For real-time collab, needs Yjs, but here just initial load.
        if (editor.getText() === "" && content !== "") {
             editor.commands.setContent(content);
        }
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const handleSlashSelect = (item: any) => {
    if (!editor) return;

    // Delete the slash character that triggered the menu
    // We assume the cursor is right after the slash
    editor.commands.deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from
    });

    switch (item.value) {
      case "text":
        editor.chain().focus().setParagraph().run();
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bullet":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "number":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "todo":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "code":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "image":
        const url = window.prompt('URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
        break;
    }
    
    setIsSlashOpen(false);
    editor.chain().focus().run();
  };

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} ref={editorRef} />
      
      <SlashMenu 
        isVisible={isSlashOpen} 
        position={slashPosition} 
        onClose={() => setIsSlashOpen(false)} 
        onSelect={handleSlashSelect}
      />
      
      {/* 
        Custom CSS for Tiptap placeholder because Tailwind peer-modifiers are tricky with Tiptap structure 
        Added in global css or style tag
      */}
      <style jsx global>{`
        .is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        /* Dark mode placeholder override if needed */
        .dark .is-editor-empty:first-child::before {
            color: #64748b;
        }
      `}</style>
    </div>
  );
};
