const CONTROL_CHAR_PATTERN = /[\p{Cc}\p{Cf}]/u;

export const isNonEmptyString = (value: string, maxLength: number): boolean =>
  value.trim().length > 0 && value.length <= maxLength && !CONTROL_CHAR_PATTERN.test(value);
