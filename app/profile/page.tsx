'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Calendar, Bell, Palette, Edit, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  theme: string;
  notificationsEnabled: boolean;
  createdAt?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch fresh user data from the database
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;
      
      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session?.user]);

  if (status === 'loading' || isLoadingProfile) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-muted rounded mb-4"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <p className="text-muted-foreground mb-4">
              You need to be signed in to view your profile.
            </p>
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const user = userProfile || (session.user as any);

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Profile</h1>
              <p className="text-muted-foreground">
                Manage your personal information and preferences
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <p className="font-medium">{user.email}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </div>
                  <p className="font-medium">
                    Recently
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Your app preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span className="font-medium">Theme</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current theme preference
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {user.theme || 'auto'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="font-medium">Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive alert notifications
                  </p>
                </div>
                <Badge variant={user.notificationsEnabled ? "default" : "secondary"}>
                  {user.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your account and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/settings" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile & Settings
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/alerts" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Manage Alerts
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  View Notifications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
