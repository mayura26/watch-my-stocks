declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      theme: 'auto' | 'light' | 'dark';
      notificationsEnabled: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    theme: 'auto' | 'light' | 'dark';
    notificationsEnabled: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    firstName: string;
    lastName: string;
    theme: 'auto' | 'light' | 'dark';
    notificationsEnabled: boolean;
  }
}

