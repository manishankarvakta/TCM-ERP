"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue>({});

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ className, children, type = "single", value, onValueChange, defaultValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
    const currentValue = value !== undefined ? value : internalValue;

    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <AccordionContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, children, value, ...props }, ref) => (
    <div ref={ref} className={cn("border-b", className)} {...props}>
      {children}
    </div>
  )
);
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, asChild, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    const isOpen = context.value === props.value;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { ref, ...props } as any);
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
          className
        )}
        onClick={() => {
          if (props.value) {
            context.onValueChange?.(props.value === context.value ? "" : (props.value as string));
          }
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    const isOpen = value ? context.value === value : true;

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn("overflow-hidden text-sm transition-all", className)}
        {...props}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

