"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FiUsers,
  FiVideo,
  FiSmartphone,
  FiImage,
  FiLayers,
  FiCheck,
  FiPlus,
  FiTag,
  FiSearch,
} from "react-icons/fi";
import { getAudienceSegmentsAction } from "@/app/actions/crm/marketing-operations.action";

export interface ContentFormatOption {
  id: "VIDEO" | "REELS_SHORTS" | "STATIC" | "CAROUSEL";
  label: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CONTENT_FORMAT_OPTIONS: ContentFormatOption[] = [
  {
    id: "VIDEO",
    label: "Video",
    description: "Long-form, explainer & product demo (16:9)",
    badge: "🎬 Video",
    icon: FiVideo,
  },
  {
    id: "REELS_SHORTS",
    label: "Reels / Shorts / Story",
    description: "Vertical short-form video (9:16) for TikTok, Reels & Shorts",
    badge: "📱 9:16 Vertical",
    icon: FiSmartphone,
  },
  {
    id: "STATIC",
    label: "Static Graphic",
    description: "Single image banner, ad poster & feed graphic",
    badge: "🖼️ Single Image",
    icon: FiImage,
  },
  {
    id: "CAROUSEL",
    label: "Carousel Cards",
    description: "Multi-slide swipeable cards & visual catalog",
    badge: "🎠 Multi-Slide",
    icon: FiLayers,
  },
];

interface AudienceAndContentSelectorProps {
  targetAudience: string;
  onAudienceChange: (audience: string) => void;
  selectedFormats: string[];
  onFormatsChange: (formats: string[]) => void;
  className?: string;
}

export default function AudienceAndContentSelector({
  targetAudience,
  onAudienceChange,
  selectedFormats,
  onFormatsChange,
  className = "",
}: AudienceAndContentSelectorProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [suggestedAudiences, setSuggestedAudiences] = useState<string[]>([]);
  const [audienceFilter, setAudienceFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    getAudienceSegmentsAction()
      .then((res) => {
        if (res.success) {
          setCategories(res.categories || []);
          setLeadSources(res.leadSources || []);
          setSuggestedAudiences(res.suggestedAudiences || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load audience segments:", err);
      });
  }, []);

  const toggleFormat = (formatId: string) => {
    if (selectedFormats.includes(formatId)) {
      onFormatsChange(selectedFormats.filter((f) => f !== formatId));
    } else {
      onFormatsChange([...selectedFormats, formatId]);
    }
  };

  const selectAllFormats = () => {
    onFormatsChange(["VIDEO", "REELS_SHORTS", "STATIC", "CAROUSEL"]);
  };

  const clearAllFormats = () => {
    onFormatsChange([]);
  };

  const allAvailableSegments = Array.from(
    new Set([...suggestedAudiences, ...categories, ...leadSources])
  );

  const filteredSegments = allAvailableSegments.filter((seg) =>
    seg.toLowerCase().includes(audienceFilter.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ========================================================= */}
      {/* 2. AUDIENCE — কার জন্য Campaign */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
              <FiUsers className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                2. Target Audience & Segment
                <Badge variant="outline" className="text-[10px] font-normal border-zinc-200 text-zinc-600 bg-zinc-50">
                  Required
                </Badge>
              </h4>
              <p className="text-xs text-zinc-500 font-normal">
                Select from CRM categories, lead sources, or enter custom target audience.
              </p>
            </div>
          </div>

          {targetAudience && (
            <Badge className="bg-zinc-800 text-white text-xs px-2.5 py-0.5 font-normal shrink-0">
              Active: {targetAudience}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Label className="text-xs font-medium text-zinc-700 flex items-center justify-between mb-1.5">
              <span>Target Audience / Segment Name *</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                Type custom or pick from suggestions
              </span>
            </Label>
            <div className="relative">
              <Input
                placeholder="e.g. Small Business Owners, E-commerce Merchants, B2B Decision Makers..."
                value={targetAudience}
                onChange={(e) => {
                  onAudienceChange(e.target.value);
                  setAudienceFilter(e.target.value);
                }}
                onFocus={() => setShowDropdown(true)}
                className="h-9 text-xs pl-8 pr-3 bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && filteredSegments.length > 0 && (
              <div className="absolute z-40 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-lg p-1.5 space-y-0.5">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                  <span>Available Segments ({filteredSegments.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="text-zinc-500 hover:text-zinc-800 cursor-pointer text-[11px]"
                  >
                    Close
                  </button>
                </div>
                {filteredSegments.slice(0, 12).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => {
                      onAudienceChange(seg);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      targetAudience === seg
                        ? "bg-zinc-100 text-zinc-900 font-medium"
                        : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <span className="truncate">{seg}</span>
                    {targetAudience === seg && <FiCheck className="h-3.5 w-3.5 text-zinc-700 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Clickable Suggestions Pills */}
          <div>
            <Label className="text-[11px] text-zinc-500 font-normal mb-1.5 block">
              Quick Segments & CRM Categories:
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/50">
              {suggestedAudiences.map((aud) => {
                const isSelected = targetAudience === aud;
                return (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => onAudienceChange(aud)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-zinc-800 text-white border-zinc-800 font-medium"
                        : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <FiTag className={`h-2.5 w-2.5 ${isSelected ? "text-white" : "text-zinc-400"}`} />
                    <span>{aud}</span>
                  </button>
                );
              })}
              {categories.slice(0, 8).map((cat) => {
                const isSelected = targetAudience === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onAudienceChange(cat)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-zinc-800 text-white border-zinc-800 font-medium"
                        : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CONTENT — কী ধরনের Content ব্যবহার হবে (Multi-Select) */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
              <FiLayers className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                3. Content Planning & Format Selection
                <Badge variant="outline" className="text-[10px] font-normal border-zinc-200 text-zinc-600 bg-zinc-50">
                  Multi-Select
                </Badge>
              </h4>
              <p className="text-xs text-zinc-500 font-normal">
                Select one or more content formats you plan to produce for this campaign.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 text-xs">
            <button
              type="button"
              onClick={selectAllFormats}
              className="text-zinc-700 hover:text-zinc-900 font-medium hover:underline cursor-pointer"
            >
              Select All
            </button>
            <span className="text-zinc-300">•</span>
            <button
              type="button"
              onClick={clearAllFormats}
              className="text-zinc-400 hover:text-zinc-700 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Format Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CONTENT_FORMAT_OPTIONS.map((opt) => {
            const isSelected = selectedFormats.includes(opt.id);
            const Icon = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => toggleFormat(opt.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? "border-zinc-800 bg-zinc-50/80 shadow-xs ring-1 ring-zinc-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg border ${
                        isSelected
                          ? "bg-zinc-800 text-white border-zinc-800"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-zinc-900">{opt.label}</h5>
                      <span className="text-[10px] text-zinc-500 block font-normal">{opt.badge}</span>
                    </div>
                  </div>

                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? "bg-zinc-800 border-zinc-800 text-white"
                        : "border-zinc-300 bg-white text-zinc-300"
                    }`}
                  >
                    {isSelected ? <FiCheck className="h-3 w-3 stroke-[2.5]" /> : <FiPlus className="h-2.5 w-2.5" />}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 leading-normal font-normal">
                  {opt.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Selection Summary Banner */}
        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-zinc-700 text-xs">Planned Formats:</span>
            {selectedFormats.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedFormats.map((fmt) => {
                  const opt = CONTENT_FORMAT_OPTIONS.find((o) => o.id === fmt);
                  return (
                    <Badge
                      key={fmt}
                      className="bg-zinc-800 text-white text-[10px] font-normal px-2 py-0.5"
                    >
                      {opt?.label || fmt}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span className="text-zinc-400 text-xs font-normal italic">None selected yet</span>
            )}
          </div>

          <span className="text-[11px] text-zinc-500 font-normal shrink-0">
            {selectedFormats.length} format{selectedFormats.length === 1 ? "" : "s"} selected
          </span>
        </div>
      </div>
    </div>
  );
}
