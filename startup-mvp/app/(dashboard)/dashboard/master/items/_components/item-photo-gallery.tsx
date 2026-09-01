"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FiImage,
  FiMaximize2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiPlus,
  FiUploadCloud,
  FiLoader,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import UploadDialog from "@/components/UploadDialog";
import { uploadItemPhotos } from "../_actions/item.action";
import { useToast } from "@/hooks/use-toast";

interface ItemPhotoGalleryProps {
  itemId?: string;
  images: string[];
  featuredImage?: string | null;
  itemName: string;
  itemCode?: string;
  canUploadPhoto?: boolean;
}

export default function ItemPhotoGallery({
  itemId,
  images = [],
  featuredImage,
  itemName,
  itemCode,
  canUploadPhoto = false,
}: ItemPhotoGalleryProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Determine initial selected index: fallback to featured image index if present, else 0
  const initialIndex = React.useMemo(() => {
    if (!images || images.length === 0) return 0;
    if (featuredImage) {
      const featuredIdx = images.findIndex((img) => img === featuredImage);
      if (featuredIdx !== -1) return featuredIdx;
    }
    return 0;
  }, [images, featuredImage]);

  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(initialIndex);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState<boolean>(false);

  // Synchronize when images or initialIndex change
  useEffect(() => {
    setSelectedIndex(initialIndex);
  }, [initialIndex, images]);

  const openLightbox = (indexToOpen?: number) => {
    if (!images || images.length === 0) return;
    const targetIdx = indexToOpen !== undefined ? indexToOpen : selectedIndex;
    setLightboxIndex(targetIdx);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handlePrevLightbox = useCallback(() => {
    if (!images || images.length === 0) return;
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNextLightbox = useCallback(() => {
    if (!images || images.length === 0) return;
    setLightboxIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevLightbox();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextLightbox();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handlePrevLightbox, handleNextLightbox]);

  // Handle uploaded photos from UploadDialog
  const handleUploadNewPhotos = async (newUrls: string[]) => {
    setIsUploadDialogOpen(false);
    if (!itemId || !newUrls || newUrls.length === 0) return;

    startTransition(async () => {
      const result = await uploadItemPhotos(itemId, newUrls);
      if (result.success) {
        toast({
          title: "Photos Uploaded",
          description: `Successfully uploaded ${newUrls.length} ${newUrls.length === 1 ? "photo" : "photos"}.`,
        });
        router.refresh();
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to save uploaded photos",
          variant: "destructive",
        });
      }
    });
  };

  // If no photos and user does NOT have permission to upload, hide card completely
  if ((!images || images.length === 0) && !canUploadPhoto) {
    return null;
  }

  const hasPhotos = images && images.length > 0;
  const currentHeroImage = hasPhotos ? (images[selectedIndex] || images[0]) : "";
  const isCurrentFeatured = featuredImage ? currentHeroImage === featuredImage : selectedIndex === 0;

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted">
                <FiImage className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Item Photos</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {images.length} {images.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <CardDescription>Product photo showcase and gallery</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Case 1: No photos present, but user has upload permission */}
          {!hasPhotos ? (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20 text-center space-y-3">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <FiUploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">No Item Photos Yet</h4>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Upload images to display in the catalog and storefront gallery.
                </p>
              </div>
              {canUploadPhoto && itemId && (
                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={() => setIsUploadDialogOpen(true)}
                    disabled={isPending}
                    className="gap-2"
                    size="sm"
                  >
                    {isPending ? (
                      <>
                        <FiLoader className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiPlus className="h-4 w-4" />
                        Upload Photos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: Photos exist */
            <>
              {/* Main Hero Image Container */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border group bg-muted/20 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentHeroImage}
                  alt={`${itemName} - Photo ${selectedIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Featured Badge */}
                {isCurrentFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-[10px] text-primary-foreground rounded-md font-bold shadow-md tracking-wider flex items-center gap-1">
                    <FiStar className="h-3 w-3 fill-current" />
                    FEATURED
                  </div>
                )}

                {/* Top-Right Quick Action Toolbar */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-black/60 text-white rounded-md backdrop-blur-sm shadow">
                    {selectedIndex + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => openLightbox(selectedIndex)}
                    className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm shadow"
                    title="View Fullscreen"
                  >
                    <FiMaximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Hover Overlay Trigger */}
                <div
                  onClick={() => openLightbox(selectedIndex)}
                  className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                >
                  <div className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <FiMaximize2 className="h-3.5 w-3.5" />
                    Click to expand
                  </div>
                </div>
              </div>

              {/* Thumbnail Ribbon / Strip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Photo
                  </label>
                  {isPending && (
                    <span className="text-[10px] text-primary flex items-center gap-1">
                      <FiLoader className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {/* Existing Photos Thumbnails */}
                  {images.map((img, idx) => {
                    const isSelected = idx === selectedIndex;
                    const isFeaturedTile = featuredImage ? img === featuredImage : idx === 0;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedIndex(idx);
                        }}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border transition-all duration-200 bg-muted/20 focus:outline-none",
                          isSelected
                            ? "ring-2 ring-primary border-primary shadow-sm scale-95"
                            : "border-border/80 hover:border-primary/60 opacity-70 hover:opacity-100"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isFeaturedTile && (
                          <div className="absolute top-0.5 left-0.5 p-0.5 bg-primary text-primary-foreground rounded-full shadow-sm">
                            <FiStar className="h-2 w-2 fill-current" />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Upload Tile - Rendered AFTER the last photo with EXACT thumbnail size & aspect ratio */}
                  {canUploadPhoto && itemId && (
                    <button
                      type="button"
                      onClick={() => setIsUploadDialogOpen(true)}
                      disabled={isPending}
                      className="aspect-square rounded-lg border-2 border-dashed border-border/80 hover:border-primary/80 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all flex flex-col items-center justify-center p-1 cursor-pointer focus:outline-none shadow-xs group"
                      title="Upload photo"
                    >
                      <FiPlus className="h-4 w-4 mb-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-semibold">Add Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog Modal */}
      {canUploadPhoto && (
        <UploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          onSelectMultiple={handleUploadNewPhotos}
          multiple={true}
          allowedTypes={["image/*"]}
        />
      )}

      {/* Slidable Lightbox Modal */}
      {isLightboxOpen && hasPhotos && (
        <div
          tabIndex={-1}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 text-white">
                <FiImage className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white line-clamp-1">{itemName}</h3>
                {itemCode && (
                  <p className="text-xs text-white/60 font-mono">Code: {itemCode}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                {lightboxIndex + 1} of {images.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
                className="text-white hover:bg-white/20 hover:text-white rounded-full"
                title="Close (Esc)"
              >
                <FiX className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Slide Viewer Area */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden select-none">
            {/* Previous Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrevLightbox}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white border border-white/10 transition-all backdrop-blur-sm hover:scale-110 shadow-xl"
                title="Previous Photo (Left Arrow)"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Slide Image */}
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightboxIndex]}
                alt={`${itemName} - Fullscreen ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
              />
              {featuredImage && images[lightboxIndex] === featuredImage && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-md shadow-lg flex items-center gap-1.5">
                  <FiStar className="h-3.5 w-3.5 fill-current" />
                  FEATURED PHOTO
                </div>
              )}
            </div>

            {/* Next Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNextLightbox}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white border border-white/10 transition-all backdrop-blur-sm hover:scale-110 shadow-xl"
                title="Next Photo (Right Arrow)"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Thumbnail Navigation Strip */}
          {images.length > 1 && (
            <div className="border-t border-white/10 pt-3 flex justify-center overflow-x-auto py-2">
              <div className="flex items-center gap-2 max-w-full px-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={cn(
                      "relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 bg-black/40",
                      idx === lightboxIndex
                        ? "border-primary ring-2 ring-primary scale-110 shadow-lg"
                        : "border-white/20 opacity-50 hover:opacity-100 hover:border-white/60"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Lightbox thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
