"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma, AccountType, ItemType, EmploymentType } from "@prisma/client";
import { getImportModuleConfig, IMPORT_MODULES } from "@/lib/import-config";
import {
  ImportModuleConfig,
  FieldMapping,
  RowValidationResult,
  RowValidationError,
  ValidationSummary,
  DuplicateStrategy,
  ImportExecutionResult,
} from "@/types/import";
import * as XLSX from "xlsx";
import { createClient } from "../../clients/_actions/client.action";
import { createSupplier } from "../../suppliers/_actions/supplier.action";

/**
 * Safely parse date input from string, number, or Date instance.
 * Handles Excel serial dates (e.g. 33836, 33836.25023148), ISO dates, 
 * slash formats (M/D/YY, M/D/YYYY, D/M/YYYY), and timestamps.
 * Returns null if the date is invalid or empty.
 */
function safeParseDate(val: any): Date | null {
  if (val === undefined || val === null || val === "") return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Check if string or number is an Excel serial date (e.g. 33836 or 33836.250231481485)
  const num = Number(str);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel epoch formula: (serial - 25569) * 86400 * 1000
    const parsedFromSerial = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(parsedFromSerial.getTime())) {
      return parsedFromSerial;
    }
  }

  // Direct JavaScript Date parsing
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    // Fix 2-digit year edge cases (e.g. '92' parsed as year 0092 instead of 1992)
    if (parsed.getFullYear() < 100) {
      const year = parsed.getFullYear() + (parsed.getFullYear() < 50 ? 2000 : 1900);
      parsed.setFullYear(year);
    }
    return parsed;
  }

  // Parse slash/dash formatted dates explicitly: M/D/YY, M/D/YYYY, D/M/YYYY, YYYY/M/D
  const partsMatch = str.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
  if (partsMatch) {
    let p1 = parseInt(partsMatch[1], 10);
    let p2 = parseInt(partsMatch[2], 10);
    let p3 = parseInt(partsMatch[3], 10);

    // Case YYYY-MM-DD
    if (p1 > 1000) {
      parsed = new Date(p1, p2 - 1, p3);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Case M/D/YY or D/M/YY or M/D/YYYY
    if (p3 < 100) {
      p3 += p3 < 50 ? 2000 : 1900;
    }

    // Try Month/Day/Year
    if (p1 <= 12 && p2 <= 31) {
      parsed = new Date(p3, p1 - 1, p2);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // Try Day/Month/Year
    if (p2 <= 12 && p1 <= 31) {
      parsed = new Date(p3, p2 - 1, p1);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

/**
 * Safely parse numeric input from string or number.
 * Removes commas (e.g. 1,250.00) and currency symbols.
 */
function safeParseNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
  if (!str) return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Clean string for header matching (strips UTF-8 BOM and leading/trailing whitespace)
 */
function cleanHeaderStr(str: any): string {
  if (str === undefined || str === null) return "";
  return String(str).replace(/^\uFEFF/, "").trim();
}

/**
 * Safely extract raw value from row object regardless of BOM or case variations in CSV column headers
 */
function getRawRowValue(rawRow: Record<string, any>, csvHeader: string): any {
  if (rawRow[csvHeader] !== undefined && rawRow[csvHeader] !== null) {
    return rawRow[csvHeader];
  }
  const cleanMappedHeader = cleanHeaderStr(csvHeader).toLowerCase();
  for (const key of Object.keys(rawRow)) {
    if (cleanHeaderStr(key).toLowerCase() === cleanMappedHeader) {
      return rawRow[key];
    }
  }
  return undefined;
}

/**
 * Safely generate a unique slug for Category
 */
async function generateUniqueCategorySlug(baseSlug?: string | null, excludeId?: string): Promise<string | null> {
  if (!baseSlug || !String(baseSlug).trim()) return null;
  const cleanSlug = String(baseSlug).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanSlug) return null;

  let currentSlug = cleanSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: currentSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return currentSlug;

    currentSlug = `${cleanSlug}-${counter}`;
    counter++;
  }
}

/**
 * Safely generate a unique slug for Brand
 */
async function generateUniqueBrandSlug(baseSlug?: string | null, excludeId?: string): Promise<string | null> {
  if (!baseSlug || !String(baseSlug).trim()) return null;
  const cleanSlug = String(baseSlug).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanSlug) return null;

  let currentSlug = cleanSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.brand.findFirst({
      where: {
        slug: currentSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return currentSlug;

    currentSlug = `${cleanSlug}-${counter}`;
    counter++;
  }
}

/**
 * Safely generate a unique slug for Item
 */
async function generateUniqueItemSlug(baseSlug?: string | null, excludeId?: string): Promise<string | null> {
  if (!baseSlug || !String(baseSlug).trim()) return null;
  const cleanSlug = String(baseSlug).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanSlug) return null;

  let currentSlug = cleanSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.item.findFirst({
      where: {
        slug: currentSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return currentSlug;

    currentSlug = `${cleanSlug}-${counter}`;
    counter++;
  }
}

/**
 * Get available import modules
 */
export async function getImportModulesAction(): Promise<{
  success: boolean;
  modules: ImportModuleConfig[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, modules: [], error: "Unauthorized" };
    }
    return { success: true, modules: IMPORT_MODULES };
  } catch (error) {
    console.error("getImportModulesAction error:", error);
    return {
      success: false,
      modules: [],
      error: error instanceof Error ? error.message : "Failed to load import modules",
    };
  }
}

/**
 * Generate and download sample CSV content for a module (including all required fields and user-selected optional fields)
 */
export async function generateSampleCsvAction(
  moduleId: string,
  selectedFieldKeys?: string[]
): Promise<{
  success: boolean;
  csvContent?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const config = getImportModuleConfig(moduleId);
    if (!config) {
      return { success: false, error: `Import module '${moduleId}' not found` };
    }

    // Always include all required fields + user-selected optional fields
    const activeFields = (selectedFieldKeys && selectedFieldKeys.length > 0)
      ? config.fields.filter((f) => f.required || selectedFieldKeys.includes(f.key))
      : config.fields;

    // Construct ordered sample object with headers matching field labels
    const sampleObj: Record<string, any> = {};
    activeFields.forEach((field) => {
      sampleObj[field.label] = config.sampleData[field.label] ?? field.example ?? "";
    });

    const worksheet = XLSX.utils.json_to_sheet([sampleObj]);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    return {
      success: true,
      csvContent,
      filename: `sample_${config.id.toLowerCase()}_import.csv`,
    };
  } catch (error) {
    console.error("generateSampleCsvAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate sample CSV",
    };
  }
}

/**
 * Parse CSV file and validate rows against schema & field mappings
 */
export async function parseAndValidateCsvAction(
  moduleId: string,
  csvStringOrBase64: string,
  fieldMapping: FieldMapping,
  selectedFieldKeys?: string[]
): Promise<{
  success: boolean;
  summary?: ValidationSummary;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const rawConfig = getImportModuleConfig(moduleId);
    if (!rawConfig) {
      return { success: false, error: `Module '${moduleId}' not found` };
    }

    // Filter active schema fields by user-selected fields if specified (always keep required fields)
    const activeFields = (selectedFieldKeys && selectedFieldKeys.length > 0)
      ? rawConfig.fields.filter((f) => f.required || selectedFieldKeys.includes(f.key))
      : rawConfig.fields;

    const config = { ...rawConfig, fields: activeFields };

    // Read CSV using XLSX
    let workbook: XLSX.WorkBook;
    if (csvStringOrBase64.startsWith("data:")) {
      const base64Data = csvStringOrBase64.split(",")[1];
      workbook = XLSX.read(base64Data, { type: "base64" });
    } else {
      workbook = XLSX.read(csvStringOrBase64, { type: "string" });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: "Uploaded CSV file is empty or invalid" };
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rawRows.length === 0) {
      return { success: false, error: "No data rows found in uploaded file" };
    }

    // Identify mapped target field keys (supporting targetKey -> csvHeader or csvHeader -> targetKey)
    const mappedTargetKeys = new Set<string>();
    config.fields.forEach((field) => {
      const mappedHeader = fieldMapping[field.key] || Object.keys(fieldMapping).find((k) => fieldMapping[k] === field.key);
      if (mappedHeader && String(mappedHeader).trim() !== "") {
        mappedTargetKeys.add(field.key);
      }
    });

    // Identify unmapped required fields
    const unmappedRequiredFields = config.fields.filter(
      (f) => f.required && !mappedTargetKeys.has(f.key)
    );

    const validationRows: RowValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Validate each row
    rawRows.forEach((rawRow, index) => {
      const mappedData: Record<string, any> = {};
      const errors: RowValidationError[] = [];

      // Extract values for each active target field
      config.fields.forEach((field) => {
        const csvHeader = fieldMapping[field.key] || Object.keys(fieldMapping).find((k) => fieldMapping[k] === field.key);
        const rawVal = csvHeader ? getRawRowValue(rawRow, csvHeader) : undefined;
        if (rawVal !== undefined && rawVal !== null) {
          mappedData[field.key] = String(rawVal).trim();
        } else {
          mappedData[field.key] = "";
        }
      });

      // Validate required fields
      config.fields.forEach((field) => {
        const val = mappedData[field.key];
        const isMapped = mappedTargetKeys.has(field.key);

        if (field.required) {
          if (!isMapped) {
            errors.push({
              rowIndex: index + 1,
              fieldKey: field.key,
              fieldLabel: field.label,
              message: `Required field '${field.label}' is not mapped to any CSV column`,
              value: "",
            });
          } else if (!val || String(val).trim() === "") {
            errors.push({
              rowIndex: index + 1,
              fieldKey: field.key,
              fieldLabel: field.label,
              message: `Required field '${field.label}' is empty`,
              value: val,
            });
          }
        }

        // Validate data types if value is provided
        if (val && String(val).trim() !== "") {
          if (field.type === "number") {
            const cleanNum = safeParseNumber(val);
            if (cleanNum === null) {
              errors.push({
                rowIndex: index + 1,
                fieldKey: field.key,
                fieldLabel: field.label,
                message: `'${field.label}' must be a valid number (got '${val}')`,
                value: val,
              });
            } else {
              mappedData[field.key] = cleanNum;
            }
          } else if (field.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(val))) {
              errors.push({
                rowIndex: index + 1,
                fieldKey: field.key,
                fieldLabel: field.label,
                message: `'${field.label}' is not a valid email address`,
                value: val,
              });
            }
          } else if (field.type === "date") {
            const parsedDate = safeParseDate(val);
            if (!parsedDate) {
              errors.push({
                rowIndex: index + 1,
                fieldKey: field.key,
                fieldLabel: field.label,
                message: `'${field.label}' must be a valid date (e.g., YYYY-MM-DD or DD/MM/YYYY)`,
                value: val,
              });
            } else {
              mappedData[field.key] = parsedDate.toISOString().split("T")[0];
            }
          } else if (field.type === "enum" && field.enumValues) {
            const rawValStr = String(val).trim();
            if (rawValStr !== "") {
              const normalizedVal = rawValStr.toUpperCase().replace(/[-\s]+/g, "_");
              const isValidEnum = field.enumValues.some(
                (ev) => ev.toUpperCase().replace(/[-\s]+/g, "_") === normalizedVal
              );
              if (!isValidEnum && field.required) {
                errors.push({
                  rowIndex: index + 1,
                  fieldKey: field.key,
                  fieldLabel: field.label,
                  message: `'${field.label}' must be one of [${field.enumValues.join(", ")}]`,
                  value: val,
                });
              }
            }
          }
        }
      });

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      validationRows.push({
        rowIndex: index + 1,
        data: mappedData,
        rawData: rawRow,
        isValid,
        errors,
      });
    });

    const totalRequiredFields = config.fields.filter((f) => f.required).length;

    return {
      success: true,
      summary: {
        totalRows: rawRows.length,
        validRowsCount: validCount,
        invalidRowsCount: invalidCount,
        mappedFieldsCount: mappedTargetKeys.size,
        totalRequiredFieldsCount: totalRequiredFields,
        unmappedRequiredFields,
        rows: validationRows,
      },
    };
  } catch (error) {
    console.error("parseAndValidateCsvAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse and validate CSV",
    };
  }
}

