export type ImportFieldType = "string" | "number" | "boolean" | "date" | "email" | "phone" | "enum";

export interface ImportFieldMetadata {
  key: string;
  label: string;
  type: ImportFieldType;
  required: boolean;
  description?: string;
  example?: string;
  enumValues?: string[];
}

export interface ImportModuleConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  targetModel: string;
  permissionKey: string;
  fields: ImportFieldMetadata[];
  sampleData: Record<string, any>;
  uniqueIdentifierKeys: string[]; // e.g. ["email"], ["code"], ["clientCode"]
}

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export type FieldMapping = Record<string, string>; // CSV Header -> Target Field Key

export interface RowValidationError {
  rowIndex: number;
  fieldKey: string;
  fieldLabel: string;
  message: string;
  value: any;
}

export interface RowValidationResult {
  rowIndex: number;
  data: Record<string, any>; // Mapped object { targetFieldKey: value }
  rawData: Record<string, any>;
  isValid: boolean;
  errors: RowValidationError[];
}

export interface ValidationSummary {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  mappedFieldsCount: number;
  totalRequiredFieldsCount: number;
  unmappedRequiredFields: ImportFieldMetadata[];
  rows: RowValidationResult[];
}

export type DuplicateStrategy = "skip" | "update" | "reject";

export interface ImportExecutionResult {
  success: boolean;
  error?: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failedRows?: { rowIndex: number; error: string; data: Record<string, any> }[];
}
