import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

// Used to keep /auth/login's response time the same whether or not the email is registered.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('tsunade-timing-safe-placeholder', SALT_ROUNDS);
