import { and, eq, type AnyColumn, type SQL } from 'drizzle-orm';

export const findOwned = <T>(
  findFirst: (args: { where: SQL | undefined }) => Promise<T | undefined>,
  idColumn: AnyColumn,
  userIdColumn: AnyColumn,
  id: string,
  userId: string,
): Promise<T | undefined> => findFirst({ where: and(eq(idColumn, id), eq(userIdColumn, userId)) });
