"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  ImagePlus, 
  X, 
  Loader2,
  Upload,
  FileImage
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"

interface FeedbackEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  images: string[]
  onImagesChange: (images: string[]) => void
  bucketName?: string
  folderPath?: string
  minHeight?: string
}

export function FeedbackEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  images,
  onImagesChange,
  bucketName = "feedback-images",
  folderPath = "uploads",
  minHeight = "150px",
}: FeedbackEditorProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // 파일 타입 검증
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.")
        return null
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.")
        return null
      }

      // 파일명 생성
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = file.name.split(".").pop()?.toLowerCase() || "png"
      const fileName = `${folderPath}/${timestamp}-${randomStr}.${ext}`

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        console.error("이미지 업로드 실패:", error.message)
        alert(`업로드 실패: ${error.message}`)
        return null
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error("이미지 업로드 에러:", error)
      return null
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      const url = await uploadImage(file)
      if (url) {
        newImages.push(url)
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages])
    }
    setIsUploading(false)
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      await handleFileSelect(e.dataTransfer.files)
    },
    [images]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const imageFiles: File[] = []

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          imageFiles.push(file)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      const fileList = new DataTransfer()
      imageFiles.forEach((f) => fileList.items.add(f))
      await handleFileSelect(fileList.files)
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-3">
      {/* 텍스트 입력 영역 */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onPaste={handlePaste}
        className="resize-none"
        style={{ minHeight }}
      />

      {/* 이미지 업로드 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {images.length === 0 ? (
          // 이미지 없을 때
          <div
            className="flex flex-col items-center justify-center py-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">업로드 중...</p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  클릭하거나 이미지를 드래그하세요
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  또는 Ctrl+V로 붙여넣기 (최대 5MB)
                </p>
              </>
            )}
          </div>
        ) : (
          // 이미지가 있을 때
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((url, index) => (
                <div
                  key={index}
                  className="relative group aspect-video bg-muted rounded-lg overflow-hidden"
                >
                  <img
                    src={url}
                    alt={`첨부 이미지 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 h-6 w-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {/* 이미지 추가 버튼 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-video border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">추가</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 개수 표시 */}
      {images.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileImage className="h-3 w-3" />
          <span>{images.length}개 이미지 첨부됨</span>
        </div>
      )}
    </div>
  )
}

