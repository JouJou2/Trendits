/**
 * Lebanese numbers are 7–8 digits after the +961 country code, but customers
 * also paste local formats (03 xxx xxx / 71 xxx xxx). Keep validation permissive
 * enough for real input while still rejecting obvious junk.
 */
export const isValidPhone = (value: string): boolean => {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export const PHONE_HINT = 'e.g. 03 123 456 or +961 3 123 456';
