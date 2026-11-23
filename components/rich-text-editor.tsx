"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Node, mergeAttributes } from "@tiptap/core"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Placeholder from "@tiptap/extension-placeholder"
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code, Code2, Eraser,
  Heading1, Heading2, Heading3, Heading4, Highlighter, Image as ImageIcon, IndentDecrease,
  IndentIncrease, Italic, Link as LinkIcon, List, ListChecks, ListOrdered, Maximize2, Minimize2,
  Minus, Palette, Pilcrow, Quote, Redo2, RemoveFormatting, Strikethrough, Subscript as SubIcon,
  Superscript as SupIcon, Table as TableIcon, Underline as UnderlineIcon, Undo2, Unlink,
} from "lucide-react"
import { sanitizeForRender } from "@/lib/rich-text"

/** Non-editable {{variable}} chip for email templates. */
const VariableChip = Node.create({
  name: "variableChip",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return { token: { default: "" } }
  },
  parseHTML() {
    return [{ tag: "span[data-variable]" }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-variable": node.attrs.token, class: "rte-variable" }), `{{${node.attrs.token}}}`]
  },
})

const FontSizeTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size:${attributes.fontSize}` } : {}),
      },
    }
  },
})

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  mode?: "content" | "email"
  variables?: { token: string; label: string }[]
  minHeight?: number
  label?: string
  className?: string
  onImageUpload?: (file: File) => Promise<string>
}

const THEME_COLORS = ["#0c1f1d", "#18bcaa", "#12263f", "#3f7fbf", "#b45309", "#b42318", "#334155", "#6b7280"]
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"]
const EMOJI = ["🙂", "👍", "🎉", "✅", "📌", "📞", "✉️", "🏥", "💊", "🚚"]
const SPECIAL = ["—", "–", "•", "…", "©", "®", "™", "°", "±", "×", "÷", "→", "←", "“", "”", "‘", "’"]

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md text-sm transition focus-ring disabled:opacity-40 ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5 border-r border-border/70 pr-1.5 last:border-0 last:pr-0">
      {children}
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here…",
  mode = "content",
  variables = [],
  minHeight = 180,
  label,
  className = "",
  onImageUpload,
}: RichTextEditorProps) {
  const [view, setView] = useState<"visual" | "html" | "preview">("visual")
  const [fullscreen, setFullscreen] = useState(false)
  const [htmlDraft, setHtmlDraft] = useState(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      FontSizeTextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      VariableChip,
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
        style: `min-height:${minHeight}px`,
        "aria-label": label || "Rich text editor",
      },
      transformPastedHTML(html) {
        // Clean Word/Google Docs paste: drop mso styles and office classes.
        return html
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/\s(class|lang|face|size)="[^"]*"/gi, "")
          .replace(/style="[^"]*mso-[^"]*"/gi, "")
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items || !onImageUpload) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file && file.size <= 4 * 1024 * 1024 && /image\/(jpeg|png|webp)/.test(file.type)) {
              event.preventDefault()
              void onImageUpload(file).then((url) => {
                editorRef.current?.chain().focus().setImage({ src: url, alt: file.name }).run()
              })
              return true
            }
          }
        }
        return false
      },
    },
    onUpdate({ editor: instance }) {
      onChangeRef.current(instance.getHTML())
    },
  })

  const editorRef = useRef<Editor | null>(null)
  editorRef.current = editor

  // Keep external value in sync without clobbering the cursor.
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  useEffect(() => {
    if (view === "html") setHtmlDraft(value)
  }, [view, value])

  const text = editor?.getText() || ""
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text])

  const run = useCallback((fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => {
    if (!editor) return
    fn(editor.chain().focus()).run()
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL (https://, mailto: or tel:)", previous || "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      window.alert("Only http(s), mailto and tel links are allowed.")
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const insertImage = useCallback(async (file: File) => {
    if (!editor || !onImageUpload) return
    if (file.size > 4 * 1024 * 1024) {
      window.alert("Images must be 4 MB or smaller.")
      return
    }
    if (!/image\/(jpeg|png|webp)/.test(file.type)) {
      window.alert("Only JPG, PNG and WebP images are supported.")
      return
    }
    const url = await onImageUpload(file)
    const alt = window.prompt("Image alt text", file.name) || file.name
    editor.chain().focus().setImage({ src: url, alt }).run()
  }, [editor, onImageUpload])

  const insertVariable = useCallback((token: string) => {
    editor?.chain().focus().insertContent({ type: "variableChip", attrs: { token } }).run()
  }, [editor])

  const insertButton = useCallback(() => {
    const url = window.prompt("Button link URL", "https://")
    if (!url) return
    const label = window.prompt("Button label", "Confirm interview") || "Confirm"
    editor?.chain().focus().insertContent(
      `<p><a href="${url}" style="display:inline-block;background:#0c1f1d;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">${label}</a></p>`
    ).run()
  }, [editor])

  const insertSignature = useCallback(() => {
    editor?.chain().focus().insertContent(
      "<p>Kind regards,<br/><strong>Medlink Expedite Recruitment</strong><br/>Nairobi, Kenya<br/>careers@medlinkexpedite.co.ke</p>"
    ).run()
  }, [editor])

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" aria-hidden="true" />
  }

  const containerClass = fullscreen
    ? "fixed inset-4 z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl"
    : `rounded-xl border border-border bg-card ${className}`

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
          <ToolbarGroup label="History">
            <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => run((c) => c.undo())}><Undo2 size={15} /></ToolbarButton>
            <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => run((c) => c.redo())}><Redo2 size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Text">
            <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => run((c) => c.toggleBold())}><Bold size={15} /></ToolbarButton>
            <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => run((c) => c.toggleItalic())}><Italic size={15} /></ToolbarButton>
            <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => run((c) => c.toggleUnderline())}><UnderlineIcon size={15} /></ToolbarButton>
            <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => run((c) => c.toggleStrike())}><Strikethrough size={15} /></ToolbarButton>
            <ToolbarButton title="Subscript" active={editor.isActive("subscript")} onClick={() => run((c) => c.toggleSubscript())}><SubIcon size={15} /></ToolbarButton>
            <ToolbarButton title="Superscript" active={editor.isActive("superscript")} onClick={() => run((c) => c.toggleSuperscript())}><SupIcon size={15} /></ToolbarButton>
            <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => run((c) => c.toggleCode())}><Code size={15} /></ToolbarButton>
            <ToolbarButton title="Highlight" active={editor.isActive("highlight")} onClick={() => run((c) => c.toggleHighlight())}><Highlighter size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Colour and size">
            <select
              aria-label="Text colour"
              title="Text colour"
              className="h-8 rounded-md border border-border bg-background px-1 text-xs"
              onChange={(e) => { if (e.target.value) run((c) => c.setColor(e.target.value)); e.target.value = "" }}
              defaultValue=""
            >
              <option value="" disabled>Colour</option>
              {THEME_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
            <input
              type="color"
              aria-label="Custom text colour"
              title="Custom text colour"
              className="h-8 w-8 cursor-pointer rounded-md border border-border bg-background"
              onChange={(e) => run((c) => c.setColor(e.target.value))}
            />
            <select
              aria-label="Font size"
              title="Font size"
              className="h-8 rounded-md border border-border bg-background px-1 text-xs"
              onChange={(e) => { if (e.target.value) run((c) => c.setMark("textStyle", { fontSize: e.target.value })); e.target.value = "" }}
              defaultValue=""
            >
              <option value="" disabled>Size</option>
              {FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <ToolbarButton title="Clear formatting" onClick={() => run((c) => c.unsetAllMarks().clearNodes())}><RemoveFormatting size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Structure">
            <ToolbarButton title="Paragraph" active={editor.isActive("paragraph")} onClick={() => run((c) => c.setParagraph())}><Pilcrow size={15} /></ToolbarButton>
            <ToolbarButton title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => run((c) => c.toggleHeading({ level: 1 }))}><Heading1 size={15} /></ToolbarButton>
            <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}><Heading2 size={15} /></ToolbarButton>
            <ToolbarButton title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => run((c) => c.toggleHeading({ level: 3 }))}><Heading3 size={15} /></ToolbarButton>
            <ToolbarButton title="Heading 4" active={editor.isActive("heading", { level: 4 })} onClick={() => run((c) => c.toggleHeading({ level: 4 }))}><Heading4 size={15} /></ToolbarButton>
            <ToolbarButton title="Blockquote" active={editor.isActive("blockquote")} onClick={() => run((c) => c.toggleBlockquote())}><Quote size={15} /></ToolbarButton>
            <ToolbarButton title="Code block" active={editor.isActive("codeBlock")} onClick={() => run((c) => c.toggleCodeBlock())}><Code2 size={15} /></ToolbarButton>
            <ToolbarButton title="Horizontal rule" onClick={() => run((c) => c.setHorizontalRule())}><Minus size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Lists">
            <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => run((c) => c.toggleBulletList())}><List size={15} /></ToolbarButton>
            <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered size={15} /></ToolbarButton>
            <ToolbarButton title="Checklist" active={editor.isActive("taskList")} onClick={() => run((c) => c.toggleTaskList())}><ListChecks size={15} /></ToolbarButton>
            <ToolbarButton title="Indent" onClick={() => run((c) => c.sinkListItem("listItem"))}><IndentIncrease size={15} /></ToolbarButton>
            <ToolbarButton title="Outdent" onClick={() => run((c) => c.liftListItem("listItem"))}><IndentDecrease size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Alignment">
            <ToolbarButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => run((c) => c.setTextAlign("left"))}><AlignLeft size={15} /></ToolbarButton>
            <ToolbarButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => run((c) => c.setTextAlign("center"))}><AlignCenter size={15} /></ToolbarButton>
            <ToolbarButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => run((c) => c.setTextAlign("right"))}><AlignRight size={15} /></ToolbarButton>
            <ToolbarButton title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => run((c) => c.setTextAlign("justify"))}><AlignJustify size={15} /></ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Insert">
            <ToolbarButton title="Insert link" active={editor.isActive("link")} onClick={setLink}><LinkIcon size={15} /></ToolbarButton>
            <ToolbarButton title="Remove link" onClick={() => run((c) => c.unsetLink())}><Unlink size={15} /></ToolbarButton>
            <ToolbarButton title="Insert image" onClick={() => fileInputRef.current?.click()}><ImageIcon size={15} /></ToolbarButton>
            <ToolbarButton title="Insert table" onClick={() => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}><TableIcon size={15} /></ToolbarButton>
            <select
              aria-label="Insert symbol"
              title="Emoji / special characters / date"
              className="h-8 rounded-md border border-border bg-background px-1 text-xs"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value
                if (v === "__date__") run((c) => c.insertContent(new Date().toLocaleDateString("en-KE")))
                else if (v) run((c) => c.insertContent(v))
                e.target.value = ""
              }}
            >
              <option value="" disabled>Insert</option>
              <option value="__date__">Today’s date</option>
              {EMOJI.map((item) => <option key={item} value={item}>{item}</option>)}
              {SPECIAL.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </ToolbarGroup>

          {editor.isActive("table") && (
            <ToolbarGroup label="Table">
              <ToolbarButton title="Add row" onClick={() => run((c) => c.addRowAfter())}>+R</ToolbarButton>
              <ToolbarButton title="Add column" onClick={() => run((c) => c.addColumnAfter())}>+C</ToolbarButton>
              <ToolbarButton title="Delete row" onClick={() => run((c) => c.deleteRow())}>−R</ToolbarButton>
              <ToolbarButton title="Delete column" onClick={() => run((c) => c.deleteColumn())}>−C</ToolbarButton>
              <ToolbarButton title="Toggle header row" onClick={() => run((c) => c.toggleHeaderRow())}>H</ToolbarButton>
              <ToolbarButton title="Merge cells" onClick={() => run((c) => c.mergeCells())}>M</ToolbarButton>
              <ToolbarButton title="Delete table" onClick={() => run((c) => c.deleteTable())}><Eraser size={15} /></ToolbarButton>
            </ToolbarGroup>
          )}

          {mode === "email" && (
            <ToolbarGroup label="Email">
              <select
                aria-label="Insert variable"
                title="Insert variable"
                className="h-8 rounded-md border border-border bg-background px-1 text-xs"
                defaultValue=""
                onChange={(e) => { if (e.target.value) insertVariable(e.target.value); e.target.value = "" }}
              >
                <option value="" disabled>Variable</option>
                {variables.map((variable) => <option key={variable.token} value={variable.token}>{variable.label}</option>)}
              </select>
              <ToolbarButton title="Insert call-to-action button" onClick={insertButton}><Palette size={15} /></ToolbarButton>
              <button type="button" title="Insert signature" onClick={insertSignature} className="h-8 rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground hover:bg-muted">Sig</button>
            </ToolbarGroup>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(["visual", "html", "preview"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`h-8 rounded-md px-2 text-xs font-semibold capitalize ${view === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {item}
            </button>
          ))}
          <ToolbarButton title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => setFullscreen((current) => !current)}>
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </ToolbarButton>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void insertImage(file)
          e.target.value = ""
        }}
      />

      <div className={fullscreen ? "flex-1 overflow-auto p-4" : "p-3"}>
        {view === "visual" && <EditorContent editor={editor} />}
        {view === "html" && (
          <textarea
            aria-label="HTML source"
            value={htmlDraft}
            onChange={(e) => setHtmlDraft(e.target.value)}
            onBlur={() => { onChange(htmlDraft); editor.commands.setContent(htmlDraft, false) }}
            className="min-h-48 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
            style={{ minHeight }}
          />
        )}
        {view === "preview" && (
          <div
            className="rte-content"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: sanitizeForRender(value) }}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{words} words · {text.length} characters</span>
        <span>Sanitised on save</span>
      </div>
    </div>
  )
}

export default RichTextEditor
