"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Plus 
} from "lucide-react";
import { format, isPast } from "date-fns";
import SystemEventForm from "./SystemEventForm";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader,
    SheetTitle,
    SheetTrigger 
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SystemEntityType } from "@/lib/system/types";

interface EventItem {
    id: string;
    title: string;
    description?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    location?: string | null;
    attendees?: string[];
    allDay?: boolean;
    eventType?: string | null;
    reminder?: string | null;
    status?: string | null;
    owner?: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

interface EventManagerProps {
    entityId: string;
    entityType: SystemEntityType;
    events: any[];
    users?: { id: string; name: string | null; email: string; image?: string | null }[];
}

const getStatusColor = (start: Date, end: Date) => {
    const now = new Date();
    if (now > end) return "bg-muted text-muted-foreground border-border";
    if (now >= start && now <= end) return "bg-green-50 text-green-700 border-green-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
};

const getStatusLabel = (start: Date, end: Date) => {
    const now = new Date();
    if (now > end) return "Completed";
    if (now >= start && now <= end) return "In Progress";
    return "Upcoming";
};

export default function EventManager({ entityId, entityType, events, users = [] }: EventManagerProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
    const router = useRouter();

    const handleCreateNew = () => {
        setSelectedEvent(null);
        setIsSheetOpen(true);
    };

    const handleEditEvent = (event: EventItem) => {
        setSelectedEvent(event);
        setIsSheetOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mx-4 pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Events
                </h3>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4" />
                            New Event
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-xl overflow-y-auto">
                        <SheetHeader className="mb-4">
                            <SheetTitle>{selectedEvent ? "Edit Event" : "Schedule New Event"}</SheetTitle>
                        </SheetHeader>

                        <SystemEventForm 
                            key={selectedEvent?.id || "new-event"}
                            entityId={entityId}
                            entityType={entityType}
                            initialData={selectedEvent}
                            onSuccess={() => {
                                setIsSheetOpen(false);
                                router.refresh(); 
                            }}
                            onCancel={() => setIsSheetOpen(false)}
                            users={users as any} 
                        />
                    </SheetContent>
                </Sheet>
            </div>
            <div className="grid gap-3 p-4 pt-0">
                {events.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium">No events scheduled</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Schedule meetings, calls, or deadlines.</p>
                    </div>
                ) : (
                    events.map((event) => {
                        const start = new Date(event.startTime);
                        const end = new Date(event.endTime);
                        const isDone = isPast(end);

                        // Find attendee details from users prop
                        const attendees = (event.attendees || []).map((id: string) => 
                            users.find(u => u.id === id)
                        ).filter(Boolean);

                        return (
                            <Card key={event.id} className={cn(
                                "group transition-all duration-200 hover:shadow-md border-border/50 cursor-pointer",
                                isDone ? "bg-muted/30 opacity-70 hover:opacity-100" : "bg-card"
                            )} onClick={() => handleEditEvent(event)}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-2 min-w-[60px] border">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                                {format(start, "MMM")}
                                            </span>
                                            <span className="text-xl font-bold text-foreground">
                                                {format(start, "d")}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                                        {event.title}
                                                    </h4>
                                                    {event.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-1">
                                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider", getStatusColor(start, end))}>
                                                        {getStatusLabel(start, end)}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {format(start, "h:mm a")} - {format(end, "h:mm a")}
                                                    </div>
                                                    {event.location && (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {event.location}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Avatar List */}
                                                <div className="flex -space-x-2 overflow-hidden items-center ml-auto">
                                                    {/* Owner Avatar */}
                                                    {event.owner && (
                                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-background overflow-hidden bg-muted border border-primary/20" title={`Organizer: ${event.owner.name}`}>
                                                            {event.owner.image ? (
                                                                <img src={event.owner.image} alt={event.owner.name || ""} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold uppercase text-primary">
                                                                    {(event.owner.name || "?").charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Attendee Avatars */}
                                                    {attendees.map((attendee: any, idx: number) => (
                                                        <div key={attendee.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-background overflow-hidden bg-muted border" title={attendee.name || attendee.email}>
                                                            {attendee.image ? (
                                                                <img src={attendee.image} alt={attendee.name || ""} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground">
                                                                    {(attendee.name || attendee.email).charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
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
