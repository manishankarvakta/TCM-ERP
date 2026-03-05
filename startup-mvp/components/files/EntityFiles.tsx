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

interface EntityFilesProps {
    entityId: string;
    entityType: "leads" | "opportunities" | "projects" | "milestones" | "issues";
    basePath?: string; // Optional override for the base path
}

export default function EntityFiles({ entityId, entityType, basePath }: EntityFilesProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // Determine path based on entity type mapping
    const getPath = () => {
        if (basePath) return `${basePath}/${entityId}`;
        
        switch (entityType) {
            case "leads": return `crm/leads/${entityId}`;
            case "opportunities": return `crm/opportunities/${entityId}`;
            case "projects": return `projects/${entityId}`;
            case "milestones": return `projects/milestones/${entityId}`;
            case "issues": return `projects/issues/${entityId}`;
            default: return `misc/${entityId}`;
        }
    };

    const currentPath = getPath();

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
    }, [entityId, entityType]);

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
        if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-primary" />;
        if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-rose-500" />;
        if (mimeType.includes("zip") || mimeType.includes("compressed")) return <FileArchive className="h-4 w-4 text-amber-500" />;
        if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("typescript")) return <FileCode className="h-4 w-4 text-emerald-500" />;
        return <FileDefaultIcon className="h-4 w-4 text-slate-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-muted/20 p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center text-primary shadow-sm">
                        <FolderOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">Technical Assets</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none mt-1">
                            {files.length} Object{files.length !== 1 ? 's' : ''} Linked
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="entity-file-upload"
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
                        className="h-10 px-6 rounded-xl font-bold bg-background shadow-sm hover:bg-muted transition-all active:scale-95 border-border/40"
                    >
                        <label htmlFor="entity-file-upload" className="cursor-pointer">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Upload Asset
                        </label>
                    </Button>
                </div>
            </div>

            {uploading && (
                <div className="space-y-2 bg-primary/5 p-4 rounded-2xl border border-primary/10 animate-pulse">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                        <span>Transmission Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-primary/20" />
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Scanning Repository...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-muted/5 border-border/60 group hover:border-primary/20 transition-all duration-500">
                    <div className="relative mx-auto mb-6 w-16 h-16 flex items-center justify-center rounded-2xl bg-primary/5 group-hover:scale-110 transition-transform duration-500">
                        <FileIcon className="h-8 w-8 text-primary/30" />
                    </div>
                    <h4 className="text-lg font-black uppercase tracking-tight">Empty Asset Vault</h4>
                    <p className="text-sm font-medium text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                        No technical documents or binary assets have been linked to this mission yet.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                        <Card key={file.id} className="group hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500 border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-5 flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 bg-background rounded-xl border shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-500">
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0">
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 rounded-lg hover:bg-muted" 
                                            onClick={() => handleDownload(file)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                                            onClick={() => handleDelete(file)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-sm font-bold truncate tracking-tight text-foreground/90 group-hover:text-primary transition-colors" title={file.name}>
                                        {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                        <span className="bg-muted px-2 py-0.5 rounded text-foreground/70">{formatBytes(file.size)}</span>
                                        <span>•</span>
                                        <span>{format(new Date(file.updatedAt), "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
