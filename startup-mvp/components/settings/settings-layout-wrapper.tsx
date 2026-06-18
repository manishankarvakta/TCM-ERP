"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AtSign,
  Mail,
  Calendar,
  Settings as SettingsIcon,
  Users,
  Key,
  Code,
  Webhook,
  Building2,
  X,
  ChevronRight,
  Fingerprint,
  LucideUserCog,
  LucideDatabaseBackup,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MdWhatsapp } from "react-icons/md";
import { HiEnvelope } from "react-icons/hi2";
import { TbCreditCardPay, TbReceiptTax, TbShieldCheck } from "react-icons/tb";
import { SlEnvolopeLetter } from "react-icons/sl";

type SettingsSection =
  | "profile"
  | "experience"
  | "emails"
  | "calendars"
  | "backup"
  | "permissions"
  | "general"
  | "members"
  | "roles"
  | "data-model"
  | "integrations"
  | "security"
  | "organization"
  | "apis"
  | "webhooks"
  | "tex"
  | "lab"
  | "releases"
  | "whatsapp"
  | "telegram"
  | "sms"
  | "paymentMethods"
  | "coverLetter"
  | "tos"
  | "preferences";

interface SettingsLayoutWrapperProps {
  children: React.ReactNode;
  activeSection: SettingsSection;
}

export default function SettingsLayoutWrapper({
  children,
  activeSection: initialActiveSection,
}: SettingsLayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [advanced, setAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialActiveSection);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Auto-expand permissions if we're on a permissions page
  useEffect(() => {
    if (pathname?.includes("/permissions")) {
      setExpandedItems(new Set(["permissions"]));
    }
  }, [pathname]);

  // Detect if we're in admin or dashboard route
  const isDashboardRoute = pathname?.startsWith("/dashboard/settings");
  const basePath = isDashboardRoute ? "/dashboard/settings" : "/dashboard/settings";
  const exitPath = isDashboardRoute ? "/dashboard" : "/dashboard";

  const handleSectionChange = (section: SettingsSection) => {
    startTransition(() => {
      setActiveSection(section);
      if (section === "permissions") {
        router.push(`${basePath}?section=permissions`);
      } else {
        router.push(`${basePath}?section=${section}`);
      }
    });
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
      category: "Settings",
      items: [
        { id: "organization" as SettingsSection, label: "Organization", icon: Building2, active: activeSection === "experience" },
        { id: "experience" as SettingsSection, label: "Experience", icon: Fingerprint, active: activeSection === "experience" },
        {
            id: "accounts" as SettingsSection,
            label: "Accounts",
            icon: AtSign,
            active: activeSection === "emails" || activeSection === "calendars",
            children: [
                { id: "emails" as SettingsSection, label: "Emails", icon: Mail, active: activeSection === "emails" },
                { id: "calendars" as SettingsSection, label: "Calendars", icon: Calendar, active: activeSection === "calendars" },
                { id: "whatsapp" as SettingsSection, label: "WhatsApp", icon: MdWhatsapp, active: activeSection === "whatsapp" },
                { id: "telegram" as SettingsSection, label: "Telegram", icon: Calendar, active: activeSection === "telegram" },
                { id: "sms" as SettingsSection, label: "SMS", icon: HiEnvelope, active: activeSection === "sms" },
            ],
        },
        { id: "backup" as SettingsSection, label: "Backup", icon: LucideDatabaseBackup, active: activeSection === "backup" },
        { id: "permissions" as SettingsSection, label: "Permissions", icon: Building2, active: pathname === "/dashboard/settings?section=permissions" ||  pathname === "/dashboard/settings/permissions/templates/" },
        
      ],
    },
    {
      category: "Accounts",
      items: [
        { id: "tex" as SettingsSection, label: "Tex", icon: TbReceiptTax, active: activeSection === "tex" },
        { id: "paymentMethods" as SettingsSection, label: "Payment Methods", icon: TbCreditCardPay, active: activeSection === "paymentMethods" },
        { id: "preferences" as SettingsSection, label: "Preferences", icon: LucideUserCog, active: activeSection === "preferences" },
      ],
    },
    {
      category: "Quotations",
      items: [
        { id: "coverLetter" as SettingsSection, label: "Cover Letter", icon: SlEnvolopeLetter, active: activeSection === "coverLetter" },
        { id: "tos" as SettingsSection, label: "TOS", icon: TbShieldCheck, active: activeSection === "tos" },
      ],
    },
    {
      category: "Notifications",
      items: [
        { id: "general" as SettingsSection, label: "General", icon: SettingsIcon, active: activeSection === "general" },
        { id: "members" as SettingsSection, label: "Members", icon: Users, active: activeSection === "members" },
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
  ];

  return (
    <div className="fixed inset-0 flex h-screen w-screen bg-background z-50">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <Link
            href={exitPath}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Exit Settings
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {settingsMenu
            .filter((category) => {
              // Hide Developers section if advanced is not enabled
              if (category.category === "Developers" && !advanced) {
                return false;
              }
              return true;
            })
            .map((category) => (
              <div key={category.category} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category.category}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    const hasChildren = "children" in item && Array.isArray(item.children);
                    const hasActiveChild =
                      hasChildren && item.children
                        ? item.children.some((child: { active: boolean }) => child.active)
                        : false;
                    const isActive = item.active || hasActiveChild;

                    return (
                      <div key={item.id}>
                        {hasChildren ? (
                          <>
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                isActive
                                  ? "bg-background text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                              />
                            </button>
                            {isExpanded && item.children && (
                              <div className="ml-7 mt-1 space-y-1">
                                {item.children.map(
                                  (
                                    child: {
                                      id: SettingsSection;
                                      label: string;
                                      icon: React.ComponentType<{ className?: string }>;
                                      active: boolean;
                                    },
                                    index: number
                                  ) => {
                                    // Handle permissions sub-menu with links
                                    if (item.id === "permissions") {
                                      const usersPath = isDashboardRoute ? "/dashboard/users" : "/dashboard/users";
                                      let href = `${basePath}?section=permissions`;
                                      if ((child.id as string) === "permissions-templates") {
                                        href = `${basePath}/permissions/templates`;
                                      } else if ((child.id as string) === "permissions-users") {
                                        href = usersPath; // Users list page
                                      }

                                      return (
                                        <Link
                                          key={`${child.id}-${index}`}
                                          href={href}
                                          className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                            child.active
                                              ? "bg-background text-foreground font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                          )}
                                        >
                                          <child.icon className="h-4 w-4" />
                                          <span className="flex-1 text-left">{child.label}</span>
                                        </Link>
                                      );
                                    }

                                    return (
                                      <button
                                        key={`${child.id}-${index}`}
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
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => handleSectionChange(item.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                              isActive
                                ? "bg-background text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1 text-left">{item.label}</span>
                          </button>
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
            <Switch id="advanced" checked={advanced} onCheckedChange={setAdvanced} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-full mx-auto px-8 pt-4 pb-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href={`${basePath}?section=permissions`} className="hover:text-foreground">
                Settings
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link
                href={`${basePath}?section=permissions`}
                className="hover:text-foreground"
              >
                Permissions
              </Link>
              {pathname?.includes("/templates") && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground">Templates</span>
                </>
              )}
              {pathname?.includes("/users") && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground">Users</span>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
}

