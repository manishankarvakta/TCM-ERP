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

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

interface SubmissionInformationSectionProps {
  submittedById?: string;
  submittedBy: string;
  submittedByContact: string;
  onSubmittedByIdChange: (value: string) => void;
  onSubmittedByChange: (value: string) => void;
  onSubmittedByContactChange: (value: string) => void;
}

export function SubmissionInformationSection({
  submittedById,
  submittedBy,
  submittedByContact,
  onSubmittedByIdChange,
  onSubmittedByChange,
  onSubmittedByContactChange,
}: SubmissionInformationSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (response.ok && !data.error) {
          setUsers(data);
        } else {
          console.error('Error fetching users:', data.error || data.details);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserSelect = (selectedUserId: string) => {
    if (selectedUserId === 'new') {
      setIsAddingNew(true);
      onSubmittedByIdChange('');
      onSubmittedByChange('');
      onSubmittedByContactChange('');
      return;
    }

    const selectedUser = users.find((u) => u.id === selectedUserId);
    if (selectedUser) {
      setIsAddingNew(false);
      onSubmittedByIdChange(selectedUserId);
      onSubmittedByChange(selectedUser.name);
      onSubmittedByContactChange(selectedUser.email);
    }
  };

  // If submittedById exists but not in the list, show manual fields
  const showManualFields = isAddingNew || (submittedById && !users.find((u) => u.id === submittedById));

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Submitted By</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="submittedBySelect" className="text-xs">Select User</Label>
          <Select
            value={submittedById || ''}
            onValueChange={handleUserSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 text-sm" id="submittedBySelect">
              <SelectValue placeholder={isLoading ? 'Loading...' : 'Select a user'} />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} {user.role && `(${user.role})`}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <FiPlus className="w-3 h-3" />
                  Add New User
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showManualFields && (
          <>
            <div>
              <Label htmlFor="submittedBy" className="text-xs">Name</Label>
              <Input
                id="submittedBy"
                value={submittedBy}
                onChange={(e) => onSubmittedByChange(e.target.value)}
                placeholder="Your name"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="submittedByContact" className="text-xs">Contact</Label>
              <Input
                id="submittedByContact"
                value={submittedByContact}
                onChange={(e) => onSubmittedByContactChange(e.target.value)}
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