/**
 * Execute actual batch import for a module
 */
export async function executeImportAction(
  moduleId: string,
  mappedRows: Record<string, any>[],
  duplicateStrategy: DuplicateStrategy = "skip"
): Promise<ImportExecutionResult> {
  try {
    const session = await auth();
    let currentUserId = session?.user?.id;
    if (!currentUserId) {
      const fallbackUser = await prisma.user.findFirst({ select: { id: true } });
      if (fallbackUser) {
        currentUserId = fallbackUser.id;
      } else {
        return {
          success: false,
          error: "Unauthorized: No valid user account found in database",
          createdCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          failedCount: 0,
        };
      }
    }

    const config = getImportModuleConfig(moduleId);
    if (!config) {
      return {
        success: false,
        error: `Module '${moduleId}' not found`,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
      };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRows: { rowIndex: number; error: string; data: Record<string, any> }[] = [];
    const skippedRows: { rowIndex: number; reason: string; data: Record<string, any> }[] = [];

    // Process each row depending on target module
    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      const rowIndex = i + 1;

      try {
        if (config.targetModel === "Client") {
          if (row.email) {
            const existing = await prisma.client.findUnique({ where: { email: row.email } });
            if (existing) {
              if (duplicateStrategy === "skip") {
                skippedCount++;
                skippedRows.push({
                  rowIndex,
                  reason: `Duplicate client email '${row.email}' already exists in database`,
                  data: row,
                });
                continue;
              }
            }
          }

          const res = await createClient({
            name: row.name,
            clientCode: row.clientCode || undefined,
            email: row.email || null,
            phone: row.phone || "",
            company: row.company || "",
            address: row.address || "",
            city: row.city || "",
            state: row.state || "",
            zip: row.zip || "",
            country: row.country || "",
            image: row.image || "",
            clientType: row.clientType?.toLowerCase() === "wholesale" ? "wholesale" : "regular",
            openingBalance: row.openingBalance ? Number(row.openingBalance) : 0,
            status: row.status === "inactive" ? "inactive" : "active",
            membershipNumber: row.membershipNumber || undefined,
            membershipTier: row.membershipTier ? row.membershipTier.toUpperCase() : "NONE",
            membershipStatus: row.membershipStatus ? row.membershipStatus.toUpperCase() : "INACTIVE",
            membershipPoints: row.membershipPoints ? Number(row.membershipPoints) : 0,
            membershipExpiry: safeParseDate(row.membershipExpiry) || undefined,
          });

          if (res.success) {
            createdCount++;
          } else {
            failedCount++;
            failedRows.push({ rowIndex, error: res.error || "Failed to create client", data: row });
          }
        } else if (config.targetModel === "Supplier") {
          if (row.email) {
            const existing = await prisma.supplier.findUnique({ where: { email: row.email } });
            if (existing) {
              if (duplicateStrategy === "skip") {
                skippedCount++;
                skippedRows.push({
                  rowIndex,
                  reason: `Duplicate supplier email '${row.email}' already exists in database`,
                  data: row,
                });
                continue;
              }
            }
          }

          const res = await createSupplier({
            name: row.name,
            supplierCode: row.supplierCode || undefined,
            email: row.email || null,
            phone: row.phone || "",
            company: row.company || "",
            address: row.address || "",
            city: row.city || "",
            state: row.state || "",
            zip: row.zip || "",
            country: row.country || "",
            image: row.image || "",
            openingBalance: row.openingBalance ? Number(row.openingBalance) : 0,
            status: row.status === "inactive" ? "inactive" : "active",
          });

          if (res.success) {
            createdCount++;
          } else {
            failedCount++;
            failedRows.push({ rowIndex, error: res.error || "Failed to create supplier", data: row });
          }
        } else if (config.targetModel === "Category") {
          let parentId: string | null = null;
          if (row.parentCategoryName && String(row.parentCategoryName).trim() !== "") {
            const parentCatName = String(row.parentCategoryName).trim();
            let parentCat = await prisma.category.findFirst({
              where: { name: { equals: parentCatName, mode: "insensitive" } },
            });
            if (!parentCat) {
              const baseParentSlug = parentCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              const parentSlug = await generateUniqueCategorySlug(baseParentSlug);
              parentCat = await prisma.category.create({
                data: {
                  name: parentCatName,
                  slug: parentSlug,
                  status: "active",
                },
              });
            }
            parentId = parentCat.id;
          }

          const rawSlug = row.slug ? String(row.slug).trim() : (row.name ? String(row.name).trim() : "");
          const targetSlug = rawSlug ? rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";

          const existing = await prisma.category.findFirst({
            where: {
              OR: [
                { name: { equals: row.name, mode: "insensitive" } },
                targetSlug ? { slug: targetSlug } : {},
              ].filter((cond) => Object.keys(cond).length > 0) as Prisma.CategoryWhereInput[],
            },
          });

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate category name '${row.name}' or slug already exists in database`,
                data: row,
              });
              continue;
            }
            const updatedSlug = row.slug
              ? await generateUniqueCategorySlug(row.slug, existing.id)
              : existing.slug;

            await prisma.category.update({
              where: { id: existing.id },
              data: {
                slug: updatedSlug,
                description: row.description || existing.description,
                image: row.image || existing.image,
                parentId: parentId || existing.parentId,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          const finalSlug = await generateUniqueCategorySlug(rawSlug);

          await prisma.category.create({
            data: {
              name: row.name,
              slug: finalSlug,
              description: row.description || null,
              image: row.image || null,
              parentId,
              status: row.status === "inactive" ? "inactive" : "active",
            },
          });
          createdCount++;
        } else if (config.targetModel === "Brand") {
          const rawSlug = row.slug ? String(row.slug).trim() : (row.name ? String(row.name).trim() : "");
          const targetSlug = rawSlug ? rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";

          const existing = await prisma.brand.findFirst({
            where: {
              OR: [
                { name: { equals: row.name, mode: "insensitive" } },
                targetSlug ? { slug: targetSlug } : {},
              ].filter((cond) => Object.keys(cond).length > 0) as Prisma.BrandWhereInput[],
            },
          });

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate brand name '${row.name}' or slug already exists in database`,
                data: row,
              });
              continue;
            }
            const updatedSlug = row.slug
              ? await generateUniqueBrandSlug(row.slug, existing.id)
              : existing.slug;

            await prisma.brand.update({
              where: { id: existing.id },
              data: {
                slug: updatedSlug,
                description: row.description || existing.description,
                image: row.image || existing.image,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          const finalSlug = await generateUniqueBrandSlug(rawSlug);

          await prisma.brand.create({
            data: {
              name: row.name,
              slug: finalSlug,
              description: row.description || null,
              image: row.image || null,
              status: row.status === "inactive" ? "inactive" : "active",
            },
          });
          createdCount++;
        } else if (config.targetModel === "Unit") {
          const existing = await prisma.unit.findFirst({
            where: {
              OR: [
                { symbol: { equals: row.code, mode: "insensitive" } },
                { details: { equals: row.name, mode: "insensitive" } },
              ],
            },
          });
          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate unit symbol '${row.code || row.name}' already exists in database`,
                data: row,
              });
              continue;
            }
            await prisma.unit.update({
              where: { id: existing.id },
              data: {
                details: row.name,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.unit.create({
            data: {
              details: row.name,
              symbol: row.code || row.name.slice(0, 3).toUpperCase(),
              status: row.status === "inactive" ? "inactive" : "active",
              createdBy: currentUserId,
            },
          });
          createdCount++;
        } else if (config.targetModel === "Warehouse") {
          const existing = await prisma.warehouse.findFirst({
            where: {
              OR: [
                row.code ? { code: row.code } : {},
                { name: { equals: row.name, mode: "insensitive" } },
              ],
            },
          });
          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate warehouse code '${row.code || row.name}' already exists in database`,
                data: row,
              });
              continue;
            }
            await prisma.warehouse.update({
              where: { id: existing.id },
              data: {
                address: row.address || existing.address,
                city: row.city || existing.city,
                state: row.state || existing.state,
                zip: row.zip || existing.zip,
                country: row.country || existing.country,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.warehouse.create({
            data: {
              name: row.name,
              code: row.code || `WH-${Date.now().toString().slice(-4)}`,
              address: row.address || null,
              city: row.city || null,
              state: row.state || null,
              zip: row.zip || null,
              country: row.country || null,
              status: row.status === "inactive" ? "inactive" : "active",
              createdBy: currentUserId,
            },
          });
          createdCount++;
        } else if (config.targetModel === "Item") {
          // Products / Item
          let categoryId: string | null = null;
          let subCategoryId: string | null = null;
          let brandId: string | null = null;
          let unitId: string | null = null;

          if (row.categoryName && String(row.categoryName).trim() !== "") {
            const catName = String(row.categoryName).trim();
            let cat = await prisma.category.findFirst({
              where: { name: { equals: catName, mode: "insensitive" } },
            });
            if (!cat) {
              const slugStr = await generateUniqueCategorySlug(catName);
              cat = await prisma.category.create({
                data: {
                  name: catName,
                  slug: slugStr,
                  status: "active",
                },
              });
            }
            categoryId = cat.id;
          }

          if (row.subCategoryName && String(row.subCategoryName).trim() !== "") {
            const subCatName = String(row.subCategoryName).trim();
            let subCat = await prisma.category.findFirst({
              where: { name: { equals: subCatName, mode: "insensitive" } },
            });
            if (!subCat) {
              const slugStr = await generateUniqueCategorySlug(subCatName);
              subCat = await prisma.category.create({
                data: {
                  name: subCatName,
                  slug: slugStr,
                  parentId: categoryId,
                  status: "active",
                },
              });
            } else if (categoryId && !subCat.parentId) {
              await prisma.category.update({
                where: { id: subCat.id },
                data: { parentId: categoryId },
              });
            }
            subCategoryId = subCat.id;
          }

          if (row.brandName) {
            const brand = await prisma.brand.findFirst({
              where: { name: { equals: row.brandName, mode: "insensitive" } },
            });
            if (brand) brandId = brand.id;
          }

          if (row.unitCode) {
            const u = await prisma.unit.findFirst({
              where: { symbol: { equals: row.unitCode, mode: "insensitive" } },
            });
            if (u) unitId = u.id;
          }

          if (!unitId) {
            const firstUnit = await prisma.unit.findFirst();
            if (firstUnit) {
              unitId = firstUnit.id;
            } else {
              const defaultUnit = await prisma.unit.create({
                data: {
                  details: "Pieces",
                  symbol: "PCS",
                  createdBy: currentUserId,
                },
              });
              unitId = defaultUnit.id;
            }
          }

          let parsedItemType: ItemType = ItemType.READY_PRODUCT;
          if (row.itemType) {
            const rawType = String(row.itemType).toUpperCase().trim().replace(/[-\s]+/g, "_");
            if (Object.values(ItemType).includes(rawType as ItemType)) {
              parsedItemType = rawType as ItemType;
            }
          }

          const codeVal = row.code !== undefined && row.code !== null && String(row.code).trim() !== "" ? String(row.code).trim() : null;
          const barcodeVal = row.barcode !== undefined && row.barcode !== null && String(row.barcode).trim() !== "" ? String(row.barcode).trim() : null;

          const itemOrConditions: Prisma.ItemWhereInput[] = [];
          if (codeVal) {
            itemOrConditions.push({ code: codeVal });
          }
          if (barcodeVal) {
            itemOrConditions.push({ barcode: barcodeVal });
          }
          if (row.name && String(row.name).trim() !== "") {
            itemOrConditions.push({ name: { equals: String(row.name).trim(), mode: "insensitive" } });
          }

          const existing = itemOrConditions.length > 0
            ? await prisma.item.findFirst({
                where: {
                  OR: itemOrConditions,
                },
              })
            : null;

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate item code '${existing.code}', barcode, or name '${existing.name}' already exists in database`,
                data: row,
              });
              continue;
            }
            const itemSlugForUpdate = existing.slug || (await generateUniqueItemSlug(String(row.name).trim(), existing.id));

            await prisma.item.update({
              where: { id: existing.id },
              data: {
                slug: itemSlugForUpdate,
                ...(codeVal ? { code: codeVal } : {}),
                ...(barcodeVal ? { barcode: barcodeVal } : {}),
                salesPrice: row.salesPrice ? Number(row.salesPrice) : existing.salesPrice,
                costPrice: row.costPrice ? Number(row.costPrice) : existing.costPrice,
                wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : existing.wholesalePrice,
                wholesaleDiscountAmount: row.wholesaleDiscountAmount ? Number(row.wholesaleDiscountAmount) : existing.wholesaleDiscountAmount,
                discount: row.discount ? Number(row.discount) : existing.discount,
                description: row.description || existing.description,
                featuredImage: row.featuredImage || existing.featuredImage,
                isEnableEcom: row.isEnableEcom === "true" || row.isEnableEcom === true ? true : existing.isEnableEcom,
                trackInventory: row.trackInventory === "true" || row.trackInventory === true ? true : existing.trackInventory,
                isVatEnabled: row.isVatEnabled === "true" || row.isVatEnabled === true ? true : existing.isVatEnabled,
                vatPercentage: row.vatPercentage ? Number(row.vatPercentage) : existing.vatPercentage,
                categoryId: categoryId || existing.categoryId,
                subCategoryId: subCategoryId || existing.subCategoryId,
                status: row.status === "inactive" ? "inactive" : existing.status,
                itemType: row.itemType ? parsedItemType : existing.itemType,
              },
            });
            updatedCount++;
            continue;
          }

          const finalCode = codeVal || `ITM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
          const itemSlug = await generateUniqueItemSlug(String(row.name).trim());

          await prisma.item.create({
            data: {
              name: String(row.name).trim(),
              slug: itemSlug,
              code: finalCode,
              barcode: barcodeVal,
              salesPrice: row.salesPrice ? Number(row.salesPrice) : 0,
              costPrice: row.costPrice ? Number(row.costPrice) : 0,
              wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : null,
              wholesaleDiscountAmount: row.wholesaleDiscountAmount ? Number(row.wholesaleDiscountAmount) : null,
              discount: row.discount ? Number(row.discount) : null,
              description: row.description || null,
              featuredImage: row.featuredImage || null,
              isEnableEcom: row.isEnableEcom === "true" || row.isEnableEcom === true,
              trackInventory: row.trackInventory === "true" || row.trackInventory === true,
              isVatEnabled: row.isVatEnabled === "true" || row.isVatEnabled === true,
              vatPercentage: row.vatPercentage ? Number(row.vatPercentage) : 0,
              status: row.status === "inactive" ? "inactive" : "active",
              itemType: parsedItemType,
              categoryId,
              subCategoryId,
              brandId,
              unitId,
              createdBy: currentUserId,
            },
          });
          createdCount++;
        } else if (config.targetModel === "Employee") {
          const empOrConditions: Prisma.EmployeeWhereInput[] = [];
          if (row.employeeCode && String(row.employeeCode).trim() !== "") {
            empOrConditions.push({ employeeCode: String(row.employeeCode).trim() });
          }
          if (row.email && String(row.email).trim() !== "") {
            empOrConditions.push({ email: String(row.email).trim() });
          }
          if (row.nationalId && String(row.nationalId).trim() !== "") {
            empOrConditions.push({ nationalId: String(row.nationalId).trim() });
          }

          const existing = empOrConditions.length > 0
            ? await prisma.employee.findFirst({ where: { OR: empOrConditions } })
            : null;

          const parsedEmpType = row.employmentType
            ? (Object.values(EmploymentType).includes(row.employmentType.toUpperCase()) ? row.employmentType.toUpperCase() as EmploymentType : null)
            : null;

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              skippedRows.push({
                rowIndex,
                reason: `Duplicate employee code '${existing.employeeCode}', email, or NID already exists in database`,
                data: row,
              });
              continue;
            }
            await prisma.employee.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                phone: row.phone || existing.phone,
                salary: row.salary ? Number(row.salary) : existing.salary,
                department: row.department || existing.department,
                designation: row.designation || existing.designation,
                bloodGroup: row.bloodGroup || existing.bloodGroup,
                nationalId: row.nationalId || existing.nationalId,
                biometricDeviceId: row.biometricDeviceId || existing.biometricDeviceId,
                photo: row.photo || existing.photo,
                type: row.type || existing.type,
                employmentType: parsedEmpType || existing.employmentType,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.employee.create({
            data: {
              employeeCode: row.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
              name: row.name,
              email: row.email || null,
              phone: row.phone || null,
              department: row.department || null,
              designation: row.designation || null,
              gender: row.gender?.toUpperCase() || null,
              bloodGroup: row.bloodGroup || null,
              nationalId: row.nationalId || null,
              biometricDeviceId: row.biometricDeviceId || null,
              photo: row.photo || null,
              type: row.type || null,
              employmentType: parsedEmpType,
              dateOfBirth: safeParseDate(row.dateOfBirth),
              joiningDate: safeParseDate(row.joiningDate) || new Date(),
              salary: row.salary ? Number(row.salary) : 0,
              status: row.status === "inactive" ? "inactive" : "active",
            },
          });
          createdCount++;
        }
      } catch (err) {
        console.error(`Row ${rowIndex} import error:`, err);
        failedCount++;
        failedRows.push({
          rowIndex,
          error: err instanceof Error ? err.message : "Failed to import row",
          data: row,
        });
      }
    }

    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      failedRows,
      skippedRows,
    };
  } catch (error) {
    console.error("executeImportAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Batch import execution failed",
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
  }
}
