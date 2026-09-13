"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import UploadDialog from "@/components/UploadDialog";
import { getCurrentUser, updateCurrentUserProfile, changeCurrentUserPassword } from "@/app/actions/user.action";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Camera,
  Loader2,
  Info,
  Save,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("User");
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Password fields & visibility toggles
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);


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
          if (user.role) {
            setUserRole(user.role.charAt(0).toUpperCase() + user.role.slice(1));
          }
          
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
          description: "Failed to load profile details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [toast]);

  const handleSave = async (overridePhoto?: string) => {
    try {
      setSaving(true);
      const photoToSave = overridePhoto !== undefined ? overridePhoto : profilePhoto;
      const result = await updateCurrentUserProfile({
        firstName,
        lastName,
        image: photoToSave,
      });

      if (result.success) {
        if (overridePhoto !== undefined) {
          setProfilePhoto(overridePhoto);
        }
        setLastSaved(new Date());
        router.refresh();
        toast({
          title: "Profile updated",
          description: "Your profile details have been successfully saved.",
        });
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile details",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation error",
        description: "New password and re-typed password do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      const result = await changeCurrentUserPassword({
        oldPassword,
        newPassword,
      });

      if (result.success) {
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
        });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({
          title: "Password change failed",
          description: result.error || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
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

  const fullName = `${firstName} ${lastName}`.trim() || "User Profile";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full md:col-span-1 rounded-2xl" />
          <Skeleton className="h-64 w-full md:col-span-2 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and profile details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Profile Picture Card */}
        <Card className="md:col-span-1 border-border/60 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Profile Photo
              </CardTitle>
              <CardDescription className="text-xs">
                Your avatar visible across the ERP system
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-5 pt-0">
              <div className="relative group cursor-pointer" onClick={() => setMediaSelectorOpen(true)}>
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-background ring-4 ring-primary/20 shadow-md flex items-center justify-center bg-muted transition-transform duration-200 group-hover:scale-105">
                  {profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePhoto}
                      alt={fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground tracking-wider">
                      {getInitials(fullName)}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-xs font-medium gap-1">
                  <Camera className="h-5 w-5" />
                  Change
                </div>
              </div>

              <div className="flex flex-col w-full gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaSelectorOpen(true)}
                  className="w-full shadow-xs"
                >
                  <Upload className="mr-2 h-4 w-4 text-primary" />
                  Upload Photo
                </Button>

                {profilePhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleSave("");
                    }}
                    disabled={saving}
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Photo
                  </Button>
                )}
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-0">
            <div className="text-[11px] text-muted-foreground text-center space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border/40 w-full">
              <p className="font-medium text-foreground">Format requirements:</p>
              <div className="flex flex-wrap justify-center gap-1">
                <span className="px-1.5 py-0.5 bg-background rounded text-[10px] border border-border/50">PNG</span>
                <span className="px-1.5 py-0.5 bg-background rounded text-[10px] border border-border/50">JPG</span>
                <span className="px-1.5 py-0.5 bg-background rounded text-[10px] border border-border/50">WEBP</span>
                <span className="px-1.5 py-0.5 bg-background rounded text-[10px] border border-border/50">&lt; 10MB</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Personal Details & Change Password Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
                {saving ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </span>
                ) : null}
              </div>
              <CardDescription className="text-xs">
                Update your account display name and user credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-semibold">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-semibold">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 px-2 py-0">
                    Verified
                  </Badge>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-9 bg-muted/60 text-muted-foreground border-border/40 font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/40 pt-4 bg-muted/20 rounded-b-xl">
              <Button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Change Password Form (Old, New, Re-type Password) */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password by entering your current password and your new password below.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4 pt-0">
                {/* Old Password */}
                <div className="space-y-2">
                  <Label htmlFor="oldPassword" className="text-xs font-semibold">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pl-9 pr-10 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      tabIndex={-1}
                      title={showOldPassword ? "Hide password" : "Show password"}
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Re-type Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="pl-9 pr-10 focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                        tabIndex={-1}
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold">Re-type New Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="pl-9 pr-10 focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                        tabIndex={-1}
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="flex justify-between items-center border-t border-border/40 pt-4 bg-muted/20 rounded-b-xl">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0 text-muted-foreground" />
                  Password must be at least 6 characters.
                </p>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="shadow-xs"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Password...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Password
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        onSelect={(url) => {
          setMediaSelectorOpen(false);
          handleSave(url);
        }}
        allowedTypes={["image/*"]}
      />
    </div>
  );

};

export default Profile;



