"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiShield, FiLock, FiAlertCircle, FiEye, FiEyeOff } from "react-icons/fi";
import {
  getPOSPermittedUsers,
  verifyPOSPermissionPassword,
  type POSPermittedUser,
} from "../_actions/pos-security.action";

interface POSSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (permittedUserId: string, permittedUserName: string) => void;
  actionTitle?: string;
  actionDescription?: string;
}

export default function POSSecurityModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "Authorize Due Sale",
  actionDescription = "Secure POS is enabled. Select an authorized user with POS permissions and enter password to approve.",
}: POSSecurityModalProps) {
  const [users, setUsers] = useState<POSPermittedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setPassword("");
      setSelectedUserId("");
      fetchPermittedUsers();
    }
  }, [isOpen]);

  const fetchPermittedUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await getPOSPermittedUsers();
      if (res.success && res.users) {
        setUsers(res.users);
        if (res.users.length > 0) {
          setSelectedUserId(res.users[0].id);
        }
      } else {
        setError(res.error || "Failed to load authorized users");
      }
    } catch (err) {
      console.error("fetchPermittedUsers error:", err);
      setError("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select an authorized user");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setVerifying(true);
      setError("");

      const res = await verifyPOSPermissionPassword(selectedUserId, password);

      if (!res.success || !res.user) {
        setError(res.error || "Authorization failed");
        return;
      }

      onSuccess(res.user.id, res.user.name);
      onClose();
    } catch (err) {
      console.error("handleVerify error:", err);
      setError(err instanceof Error ? err.message : "Verification error occurred");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FiShield className="h-5 w-5 text-primary" />
            {actionTitle}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {actionDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* User Selection Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="authorizing-user" className="text-xs font-semibold">
              Authorizing User (with POS Permission)
            </Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loadingUsers || verifying}
            >
              <SelectTrigger id="authorizing-user" className="h-9 text-xs">
                <SelectValue
                  placeholder={
                    loadingUsers ? "Loading authorized users..." : "Select user"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name || u.email} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <Label htmlFor="authorizing-password" className="text-xs font-semibold">
              Password Verification
            </Label>
            <div className="relative">
              <Input
                id="authorizing-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password to approve"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={verifying}
                className="pr-9 text-xs h-9"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={verifying}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={verifying || loadingUsers} size="sm">
              <FiLock className="mr-1.5 h-3.5 w-3.5" />
              {verifying ? "Verifying..." : "Approve & Enable"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
