import React from "react";

const SKELETON_ASPECT_RATIOS = [
  "aspect-[4/3]",
  "aspect-[3/4]",
  "aspect-[16/9]",
  "aspect-[1/1]",
  "aspect-[2/3]",
  "aspect-[4/5]",
];

export default function GallerySkeleton({ count = 8 }) {
  const items = Array.from({ length: count });

  return (
    <div className="gallery-masonry-grid">
      {items.map((_, index) => {
        const aspectClass = SKELETON_ASPECT_RATIOS[index % SKELETON_ASPECT_RATIOS.length];
        return (
          <div
            key={`skel-${index}`}
            className="gallery-masonry-item mb-6 break-inside-avoid"
          >
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900/60 border border-white/10 p-4 shadow-xl animate-pulse">
              {/* Skeleton Tag */}
              <div className="h-4 w-24 bg-zinc-800 rounded-full mb-3" />
              
              {/* Skeleton Media Box */}
              <div className={`w-full rounded-2xl bg-zinc-800/80 ${aspectClass} relative overflow-hidden`}>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
              </div>

              {/* Skeleton Title & Metadata */}
              <div className="mt-4 space-y-2">
                <div className="h-5 w-3/4 bg-zinc-800 rounded-lg" />
                <div className="h-3 w-1/2 bg-zinc-800/60 rounded-lg" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
