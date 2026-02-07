"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FiCheck, FiTruck, FiArrowLeft, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { confirmDeliverySchedule, completeDeliverySchedule } from "@/app/actions/delivery-schedules";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import PrintableChallan from "./printable-challan";
import { FiPrinter } from "react-icons/fi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduleItem {
  id: string;
  description: string;
  quantity: any;
  unitPrice: any;
  orderItemId: string;
}

interface ScheduleDetailProps {
  schedule: {
    id: string;
    scheduledDate: Date;
    status: string;
    description: string | null;
    orderId: string;
    order: {
      orderNumber: string;
      client: {
        name: string | null;
        company: string | null;
      } | null;
    };
    items: ScheduleItem[];
  };
}

export default function ScheduleDetailClient({ schedule }: ScheduleDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"confirm" | "complete" | null>(null);
  const { toast } = useToast();

  const initiateAction = (action: "confirm" | "complete") => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleAction = async () => {
    if (!dialogAction) return;
    setLoading(true);
    setDialogOpen(false); // Close dialog immediately or keep open? Usually close.

    try {
        let result;
        if (dialogAction === "confirm") {
             result = await confirmDeliverySchedule(schedule.id);
             if (result.success) {
                toast({
                  title: "Success",
                  description: "Schedule confirmed successfully",
                });
                router.refresh();
              } else {
                toast({
                  title: "Error",
                  description: "error" in result ? result.error : "Failed to confirm schedule",
                  variant: "destructive",
                });
              }
        } else if (dialogAction === "complete") {
             result = await completeDeliverySchedule(schedule.id);
             if (result.success) {
                toast({
                  title: "Success",
                  description: `Fulfillment sequence completed! Draft invoice generated.`,
                });
                router.push(`/dashboard/quotations/orders/${schedule.orderId}`);
              } else {
                toast({
                  title: "Error",
                  description: "error" in result ? result.error : "Failed to complete schedule",
                  variant: "destructive",
                });
              }
        }
    } catch (error) {
       toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDialogAction(null);
    }
  };



  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled": return <Badge variant="secondary" className="bg-slate-100 text-slate-700 h-6">Scheduled</Badge>;
      case "confirmed": return <Badge className="bg-blue-600 hover:bg-blue-700 text-white h-6">Confirmed</Badge>;
      case "completed": return <Badge className="bg-green-600 hover:bg-green-700 text-white h-6">Completed</Badge>;
      default: return <Badge variant="outline" className="h-6">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Construct a delivery object for the specific item to match PrintableChallan props
  // PrintableChallan expects a single delivery object, but here we have a schedule with multiple items.
  // We might need to iterate or change PrintableChallan to accept a schedule.
  // For now, let's adapt the schedule to the expected format if possible, or modify PrintableChallan later.
  // Wait, PrintableChallan takes `delivery`. Let's check its props.
  // It seems designed for a single delivery ledger entry.
  // Converting schedule to match PrintableChallan seems wrong if PrintableChallan is for Ledger.
  // But the user wants to print Challan AFTER Confirm (before Complete/Ledger).
  // So we should probably adapt PrintableChallan or pass a constructed object.
  // Let's modify PrintableChallan to handle Schedule as well or map here.
  // Actually, let's just use it and see, or better, pass the schedule as a delivery-like object since they share structure.
  
  // Checking PrintableChallan props again:
  // delivery.id, delivery.date, delivery.order.orderNumber, delivery.order.client...
  // delivery.orderItem.description...
  // It seems PrintableChallan is for SINGLE ITEM delivery.
  // But a Schedule can have MULTIPLE items.
  // We probably need a "PrintableScheduleChallan" or update PrintableChallan to support multiple items.
  // For now, I will map the first item or iterate. 
  // User said "Print Challan". Usually a Challan is per shipment (Schedule).
  // I will assume PrintableChallan needs to be updated to support multiple items, OR provided with a list.
  // BUT, I can't change other files yet (user claimed "do not change any code yet" but that was for the verification request).
  // Actually, I can change code now to MAKE it work.
  // I will assume PrintableChallan needs to be updated or I will write a new structure for the print view inside this file or component.
  // Let's just create a print view structure inside this return for now, hidden on screen.

  const totalValue = schedule.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link href="/dashboard/quotations/delivery-schedule">
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedules
        </Link>
      </Button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <h1 className="text-3xl font-bold tracking-tight">Schedule Details</h1>
             {getStatusBadge(schedule.status)}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
             <span className="font-semibold text-foreground">{schedule.order.orderNumber}</span> 
             &bull; {schedule.order.client?.company || schedule.order.client?.name || "No Client"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {schedule.status === "scheduled" && (
            <Button 
                onClick={() => initiateAction("confirm")} 
                disabled={loading} 
                variant="outline"
                className="h-10 px-4 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <FiCheckCircle className="mr-2 h-4 w-4" />
              Confirm Schedule
            </Button>
          )}
          
          {schedule.status === "confirmed" && (
            <Button 
                onClick={() => initiateAction("complete")} 
                disabled={loading} 
                className="h-10 px-6 shadow-md"
            >
              <FiTruck className="mr-2 h-4 w-4" />
              Post Fulfillment
            </Button>
          )}

          {schedule.status === "completed" && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 text-sm font-medium">
               <FiCheck className="h-4 w-4" />
               Fulfillment Completed
            </div>
          )}
          {schedule.status === "confirmed" && (
            <>
                <Button 
                    onClick={handlePrint}
                    variant="outline"
                    className="h-10 px-4 gap-2"
                >
                    <FiPrinter className="h-4 w-4" />
                    Print Challan
                </Button>
                <Button 
                    onClick={() => initiateAction("complete")} 
                    disabled={loading} 
                    className="h-10 px-6 shadow-md"
                >
                <FiTruck className="mr-2 h-4 w-4" />
                Post Fulfillment
                </Button>
            </>
          )}

          {schedule.status === "completed" && (
            <div className="flex items-center gap-2">
                 <Button 
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                >
                    <FiPrinter className="h-3 w-3" />
                    Print Challan
                </Button>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 text-sm font-medium">
                    <FiCheck className="h-4 w-4" />
                    Fulfillment Completed
                </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden print:block">
        <PrintableChallan schedule={schedule} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-erp print:hidden">
         {/* Detail Cards */}
         <Card className="shadow-none border-slate-200">
            <CardHeader className="py-3 bg-slate-50/50">
               <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Logistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
               <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Scheduled Date</label>
                  <p className="text-sm font-semibold">{formatDate(schedule.scheduledDate)}</p>
               </div>
               <div>
                   <label className="text-[10px] text-slate-400 font-bold uppercase">Description</label>
                   <p className="text-sm italic text-slate-600">{schedule.description || "No specific instructions provided."}</p>
               </div>
            </CardContent>
         </Card>

         <Card className="md:col-span-2 shadow-none border-slate-200">
            <CardHeader className="py-3 bg-slate-50/50">
               <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Planned Fulfillment Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table className="text-xs border-y-0">
                  <TableHeader>
                     <TableRow className="hover:bg-transparent bg-slate-50/30">
                        <TableHead className="pl-6">Item Description</TableHead>
                        <TableHead className="text-right w-[100px]">Planned Qty</TableHead>
                        <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                        <TableHead className="text-right pr-6 w-[120px]">Sub-total</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {schedule.items.map((item) => (
                        <TableRow key={item.id}>
                           <TableCell className="pl-6 font-medium">{item.description}</TableCell>
                           <TableCell className="text-right font-bold text-slate-900 bg-slate-50/30">
                              {Number(item.quantity).toFixed(2)}
                           </TableCell>
                           <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(Number(item.unitPrice))}
                           </TableCell>
                           <TableCell className="text-right pr-6 font-mono">
                              {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                           </TableCell>
                        </TableRow>
                     ))}
                     <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={3} className="text-right text-slate-500">Estimated Fulfillment Value:</TableCell>
                        <TableCell className="text-right pr-6 text-primary text-sm font-bold">
                            {formatCurrency(totalValue)}
                        </TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </CardContent>
         </Card>
      </div>

      {/* Action Notice */}
      {schedule.status === "scheduled" && (
        <div className="flex gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-lg text-blue-800 text-sm">
           <FiAlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
           <p>This schedule is currently in <b>Scheduled</b> status. Please review the items and dates with your production/logistics team and click <b>Confirm Schedule</b> once verified.</p>
        </div>
      )}

      {schedule.status === "confirmed" && (
        <div className="flex gap-3 bg-slate-50 border border-slate-200 p-4 rounded-lg text-slate-700 text-sm">
           <FiTruck className="h-5 w-5 mt-0.5 shrink-0" />
           <p>This schedule is <b>Confirmed</b>. Once the physical delivery has been dispatched, click <b>Post Fulfillment</b> to update the delivery ledger and generate the draft invoice.</p>
        </div>
      )}
      {/* Alert Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
                {dialogAction === "confirm" ? "Confirm Delivery Schedule?" : "Post Fulfillment?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
                {dialogAction === "confirm" 
                    ? "This will lock the schedule and prepare it for fulfillment. You cannot edit quantities after confirmation."
                    : "This will finalize the delivery, post entries to the delivery ledger, and generate a draft invoice. This action cannot be undone."
                }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleAction(); }} disabled={loading} className={dialogAction === "complete" ? "bg-green-600 hover:bg-green-700" : ""}>
                {loading ? "Processing..." : "Proceed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
