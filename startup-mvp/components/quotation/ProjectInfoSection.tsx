'use client';

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
import { PROJECT_TYPES, LOCATION_TYPES } from '@/types/enums';
import type { ProjectType, LocationType } from '@/types/enums';

import OpportunitySelect from './OpportunitySelect';

interface ProjectInfoSectionProps {
  projectName: string;
  projectLocation: string;
  projectType: ProjectType;
  selectedLocation?: LocationType | null;
  opportunityId?: string | null;
  onProjectNameChange: (value: string) => void;
  onProjectLocationChange: (value: string) => void;
  onProjectTypeChange: (value: ProjectType) => void;
  onLocationChange: (value: LocationType) => void;
  onOpportunityChange: (value: string | null) => void;
}

export function ProjectInfoSection({
  projectName,
  projectLocation,
  projectType,
  selectedLocation,
  opportunityId,
  onProjectNameChange,
  onProjectLocationChange,
  onProjectTypeChange,
  onLocationChange,
  onOpportunityChange,
}: ProjectInfoSectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Project Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Linked Opportunity</Label>
          <OpportunitySelect 
            value={opportunityId || undefined} 
            onValueChange={onOpportunityChange} 
          />
        </div>

        <div>
          <Label htmlFor="projectName" className="text-xs">Project Name</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Project name"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="projectLocation" className="text-xs">Location</Label>
          <Input
            id="projectLocation"
            value={projectLocation}
            onChange={(e) => onProjectLocationChange(e.target.value)}
            placeholder="Project location"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="projectType" className="text-xs">Project Type</Label>
          <Select
            value={projectType}
            onValueChange={(value) => onProjectTypeChange(value as ProjectType)}
          >
            <SelectTrigger id="projectType" className="h-8 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="selectedLocation" className="text-xs">PWD Location</Label>
          <Select
            value={selectedLocation || ''}
            onValueChange={(value) => onLocationChange(value as LocationType)}
          >
            <SelectTrigger id="selectedLocation" className="h-8 text-sm">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((location) => (
                <SelectItem key={location.value} value={location.value}>
                  {location.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

