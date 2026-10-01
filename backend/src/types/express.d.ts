// NOTE: Extends Express request typings with authenticated user data.

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
    }
  }
}

export {};
