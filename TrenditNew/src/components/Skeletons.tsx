import React from 'react';

const SkeletonBase = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const ProductCardSkeleton = ({ isCompact = false }: { isCompact?: boolean }) => {
  if (isCompact) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-1 flex flex-col gap-1.5">
        <SkeletonBase className="aspect-[1.35/1] w-full rounded-lg" />
        <div className="flex flex-col gap-1 p-1">
          <SkeletonBase className="h-3 w-2/3" />
          <SkeletonBase className="h-2 w-1/2" />
          <div className="flex justify-between items-center mt-1">
            <SkeletonBase className="h-4 w-1/3" />
            <SkeletonBase className="h-5 w-10 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-3 flex flex-col gap-3">
      <SkeletonBase className="aspect-square w-full rounded-2xl" />
      <div className="flex flex-col gap-2 p-2">
        <SkeletonBase className="h-4 w-2/3" />
        <SkeletonBase className="h-3 w-1/2" />
        <div className="flex justify-between items-center mt-2">
          <SkeletonBase className="h-6 w-1/3" />
          <SkeletonBase className="h-8 w-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const CategorySkeleton = () => (
  <div className="flex flex-col items-center gap-3">
    <SkeletonBase className="w-16 h-16 md:w-20 md:h-20 rounded-2xl" />
    <SkeletonBase className="h-3 w-12" />
  </div>
);

export const HeroSkeleton = () => (
  <div className="relative h-[400px] md:h-[600px] w-full rounded-[2.5rem] overflow-hidden">
    <SkeletonBase className="w-full h-full" />
    <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 gap-6">
      <SkeletonBase className="h-12 w-2/3 md:w-1/2" />
      <SkeletonBase className="h-6 w-1/2 md:w-1/3" />
      <div className="flex gap-4">
        <SkeletonBase className="h-12 w-32 rounded-xl" />
        <SkeletonBase className="h-12 w-32 rounded-xl" />
      </div>
    </div>
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="grid lg:grid-cols-2 gap-12">
      <SkeletonBase className="aspect-square w-full rounded-[2rem]" />
      <div className="flex flex-col gap-6">
        <SkeletonBase className="h-10 w-3/4" />
        <SkeletonBase className="h-6 w-1/4" />
        <SkeletonBase className="h-12 w-1/3" />
        <div className="flex flex-col gap-4">
          <SkeletonBase className="h-24 w-full" />
          <SkeletonBase className="h-12 w-1/2" />
          <SkeletonBase className="h-12 w-full" />
        </div>
      </div>
    </div>
  </div>
);
