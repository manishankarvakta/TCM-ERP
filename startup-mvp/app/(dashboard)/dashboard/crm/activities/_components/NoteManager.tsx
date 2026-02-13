"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    FileText, 
    MoreVertical, 
    User, 
    Calendar,
    Pin,
    Trash2,
    Edit3,
    Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NoteForm } from "@/app/(dashboard)/dashboard/notes/_components/NoteForm";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader,
    SheetTitle,
    SheetTrigger 
} from "@/components/ui/sheet";

interface NoteItem {
    id: string;
    title: string;
    content: string | null;
    createdAt: Date | string;
    User?: {
        name: string | null;
        email: string;
    } | null;
}

interface NoteManagerProps {
    entityId: string;
    entityType: "lead" | "opportunity" | "contact";
    notes: any[];
}

export default function NoteManager({ entityId, entityType, notes }: NoteManagerProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

    const handleCreateNew = () => {
        setSelectedNote(null);
        setIsSheetOpen(true);
    };

    const handleEditNote = (note: NoteItem) => {
        setSelectedNote(note);
        setIsSheetOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mx-4 pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes
                </h3>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4" />
                            Add Note
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-md">
                        <SheetHeader className="mb-4">
                            <SheetTitle>{selectedNote ? "Edit Note" : "Create New Note"}</SheetTitle>
                        </SheetHeader>
                        <NoteForm 
                            entityId={entityId}
                            entityType={entityType}
                            initialData={selectedNote ? {
                                ...selectedNote,
                                content: selectedNote.content || undefined
                            } : null}
                            onSuccess={() => {
                                setIsSheetOpen(false);
                                window.location.reload(); 
                            }}
                            onCancel={() => setIsSheetOpen(false)}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-4 p-4 pt-0">
                {notes.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium">No notes recorded for this {entityType}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Capture important details by adding a note.</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <Card key={note.id} className="border-border/50 hover:shadow-md transition-all duration-200 group cursor-pointer" onClick={() => handleEditNote(note)}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(note.createdAt), "MMMM d, yyyy • HH:mm")}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {note.title}
                                </h4>
                                {note.content && (
                                    <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground leading-relaxed border border-border/50">
                                        {note.content}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                        {note.User?.name?.[0] || "?"}
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground">
                                        {note.User?.name || "Unknown"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
