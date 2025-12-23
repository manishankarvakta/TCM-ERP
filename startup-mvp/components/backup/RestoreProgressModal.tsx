/**
 * Restore Progress Modal
 * 
 * Displays real-time progress for restore operations
 */

"use client";

import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { RestoreProgress } from '@/types/backup';
import {
  Database,
  Files,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RestoreProgressModalProps {
  open: boolean;
  progress: RestoreProgress | null;
  onClose: () => void;
}

export function RestoreProgressModal({
  open,
  progress,
  onClose,
}: RestoreProgressModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress?.logs]);

  if (!progress) {
    return null;
  }

  const isComplete = progress.status === 'COMPLETED';
  const isFailed = progress.status === 'FAILED';
  const isRunning = !isComplete && !isFailed;

  return (
    <Dialog open={open} onOpenChange={isRunning ? undefined : onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isFailed && <XCircle className="h-5 w-5 text-red-500" />}
            {isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            <span>
              {isComplete && 'Restore Completed'}
              {isFailed && 'Restore Failed'}
              {isRunning && 'Restoring Backup'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              variant={
                isComplete ? 'default' : isFailed ? 'destructive' : 'secondary'
              }
            >
              {progress.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{progress.progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.stage}</p>
          </div>

          {/* Current Item */}
          {progress.currentItem && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Processing:</p>
              <p className="text-sm font-mono truncate">{progress.currentItem}</p>
            </div>
          )}

          {/* Statistics */}
          {progress.stats && Object.keys(progress.stats).length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {progress.stats.tablesProcessed !== undefined && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tables</p>
                  <p className="text-sm font-medium">
                    {progress.stats.tablesProcessed} / {progress.stats.tablesTotal || 0}
                  </p>
                </div>
              )}
              {progress.stats.filesUploaded !== undefined && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Files</p>
                  <p className="text-sm font-medium">
                    {progress.stats.filesUploaded} / {progress.stats.filesTotal || 0}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {isFailed && progress.error && (
            <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80 mt-1">{progress.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Operation Log</p>
            <ScrollArea className="h-[200px] rounded-md border bg-muted/50 p-3">
              <div className="space-y-1">
                {progress.logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Success Message */}
          {isComplete && (
            <div className="rounded-md bg-green-500/10 p-3 border border-green-500/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Restore completed successfully
                  </p>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                    Your data has been restored from the backup.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isRunning && (
              <Button variant="outline" size="sm" disabled>
                Please wait...
              </Button>
            )}
            {(isComplete || isFailed) && (
              <Button onClick={onClose} size="sm">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

