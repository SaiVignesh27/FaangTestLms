import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Course, User } from '@shared/schema';
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
import CourseCard from '@/components/dashboard/CourseCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, School } from 'lucide-react';

// Form schema for creating/editing courses
const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  visibility: z.enum(["public", "private", "restricted"]),
  assignedTo: z.array(z.string()).optional(),
  instructor: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    initials: z.string().max(2).optional(),
  }).optional(),
  learningObjectives: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  duration: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

export default function Courses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSkillLevel, setFilterSkillLevel] = useState('all');

  // Fetch courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });

  // Fetch students for assignment
  const { data: students, isLoading: isLoadingStudents } = useQuery<User[]>({
    queryKey: ['/api/admin/users', { role: 'student' }],
  });

  const categoryOptions = React.useMemo(() => {
    if (!courses) return [];
    const categories = new Set(courses.map(c => c.category || '').filter(Boolean));
    return ['all', ...Array.from(categories)];
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    if (!courses) return [];
    return courses.filter(course => {
      const searchMatch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory === 'all' || course.category === filterCategory;
      const skillLevelMatch = filterSkillLevel === 'all' || course.skillLevel === filterSkillLevel;
      return searchMatch && categoryMatch && skillLevelMatch;
    });
  }, [courses, searchTerm, filterCategory, filterSkillLevel]);

  // Setup form with validation
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      visibility: 'public',
      assignedTo: [],
      instructor: {
        name: '',
        title: '',
        initials: '',
      },
      learningObjectives: [],
      prerequisites: [],
      skillLevel: 'beginner',
      duration: '',
    },
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (selectedCourse) {
      form.reset({
        title: selectedCourse.title,
        description: selectedCourse.description || '',
        category: selectedCourse.category || '',
        visibility: selectedCourse.visibility,
        assignedTo: selectedCourse.assignedTo || [],
        instructor: selectedCourse.instructor || { name: '', title: '', initials: '' },
        learningObjectives: selectedCourse.learningObjectives || [],
        prerequisites: selectedCourse.prerequisites || [],
        skillLevel: selectedCourse.skillLevel || 'beginner',
        duration: selectedCourse.duration || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        category: '',
        visibility: 'public',
        assignedTo: [],
        instructor: {
          name: '',
          title: '',
          initials: '',
        },
        learningObjectives: [],
        prerequisites: [],
        skillLevel: 'beginner',
        duration: '',
      });
    }
  }, [selectedCourse, form]);

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CourseFormValues) => apiRequest('POST', '/api/admin/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/courses'] });
      toast({
        title: 'Success',
        description: 'Cluster created successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error creating cluster',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: (data: { id: string; courseData: CourseFormValues }) => 
      apiRequest('PATCH', `/api/admin/courses/${data.id}`, data.courseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/courses'] });
      toast({
        title: 'Success',
        description: 'Cluster updated successfully',
      });
      setSelectedCourse(null);
    },
    onError: (error) => {
      toast({
        title: 'Error updating cluster',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/courses'] });
      toast({
        title: 'Success',
        description: 'Cluster deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting cluster',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: CourseFormValues) => {
    if (selectedCourse) {
      updateCourseMutation.mutate({ id: selectedCourse._id as string, courseData: data });
    } else {
      createCourseMutation.mutate(data);
    }
  };

  // Get category color based on category name
  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'javascript':
        return 'bg-primary-light bg-opacity-10 text-primary';
      case 'react':
        return 'bg-secondary bg-opacity-10 text-secondary';
      case 'node.js':
        return 'bg-green-500 bg-opacity-10 text-green-500';
      case 'python':
        return 'bg-blue-500 bg-opacity-10 text-blue-500';
      case 'database':
        return 'bg-purple-500 bg-opacity-10 text-purple-500';
      default:
        return 'bg-gray-500 bg-opacity-10 text-gray-500';
    }
  };

  const getInstructorDetails = (course: Course) => {
    return {
      name: course.instructor?.name || 'Unknown Instructor',
      initials: course.instructor?.initials || 'UI',
      title: course.instructor?.title
    };
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
                  Cluster Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Create and manage learning clusters
                </p>
              </div>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Cluster
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Card className="p-4 sm:p-6 bg-white dark:bg-gray-800/50 rounded-xl shadow-md border dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Search by Title</Label>
                <Input
                  placeholder="e.g. React Hooks"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Skill Level</Label>
                <Select value={filterSkillLevel} onValueChange={setFilterSkillLevel}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select a skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          {isLoadingCourses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses && filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <div key={course._id} className="relative group transition-all duration-200 hover:scale-[1.02]">
                    <CourseCard
                      id={course._id as string}
                      title={course.title}
                      description={course.description || ''}
                      category={course.category || 'General'}
                      categoryColor={getCategoryColor(course.category || '')}
                      students={(course.assignedTo?.length || 0)}
                      instructor={getInstructorDetails(course)}
                      rating={4.8}
                      skillLevel={course.skillLevel}
                      duration={course.duration}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
                      <Button 
                        variant="secondary" 
                        className="mr-2 shadow-sm hover:shadow-md transition-shadow"
                        onClick={() => setSelectedCourse(course)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        onClick={() => deleteCourseMutation.mutate(course._id as string)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <School className="h-12 w-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">No matching clusters found</h3>
                  <p className="text-sm">Try adjusting your filters or create a new cluster</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Course Dialog */}
      <Dialog open={isDialogOpen || !!selectedCourse} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setSelectedCourse(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedCourse ? 'Edit cluster' : 'Create New cluster'}
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                {selectedCourse 
                  ? 'Update cluster details and student allotment' 
                  : 'Fill out the form to create a new cluster'}
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
                    <FormLabel className="text-sm font-medium">Cluster Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="JavaScript Fundamentals" 
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A comprehensive cluster covering JavaScript basics to advanced concepts"
                        className="resize-none focus-visible:ring-blue-500"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Category</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="JavaScript" 
                          {...field} 
                          value={field.value || ''}
                          className="focus-visible:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instructor.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Instructor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter instructor name" {...field} className="focus-visible:ring-blue-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructor.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Instructor Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Lead Instructor" {...field} className="focus-visible:ring-blue-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructor.initials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Instructor Initials</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. JD" maxLength={2} {...field} className="focus-visible:ring-blue-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="learningObjectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Learning Objectives (one per line)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter learning objectives" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.split('\n'))}
                        value={field.value?.join('\n')}
                        className="resize-none focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prerequisites"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Prerequisites (one per line)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter prerequisites" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.split('\n'))}
                        value={field.value?.join('\n')}
                        className="resize-none focus-visible:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Skill Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-blue-500">
                          <SelectValue placeholder="Select skill level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 4 weeks" {...field} className="focus-visible:ring-blue-500" />
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
                        <SelectTrigger className="focus-visible:ring-blue-500">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public (All Students)</SelectItem>
                        <SelectItem value="private">Private (Selected Students Only)</SelectItem>
                        <SelectItem value="restricted">Restricted (Admins only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('visibility') === 'private' && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Assign to Students</Label>
                  <div className="mt-2 border rounded-md p-4 max-h-60 overflow-y-auto shadow-sm">
                    {isLoadingStudents ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : students && students.length > 0 ? (
                      <div className="space-y-2">
                        {students.map((student) => (
                          <div key={student._id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`student-${student._id}`}
                              checked={form.watch('assignedTo')?.includes(student._id as string)}
                              onCheckedChange={(checked) => {
                                const assignedTo = form.getValues('assignedTo') || [];
                                if (checked) {
                                  form.setValue('assignedTo', [...assignedTo, student._id as string]);
                                } else {
                                  form.setValue('assignedTo', assignedTo.filter(id => id !== student._id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`student-${student._id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {student.name} ({student.email})
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No students found</p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </Form>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t px-6 pb-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedCourse(null);
              }}
              className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-shadow"
            >
              {(createCourseMutation.isPending || updateCourseMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {selectedCourse ? 'Update Cluster' : 'Create Cluster'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}