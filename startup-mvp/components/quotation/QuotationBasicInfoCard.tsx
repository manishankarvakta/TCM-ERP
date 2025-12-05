'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { getActiveClients } from '@/app/actions/clients';
import { getActiveOrganizations } from '@/app/actions/organizations';
import { getActiveCoverLetters } from '@/app/actions/quotation-helpers';
import { createClient } from '@/app/(dashboard)/dashboard/clients/_actions/client.action';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

interface QuotationBasicInfoCardProps {
  quotationNumber: string;
  date: string;
  subject: string;
  organizationId?: string;
  organizationName?: string;
  clientId?: string;
  clientName?: string;
  coverLetter?: string;
  shippingCharges?: number;
  discount?: number;
  vatIncluded?: boolean;
  projectLocation?: string;
  status: string;
  onQuotationNumberChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onOrganizationChange: (organizationId: string, organizationName: string) => void;
  onClientChange: (clientId: string, clientName: string) => void;
  onCoverLetterChange: (value: string) => void;
  onShippingChargesChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
  onVatIncludedChange: (value: boolean) => void;
  onProjectLocationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVISED', label: 'Revised' },
];

// Cover letter interface
interface CoverLetter {
  id: string;
  title: string;
  content: string;
}

export function QuotationBasicInfoCard({
  quotationNumber,
  date,
  subject,
  organizationId,
  organizationName,
  clientId,
  clientName,
  coverLetter,
  shippingCharges = 0,
  discount = 0,
  vatIncluded = false,
  projectLocation = '',
  status,
  onQuotationNumberChange,
  onDateChange,
  onSubjectChange,
  onOrganizationChange,
  onClientChange,
  onCoverLetterChange,
  onShippingChargesChange,
  onDiscountChange,
  onVatIncludedChange,
  onProjectLocationChange,
  onStatusChange,
}: QuotationBasicInfoCardProps) {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string | null }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string | null; email: string; company: string | null }>>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [, setIsLoadingClients] = useState(false);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>('');
  const [customCoverLetter, setCustomCoverLetter] = useState(coverLetter || '');

  // New client form state
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Load organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      const result = await getActiveOrganizations();
      if (result.success) {
        setOrganizations(result.organizations);
      }
    };
    loadOrganizations();
  }, []);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);
      const result = await getActiveClients();
      if (result.success) {
        setClients(result.clients);
      }
      setIsLoadingClients(false);
    };
    loadClients();
  }, []);

  // Load cover letters
  useEffect(() => {
    const loadCoverLetters = async () => {
      const result = await getActiveCoverLetters();
      if (result.success) {
        setCoverLetters(result.coverLetters);
        
        // If cover letter is already set, try to find matching cover letter from database
        if (coverLetter && !selectedCoverLetterId) {
          const matchingCoverLetter = result.coverLetters.find(
            (cl) => cl.content === coverLetter
          );
          if (matchingCoverLetter) {
            setSelectedCoverLetterId(matchingCoverLetter.id);
          } else {
            // If no match, it's a custom cover letter
            setSelectedCoverLetterId('custom');
            setCustomCoverLetter(coverLetter);
          }
        }
      }
    };
    loadCoverLetters();
  }, [coverLetter, selectedCoverLetterId]);

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    const searchLower = clientSearch.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.company?.toLowerCase().includes(searchLower)
    );
  });

  // Handle cover letter selection
  const handleCoverLetterChange = (value: string) => {
    setSelectedCoverLetterId(value);
    if (value === 'custom') {
      // Keep custom text if already entered
      onCoverLetterChange(customCoverLetter);
    } else if (value === '') {
      onCoverLetterChange('');
    } else {
      // Find selected cover letter from database
      const selectedCoverLetter = coverLetters.find((cl) => cl.id === value);
      if (selectedCoverLetter) {
        onCoverLetterChange(selectedCoverLetter.content);
      }
    }
  };

  // Handle custom cover letter change
  const handleCustomCoverLetterChange = (value: string) => {
    setCustomCoverLetter(value);
    if (selectedCoverLetterId === 'custom') {
      onCoverLetterChange(value);
    }
  };

  // Handle new client creation
  const handleCreateClient = async () => {
    if (!newClientEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingClient(true);
    try {
      const result = await createClient({
        name: newClientName || undefined,
        email: newClientEmail,
        phone: newClientPhone || undefined,
        company: newClientCompany || undefined,
        status: 'active',
      });

      if (result.success && result.client) {
        toast({
          title: 'Success',
          description: 'Client created successfully',
        });
        
        // Add to clients list
        setClients([result.client, ...clients]);
        
        // Select the new client
        onClientChange(result.client.id, result.client.name || result.client.email);
        
        // Reset form and close dialog
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewClientCompany('');
        setIsClientDialogOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create client',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Quotation Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="organization" className="text-xs">Organization</Label>
          <Select
            value={organizationId || undefined}
            onValueChange={(value) => {
              const selectedOrganization = organizations.find((org) => org.id === value);
              if (selectedOrganization) {
                onOrganizationChange(selectedOrganization.id, selectedOrganization.name || '');
              }
            }}
          >
            <SelectTrigger className="h-8 text-sm text-left">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.length === 0 ? (
                <div className="p-2 text-sm text-gray-500 text-left">No organizations found</div>
              ) : (
                organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id} className="text-left">
                    {org.name || 'Unnamed Organization'}
                  </SelectItem>
                ))
              )}
              {organizationName && organizationId && !organizations.find((org) => org.id === organizationId) && (
                <SelectItem value={organizationId} disabled className="text-left">
                  {organizationName} (Current Selection)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="quotationNumber" className="text-xs">Quotation #</Label>
            <Input
              id="quotationNumber"
              value={quotationNumber}
              onChange={(e) => onQuotationNumberChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="subject" className="text-xs">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Quotation subject"
            className="h-8 text-sm"
          />
        </div>
        
        {/* Client Selection Dropdown */}
        <div>
          <Label htmlFor="client" className="text-xs">Client</Label>
          <div className="flex gap-2 items-center w-full">
            <div className="flex-1 relative w-full min-w-0">
              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
              <Select
                value={clientId || undefined}
                onValueChange={(value) => {
                  const selectedClient = clients.find((c) => c.id === value);
                  if (selectedClient) {
                    onClientChange(selectedClient.id, selectedClient.name || selectedClient.email);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm pl-8 w-full min-w-0 text-left">
                  <SelectValue placeholder="Search and select client" className="truncate block" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {filteredClients.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No clients found</div>
                  ) : (
                    filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || client.company || client.email}
                        {client.company && client.name && ` (${client.company})`}
                      </SelectItem>
                    ))
                  )}
                  {clientName && clientId && !clients.find((c) => c.id === clientId) && (
                    <SelectItem value={clientId} disabled>
                      {clientName} (Current Selection)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0">
                  <FiPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Create a new client to add to this quotation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="newClientName">Name</Label>
                    <Input
                      id="newClientName"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newClientEmail">Email *</Label>
                    <Input
                      id="newClientEmail"
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="newClientPhone">Phone</Label>
                    <Input
                      id="newClientPhone"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newClientCompany">Company</Label>
                    <Input
                      id="newClientCompany"
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsClientDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={isCreatingClient || !newClientEmail.trim()}
                    >
                      {isCreatingClient ? 'Creating...' : 'Create Client'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cover Letter Dropdown */}
        <div>
          <Label htmlFor="coverLetter" className="text-xs">Cover Letter</Label>
          <Select
            value={selectedCoverLetterId || undefined}
            onValueChange={handleCoverLetterChange}
          >
            <SelectTrigger className="h-8 text-sm text-left">
              <SelectValue placeholder="Select cover letter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom" className="text-left">Custom (Enter below)</SelectItem>
              {coverLetters.length === 0 ? (
                <div className="p-2 text-xs text-gray-500 text-left">No cover letters found</div>
              ) : (
                coverLetters.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id} className="text-left">
                    {cl.title}
                </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedCoverLetterId === 'custom' && (
            <div className="mt-2">
              <textarea
                value={customCoverLetter}
                onChange={(e) => handleCustomCoverLetterChange(e.target.value)}
                placeholder="Enter custom cover letter..."
                className="w-full min-h-[100px] p-2 text-sm border rounded-md"
              />
            </div>
          )}
        </div>

        {/* Shipping Charges and Discount */}
        <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="shippingCharges" className="text-xs">Shipping Charges</Label>
          <Input
            id="shippingCharges"
            type="number"
            step="0.01"
            min="0"
            value={shippingCharges}
            onChange={(e) => onShippingChargesChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="h-8 text-sm"
          />
          </div>
          <div>
            <Label htmlFor="discount" className="text-xs">Discount</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-sm text-left">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-left">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Location */}
        <div>
          <Label htmlFor="projectLocation" className="text-xs">Project Location</Label>
          <Input
            id="projectLocation"
            type="text"
            value={projectLocation}
            onChange={(e) => onProjectLocationChange(e.target.value)}
            placeholder="Enter project location"
            className="h-8 text-sm"
          />
        </div>

        {/* VAT Checkbox */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vatIncluded"
              checked={vatIncluded}
              onCheckedChange={(checked) => onVatIncludedChange(checked === true)}
            />
            <Label htmlFor="vatIncluded" className="text-xs font-normal cursor-pointer">
              VAT Included
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
