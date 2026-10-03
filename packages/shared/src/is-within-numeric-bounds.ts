export const isWithinNumericBounds = (value: string, precision: number, scale: number): boolean => {
  const unsigned = value.startsWith('-') ? value.slice(1) : value;
  const [integerPart = '', fractionalPart = ''] = unsigned.split('.');
  const digits = integerPart.replace(/^0+(?=\d)/, '');
  return digits.length <= precision - scale && fractionalPart.length <= scale;
};
