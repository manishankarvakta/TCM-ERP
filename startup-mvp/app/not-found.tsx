"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiHome, FiArrowLeft, FiPackage, FiFolder, FiUsers } from "react-icons/fi";
import { MdOutlineCategory } from "react-icons/md";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative">
      {/* Top Left - Navigation Buttons */}
      <div className="absolute top-6 left-6 flex gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => window.history.back()}
          className="shadow-sm"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        <Button asChild size="lg" className="shadow-sm">
          <Link href="/dashboard">
            <FiHome className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      {/* Main Content - Centered */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-2xl w-full">
        {/* Top - 404 Message */}
        <div className="text-center space-y-2">
          <h1 className="text-7xl md:text-8xl font-bold text-primary">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Page Not Found
          </h2>
        </div>

        {/* Center - Image */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 flex-shrink-0">
          <Image
            src="/404.png"
            alt="404 Not Found"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Bottom - Details */}
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The page you're looking for seems to have wandered off. 
            Don't worry, we'll help you find your way back!
          </p>
        </div>
      </div>

      {/* Bottom Right - Important Links */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground mb-2 text-right">
          Quick Links:
        </p>
        <div className="flex flex-row gap-2 items-center">
          <Button asChild variant="link" size="sm">
            <Link href="/dashboard/items">
              <FiPackage className="mr-1.5 h-3.5 w-3.5" />
              Items
            </Link>
          </Button>
          <Button asChild variant="link" size="sm">
            <Link href="/dashboard/category">
              <MdOutlineCategory className="mr-1.5 h-3.5 w-3.5" />
              Categories
            </Link>
          </Button>
          <Button asChild variant="link" size="sm">
            <Link href="/dashboard/files">
              <FiFolder className="mr-1.5 h-3.5 w-3.5" />
              Files
            </Link>
          </Button>
          <Button asChild variant="link" size="sm">
            <Link href="/dashboard/users">
              <FiUsers className="mr-1.5 h-3.5 w-3.5" />
              Users
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

