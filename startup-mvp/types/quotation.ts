import type { LocationType, ProjectType } from './enums';

export interface Component {
  id: string;
  itemId: string;
  boxCode: string;
  description: string;
  height: number;
  width: number;
  depth: number;
  unit: string;
  unitPrice: number;
  quantity: number;
  quantityUnit: string;
  amount: number;
  finish?: string;
  material?: string;
  color?: string;
}

export interface InteriorUnitFormData {
  id: string;
  unitType: string;
  boxCode: string;
  height: number;
  width: number;
  depth: number;
  dimensionUnit: string;
  finish: string;
  material: string;
  color: string;
  unitPrice: number;
  quantity: number;
  quantityUnit: string;
  amount: number;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  slNo: number;
  name: string;
  description: string;
  components: Component[];
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialItemFormData {
  id: string;
  materialId?: string;
  slNo: number;
  code: string;
  description: string;
  specifications: string;
  category: string;
  unitPrice: number;
  quantity: number;
  quantityUnit: string;
  amount: number;
}

export interface MaterialLibrary {
  id: string;
  code: string;
  name: string;
  description: string;
  specifications?: string;
  category: string;
  unitPrice: number | string;
  quantityUnit: string;
  supplier?: string;
  isActive: boolean;
}

export interface PWDItemFormData {
  id?: string;
  itemNumber: string;
  code: string;
  description: string;
  specifications?: string;
  unit: string;
  rateDhakaMym: number | string;
  rateChatSyl: number | string;
  rateKhulBariGop: number | string;
  rateRajRange: number | string;
  selectedRate?: number | string;
  quantity: number;
  category?: string;
}

// Re-export types from enums (already imported above)
export type { LocationType, ProjectType };

export interface QuotationFormData {
  quotationNumber: string;
  date: Date | string;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  projectName?: string;
  projectLocation?: string;
  projectType?: ProjectType;
  selectedLocation?: LocationType;
  submittedBy: string;
  submittedByContact: string;
  reference?: string;
  subject: string;
  hotline?: string;
  email?: string;
  status?: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "REVISED";
  phases?: PhaseFormData[];
  grandTotal?: number;
}

export interface PhaseFormData {
  phaseNumber: number | string;
  phaseName: string;
  description?: string;
  startDate?: Date | string;
  estimatedDuration?: number | string;
  sections: SectionFormData[];
}

export interface SectionFormData {
  id?: string;
  slNo?: number;
  sectionName?: string;
  title?: string;
  note?: string;
  sectionType?: string;
  pwdItems?: PWDItemFormData[];
  interiorUnits?: InteriorUnitFormData[];
  materials?: MaterialItemFormData[];
  total?: number;
  sortOrder?: number;
}

export interface Quotation {
  id?: string;
  quotationNumber: string;
  date: Date | string;
  subject: string;
  discount?: number;
  grandTotal?: number;
  coverLetter?: string | null;
  financialStatement?: string | null;
  tos?: string | null;
  total?: number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "REVISED";
  clientId?: string;
  organizationId?: string;
  submittedById?: string;
  shippingCharges?: number;
  vatIncluded?: boolean;
  projectLocation?: string;
  section?: any[];
  // Additional fields for form compatibility
  clientName?: string;
  clientAddress?: string;
  clientContact?: string;
  submittedBy?: string;
  submittedByContact?: string;
  reference?: string;
  validityDays?: number;
  items?: QuotationItem[];
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
}

