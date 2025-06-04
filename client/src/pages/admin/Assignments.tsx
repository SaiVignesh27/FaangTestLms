import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Assignment, Course, User } from '@shared/schema';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

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
  FormDescription,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ClipboardList, 
  Loader2, 
  MoreVertical, 
  Plus, 
  Edit, 
  Trash2,
  CheckSquare,
  TextCursor,
  Code,
  Calendar,
  Upload,
  Minus,
  Timer
} from 'lucide-react';

// Form schema for creating/editing assignments
const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["mcq", "fill", "code"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  codeTemplate: z.string().optional(),
  testCase: z.object({
    input: z.string(),
    output: z.string(),
  }).optional(),
  points: z.number().default(1),
});

const assignmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string().min(1, "Course is required"),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
  timeWindow: z.object({
    startTime: z.date(),
    endTime: z.date(),
  }),
  timeLimit: z.number().min(1, "Time limit must be at least 1 minute").optional(),
  allowFileUpload: z.boolean().default(false),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

export default function Assignments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Fetch assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/admin/assignments'],
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
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      courseId: '',
      questions: [
        {
          text: '',
          type: 'mcq',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1,
        },
      ],
      visibility: 'public',
      assignedTo: [],
      timeWindow: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      },
      timeLimit: undefined,
      allowFileUpload: false,
    },
  });

  // Setup field array for questions
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Reset form when dialog opens/closes or selected assignment changes
  React.useEffect(() => {
    if (selectedAssignment) {
      form.reset({
        title: selectedAssignment.title,
        description: selectedAssignment.description || '',
        courseId: selectedAssignment.courseId,
        questions: selectedAssignment.questions,
        visibility: selectedAssignment.visibility,
        assignedTo: selectedAssignment.assignedTo || [],
        timeWindow: {
          startTime: new Date(selectedAssignment.timeWindow?.startTime || Date.now()),
          endTime: new Date(selectedAssignment.timeWindow?.endTime || Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        timeLimit: selectedAssignment.timeLimit,
        allowFileUpload: selectedAssignment.allowFileUpload || false,
      });
    } else if (isDialogOpen) {
      form.reset({
        title: '',
        description: '',
        courseId: '',
        questions: [
          {
            text: '',
            type: 'mcq',
            options: ['', '', '', ''],
            correctAnswer: '',
            points: 1,
          },
        ],
        visibility: 'public',
        assignedTo: [],
        timeWindow: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        },
        timeLimit: undefined,
        allowFileUpload: false,
      });
    }
  }, [selectedAssignment, isDialogOpen, form]);

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: AssignmentFormValues) => apiRequest('POST', '/api/admin/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error creating assignment',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: (data: { id: string; assignmentData: AssignmentFormValues }) => 
      apiRequest('PATCH', `/api/admin/assignments/${data.id}`, data.assignmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
      });
      setSelectedAssignment(null);
    },
    onError: (error) => {
      toast({
        title: 'Error updating assignment',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting assignment',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: AssignmentFormValues) => {
    // Process form data before submission
    // Ensure correctAnswer is properly formatted based on question type
    const processedData = {
      ...data,
      questions: data.questions.map(q => {
        if (q.type === 'mcq') {
          // Ensure correctAnswer is a string for MCQ
          return { ...q, correctAnswer: q.correctAnswer.toString() };
        }
        return q;
      })
    };

    if (selectedAssignment) {
      updateAssignmentMutation.mutate({ id: selectedAssignment._id as string, assignmentData: processedData });
    } else {
      createAssignmentMutation.mutate(processedData);
    }
  };

  // Find course name by ID
  const getCourseName = (courseId: string) => {
    const course = courses?.find(c => c._id === courseId);
    return course?.title || 'Unknown Course';
  };

  // Add a new question
  const addQuestion = () => {
    append({
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
    });
  };

  // Remove a question
  const removeQuestion = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: 'Error',
        description: 'Assignment must have at least one question',
        variant: 'destructive',
      });
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  // Check if assignment is active
  const isAssignmentActive = (assignment: Assignment) => {
    const now = new Date();
    const startTime = new Date(assignment.timeWindow?.startTime || Date.now());
    const endTime = new Date(assignment.timeWindow?.endTime || Date.now() + 7 * 24 * 60 * 60 * 1000);
    return now >= startTime && now <= endTime;
  };

  // Render question form based on type
  const renderQuestionForm = (index: number, questionType: string) => {
    switch (questionType) {
      case 'mcq':
        return (
          <>
            <FormField
              control={form.control}
              name={`questions.${index}.options.0`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Option A</FormLabel>
                  <FormControl>
                    <Input {...field} className="focus-visible:ring-blue-500 transition-colors duration-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`questions.${index}.options.1`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Option B</FormLabel>
                  <FormControl>
                    <Input {...field} className="focus-visible:ring-blue-500 transition-colors duration-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`questions.${index}.options.2`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Option C</FormLabel>
                  <FormControl>
                    <Input {...field} className="focus-visible:ring-blue-500 transition-colors duration-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`questions.${index}.options.3`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Option D</FormLabel>
                  <FormControl>
                    <Input {...field} className="focus-visible:ring-blue-500 transition-colors duration-200" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`questions.${index}.correctAnswer`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Correct Answer</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value?.toString()}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                        <SelectValue placeholder="Select correct option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0" className="cursor-pointer transition-colors duration-200">Option A</SelectItem>
                      <SelectItem value="1" className="cursor-pointer transition-colors duration-200">Option B</SelectItem>
                      <SelectItem value="2" className="cursor-pointer transition-colors duration-200">Option C</SelectItem>
                      <SelectItem value="3" className="cursor-pointer transition-colors duration-200">Option D</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 'fill':
        return (
          <FormField
            control={form.control}
            name={`questions.${index}.correctAnswer`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Correct Answer</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter the correct answer"
                    {...field}
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="focus-visible:ring-blue-500 transition-colors duration-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'code':
        // Ensure testCase and its properties are initialized
        const testCaseInput = form.watch(`questions.${index}.testCase.input`) || '';
        const testCaseOutput = form.watch(`questions.${index}.testCase.output`) || '';

        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name={`questions.${index}.codeTemplate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Code Template</FormLabel>
                  <FormDescription className="text-xs text-gray-500 dark:text-gray-400">
                    Provide a starting code template for students
                  </FormDescription>
                  <FormControl>
                    <Textarea 
                      className="font-mono h-40 focus-visible:ring-blue-500 transition-colors duration-200"
                      placeholder="// Provide a code template for students to start with"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Test Case</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Provide input and expected output for the code question
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <FormField
                  control={form.control}
                  name={`questions.${index}.testCase.input`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Input</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="font-mono h-32 focus-visible:ring-blue-500 transition-colors duration-200"
                          placeholder="Enter test input"
                          {...field}
                          value={testCaseInput} // Use the potentially initialized value
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`questions.${index}.testCase.output`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Expected Output</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="font-mono h-32 focus-visible:ring-blue-500 transition-colors duration-200"
                          placeholder="Enter expected output"
                          {...field}
                          value={testCaseOutput} // Use the potentially initialized value
                          onChange={(e) => {
                            field.onChange(e);
                            // Update correctAnswer with the output value
                            form.setValue(`questions.${index}.correctAnswer`, e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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
                  Assignment Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Create and manage grand exams with time limits
                </p>
              </div>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Assignment
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Assignments</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">All assignments organized by course</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingAssignments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments && assignments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold">Title</TableHead>
                          <TableHead className="font-semibold">Course</TableHead>
                          <TableHead className="font-semibold">Questions</TableHead>
                          <TableHead className="font-semibold">Start Time</TableHead>
                          <TableHead className="font-semibold">End Time</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => {
                          const isActive = isAssignmentActive(assignment);
                          return (
                            <TableRow key={assignment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                              <TableCell className="font-medium">{assignment.title}</TableCell>
                              <TableCell>{getCourseName(assignment.courseId)}</TableCell>
                              <TableCell>{assignment.questions.length}</TableCell>
                              <TableCell>{formatDate(new Date(assignment.timeWindow?.startTime || Date.now()))}</TableCell>
                              <TableCell>{formatDate(new Date(assignment.timeWindow?.endTime || Date.now() + 7 * 24 * 60 * 60 * 1000))}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${
                                  isActive 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' 
                                    : new Date() < new Date(assignment.timeWindow?.startTime || Date.now())
                                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                                }`}>
                                  {isActive 
                                    ? 'Active' 
                                    : new Date() < new Date(assignment.timeWindow?.startTime || Date.now())
                                      ? 'Upcoming'
                                      : 'Expired'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                                      <span className="sr-only">Open menu</span>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[160px]">
                                    <DropdownMenuItem 
                                      onClick={() => setSelectedAssignment(assignment)}
                                      className="cursor-pointer transition-colors duration-200"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600 focus:text-red-600 cursor-pointer transition-colors duration-200"
                                      onClick={() => deleteAssignmentMutation.mutate(assignment._id as string)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ClipboardList className="h-12 w-12 opacity-20" />
                        <h3 className="text-lg font-medium">No assignments found</h3>
                        <p className="text-sm">Create your first assignment to get started</p>
                        <Button 
                          variant="outline" 
                          className="mt-4 shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Create Assignment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Assignment Dialog */}
      <Dialog open={isDialogOpen || !!selectedAssignment} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setSelectedAssignment(null);
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedAssignment ? 'Edit Assignment' : 'Create New Assignment'}
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                {selectedAssignment 
                  ? 'Update assignment details and questions' 
                  : 'Create a new grand exam with time limits and file upload options'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 overflow-y-auto">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <TabsTrigger 
                    value="details"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    Assignment Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="questions"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    Questions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Assignment Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="JavaScript Final Project" 
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
                            placeholder="Comprehensive assessment of JavaScript knowledge"
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeWindow.startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Start Time</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                                onChange={(e) => {
                                  const date = e.target.value ? new Date(e.target.value) : new Date();
                                  field.onChange(date);
                                }}
                                className="focus-visible:ring-blue-500 transition-colors duration-200"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeWindow.endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">End Time</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                                onChange={(e) => {
                                  const date = e.target.value ? new Date(e.target.value) : new Date();
                                  field.onChange(date);
                                }}
                                className="focus-visible:ring-blue-500 transition-colors duration-200"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Time Limit (minutes)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Timer className="mr-2 h-4 w-4 text-gray-500" />
                              <Input
                                type="number"
                                min="1"
                                placeholder="Enter time limit in minutes"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ''}
                                className="focus-visible:ring-blue-500 transition-colors duration-200"
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Leave empty for no time limit
                          </p>
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
                  </div>
                  <FormField
                    control={form.control}
                    name="allowFileUpload"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-gray-50 dark:bg-gray-800/50">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="focus-visible:ring-blue-500 transition-colors duration-200"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium">Allow File Uploads</FormLabel>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enable students to upload files with their answers
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="questions" className="space-y-6 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Questions</h4>
                    <Button 
                      type="button" 
                      onClick={addQuestion} 
                      variant="outline"
                      className="shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Question
                    </Button>
                  </div>

                  <Accordion type="multiple" className="w-full">
                    {fields.map((field, index) => (
                      <AccordionItem 
                        key={field.id} 
                        value={`question-${index}`}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 transition-all duration-200"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-2">
                          <div className="flex items-center text-left">
                            <span className="text-sm font-medium">Question {index + 1}</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {form.getValues(`questions.${index}.text`) || 'New Question'}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <div className="flex justify-end">
                              <Button 
                                type="button" 
                                onClick={() => removeQuestion(index)} 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                              >
                                <Minus className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </div>

                            <FormField
                              control={form.control}
                              name={`questions.${index}.text`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Question Text</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      className="focus-visible:ring-blue-500 transition-colors duration-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`questions.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">Question Type</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value === 'mcq') {
                                          form.setValue(`questions.${index}.options`, ['', '', '', '']);
                                          form.setValue(`questions.${index}.correctAnswer`, '');
                                        } else if (value === 'fill') {
                                          form.setValue(`questions.${index}.correctAnswer`, '');
                                        } else if (value === 'code') {
                                          form.setValue(`questions.${index}.codeTemplate`, '');
                                          form.setValue(`questions.${index}.testCase`, { input: '', output: '' });
                                          form.setValue(`questions.${index}.correctAnswer`, '');
                                        }
                                      }} 
                                      defaultValue={field.value}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                                          <SelectValue placeholder="Select question type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem 
                                          value="mcq"
                                          className="cursor-pointer transition-colors duration-200"
                                        >
                                          <div className="flex items-center">
                                            <CheckSquare className="h-4 w-4 mr-2" />
                                            <span>Multiple Choice</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem 
                                          value="fill"
                                          className="cursor-pointer transition-colors duration-200"
                                        >
                                          <div className="flex items-center">
                                            <TextCursor className="h-4 w-4 mr-2" />
                                            <span>Fill in the Blank</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem 
                                          value="code"
                                          className="cursor-pointer transition-colors duration-200"
                                        >
                                          <div className="flex items-center">
                                            <Code className="h-4 w-4 mr-2" />
                                            <span>Coding Question</span>
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
                                name={`questions.${index}.points`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">Points</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        {...field} 
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                        className="focus-visible:ring-blue-500 transition-colors duration-200"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Render different form fields based on question type */}
                            {renderQuestionForm(index, form.watch(`questions.${index}.type`))}

                            {form.watch('allowFileUpload') && (
                              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                                <div className="flex items-center text-gray-600 dark:text-gray-300">
                                  <Upload className="h-4 w-4 mr-2" />
                                  <span className="text-sm">Students will be able to upload files for this question</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t px-6 pb-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedAssignment(null);
              }}
              className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {(createAssignmentMutation.isPending || updateAssignmentMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {selectedAssignment ? 'Update Assignment' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}