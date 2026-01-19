// ============================================
// File: src/components/layout/logo.tsx
// Logo Component - Reusable Logo
// ============================================

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  width?: number;
  height?: number;
}

const Logo = ({ width = 200, height = 100 }: LogoProps) => {
  return (
    <div className="flex items-center gap-2">
      <Image className="dark:invert" src="/logo.png" alt="Startup MVP Logo" width={width} height={height} />
    </div>
  );
};

export default Logo;