import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import UploadContent from "@/components/files/UploadDialog";
import { 
    CircleDot, ChevronsRight, MessageSquare, Wand2, LayoutGrid, Check, 
    User2, Calendar, Flag, Clock, Tags, FileText, PlusSquare, 
    Network, Link as LinkIcon, ListChecks, Paperclip, PlayCircle,
    ChevronDown, Minimize2
} from "lucide-react";
import { format } from "date-fns";
import { getChecklists, createChecklist, createChecklistItem, toggleChecklistItem } from "@/app/actions/system/checklist.action";
import { toast } from "sonner";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { updateClickUpEntity } from "@/app/actions/projects/clickup.action";
export interface ClickUpItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: "task" | "issue" | "milestone";
    initialData: any;
    users?: any[];
    onRefresh: () => void;
}

export function ClickUpItemModal({ 
    isOpen, 
    onClose, 
    entityType, 
    initialData, 
    users = [],
    onRefresh
}: ClickUpItemModalProps) {
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState(initialData?.title || "New Item");
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Interactive states
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isChecklistVisible, setIsChecklistVisible] = useState(false);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [newItemContent, setNewItemContent] = useState("");

    useEffect(() => {
        if (isOpen && initialData?.id) {
            fetchChecklists();
        }
    }, [isOpen, initialData?.id, entityType]);

    const fetchChecklists = async () => {
        const res = await getChecklists(entityType, initialData.id);
        if (res.success && res.checklists) {
            setChecklists(res.checklists);
            if (res.checklists.length > 0) {
                setIsChecklistVisible(true);
            }
        }
    };

    const handleCreateChecklist = async () => {
        if (!initialData?.id) return;
        startTransition(async () => {
            const res = await createChecklist(entityType, initialData.id, "Checklist");
            if (res.success) {
                fetchChecklists();
                setIsChecklistVisible(true);
            } else {
                toast.error("Failed to create checklist");
            }
        });
    };

    const handleAddItem = async (checklistId: string) => {
        if (!newItemContent.trim()) return;
        const res = await createChecklistItem(checklistId, newItemContent);
        if (res.success) {
            setNewItemContent("");
            fetchChecklists();
        }
    };

    const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
        const res = await toggleChecklistItem(itemId, !currentStatus);
        if (res.success) {
            fetchChecklists();
        }
    };

    // Interactive Local States
    const [localStatus, setLocalStatus] = useState(initialData?.status || "OPEN");
    const [localStartDate, setLocalStartDate] = useState<Date | undefined>(initialData?.startDate ? new Date(initialData.startDate) : undefined);
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(initialData?.dueDate ? new Date(initialData.dueDate) : undefined);
    const [localAssignee, setLocalAssignee] = useState<any>(initialData?.Assignee || null);
    const [localPriority, setLocalPriority] = useState(initialData?.priority || "NORMAL");
    const [description, setDescription] = useState(initialData?.description || "");
    const tags = initialData?.tags || [];

    const handleUpdate = async (updates: any) => {
        if (!initialData?.id) return;
        startTransition(async () => {
            const res = await updateClickUpEntity(entityType, initialData.id, updates);
            if (res.success) {
                toast.success("Updated successfully");
                onRefresh();
            } else {
                toast.error(res.error || "Failed to update");
            }
        });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        if (title !== initialData?.title) {
            handleUpdate({ title });
        }
    };

    const handleDescriptionBlur = () => {
        if (description !== initialData?.description) {
            handleUpdate({ description });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`bg-white dark:bg-zinc-950 p-0 overflow-hidden shadow-2xl gap-0 border-none transition-all duration-300 ${isFullscreen ? 'w-screen h-screen max-w-none rounded-none' : 'sm:max-w-5xl rounded-xl h-[85vh]'} flex flex-col`}>
                
                {/* Top Navbar Area */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-muted-foreground border-border/60 hover:bg-muted/50 rounded-md">
                            <CircleDot className="w-3.5 h-3.5 mr-2 text-primary" />
                            <span className="capitalize">{entityType}</span>
                            <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50">
                            <span className="text-xs font-bold font-mono border rounded px-1">ID</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50" onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50">
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50">
                            <Wand2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50">
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-50/30 dark:bg-zinc-950/50">
                    
                    {/* Large Title Input */}
                    <div>
                        <Input 
                            value={title} 
                            onChange={handleTitleChange}
                            onBlur={handleTitleBlur}
                            className="text-4xl font-bold bg-transparent border-none shadow-none h-auto p-0 focus-visible:ring-0 rounded-none placeholder:text-muted-foreground/50 text-foreground"
                            placeholder={`${entityType} title`}
                        />
                    </div>

                    {/* Properties Grid (2 Columns) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 w-full max-w-3xl">
                        
                        {/* Row 1 */}
                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <CircleDot className="w-4 h-4 opacity-70" /> Status
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={localStatus} onValueChange={(val) => {
                                    setLocalStatus(val);
                                    handleUpdate({ status: val });
                                }}>
                                    <SelectTrigger className="border-0 p-0 h-auto focus:ring-0 focus-visible:ring-0 bg-transparent hover:bg-transparent shadow-none [&>svg]:hidden">
                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm px-2 py-1 flex items-center gap-1.5 cursor-pointer w-fit">
                                            <span className="text-xs font-bold tracking-wider">{localStatus.replace("_", " ")}</span>
                                            <div className="border-l border-white/20 pl-1.5 ml-0.5 flex items-center">
                                                <ChevronDown className="w-3 h-3" />
                                            </div>
                                        </Badge>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPEN">Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="DELAYED">Delayed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-md border-border/60 bg-white dark:bg-zinc-900 shadow-sm text-muted-foreground">
                                    <Check className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <User2 className="w-4 h-4 opacity-70" /> Assignees
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="text-sm text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors w-fit">
                                        {localAssignee ? localAssignee.name : "Empty"}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search users..." />
                                        <CommandList>
                                            <CommandEmpty>No users found.</CommandEmpty>
                                            <CommandGroup>
                                                {users.map(u => (
                                                    <CommandItem 
                                                        key={u.id}
                                                        onSelect={() => {
                                                            setLocalAssignee(u);
                                                            handleUpdate({ assigneeId: u.id });
                                                        }}
                                                    >
                                                        {u.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Row 2 */}
                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <Calendar className="w-4 h-4 opacity-70" /> Dates
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80 cursor-pointer">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                            <Calendar className="w-3.5 h-3.5" /> 
                                            {localStartDate ? format(localStartDate, "MMM d") : "Start"}
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarUI
                                            mode="single"
                                            selected={localStartDate}
                                            onSelect={(date) => {
                                                setLocalStartDate(date);
                                                handleUpdate({ startDate: date });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="opacity-40 text-xs">→</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                            <Calendar className="w-3.5 h-3.5" /> 
                                            {localDueDate ? format(localDueDate, "MMM d") : "Due"}
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarUI
                                            mode="single"
                                            selected={localDueDate}
                                            onSelect={(date) => {
                                                setLocalDueDate(date);
                                                handleUpdate({ dueDate: date });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <Flag className="w-4 h-4 opacity-70" /> Priority
                            </div>
                            <Select value={localPriority} onValueChange={(val) => {
                                setLocalPriority(val);
                                handleUpdate({ priority: val });
                            }}>
                                <SelectTrigger className="border-0 p-0 h-auto focus:ring-0 focus-visible:ring-0 shadow-none text-sm text-muted-foreground/60 hover:text-foreground transition-colors w-auto text-left flex gap-1 [&>svg]:hidden">
                                    <SelectValue placeholder="Empty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Row 3 */}
                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <Clock className="w-4 h-4 opacity-70" /> Track time
                            </div>
                            <div 
                                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/80 cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => toast.info("Time tracking will be enabled in the next update!")}
                            >
                                <PlayCircle className="w-4 h-4" /> Start
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div className="w-32 flex items-center text-sm font-medium text-muted-foreground gap-2">
                                <Tags className="w-4 h-4 opacity-70" /> Tags
                            </div>
                            <div 
                                className="text-sm text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => toast.info("Tag management popover coming soon!")}
                            >
                                {tags.length > 0 ? tags.map((t: any) => t.name).join(", ") : "Empty"}
                            </div>
                        </div>

                    </div>

                    <div className="w-full h-px bg-border/40 my-8"></div>

                    {/* Action List Below Properties */}
                    <div className="space-y-6 max-w-3xl">
                        
                        <div className="flex items-start gap-3 group">
                            <FileText className="w-5 h-5 text-muted-foreground/50 mt-2 group-hover:text-primary transition-colors flex-shrink-0" />
                            <Textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleDescriptionBlur}
                                placeholder="Add description..."
                                className="min-h-[100px] bg-transparent border-transparent hover:border-border focus:border-primary resize-none transition-colors text-sm p-2 w-full"
                            />
                        </div>



                        <div 
                            className="flex items-start gap-3 group cursor-pointer"
                            onClick={() => toast.info("Nested subtask creation coming soon!")}
                        >
                            <Network className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            <div className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                                Add subtask or issue
                            </div>
                        </div>

                        <div 
                            className="flex items-start gap-3 group cursor-pointer"
                            onClick={() => toast.info("Item dependencies coming soon!")}
                        >
                            <LinkIcon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            <div className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                                Relate items or add dependencies
                            </div>
                        </div>

                        <div className="flex items-start gap-3 group cursor-pointer" onClick={handleCreateChecklist}>
                            <ListChecks className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            <div className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                                Create checklist
                            </div>
                        </div>

                        {/* Interactive Checklist UI */}
                        {isChecklistVisible && checklists.map((checklist) => (
                            <div key={checklist.id} className="ml-8 border border-border/50 rounded-lg p-4 bg-background shadow-sm space-y-3">
                                <div className="text-sm font-bold flex items-center justify-between">
                                    <span>{checklist.title}</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-muted-foreground" onClick={() => setIsChecklistVisible(false)}>Hide</Button>
                                </div>
                                <div className="space-y-2">
                                    {checklist.Items?.map((item: any) => (
                                        <div key={item.id} className="flex items-start gap-3 group">
                                            <button 
                                                onClick={() => handleToggleItem(item.id, item.isCompleted)}
                                                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border ${item.isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 text-transparent hover:border-primary/50 transition-colors'}`}
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <span className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                                                {item.content}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 flex items-center gap-2">
                                    <Input 
                                        placeholder="Add checklist item..." 
                                        className="h-8 text-sm"
                                        value={newItemContent}
                                        onChange={(e) => setNewItemContent(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddItem(checklist.id);
                                        }}
                                    />
                                    <Button size="sm" className="h-8" onClick={() => handleAddItem(checklist.id)}>Add</Button>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-start gap-3 group cursor-pointer" onClick={() => setIsUploadOpen(true)}>
                            <Paperclip className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            <div className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                                Attach file
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>

            {/* Upload File Dialog Overlay */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-lg bg-background">
                    <DialogHeader>
                        <DialogTitle>Attach File to {entityType}</DialogTitle>
                    </DialogHeader>
                    <UploadContent 
                        open={isUploadOpen}
                        onOpenChange={setIsUploadOpen}
                        currentPath={`/attachments/${entityType}/${initialData?.id || 'new'}`}
                        onUploadComplete={() => {
                            setIsUploadOpen(false);
                            onRefresh();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
