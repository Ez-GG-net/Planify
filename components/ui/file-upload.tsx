"use client"

import { useRef, useState } from "react"
import {
  FileTextIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"

import Image from "next/image"

type UploadedFile = {
  file: File
  preview?: string
}

export default function FileUpload({
  "aria-labelledby": ariaLabelledBy,
}: {
  "aria-labelledby"?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<UploadedFile[]>([])

  function addFiles(selected: FileList | null) {
    if (!selected) return

    const newFiles = Array.from(selected).map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }))

    setFiles((current) => [...current, ...newFiles])
  }

  function removeFile(index: number) {
    setFiles((current) => {
      const removed = current[index]

      if (removed.preview) {
        URL.revokeObjectURL(removed.preview)
      }

      return current.filter((_, i) => i !== index)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      <button
        type="button"
        aria-labelledby={ariaLabelledBy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="
          flex w-full flex-col items-center justify-center
          rounded-lg border border-dashed p-8
          text-sm text-muted-foreground
          transition hover:bg-muted/50
        "
      >
        <UploadIcon className="mb-2 h-6 w-6" />

        <span>
          Drop files here or click to upload
        </span>
      </button>

      {files.length > 0 && (
        <AttachmentGroup className="flex-col gap-2">
          {files.map((item, index) => (
            <Attachment
              key={`${item.file.name}-${index}`}
              size="default"
            >
              <AttachmentMedia
                variant={item.preview ? "image" : "icon"}
              >
                {item.preview ? (
                  <Image
                    src={item.preview}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                    width={0}
                    height={0}
                  />
                ) : item.file.type.includes("text") ? (
                  <FileTextIcon />
                ) : (
                  <ImageIcon />
                )}
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>
                  {item.file.name}
                </AttachmentTitle>

                <AttachmentDescription>
                  {formatBytes(item.file.size)}
                </AttachmentDescription>
              </AttachmentContent>

              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => removeFile(index)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes"

  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(
    Math.log(bytes) / Math.log(1024)
  )

  return `${(
    bytes / Math.pow(1024, i)
  ).toFixed(1)} ${sizes[i]}`
}