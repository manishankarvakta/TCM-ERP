"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Package,
  Settings2,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MdWhatsapp } from "react-icons/md";
import { HiEnvelope } from "react-icons/hi2";
import { TbCreditCardPay, TbReceiptTax, TbShieldCheck } from "react-icons/tb";
import Profile from "./_components/Profile";
import Organization from "./_components/organization/Organization";
import Experience from "./_components/Experience";
import Emails from "./_components/Emails";
import Calendars from "./_components/Calendars";
import WhatsApp from "./_components/WhatsApp";
import Telegram from "./_components/Telegram";
import SMS from "./_components/SMS";
import Tex from "./_components/Tex";
import PaymentMethods from "./_components/PaymentMethods";
import Preferences from "./_components/Preferences";
import General from "./_components/General";
import Members from "./_components/Members";
import Security from "./_components/Security";
import APIs from "./_components/APIs";
import Webhooks from "./_components/Webhooks";

import { SlEnvolopeLetter } from "react-icons/sl";
import TOS from "./_components/Tos";
import Inventory from "./_components/Inventory";
import Production from "./_components/Production";
import Accounting from "./_components/Accounting";


type SettingsSection = "profile" | 
                       "experience" | 
                       "emails" | 
                       "calendars" |
                       "general" | 
                       "members" | 
                       "roles" | 
                       "data-model" | 
                       "integrations" | 
                       "security" | 
                       "organization"| 
                       "apis" | 
                       "webhooks" | 
                       "tax" | 
                       "lab" | 
                       "releases" | 
                       "whatsapp" | 
                       "telegram" | 
                       "sms" | 
                       "payment-methods" | 
                       "coverLetter" | 
                       "tos" | 
                       "preferences" |
                       "inventory" |
                       "production" |
                       "accounts-default" |
                       "membership";

interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  children?: SettingsMenuItem[];
}

interface SettingsMenuCategory {
  category: string;
  items: SettingsMenuItem[];
}

interface SettingsPageClientProps {
  accessiblePages: Record<string, boolean>;
}

