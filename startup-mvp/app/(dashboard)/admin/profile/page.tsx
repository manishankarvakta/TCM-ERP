"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import UploadDialog from "@/components/UploadDialog";
import { getCurrentUser, updateCurrentUserProfile, requestPasswordChange, deleteCurrentUserAccount } from "@/app/actions/user.action";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";
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
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (user) {
          setProfilePhoto(user.image || "");
          setEmail(user.email || "");
          
          // Split name into first and last name
          if (user.name) {
            const nameParts = user.name.trim().split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts.slice(1).join(" ") || "");
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateCurrentUserProfile({
        firstName,
        lastName,
        image: profilePhoto,
      });

      if (result.success) {
        // Revalidate the session by triggering a page refresh or router refresh
        // The JWT callback will fetch the latest user data on the next request
        router.refresh();
        
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const result = await requestPasswordChange();
      if (result.success) {
        toast({
          title: "Email sent",
          description: "Check your email for password change instructions",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send password change email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error requesting password change:", error);
      toast({
        title: "Error",
        description: "Failed to send password change email",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const result = await deleteCurrentUserAccount();
      
      if (result.success) {
        toast({
          title: "Account deleted",
          description: "Your account has been deleted",
        });
        // Sign out and redirect
        await signOut({ redirect: false });
        router.push("/");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete account",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };



  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
      </div>

      {/* Picture Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Picture</h2>
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
            {profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePhoto}
                alt={firstName || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-medium text-muted-foreground">
                {getInitials(`${firstName} ${lastName}`.trim() || null)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaSelectorOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setProfilePhoto("");
                  handleSave();
                }}
                disabled={!profilePhoto || saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              We support your square PNGs, JPEGs and GIFs under 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Name Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Name</h2>
        <p className="text-sm text-muted-foreground">Your name as it will be displayed</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={handleSave}
              placeholder="First Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={handleSave}
              placeholder="Last Name"
            />
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Email</h2>
        <p className="text-sm text-muted-foreground">The email associated to your account</p>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      {/* Change Password Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Change Password</h2>
        <p className="text-sm text-muted-foreground">Receive an email containing password update link</p>
        <Button
          type="button"
          variant="outline"
          onClick={handleChangePassword}
        >
          Change Password
        </Button>
      </div>

      {/* Danger Zone Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Danger zone</h2>
        <p className="text-sm text-muted-foreground">Delete account and all the associated data</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete account
        </Button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        onSelect={(url) => {
          setProfilePhoto(url);
          setMediaSelectorOpen(false);
          handleSave();
        }}
        allowedTypes={["image/*"]}
      />
    </div>
  );
};

export default Profile;
