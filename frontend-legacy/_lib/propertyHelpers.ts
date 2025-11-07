import { Property } from '@/types/models';

/**
 * Helper functions for property data handling
 */

/**
 * Get the primary address line from a property, handling both
 * old (addressLine1) and new (address1) field names for backward compatibility
 */
export function getPropertyAddress1(property: Property): string {
  return property.address1 || property.addressLine1 || '';
}

/**
 * Get the secondary address line from a property, handling both
 * old (addressLine2) and new (address2) field names for backward compatibility
 */
export function getPropertyAddress2(property: Property): string | undefined {
  return property.address2 || property.addressLine2;
}

/**
 * Get the full formatted address for a property
 */
export function getPropertyFullAddress(property: Property): string {
  const parts = [
    getPropertyAddress1(property),
    getPropertyAddress2(property),
    property.city,
    property.postcode,
  ].filter(Boolean);
  
  return parts.join(', ');
}
