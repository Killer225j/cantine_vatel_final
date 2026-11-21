export const sanitizePhone = (val: string): string => {
  return val.replace(/[^\d\s]/g, '').slice(0, 14);
};

export const sanitizeName = (val: string): string => {
  return val.trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
};

export const sanitizeEmail = (val: string): string => {
  return val.trim().toLowerCase();
};

export const sanitizePassword = (val: string): string => {
  return val.replace(/\s/g, '');
};
