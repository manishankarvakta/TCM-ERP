"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiAlertTriangle, FiInfo } from "react-icons/fi";
import { amountToWords, formatCurrency, validateAmount, ValidationResult } from "../_lib/voucher-form-helpers";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showWords?: boolean;
  showWarnings?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  warnThreshold?: number;
  className?: string;
  id?: string;
}

export default function AmountInput({
  value,
  onChange,
  label = "Amount",
  required = true,
  disabled = false,
  showWords = true,
  showWarnings = true,
  placeholder = "0.00",
  min = 0.01,
  max = 10000000,
  warnThreshold = 100000,
  className,
  id = "amount",
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true });

  useEffect(() => {
    if (value > 0 && showWarnings) {
      const result = validateAmount(value, { min, max, warnThreshold });
      setValidation(result);
    } else {
      setValidation({ valid: true });
    }
  }, [value, showWarnings, min, max, warnThreshold]);

  const displayWords = showWords && value > 0 && value <= max;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none">
          ৳
        </div>
        <Input
          id={id}
          type="number"
          step="0.01"
          min={min}
          max={max}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value) || 0;
            onChange(newValue);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={cn(
            "pl-8 pr-4 text-lg font-mono",
            validation.error && "border-destructive focus-visible:ring-destructive",
            validation.warning && !validation.error && "border-amber-500 focus-visible:ring-amber-500"
          )}
        />
      </div>

      {/* Amount in Words */}
      {displayWords && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <div className="flex items-start gap-2">
            <FiInfo className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Amount in Words:</p>
              <p className="text-sm font-medium text-foreground">
                {amountToWords(value)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {validation.warning && !validation.error && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
          <FiAlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{validation.warning}</span>
        </div>
      )}

      {/* Validation Error */}
      {validation.error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <FiAlertTriangle className="h-3 w-3" />
          {validation.error}
        </p>
      )}

      {/* Formatted Display (shown when focused) */}
      {focused && value > 0 && (
        <p className="text-xs text-muted-foreground">
          Formatted: {formatCurrency(value)}
        </p>
      )}
    </div>
  );
}
