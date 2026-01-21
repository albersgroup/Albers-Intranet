import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Undo,
  Redo,
  Type
} from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const PRESET_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#51142a', '#D9E4EC', '#1E40AF',
];

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[200px] p-3 focus:outline-none',
        'data-placeholder': placeholder || 'Start typing...',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-input bg-muted/30">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          data-testid="editor-bold"
          data-goatcounter-click="editor-bold"
          data-goatcounter-title="Editor Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          data-testid="editor-italic"
          data-goatcounter-click="editor-italic"
          data-goatcounter-title="Editor Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
          data-testid="editor-underline"
          data-goatcounter-click="editor-underline"
          data-goatcounter-title="Editor Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
          data-testid="editor-strike"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
          data-testid="editor-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
          data-testid="editor-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
          data-testid="editor-h3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
          data-testid="editor-bullet-list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered List"
          data-testid="editor-numbered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" data-testid="editor-text-color">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Text Color</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                    aria-label={`Set color ${color}`}
                  />
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                <Type className="h-4 w-4 mr-2" />
                Reset Color
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 px-2"
          data-testid="editor-undo"
          data-goatcounter-click="editor-undo"
          data-goatcounter-title="Editor Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 px-2"
          data-testid="editor-redo"
          data-goatcounter-click="editor-redo"
          data-goatcounter-title="Editor Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
}
