// eslint-disable-next-line import-x/no-unresolved -- types-only package; tsc resolves it, the lint resolver doesn't
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    userId: string;
  }
}
