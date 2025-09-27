import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import client from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user in database
          const result = await client.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [credentials.email]
          });

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];
          
          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password as string);
          
          if (!isValid) {
            return null;
          }
          
          return {
            id: user.id as string,
            email: user.email as string,
            name: `${user.first_name} ${user.last_name}`.trim(),
            firstName: user.first_name as string,
            lastName: user.last_name as string,
            theme: user.theme as string,
            notificationsEnabled: Boolean(user.notifications_enabled),
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.theme = user.theme;
        token.notificationsEnabled = user.notificationsEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.theme = token.theme as string;
        session.user.notificationsEnabled = token.notificationsEnabled as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

