// Project Types
export type ProjectType = 'INTERIOR' | 'CIVIL' | 'BOTH';

export const PROJECT_TYPES: Array<{ value: ProjectType; label: string }> = [
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'CIVIL', label: 'Civil' },
  { value: 'BOTH', label: 'Both' },
];

// Location Types (PWD Locations)
export type LocationType =
  | 'DHAKA_MYMENSINGH'
  | 'CHATTOGRAM_SYLHET'
  | 'KHULNA_BARISAL_GOPALGONJ'
  | 'RAJSHAHI_RANGPUR';

export const LOCATION_TYPES: Array<{ value: LocationType; label: string }> = [
  { value: 'DHAKA_MYMENSINGH', label: 'Dhaka & Mymensingh' },
  { value: 'CHATTOGRAM_SYLHET', label: 'Chattogram & Sylhet' },
  { value: 'KHULNA_BARISAL_GOPALGONJ', label: 'Khulna, Barisal & Gopalgonj' },
  { value: 'RAJSHAHI_RANGPUR', label: 'Rajshahi & Rangpur' },
];

// Material Categories
export type MaterialCategory =
  | 'PAINT'
  | 'TILES'
  | 'FLOORING'
  | 'CEILING'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'HARDWARE'
  | 'GLASS'
  | 'FABRIC'
  | 'LIGHTING'
  | 'OTHER';

export const MATERIAL_CATEGORIES: Array<{ value: MaterialCategory; label: string }> = [
  { value: 'PAINT', label: 'Paint' },
  { value: 'TILES', label: 'Tiles' },
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'CEILING', label: 'Ceiling' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'GLASS', label: 'Glass' },
  { value: 'FABRIC', label: 'Fabric' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'OTHER', label: 'Other' },
];

// Quantity Units
export type QuantityUnit = 'PC' | 'SQFT' | 'SQM' | 'KG' | 'L' | 'M' | 'SET' | 'BOX';

export const QUANTITY_UNITS: Array<{ value: QuantityUnit; label: string }> = [
  { value: 'PC', label: 'PC (Piece)' },
  { value: 'SQFT', label: 'SQFT (Square Feet)' },
  { value: 'SQM', label: 'SQM (Square Meter)' },
  { value: 'KG', label: 'KG (Kilogram)' },
  { value: 'L', label: 'L (Liter)' },
  { value: 'M', label: 'M (Meter)' },
  { value: 'SET', label: 'SET' },
  { value: 'BOX', label: 'BOX' },
];

// Dimension Units
export type DimensionUnit = 'mm' | 'cm' | 'm' | 'inch' | 'ft';

export const DIMENSION_UNITS: Array<{ value: DimensionUnit; label: string }> = [
  { value: 'mm', label: 'mm (Millimeter)' },
  { value: 'cm', label: 'cm (Centimeter)' },
  { value: 'm', label: 'm (Meter)' },
  { value: 'inch', label: 'inch' },
  { value: 'ft', label: 'ft (Feet)' },
];

// Section Types
export type SectionType =
  | 'PWD'
  | 'INTERIOR_UNIT'
  | 'MATERIAL'
  | 'LABOR'
  | 'TRANSPORT'
  | 'OTHER';

export const SECTION_TYPES: Array<{ value: SectionType; label: string }> = [
  { value: 'PWD', label: 'PWD Schedule' },
  { value: 'INTERIOR_UNIT', label: 'Interior Unit' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
];

