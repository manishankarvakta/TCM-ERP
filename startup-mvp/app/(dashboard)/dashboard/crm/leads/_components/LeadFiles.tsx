"use client";

import { useState, useEffect } from "react";
import { listFolder, deleteFile, uploadFileServerSide, getDownloadUrl } from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
    FileIcon, 
    Upload, 
    X, 
    Download, 
    Trash2, 
    Loader2, 
    FolderOpen,
    FileText,
    FileImage,
    FileCode,
    FileArchive,
    File as FileDefaultIcon
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileItem {
    id: string;
    name: string;
    path: string;
    storageKey?: string;
    size: number;
    mimeType: string;
    isFolder: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }

interface LeadFilesProps {
    leadId: string;
}

export default function LeadFiles({ leadId }: LeadFilesProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const currentPath = `crm/leads/${leadId}`;

    const loadFiles = async () => {
        try {
            setLoading(true);
            const result = await listFolder({ path: currentPath });
            if (result.success && result.data) {
                setFiles(result.data.files as FileItem[]);
            }
        } catch (error) {
            console.error("Load files error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [leadId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        setProgress(10);

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileData = buffer.toString('base64');

                const result = await uploadFileServerSide({
                    path: currentPath,
                    name: file.name,
                    fileData,
                    contentType: file.type || "application/octet-stream",
                    size: file.size,
                });

                if (result.success) {
                    toast.success(`Uploaded ${file.name}`);
                } else {
                    toast.error(`Failed to upload ${file.name}: ${result.error}`);
                }
                setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
            }
            loadFiles();
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("An error occurred during upload");
        } finally {
            setUploading(false);
            setProgress(0);
            e.target.value = ''; // Reset input
        }
    };

    const handleDelete = async (file: FileItem) => {
        if (!file.storageKey) return;
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

        try {
            const result = await deleteFile({ key: file.storageKey });
            if (result.success) {
                toast.success("File deleted");
                loadFiles();
            } else {
                toast.error(result.error || "Failed to delete file");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("An error occurred while deleting the file");
        }
    };

    const handleDownload = async (file: FileItem) => {
        if (!file.storageKey) return;
        try {
            const result = await getDownloadUrl({ key: file.storageKey });
            if (result.success && result.data) {
                window.open(result.data.url, '_blank');
            } else {
                toast.error("Failed to get download link");
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error("An error occurred");
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
        if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
        if (mimeType.includes("zip") || mimeType.includes("compressed")) return <FileArchive className="h-4 w-4 text-yellow-500" />;
        if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("typescript")) return <FileCode className="h-4 w-4 text-purple-500" />;
        return <FileDefaultIcon className="h-4 w-4 text-gray-500" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    Files
                </h3>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <Button 
                        size="sm" 
                        variant="outline" 
                        asChild 
                        disabled={uploading}
                    >
                        <label htmlFor="file-upload" className="cursor-pointer">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Upload
                        </label>
                    </Button>
                </div>
            </div>

            {uploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <FileIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {files.map((file) => (
                        <Card key={file.id} className="group hover:bg-slate-50/50 transition-colors">
                            <CardContent className="p-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white rounded border shadow-sm group-hover:shadow-md transition-all">
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span>{formatBytes(file.size)}</span>
                                            <span>•</span>
                                            <span>{format(new Date(file.updatedAt), "MMM d, yyyy")}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8" 
                                        onClick={() => handleDownload(file)}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                        onClick={() => handleDelete(file)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
