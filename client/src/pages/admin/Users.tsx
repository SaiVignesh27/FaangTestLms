import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User, Course } from '@shared/schema';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreVertical, Plus, User as UserIcon, Trash2, Edit } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

// Form schema for creating/editing users
const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["admin", "student"]),
  enrolledCourses: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  
  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch courses for assignment
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });

  // Setup form with validation
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'student',
    },
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (selectedUser) {
      form.reset({
        name: selectedUser.name,
        email: selectedUser.email,
        password: undefined, // Don't prefill password
        role: selectedUser.role,
        enrolledCourses: selectedUser.enrolledCourses || [],
      });
      setDialogError(null);
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'student',
        enrolledCourses: [],
      });
      setDialogError(null);
    }
  }, [selectedUser, form]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormValues) => apiRequest('POST', '/api/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsAddDialogOpen(false);
      setDialogError(null);
    },
    onError: (error) => {
      // Now that the server sends a specific message, we can just check for it.
      const errMsg = (error as Error).message;
      if (errMsg.includes('A user with this email already exists.')) {
        form.setError('email', {
          type: 'manual',
          message: 'A user with this email already exists.',
        });
        setDialogError(null);
      } else {
        setDialogError('An unexpected error occurred. Please try again or contact support.');
      }
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; userData: Partial<UserFormValues> }) => 
      apiRequest('PATCH', `/api/admin/users/${data.id}`, data.userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setSelectedUser(null);
      setDialogError(null);
    },
    onError: (error) => {
      // Now that the server sends a specific message, we can just check for it.
      const errMsg = (error as Error).message;
      if (errMsg.includes('A user with this email already exists.')) {
        form.setError('email', {
          type: 'manual',
          message: 'A user with this email already exists.',
        });
        setDialogError(null);
      } else {
        setDialogError('An unexpected error occurred. Please try again or contact support.');
      }
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting user',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: UserFormValues) => {
    if (selectedUser) {
      // Only send password if filled
      const updateData: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        enrolledCourses: data.enrolledCourses,
      };
      if (data.password && data.password.length >= 6) {
        updateData.password = data.password;
      }
      updateUserMutation.mutate({ id: selectedUser._id as string, userData: updateData });
    } else {
      // On create, password is required
      createUserMutation.mutate({
        ...data,
        password: data.password || '',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Highlighted Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-white">User Management</h2>
                <p className="text-sm text-blue-100">Manage administrators and students</p>
              </div>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 dark:bg-blue-900 dark:text-white dark:hover:bg-blue-800"
              >
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage all system users</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead className="w-[40%]">Email</TableHead>
                        <TableHead className="w-[20%]">Role</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((user) => (
                          <TableRow key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-500" />
                                {user.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{user.email}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                user.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Student'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  <DropdownMenuItem 
                                    onClick={() => setSelectedUser(user)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                    onClick={() => deleteUserMutation.mutate(user._id as string)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 gap-0 shadow-2xl max-h-[90vh] overflow-y-auto">
          {dialogError && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-2 rounded">
              <strong>Warning:</strong> {dialogError}
            </div>
          )}
          <div className="bg-gradient-to-r from-white-600 to-white-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-Black">Add New User</DialogTitle>
              <DialogDescription className="text-black-100">
                Create a new administrator or student account
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="user@example.com" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {selectedUser ? 'New Password (optional)' : 'Password'}
                      {!selectedUser && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                        required={!selectedUser}
                      />
                    </FormControl>
                    <FormMessage />
                    {selectedUser && (
                      <div className="text-xs text-gray-500 mt-1">Leave blank to keep current password</div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Course assignment for students */}
              {form.watch('role') === 'student' && (
                <div>
                  <FormLabel className="text-sm font-medium">Assign to Courses</FormLabel>
                  <div className="mt-2 border rounded-md p-4 max-h-60 overflow-y-auto shadow-sm">
                    {isLoadingCourses ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : courses && courses.length > 0 ? (
                      <div className="space-y-2">
                        {courses.map((course) => {
                          const isPublic = course.visibility === 'public';
                          const checked = form.watch('enrolledCourses')?.includes(course._id as string);
                          return (
                            <div key={course._id} className="flex items-center space-x-2">
                              {isPublic ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <input
                                          type="checkbox"
                                          id={`course-${course._id}`}
                                          checked={checked}
                                          disabled
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      All students are always assigned to public courses.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <input
                                  type="checkbox"
                                  id={`course-${course._id}`}
                                  checked={checked}
                                  onChange={(e) => {
                                    const enrolled = form.getValues('enrolledCourses') || [];
                                    if (e.target.checked) {
                                      form.setValue('enrolledCourses', [...enrolled, course._id as string]);
                                    } else {
                                      form.setValue('enrolledCourses', enrolled.filter(id => id !== course._id));
                                    }
                                  }}
                                />
                              )}
                              <label htmlFor={`course-${course._id}`} className="text-sm">
                                {course.title}
                                {isPublic && (
                                  <span className="ml-2 text-xs text-blue-500">(Public)</span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No courses found</p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-shadow"
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 gap-0 shadow-2xl max-h-[90vh] overflow-y-auto">
          {dialogError && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-2 rounded">
              <strong>Warning:</strong> {dialogError}
            </div>
          )}
          <div className="bg-gradient-to-r from-white-600 to-white-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-Black">Edit User</DialogTitle>
              <DialogDescription className="text-black-100">
                Update user information
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="user@example.com" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {selectedUser ? 'New Password (optional)' : 'Password'}
                      {!selectedUser && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="focus-visible:ring-blue-500"
                        required={!selectedUser}
                      />
                    </FormControl>
                    <FormMessage />
                    {selectedUser && (
                      <div className="text-xs text-gray-500 mt-1">Leave blank to keep current password</div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Course assignment for students */}
              {form.watch('role') === 'student' && (
                <div>
                  <FormLabel className="text-sm font-medium">Assign to Courses</FormLabel>
                  <div className="mt-2 border rounded-md p-4 max-h-60 overflow-y-auto shadow-sm">
                    {isLoadingCourses ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : courses && courses.length > 0 ? (
                      <div className="space-y-2">
                        {courses.map((course) => {
                          const isPublic = course.visibility === 'public';
                          const checked = form.watch('enrolledCourses')?.includes(course._id as string);
                          return (
                            <div key={course._id} className="flex items-center space-x-2">
                              {isPublic ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <input
                                          type="checkbox"
                                          id={`course-${course._id}`}
                                          checked={checked}
                                          disabled
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      All students are always assigned to public courses.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <input
                                  type="checkbox"
                                  id={`course-${course._id}`}
                                  checked={checked}
                                  onChange={(e) => {
                                    const enrolled = form.getValues('enrolledCourses') || [];
                                    if (e.target.checked) {
                                      form.setValue('enrolledCourses', [...enrolled, course._id as string]);
                                    } else {
                                      form.setValue('enrolledCourses', enrolled.filter(id => id !== course._id));
                                    }
                                  }}
                                />
                              )}
                              <label htmlFor={`course-${course._id}`} className="text-sm">
                                {course.title}
                                {isPublic && (
                                  <span className="ml-2 text-xs text-blue-500">(Public)</span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No courses found</p>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setSelectedUser(null)}
                  className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-shadow"
                >
                  {updateUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
