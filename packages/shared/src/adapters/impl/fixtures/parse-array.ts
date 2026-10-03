export const parseArray = <T>(value: unknown, parseItem: (item: unknown) => T): T[] => {
  if (!Array.isArray(value)) {
    throw new Error('Expected a JSON array');
  }
  const value_: unknown[] = value;
  return value_.map(parseItem);
};
