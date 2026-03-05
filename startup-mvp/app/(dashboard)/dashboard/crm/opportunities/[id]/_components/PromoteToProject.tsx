"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiBriefcase } from "react-icons/fi";
import { createProject } from "@/app/actions/projects/project.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PromoteToProjectProps {
  opportunity: any;
}

export default function PromoteToProject({ opportunity }: PromoteToProjectProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePromote = () => {
    startTransition(async () => {
      try {
        const result = await createProject({
          title: opportunity.title,
          clientId: opportunity.clientId,
          opportunityId: opportunity.id,
          budget: opportunity.value || 0,
          description: `Project promoted from Opportunity: ${opportunity.opportunityNumber}`,
          priority: "NORMAL",
        });

        if (result.success && result.project) {
          toast.success("Opportunity successfully promoted to a Project!");
          router.push(`/dashboard/projects/${result.project.id}`);
        } else {
          toast.error(typeof result.error === 'string' ? result.error : "Failed to promote opportunity");
        }
      } catch (err) {
        console.error("Promotion error:", err);
        toast.error("An unexpected error occurred during promotion");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
            className="rounded-xl h-10 px-6 bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90 font-bold transition-all active:scale-95 flex items-center gap-2"
            disabled={isPending}
        >
            <FiBriefcase className="h-4 w-4" />
            Promote to Project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
        <AlertDialogHeader className="bg-primary/5 p-10 -mx-6 -mt-6 border-b border-primary/10">
          <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter">Promote to Matrix?</AlertDialogTitle>
          <AlertDialogDescription className="text-lg font-medium text-muted-foreground/80 mt-4 leading-relaxed">
            Technical mission will be initialized based on this opportunity. 
            All financial parameters and client links will be synchronized into the project ecosystem.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-6 py-8">
          <AlertDialogCancel className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted transition-all">Cancel Mission</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handlePromote}
            className="rounded-2xl h-12 px-10 font-black bg-primary uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/30 transform active:scale-95 transition-all"
            disabled={isPending}
          >
            {isPending ? "Initializing..." : "Confirm Launch"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
