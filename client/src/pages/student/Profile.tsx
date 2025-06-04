import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { User } from '@shared/schema';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, User as UserIcon, Key, Mail, GraduationCap, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Form schema for profile update
const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// Form schema for password update
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = {
  name: string;
};

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<User>({
    queryKey: ['/api/student/profile'],
  });


  // Setup form with validation for profile
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // Setup form with validation for password
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Set form values when profile data is loaded
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
      });
    }
  }, [profile, profileForm]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => apiRequest('PATCH', '/api/student/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating profile',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => apiRequest('PATCH', '/api/student/profile/password', data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating password',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Profile form submission handler
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Password form submission handler
  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate(data);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!profile?.name) return 'U';
    
    const names = profile.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-4 border-white/20">
                <AvatarFallback className="bg-white/20 text-white text-2xl">
                  {isLoadingProfile ? <Loader2 className="h-8 w-8 animate-spin" /> : getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-3xl font-bold mb-2">{profile?.name || 'Loading...'}</h2>
                <p className="text-blue-100 flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Student Account
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-blue-100 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                {profile?.email || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-[600px] bg-white dark:bg-gray-800 p-1 rounded-lg shadow-md">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300"
            >
              General
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300"
            >
              Security
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProfile ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input 
                                  {...field} 
                                  className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <Mail className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{profile?.email}</p>
                            <p className="text-xs mt-1">Email can only be changed by administrator</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white transition-all duration-300 hover:scale-105"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Password
                </CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                type="password" 
                                {...field} 
                                className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                type="password" 
                                {...field} 
                                className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Password must be at least 6 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                type="password" 
                                {...field} 
                                className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white transition-all duration-300 hover:scale-105"
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Account Security
                </CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <GraduationCap className="h-6 w-6 text-blue-500" />
                      <h4 className="font-medium text-lg">Role</h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Student
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="h-6 w-6 text-blue-500" />
                      <h4 className="font-medium text-lg">Last Login</h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <Key className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    If you notice any suspicious activity on your account, please contact your instructor or administrator immediately.
                  </p>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </StudentLayout>
  );
}