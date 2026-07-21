import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        {/* Center Icon */}
        <div className="relative z-10 w-16 h-16 md:w-20 md:h-20">
          <Image
            src="/site-icon.png"
            alt="Loading"
            fill
            className="object-contain drop-shadow-sm"
            priority
          />
        </div> 
        {/* Loading Icon */}
        
        {/* Loading Circle Animation - Single smooth rotating circle */}
        <div className="absolute w-28 h-28 md:w-36 md:h-36">
          <svg 
            className="w-full h-full animate-spin" 
            style={{ animationDuration: '1.5s' }}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="70 200"
              className="text-primary/30"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="70 200"
              strokeDashoffset="35"
              className="text-primary"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

