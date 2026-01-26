/**
 * Custom Error Classes for Accounting Operations
 * 
 * These errors provide clear, user-facing messages when accounting
 * configuration is missing or invalid.
 */

/**
 * Thrown when a required account mapping is missing from settings
 */
export class AccountMappingMissingError extends Error {
  constructor(
    public readonly accountKey: string,
    public readonly operation: string
  ) {
    super(
      `Account mapping for "${accountKey}" is required for ${operation} operations. ` +
      `Please configure this account in Settings > Accounting.`
    );
    this.name = 'AccountMappingMissingError';
    Object.setPrototypeOf(this, AccountMappingMissingError.prototype);
  }
}

/**
 * Thrown when an account ID is invalid or doesn't exist
 */
export class InvalidAccountError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly accountKey: string
  ) {
    super(
      `The account configured for "${accountKey}" (ID: ${accountId}) is invalid or does not exist. ` +
      `Please update your accounting settings.`
    );
    this.name = 'InvalidAccountError';
    Object.setPrototypeOf(this, InvalidAccountError.prototype);
  }
}

/**
 * Thrown when accounting settings have not been configured at all
 */
export class AccountingSettingsNotConfiguredError extends Error {
  constructor(public readonly operation: string) {
    super(
      `Accounting settings have not been configured. ` +
      `Please configure account mappings in Settings > Accounting before performing ${operation} operations.`
    );
    this.name = 'AccountingSettingsNotConfiguredError';
    Object.setPrototypeOf(this, AccountingSettingsNotConfiguredError.prototype);
  }
}

/**
 * Thrown when an account is a control account but shouldn't be used directly
 */
export class ControlAccountError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly accountName: string
  ) {
    super(
      `The account "${accountName}" is a control account and cannot be used directly in transactions. ` +
      `Please select a sub-account instead.`
    );
    this.name = 'ControlAccountError';
    Object.setPrototypeOf(this, ControlAccountError.prototype);
  }
}

/**
 * Thrown when an account type doesn't match the expected type for an operation
 */
export class AccountTypeMismatchError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly expectedType: string,
    public readonly actualType: string
  ) {
    super(
      `Account type mismatch: Expected ${expectedType} but got ${actualType}. ` +
      `Please configure the correct account type in Settings > Accounting.`
    );
    this.name = 'AccountTypeMismatchError';
    Object.setPrototypeOf(this, AccountTypeMismatchError.prototype);
  }
}
