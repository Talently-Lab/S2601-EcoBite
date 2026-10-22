// NOTE: Extends Express request typings with authenticated user data.

import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: UserRole;
    }
  }
}

export {};