export default function SettingsPageClient({ accessiblePages }: SettingsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advanced, setAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Sync state with URL params after mount to avoid hydration mismatch
    const section = searchParams.get("section") as SettingsSection;
    if (section && section !== activeSection) {
      startTransition(() => {
        setActiveSection(section);
        // Auto-expand parent items if a child is active
        if (section === "emails" || section === "calendars" || section === "whatsapp" || section === "telegram" || section === "sms") {
          setExpandedItems(new Set(["accounts"]));
        }
      });
    }
  }, [searchParams, activeSection]);

  const handleSectionChange = (section: SettingsSection) => {
    startTransition(() => {
    setActiveSection(section);
    router.push(`/dashboard/settings?section=${section}`);
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

  /**
   * Filter settings menu items based on permissions
   */
  function filterSettingsMenu(menu: SettingsMenuCategory[]): SettingsMenuCategory[] {
    const filteredMenu: SettingsMenuCategory[] = [];

    for (const category of menu) {
      const filteredItems: SettingsMenuItem[] = [];

      for (const item of category.items) {
        // Handle items with children
        if (item.children && item.children.length > 0) {
          // Filter children based on permissions
          const filteredChildren = item.children.filter((child) => {
            const permissionKey = `settings.${child.id}`;
            return accessiblePages[permissionKey] === true;
          });

          // Only show parent if at least one child is accessible
          if (filteredChildren.length === 0) {
            continue;
          }

          // Create filtered item with filtered children
          filteredItems.push({
            ...item,
            children: filteredChildren,
            active: item.active,
          });
        } else {
          // Handle items without children
          let permissionKey = `settings.${item.id}`;
          
          // Special handling for nested permissions under accounts
          if (item.id === "accounts-default" || item.id === "tax" || item.id === "payment-methods") {
            permissionKey = `settings.accounts.${item.id === "accounts-default" ? "default" : item.id}`;
          }
          
          const hasAccess = accessiblePages[permissionKey];
          
          if (hasAccess === true) {
            filteredItems.push(item);
          }
        }
      }

      // Only show category if it has accessible items
      if (filteredItems.length > 0) {
        filteredMenu.push({
          ...category,
          items: filteredItems,
        });
      }
    }

    return filteredMenu;
  }

  const fullSettingsMenu: SettingsMenuCategory[] = [
    {
      category: "Settings",
      items: [
        { id: "organization" as SettingsSection, label: "Organization", icon: Building2, active: activeSection === "organization" },
        { id: "experience" as SettingsSection, label: "Experience", icon: Fingerprint, active: activeSection === "experience" },
        {
          id: "accounts" as SettingsSection,
          label: "Accounts",
          icon: AtSign,
          active: activeSection === "emails" || activeSection === "calendars" || activeSection === "whatsapp" || activeSection === "telegram" || activeSection === "sms",
          children: [
            { id: "emails" as SettingsSection, label: "Emails", icon: Mail, active: activeSection === "emails" },
            { id: "calendars" as SettingsSection, label: "Calendars", icon: Calendar, active: activeSection === "calendars" },
            { id: "whatsapp" as SettingsSection, label: "WhatsApp", icon: MdWhatsapp, active: activeSection === "whatsapp" },
            { id: "telegram" as SettingsSection, label: "Telegram", icon: Calendar, active: activeSection === "telegram" },
            { id: "sms" as SettingsSection, label: "SMS", icon: HiEnvelope, active: activeSection === "sms" },
          ],
        },
      ],
    },
    {
      category: "Accounts",
      items: [
        { id: "accounts-default" as SettingsSection, label: "Accounts Default", icon: Calculator, active: activeSection === "accounts-default" },
        { id: "tax" as SettingsSection, label: "Tax", icon: TbReceiptTax, active: activeSection === "tax" },
        { id: "payment-methods" as SettingsSection, label: "Payment Methods", icon: TbCreditCardPay, active: activeSection === "payment-methods" },
        { id: "preferences" as SettingsSection, label: "Preferences", icon: LucideUserCog, active: activeSection === "preferences" },
      ],
    },
    {
      category: "Operations",
      items: [
        { id: "inventory" as SettingsSection, label: "Inventory", icon: Package, active: activeSection === "inventory" },
        { id: "production" as SettingsSection, label: "Production", icon: Settings2, active: activeSection === "production" },
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

  // Filter menu based on permissions
  const settingsMenu = filterSettingsMenu(fullSettingsMenu);

  // Check if user has Developers permissions (APIs or Webhooks)
  const hasDevelopersPermission =
    accessiblePages["settings.apis"] === true ||
    accessiblePages["settings.webhooks"] === true;

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <Profile />;
      case "organization":
        return <Organization />;
      case "experience":
        return <Experience />;
      case "emails":
        return <Emails />;
      case "calendars":
        return <Calendars />;
      case "whatsapp":
        return <WhatsApp />;
      case "telegram":
        return <Telegram />;
      case "sms":
        return <SMS />;
      case "tax":
        return <Tex />;
      case "payment-methods":
        return <PaymentMethods />;
      case "preferences":
        return <Preferences />;
      case "coverLetter":
      case "tos":
        return <TOS />;
      case "general":
        return <General />;
      case "members":
        return <Members />;
      case "security":
        return <Security />;
      case "apis":
        return <APIs />;
      case "webhooks":
        return <Webhooks />;
      case "inventory":
        return <Inventory />;
      case "production":
        return <Production />;
      case "accounts-default":
        return <Accounting />;
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
                  const hasChildren = 'children' in item && Array.isArray(item.children);
                  const hasActiveChild = hasChildren && item.children ? item.children.some((child: any) => child.active) : false;
                  
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (hasChildren) {
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
                        {hasChildren && (
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        )}
                      </button>
                      {hasChildren && isExpanded && item.children && (
                        <div className="ml-7 mt-1 space-y-1">
                          {item.children.map((child: { id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean }) => (
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

        {/* Footer - Advanced Toggle (only show if user has Developers permissions) */}
        {hasDevelopersPermission && (
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
        )}
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

