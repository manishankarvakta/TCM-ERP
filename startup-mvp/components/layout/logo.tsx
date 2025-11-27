// ============================================
// File: src/components/layout/logo.tsx
// Logo Component - Reusable Logo
// ============================================

import React from "react";
import Link from "next/link";

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
        <span className="text-white font-bold text-lg">S</span>
      </div>
      <span className="font-bold text-xl">Startup MVP</span>
    </div>
  );
};

export default Logo;