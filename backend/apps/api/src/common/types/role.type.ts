/**
 * User role types
 * SQLite does not support enums, so we use string union types
 */
export type Role = 'LANDLORD' | 'TENANT' | 'OPS' | 'CONTRACTOR';

/**
 * Check if a string is a valid role
 */
export function isValidRole(value: string): value is Role {
  return ['LANDLORD', 'TENANT', 'OPS', 'CONTRACTOR'].includes(value);
}
