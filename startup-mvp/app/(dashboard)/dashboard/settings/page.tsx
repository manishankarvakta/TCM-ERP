"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  GraduationCap,
  AtSign,
  Mail,
  Calendar,
  Settings as SettingsIcon,
  Users,
  Lock,
  Network,
  Puzzle,
  Key,
  Code,
  Webhook,
  Building2,
  Beaker,
  Rocket,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Profile from "../profile/page";

type SettingsSection = "profile" | "experience" | "emails" | "calendars" | "general" | "members" | "roles" | "data-model" | "integrations" | "security" | "apis" | "webhooks" | "admin-panel" | "lab" | "releases";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [advanced, setAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const section = searchParams.get("section") as SettingsSection;
    if (section) {
      setActiveSection(section);
      // Auto-expand parent items if a child is active
      if (section === "emails" || section === "calendars") {
        setExpandedItems(new Set(["accounts"]));
      }
    }
  }, [searchParams]);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    router.push(`/dashboard/settings?section=${section}`);
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const settingsMenu = [
    {
      category: "User",
      items: [
        // { id: "profile" as SettingsSection, label: "Profile", icon: User, active: activeSection === "profile" },
        { id: "experience" as SettingsSection, label: "Experience", icon: GraduationCap, active: activeSection === "experience" },
        {
          id: "accounts" as SettingsSection,
          label: "Accounts",
          icon: AtSign,
          active: activeSection === "emails" || activeSection === "calendars",
          children: [
            { id: "emails" as SettingsSection, label: "Emails", icon: Mail, active: activeSection === "emails" },
            { id: "calendars" as SettingsSection, label: "Calendars", icon: Calendar, active: activeSection === "calendars" },
          ],
        },
      ],
    },
    {
      category: "Notifications",
      items: [
        { id: "general" as SettingsSection, label: "General", icon: SettingsIcon, active: activeSection === "general" },
        { id: "members" as SettingsSection, label: "Members", icon: Users, active: activeSection === "members" },
        { id: "roles" as SettingsSection, label: "Roles", icon: Lock, active: activeSection === "roles" },
        { id: "data-model" as SettingsSection, label: "Data model", icon: Network, active: activeSection === "data-model" },
        { id: "integrations" as SettingsSection, label: "Integrations", icon: Puzzle, active: activeSection === "integrations" },
        { id: "security" as SettingsSection, label: "Security", icon: Key, active: activeSection === "security" },
      ],
    },
    {
      category: "Developers",
      items: [
        { id: "apis" as SettingsSection, label: "APIs", icon: Code, active: activeSection === "apis" },
        { id: "webhooks" as SettingsSection, label: "Webhooks", icon: Webhook, active: activeSection === "webhooks" },
      ],
    },
    {
      category: "Other",
      items: [
        { id: "admin-panel" as SettingsSection, label: "Admin Panel", icon: Building2, active: activeSection === "admin-panel" },
        { id: "lab" as SettingsSection, label: "Lab", icon: Beaker, active: activeSection === "lab" },
        { id: "releases" as SettingsSection, label: "Releases", icon: Rocket, active: activeSection === "releases" },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <Profile />;
      default:
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold capitalize">{activeSection.replace("-", " ")}</h1>
            <p className="text-sm text-muted-foreground">This section is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex h-screen w-screen bg-background z-50">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Exit Settings
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {settingsMenu.map((category) => (
            <div key={category.category} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasActiveChild = item.children?.some(child => child.active);
                  
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (item.children) {
                            toggleExpand(item.id);
                          } else {
                            handleSectionChange(item.id);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          (item.active || hasActiveChild)
                            ? "bg-background text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.children && (
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        )}
                      </button>
                      {item.children && isExpanded && (
                        <div className="ml-7 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => handleSectionChange(child.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                child.active
                                  ? "bg-background text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span className="flex-1 text-left">{child.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer - Advanced Toggle */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="advanced" className="text-sm text-muted-foreground">
              Advanced:
            </Label>
            <Switch
              id="advanced"
              checked={advanced}
              onCheckedChange={setAdvanced}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-full mx-auto px-8 pt-4 pb-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Settings</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground capitalize">{activeSection.replace("-", " ")}</span>
            </div>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
