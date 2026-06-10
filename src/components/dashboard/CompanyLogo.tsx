"use client";

import { getCompanyInitials } from "@/lib/logos";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface CompanyLogoProps {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
}

export function CompanyLogo({ name, logoUrl, size = 32, className }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {getCompanyInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-100", className)}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
