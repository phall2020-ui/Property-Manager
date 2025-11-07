export type Property = {
  id: string;
  name?: string;
  address: {
    line1: string;
    line2?: string;
    city?: string;
    postcode: string;
    country?: string;
  };
  lat?: number;
  lng?: number;
  units?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorAreaM2?: number;
  monthlyRent?: number;
  lastRentPaidAt?: string | null;
  annualInsurance?: number | null;
  annualServiceCharge?: number | null;
  estimatedValue?: number | null;
  occupancyRate?: number | null;
  status?: 'Occupied' | 'Vacant' | 'Let Agreed';
};

export type Tenancy = {
  id: string;
  propertyId: string;
  tenantOrgId: string;
  startDate: string;
  endDate?: string;
  rentPcm: number;
  deposit: number;
};

export type ActivityItem = {
  id: string;
  text: string;
  date?: string;
};

export type MapPin = {
  id: string;
  name: string;
  position: [number, number];
};
