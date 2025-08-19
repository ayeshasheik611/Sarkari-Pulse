import { FrontendScheme } from '../services/schemeAdapter';

export const getSectors = (schemes: FrontendScheme[]): string[] => {
  const sectors = schemes.map(scheme => scheme.sector);
  return Array.from(new Set(sectors)).sort();
};

export const getMinistries = (schemes: FrontendScheme[]): string[] => {
  const ministries = schemes.map(scheme => scheme.ministry);
  return Array.from(new Set(ministries)).sort();
};

export const getStatuses = (schemes: FrontendScheme[]): string[] => {
  const statuses = schemes.map(scheme => scheme.status);
  return Array.from(new Set(statuses)).sort();
};

export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  } else {
    return `₹${amount.toLocaleString()}`;
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(1)} Cr`;
  } else if (num >= 100000) {
    return `${(num / 100000).toFixed(1)} L`;
  } else {
    return num.toLocaleString();
  }
};