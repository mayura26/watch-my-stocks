import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      theme: string;
      notificationsEnabled: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    theme: string;
    notificationsEnabled: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    firstName: string;
    lastName: string;
    theme: string;
    notificationsEnabled: boolean;
  }
}

