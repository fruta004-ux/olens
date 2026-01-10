"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Underline, List, ListOrdered, Type, Palette, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface RichTextEditorProps {
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
}

export function RichTextEditor({ initialValue, onSave, onCancel }: RichTextEditorProps) {
  const [content, setContent] = useState(initialValue)

  const applyStyle = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  const handleSave = () => {
    const editor = document.getElementById("editor")
    if (editor) {
      onSave(editor.innerHTML)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {/* Text Style */}
        <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("bold")} className="h-8 w-8 p-0">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("italic")} className="h-8 w-8 p-0">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("underline")} className="h-8 w-8 p-0">
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Size */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2">
              <Type className="h-4 w-4 mr-1" />
              크기
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2">
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((size) => (
                <Button
                  key={size}
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyStyle("fontSize", String(size))}
                  className="justify-start"
                >
                  크기 {size}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2">
              <Palette className="h-4 w-4 mr-1" />
              색상
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-5 gap-2">
              {[
                "#000000",
                "#FF0000",
                "#00FF00",
                "#0000FF",
                "#FFFF00",
                "#FF00FF",
                "#00FFFF",
                "#FFA500",
                "#800080",
                "#008000",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => applyStyle("foreColor", color)}
                  className="h-8 w-8 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => applyStyle("insertUnorderedList")}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => applyStyle("insertOrderedList")}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Action Buttons */}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="h-8">
          <X className="h-4 w-4 mr-1" />
          취소
        </Button>
        <Button type="button" size="sm" onClick={handleSave} className="h-8">
          <Check className="h-4 w-4 mr-1" />
          저장
        </Button>
      </div>

      {/* Editor */}
      <div
        id="editor"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: content }}
        className="min-h-[120px] p-4 focus:outline-none prose prose-sm max-w-none"
      />
    </div>
  )
}
