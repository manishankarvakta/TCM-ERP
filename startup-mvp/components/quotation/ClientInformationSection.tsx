'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FiPlus } from 'react-icons/fi';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface ClientInformationSectionProps {
  clientId?: string;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  onClientIdChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onClientAddressChange: (value: string) => void;
  onClientContactChange: (value: string) => void;
}

export function ClientInformationSection({
  clientId,
  clientName,
  clientAddress,
  clientContact,
  onClientIdChange,
  onClientNameChange,
  onClientAddressChange,
  onClientContactChange,
}: ClientInformationSectionProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        const data = await response.json();
        if (response.ok && !data.error) {
          setClients(data);
        } else {
          console.error('Error fetching clients:', data.error || data.details);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleClientSelect = (selectedClientId: string) => {
    if (selectedClientId === 'new') {
      setIsAddingNew(true);
      onClientIdChange('');
      onClientNameChange('');
      onClientAddressChange('');
      onClientContactChange('');
      return;
    }

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    if (selectedClient) {
      setIsAddingNew(false);
      onClientIdChange(selectedClientId);
      onClientNameChange(selectedClient.name);
      onClientAddressChange(selectedClient.address || '');
      onClientContactChange(selectedClient.phone || selectedClient.email || '');
    }
  };

  // If clientId exists but not in the list, show manual fields
  const showManualFields = isAddingNew || (clientId && !clients.find((c) => c.id === clientId));

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Client Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="clientSelect" className="text-xs">Select Client</Label>
          <Select
            value={clientId || ''}
            onValueChange={handleClientSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 text-sm" id="clientSelect">
              <SelectValue placeholder={isLoading ? 'Loading...' : 'Select a client'} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <FiPlus className="w-3 h-3" />
                  Add New Client
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showManualFields && (
          <>
            <div>
              <Label htmlFor="clientName" className="text-xs">Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                placeholder="Client name"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="clientAddress" className="text-xs">Address</Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => onClientAddressChange(e.target.value)}
                placeholder="Client address"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="clientContact" className="text-xs">Contact</Label>
              <Input
                id="clientContact"
                value={clientContact}
                onChange={(e) => onClientContactChange(e.target.value)}
                placeholder="Phone/Email"
                className="h-8 text-sm"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
