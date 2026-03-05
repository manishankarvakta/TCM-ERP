"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { 
  Bold, 
  Italic, 
  List, 
  CheckSquare, 
  Link2,
  ListOrdered
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
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
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none w-full text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          readOnly && "prose-p:my-0"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync value from props if it changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Handle readOnly toggle
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={cn("space-y-1.5", readOnly && "space-y-0")}>
      {!readOnly && (
        <div className="flex items-center gap-0.5 p-0.5 border-b pb-1.5 mb-1.5 border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-7 w-7 p-0 hover:bg-muted/50 transition-colors", editor.isActive("bold") && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-7 w-7 p-0 hover:bg-muted/50 transition-colors", editor.isActive("italic") && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          
          <div className="w-[1px] h-3 bg-border/40 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("h-7 w-7 p-0 hover:bg-muted/50 transition-colors", editor.isActive("bulletList") && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={cn("h-7 w-7 p-0 hover:bg-muted/50 transition-colors", editor.isActive("taskList") && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Checklist"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </Button>

          <div className="w-[1px] h-3 bg-border/40 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn("h-7 w-7 p-0 hover:bg-muted/50 transition-colors", editor.isActive("link") && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Add Link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      
      <EditorContent 
        editor={editor} 
        className={cn(
          "tiptap-content p-3 transition-all", 
          !readOnly && "min-h-[120px] focus-within:ring-1 focus-within:ring-primary/20",
          readOnly && "p-0",
          className
        )} 
      />
      
      <style jsx global>{`
        .tiptap-content .ProseMirror {
           padding: 0 !important;
           border: none !important;
           min-height: 100px !important;
           height: 100%;
           outline: none !important;
        }
        .tiptap ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap ol {
          list-style: decimal;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          margin: 0.15rem 0;
        }
        .tiptap ul[data-type="taskList"] input[type="checkbox"] {
          margin-top: 0.2rem;
          cursor: pointer;
        }
        .tiptap p {
          margin: 0.15rem 0;
        }
        .tiptap a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
