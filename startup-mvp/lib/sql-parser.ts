/**
 * SQL Parser for backup/restore operations
 * Handles proper parsing of SQL statements with quoted strings, escaped quotes, etc.
 */

/**
 * Split SQL content into individual statements
 * Properly handles:
 * - Single quotes with escaped quotes ('It''s good')
 * - Double quotes
 * - Semicolons inside quoted strings
 * - JSON values in strings
 */
export function splitSqlStatements(sqlContent: string): string[] {
  const statements: string[] = [];
  let currentStatement = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < sqlContent.length) {
    const char = sqlContent[i];
    const nextChar = i + 1 < sqlContent.length ? sqlContent[i + 1] : null;

    // Handle escaped quotes in single-quoted strings
    if (char === "'" && inSingleQuote && !inDoubleQuote) {
      if (nextChar === "'") {
        // Escaped single quote ('')
        currentStatement += "''";
        i += 2;
        continue;
      } else {
        // End of single-quoted string
        inSingleQuote = false;
        currentStatement += char;
        i++;
        continue;
      }
    }

    // Handle escaped quotes in double-quoted strings
    if (char === '"' && inDoubleQuote && !inSingleQuote) {
      if (nextChar === '"') {
        // Escaped double quote ("")
        currentStatement += '""';
        i += 2;
        continue;
      } else {
        // End of double-quoted string
        inDoubleQuote = false;
        currentStatement += char;
        i++;
        continue;
      }
    }

    // Start of single-quoted string
    if (char === "'" && !inSingleQuote && !inDoubleQuote) {
      inSingleQuote = true;
      currentStatement += char;
      i++;
      continue;
    }

    // Start of double-quoted string
    if (char === '"' && !inSingleQuote && !inDoubleQuote) {
      inDoubleQuote = true;
      currentStatement += char;
      i++;
      continue;
    }

    // Semicolon outside of quotes = statement separator
    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = "";
      i++;
      continue;
    }

    // Regular character
    currentStatement += char;
    i++;
  }

  // Add remaining statement if any
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Parse INSERT statement to extract table name
 */
export function parseInsertTable(statement: string): string | null {
  // Match: INSERT INTO "TableName" or INSERT INTO TableName
  const match = statement.match(/INSERT\s+INTO\s+"?(\w+)"?/i);
  return match ? match[1] : null;
}

/**
 * Check if a statement is an INSERT statement
 */
export function isInsertStatement(statement: string): boolean {
  return statement.trim().toLowerCase().startsWith("insert");
}

/**
 * Group INSERT statements by table name
 */
export function groupStatementsByTable(statements: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const statement of statements) {
    if (isInsertStatement(statement)) {
      const table = parseInsertTable(statement);
      if (table) {
        if (!grouped.has(table)) {
          grouped.set(table, []);
        }
        grouped.get(table)!.push(statement);
      }
    }
  }

  return grouped;
}

/**
 * Define table dependency order for restore
 * Tables are ordered so dependencies are restored before dependents
 */
export const TABLE_DEPENDENCY_ORDER = [
  // Level 1: No dependencies
  "User",
  
  // Level 2: Depend on User only
  "Account",
  "Session",
  "VerificationToken",
  "PasswordReset",
  "UserLog",
  "File",
  "Notification",
  
  // Level 3: No dependencies or depend on User
  "Unit",
  "Category",
  "Organization",
  "Client",
  "Supplier",
  "ModuleGroup",
  "CoverLetter",
  "Settings",
  
  // Level 4: Depend on Level 3
  "Item", // depends on Unit
  "ItemCategory", // depends on Item, Category
  "ModuleGroupItem", // depends on ModuleGroup
  
  // Level 5: Depend on Level 4
  "Quotation", // depends on Client, Organization, User
  "Section", // depends on Quotation, User
  "ItemGroup", // depends on Section, ModuleGroup
  "CategoryGroup", // depends on Section, Category
  
  // Level 6: Depend on Level 5
  "QuotationItem", // depends on Item, ModuleGroupItem, Section, ItemGroup, CategoryGroup
] as const;

/**
 * Get execution order for tables based on dependencies
 */
export function getTableExecutionOrder(tables: string[]): string[] {
  const order: string[] = [];
  const tableSet = new Set(tables);

  // Add tables in dependency order if they exist in the set
  for (const table of TABLE_DEPENDENCY_ORDER) {
    if (tableSet.has(table)) {
      order.push(table);
    }
  }

  // Add any remaining tables that weren't in the dependency list
  for (const table of tables) {
    if (!order.includes(table)) {
      order.push(table);
    }
  }

  return order;
}

