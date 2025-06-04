import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Class, Course, User } from '@shared/schema';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileVideo, 
  FileText, 
  Loader2, 
  MoreVertical, 
  Plus, 
  Edit, 
  Trash2, 
  Video, 
  File
} from 'lucide-react';

// Form schema for creating/editing classes
const classFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string().min(1, "Course is required"),
  content: z.object({
    type: z.enum(["video", "document"]),
    url: z.string().min(1, "Content URL is required"),
  }),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

export default function Classes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  
  // Fetch classes
  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/admin/classes'],
  });

  // Fetch courses for dropdown
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });

  // Fetch students for assignment
  const { data: students, isLoading: isLoadingStudents } = useQuery<User[]>({
    queryKey: ['/api/admin/users', { role: 'student' }],
  });

  // Setup form with validation
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      title: '',
      description: '',
      courseId: '',
      content: {
        type: 'video',
        url: '',
      },
      visibility: 'public',
      assignedTo: [],
    },
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (selectedClass) {
      form.reset({
        title: selectedClass.title,
        description: selectedClass.description || '',
        courseId: selectedClass.courseId,
        content: {
          type: selectedClass.content.type === 'video' || selectedClass.content.type === 'document' 
            ? selectedClass.content.type 
            : 'video',
          url: selectedClass.content.url
        },
        visibility: selectedClass.visibility,
        assignedTo: selectedClass.assignedTo || [],
      });
    } else {
      form.reset({
        title: '',
        description: '',
        courseId: '',
        content: {
          type: 'video',
          url: '',
        },
        visibility: 'public',
        assignedTo: [],
      });
    }
  }, [selectedClass, form]);

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (data: ClassFormValues) => apiRequest('POST', '/api/admin/classes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      toast({
        title: 'Success',
        description: 'Class created successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error creating class',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: (data: { id: string; classData: ClassFormValues }) => 
      apiRequest('PATCH', `/api/admin/classes/${data.id}`, data.classData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      toast({
        title: 'Success',
        description: 'Class updated successfully',
      });
      setSelectedClass(null);
    },
    onError: (error) => {
      toast({
        title: 'Error updating class',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/classes'] });
      toast({
        title: 'Success',
        description: 'Class deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting class',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: ClassFormValues) => {
    if (selectedClass) {
      updateClassMutation.mutate({ id: selectedClass._id as string, classData: data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  // Find course name by ID
  const getCourseName = (courseId: string) => {
    const course = courses?.find(c => c._id === courseId);
    return course?.title || 'Unknown Course';
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Highlighted Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-600">
                  Class Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Manage video and document classes
                </p>
              </div>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Class
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Classes</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">All video and document classes organized by course</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingClasses ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                        <TableHead className="font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Course</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Visibility</TableHead>
                        <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes && classes.length > 0 ? (
                        classes.map((classItem) => (
                          <TableRow 
                            key={classItem._id}
                            className="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <TableCell className="font-medium">{classItem.title}</TableCell>
                            <TableCell>{getCourseName(classItem.courseId)}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {classItem.content.type === 'video' ? (
                                  <>
                                    <FileVideo className="h-4 w-4 mr-2 text-primary" />
                                    <span>Video</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 mr-2 text-secondary" />
                                    <span>Document</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${
                                classItem.visibility === 'public' 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' 
                                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                              }`}>
                                {classItem.visibility === 'public' ? 'Public' : 'Private'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  <DropdownMenuItem 
                                    onClick={() => setSelectedClass(classItem)}
                                    className="cursor-pointer transition-colors duration-200"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600 cursor-pointer transition-colors duration-200"
                                    onClick={() => deleteClassMutation.mutate(classItem._id as string)}
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
                          <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <FileVideo className="h-12 w-12 opacity-20" />
                              <h3 className="text-lg font-medium">No classes found</h3>
                              <p className="text-sm">Create your first class to get started</p>
                              <Button 
                                variant="outline" 
                                className="mt-2 shadow-sm hover:shadow-md transition-shadow"
                                onClick={() => setIsDialogOpen(true)}
                              >
                                <Plus className="mr-2 h-4 w-4" /> Create Class
                              </Button>
                            </div>
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

      {/* Create/Edit Class Dialog */}
      <Dialog open={isDialogOpen || !!selectedClass} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setSelectedClass(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedClass ? 'Edit Class' : 'Create New Class'}
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                {selectedClass 
                  ? 'Update class details and content' 
                  : 'Add a new video or document class to a course'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6 overflow-y-auto pr-6 -mr-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Class Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="JavaScript Arrays & Objects" 
                        {...field} 
                        className="focus-visible:ring-blue-500 transition-colors duration-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Learn about arrays and objects in JavaScript"
                        className="resize-none focus-visible:ring-blue-500 transition-colors duration-200"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Course</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCourses ? (
                          <div className="flex justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : courses && courses.length > 0 ? (
                          courses.map((course) => (
                            <SelectItem 
                              key={course._id} 
                              value={course._id as string}
                              className="cursor-pointer transition-colors duration-200"
                            >
                              {course.title}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
                            No courses available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Content Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem 
                          value="video"
                          className="cursor-pointer transition-colors duration-200"
                        >
                          <div className="flex items-center">
                            <Video className="h-4 w-4 mr-2" />
                            <span>Video</span>
                          </div>
                        </SelectItem>
                        <SelectItem 
                          value="document"
                          className="cursor-pointer transition-colors duration-200"
                        >
                          <div className="flex items-center">
                            <File className="h-4 w-4 mr-2" />
                            <span>Document</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content.url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {form.watch('content.type') === 'video' ? 'Video URL' : 'Document URL'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={form.watch('content.type') === 'video' 
                          ? "https://example.com/video.mp4" 
                          : "https://example.com/document.pdf"}
                        {...field} 
                        className="focus-visible:ring-blue-500 transition-colors duration-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Visibility</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem 
                          value="public"
                          className="cursor-pointer transition-colors duration-200"
                        >
                          Public (all students)
                        </SelectItem>
                        <SelectItem 
                          value="private"
                          className="cursor-pointer transition-colors duration-200"
                        >
                          Private (Admins only)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t px-6 pb-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedClass(null);
              }}
              className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createClassMutation.isPending || updateClassMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {(createClassMutation.isPending || updateClassMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {selectedClass ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
