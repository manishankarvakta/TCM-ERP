"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    FileText, 
    Plus,
    User,
    Calendar,
    PenTool
} from "lucide-react";
import { format } from "date-fns";
import DocForm from "./DocForm";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader,
    SheetTitle,
    SheetTrigger 
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SystemEntityType } from "@/lib/system/types";

interface DocItem {
    id: string;
    title: string;
    content?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    User?: {
        id: string;
        name: string | null;
        email: string;
    } | null;
}

interface DocManagerProps {
    entityId: string;
    entityType: SystemEntityType;
    docs: any[]; // strict casting in usage
}

export default function DocManager({ entityId, entityType, docs }: DocManagerProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
    const router = useRouter();

    const handleCreateNew = () => {
        setSelectedDoc(null);
        setIsSheetOpen(true);
    };

    const handleEditDoc = (doc: DocItem) => {
        setSelectedDoc(doc);
        setIsSheetOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mx-4 pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Documents
                </h3>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4" />
                            Add Doc
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-4xl sm:w-[90vw] overflow-y-auto w-full">
                        <SheetHeader className="mb-4">
                            <SheetTitle>{selectedDoc ? "Edit Document" : "Create New Document"}</SheetTitle>
                        </SheetHeader>

                        <DocForm 
                            entityId={entityId}
                            entityType={entityType}
                            initialData={selectedDoc}
                            onSuccess={() => {
                                setIsSheetOpen(false);
                                router.refresh(); 
                            }}
                            onCancel={() => setIsSheetOpen(false)}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-3 p-4 pt-0">
                {docs.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <PenTool className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium">No documents yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Create specifications, requirements, or briefs.</p>
                    </div>
                ) : (
                    docs.map((doc) => {
                        return (
                            <Card key={doc.id} className="group transition-all duration-200 hover:shadow-md border-border/50 cursor-pointer bg-card" onClick={() => handleEditDoc(doc)}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                         <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                            <FileText className="h-5 w-5 text-orange-600" />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {doc.title}
                                                    </h4>
                                                    {doc.content && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">
                                                            {doc.content.replace(/<[^>]*>?/gm, " ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                                                </div>
                                                {doc.User && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                        <User className="h-3.5 w-3.5" />
                                                        {doc.User.name || "Unknown"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
