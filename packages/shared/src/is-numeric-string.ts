const NUMERIC_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

export const isNumericString = (value: string): boolean => NUMERIC_STRING_PATTERN.test(value);
