/**
 * Backup Upload Zone
 * 
 * Drag-and-drop file upload component for backup files
 */

"use client";

import { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface BackupUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export function BackupUploadZone({ onUpload, uploading }: BackupUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.zip')) {
      setUploadError('Only ZIP files are accepted');
      return;
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      setUploadError('File is too large. Maximum size is 2GB');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadError(null);
    setUploadSuccess(false);

    try {
      await onUpload(selectedFile);
      setUploadSuccess(true);
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>

          <div>
            <p className="text-sm font-medium">
              Drag and drop your backup file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Only ZIP files up to 2GB are accepted
            </p>
          </div>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && !uploading && !uploadSuccess && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleUpload} size="sm">
              Upload
            </Button>
            <Button
              onClick={handleClearFile}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploading && selectedFile && (
        <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Uploading {selectedFile.name}...</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-muted-foreground">Please wait...</p>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-lg border bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">
            Backup uploaded successfully
          </p>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-4 rounded-lg border bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{uploadError}</p>
        </div>
      )}
    </div>
  );
}

