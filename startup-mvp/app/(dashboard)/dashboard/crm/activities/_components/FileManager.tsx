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

interface FileManagerProps {
    path: string;
    title?: string;
}

export default function FileManager({ path, title = "Files" }: FileManagerProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const result = await listFolder({ path });
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
    }, [path]);

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
                    path,
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
            <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {title}
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
                        className="rounded-full px-4 border-border/50 hover:border-primary transition-all"
                    >
                        <label htmlFor="file-upload" className="cursor-pointer">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Upload
                        </label>
                    </Button>
                </div>
            </div>

            {uploading && (
                <div className="space-y-2 px-4">
                    <div className="flex justify-between text-[10px] font-bold text-primary uppercase tracking-wider">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-muted" />
                </div>
            )}

            <div className="grid gap-3 p-4 pt-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium mt-3">Loading files...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <FileIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium">No files uploaded yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Keep all your important documents in one place.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {files.map((file) => (
                            <Card key={file.id} className="group hover:bg-muted/30 transition-all duration-200 border-border/50">
                                <CardContent className="p-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-background rounded-lg border border-border/50 shadow-sm transition-all group-hover:shadow-md">
                                            {getFileIcon(file.mimeType)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold truncate" title={file.name}>
                                                {file.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                <span>{formatBytes(file.size)}</span>
                                                <span>•</span>
                                                <span>{format(new Date(file.updatedAt), "MMM d, yyyy")}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 hover:bg-background" 
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
        </div>
    );
}
