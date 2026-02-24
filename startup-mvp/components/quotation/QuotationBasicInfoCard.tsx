'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Calendar, 
  Truck, 
  Tag, 
  ShieldCheck, 
  Target,
  Hash,
  DollarSign,
  Banknote
} from 'lucide-react';

import OpportunitySelect from './OpportunitySelect';

interface QuotationBasicInfoCardProps {
  shippingCharges?: number;
  discount?: number;
  vatIncluded?: boolean;
  expiredDate?: string;
  opportunityId?: string | null;
  submittedById?: string;
  currency?: string;
  users?: any[];
  onShippingChargesChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
  onVatIncludedChange: (value: boolean) => void;
  onExpiredDateChange: (value: string) => void;
  onOpportunityChange: (value: any) => void;
  onSubmittedByChange?: (value: string) => void;
  onCurrencyChange?: (value: string) => void;
}

export function QuotationBasicInfoCard({
  shippingCharges = 0,
  discount = 0,
  vatIncluded = false,
  expiredDate = '',
  opportunityId,
  submittedById,
  currency = 'TK',
  users = [],
  onShippingChargesChange,
  onDiscountChange,
  onVatIncludedChange,
  onExpiredDateChange,
  onOpportunityChange,
  onSubmittedByChange,
  onCurrencyChange,
}: QuotationBasicInfoCardProps) {
  const { toast } = useToast();

  return (
    <Card className="mb-4 overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="pb-3 pt-5 bg-muted/10">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          Quotation Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 pt-4">
        
        <OpportunitySelect 
          value={opportunityId || undefined} 
          onValueChange={onOpportunityChange} 
        />
        
        <div className="space-y-1.5">
          <Label htmlFor="submittedBy" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            Prepared By
          </Label>
          {users.length > 0 ? (
            <Select
              value={submittedById || undefined}
              onValueChange={onSubmittedByChange}
            >
              <SelectTrigger id="submittedBy" className="h-9 w-full text-sm">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || user.email?.[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name || user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-full bg-muted animate-pulse rounded-md" />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Banknote className="h-4 w-4" />
            Currency
          </Label>
          <Select
            value={currency}
            onValueChange={onCurrencyChange}
          >
            <SelectTrigger id="currency" className="h-9 w-full text-sm">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TK">TK (৳)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Shipping Charges and Discount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="shippingCharges" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" />
              Shipping
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currency === 'USD' ? '$' : '৳'}
              </span>
              <Input
                id="shippingCharges"
                type="number"
                step="0.01"
                min="0"
                value={shippingCharges}
                onChange={(e) => onShippingChargesChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-9 text-sm pl-7 w-full"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discount" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              Discount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currency === 'USD' ? '$' : '৳'}
              </span>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-9 text-sm pl-7 w-full"
              />
            </div>
          </div>
        </div>

        {/* Valid Until */}
        <div className="space-y-1.5">
          <Label htmlFor="expiredDate" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Valid Until
          </Label>
          <Input
            id="expiredDate"
            type="date"
            value={expiredDate}
            onChange={(e) => onExpiredDateChange(e.target.value)}
            className="h-9 text-sm w-full"
          />
        </div>

        {/* VAT Checkbox */}
        <div className="pt-1">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border/50">
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="vatIncluded"
                checked={vatIncluded}
                onCheckedChange={(checked) => onVatIncludedChange(checked === true)}
              />
              <Label htmlFor="vatIncluded" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Include VAT
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground font-bold tracking-wider">TAX</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
