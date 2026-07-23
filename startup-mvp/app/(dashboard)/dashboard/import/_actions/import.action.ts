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
        if (csvHeader && rawRow[csvHeader] !== undefined && rawRow[csvHeader] !== null) {
          mappedData[field.key] = String(rawRow[csvHeader]).trim();
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
            const num = Number(val);
            if (isNaN(num)) {
              errors.push({
                rowIndex: index + 1,
                fieldKey: field.key,
                fieldLabel: field.label,
                message: `'${field.label}' must be a valid number (got '${val}')`,
                value: val,
              });
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
            const lowerVal = String(val).toLowerCase();
            const isValidEnum = field.enumValues.some((ev) => ev.toLowerCase() === lowerVal);
            if (!isValidEnum) {
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
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
      };
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
                continue;
              }
            }
          }

          const res = await createClient({
            name: row.name,
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
                continue;
              }
            }
          }

          const res = await createSupplier({
            name: row.name,
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
          const existing = await prisma.category.findFirst({
            where: { name: { equals: row.name, mode: "insensitive" } },
          });
          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              continue;
            }
            await prisma.category.update({
              where: { id: existing.id },
              data: {
                slug: row.slug || existing.slug,
                description: row.description || existing.description,
                image: row.image || existing.image,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.category.create({
            data: {
              name: row.name,
              slug: row.slug || null,
              description: row.description || null,
              image: row.image || null,
              status: row.status === "inactive" ? "inactive" : "active",
            },
          });
          createdCount++;
        } else if (config.targetModel === "Brand") {
          const existing = await prisma.brand.findFirst({
            where: { name: { equals: row.name, mode: "insensitive" } },
          });
          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              continue;
            }
            await prisma.brand.update({
              where: { id: existing.id },
              data: {
                slug: row.slug || existing.slug,
                description: row.description || existing.description,
                image: row.image || existing.image,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.brand.create({
            data: {
              name: row.name,
              slug: row.slug || null,
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
              createdBy: session.user.id,
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
              createdBy: session.user.id,
            },
          });
          createdCount++;
        } else if (config.targetModel === "Item") {
          // Products / Item
          let categoryId: string | null = null;
          let brandId: string | null = null;
          let unitId: string | null = null;

          if (row.categoryName) {
            const cat = await prisma.category.findFirst({
              where: { name: { equals: row.categoryName, mode: "insensitive" } },
            });
            if (cat) categoryId = cat.id;
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
                  createdBy: session.user.id,
                },
              });
              unitId = defaultUnit.id;
            }
          }

          const existing = await prisma.item.findFirst({
            where: {
              OR: [
                row.code ? { code: row.code } : {},
                row.barcode ? { barcode: row.barcode } : {},
                { name: { equals: row.name, mode: "insensitive" } },
              ],
            },
          });

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
              continue;
            }
            await prisma.item.update({
              where: { id: existing.id },
              data: {
                salesPrice: row.salesPrice ? Number(row.salesPrice) : existing.salesPrice,
                costPrice: row.costPrice ? Number(row.costPrice) : existing.costPrice,
                wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : existing.wholesalePrice,
                wholesaleDiscountAmount: row.wholesaleDiscountAmount ? Number(row.wholesaleDiscountAmount) : existing.wholesaleDiscountAmount,
                discount: row.discount ? Number(row.discount) : existing.discount,
                description: row.description || existing.description,
                barcode: row.barcode || existing.barcode,
                fit: row.fit || existing.fit,
                featuredImage: row.featuredImage || existing.featuredImage,
                isEnableEcom: row.isEnableEcom === "true" || row.isEnableEcom === true ? true : existing.isEnableEcom,
                trackInventory: row.trackInventory === "true" || row.trackInventory === true ? true : existing.trackInventory,
                isVatEnabled: row.isVatEnabled === "true" || row.isVatEnabled === true ? true : existing.isVatEnabled,
                vatPercentage: row.vatPercentage ? Number(row.vatPercentage) : existing.vatPercentage,
                status: row.status === "inactive" ? "inactive" : existing.status,
              },
            });
            updatedCount++;
            continue;
          }

          await prisma.item.create({
            data: {
              name: row.name,
              code: row.code || `ITM-${Date.now().toString().slice(-6)}`,
              salesPrice: row.salesPrice ? Number(row.salesPrice) : 0,
              costPrice: row.costPrice ? Number(row.costPrice) : 0,
              wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : null,
              wholesaleDiscountAmount: row.wholesaleDiscountAmount ? Number(row.wholesaleDiscountAmount) : null,
              discount: row.discount ? Number(row.discount) : null,
              description: row.description || null,
              barcode: row.barcode || null,
              fit: row.fit || null,
              featuredImage: row.featuredImage || null,
              isEnableEcom: row.isEnableEcom === "true" || row.isEnableEcom === true,
              trackInventory: row.trackInventory === "true" || row.trackInventory === true,
              isVatEnabled: row.isVatEnabled === "true" || row.isVatEnabled === true,
              vatPercentage: row.vatPercentage ? Number(row.vatPercentage) : 0,
              status: row.status === "inactive" ? "inactive" : "active",
              itemType: ItemType.READY_PRODUCT,
              categoryId,
              brandId,
              unitId,
              createdBy: session.user.id,
            },
          });
          createdCount++;
        } else if (config.targetModel === "Employee") {
          const existing = await prisma.employee.findFirst({
            where: {
              OR: [
                row.employeeCode ? { employeeCode: row.employeeCode } : {},
                row.email ? { email: row.email } : {},
                row.nationalId ? { nationalId: row.nationalId } : {},
              ],
            },
          });

          const parsedEmpType = row.employmentType
            ? (Object.values(EmploymentType).includes(row.employmentType.toUpperCase()) ? row.employmentType.toUpperCase() as EmploymentType : null)
            : null;

          if (existing) {
            if (duplicateStrategy === "skip") {
              skippedCount++;
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
