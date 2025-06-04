import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Test, Course, Class, Question, User } from '@shared/schema';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import TestItem from '@/components/dashboard/TestItem';
import { FileQuestion, Loader2, Plus, Minus, Code, CheckSquare, TextCursor } from 'lucide-react';

// Form schema for creating/editing tests
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

const testFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string().min(1, "Course is required"),
  classId: z.string().optional(),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
  timeLimit: z.number().optional(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

export default function Tests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  // Fetch tests
  const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
    queryKey: ['/api/admin/tests'],
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
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      title: '',
      description: '',
      courseId: '',
      classId: '',
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
      timeLimit: 30,
    },
  });

  // Setup field array for questions
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch classes when course changes
  const selectedCourseId = form.watch('courseId');
  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/admin/classes', { courseId: selectedCourseId }],
    enabled: !!selectedCourseId,
  });

  // Reset form when dialog opens/closes or selected test changes
  React.useEffect(() => {
    if (selectedTest) {
      form.reset({
        title: selectedTest.title,
        description: selectedTest.description || '',
        courseId: selectedTest.courseId,
        classId: selectedTest.classId || '',
        questions: selectedTest.questions,
        visibility: selectedTest.visibility,
        assignedTo: selectedTest.assignedTo || [],
        timeLimit: selectedTest.timeLimit || 30,
      });
    } else if (isDialogOpen) {
      form.reset({
        title: '',
        description: '',
        courseId: '',
        classId: '',
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
        timeLimit: 30,
      });
    }
  }, [selectedTest, isDialogOpen, form]);

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: (data: TestFormValues) => apiRequest('POST', '/api/admin/tests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tests'] });
      toast({
        title: 'Success',
        description: 'Test created successfully',
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error creating test',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Update test mutation
  const updateTestMutation = useMutation({
    mutationFn: (data: { id: string; testData: TestFormValues }) => 
      apiRequest('PATCH', `/api/admin/tests/${data.id}`, data.testData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tests'] });
      toast({
        title: 'Success',
        description: 'Test updated successfully',
      });
      setSelectedTest(null);
    },
    onError: (error) => {
      toast({
        title: 'Error updating test',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tests'] });
      toast({
        title: 'Success',
        description: 'Test deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting test',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Toggle test status mutation
  const toggleTestStatusMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) => 
      apiRequest('PATCH', `/api/admin/tests/${data.id}/status`, { isActive: data.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tests'] });
      toast({
        title: 'Success',
        description: 'Test status updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating test status',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: TestFormValues) => {
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

    if (selectedTest) {
      updateTestMutation.mutate({ id: selectedTest._id as string, testData: processedData });
    } else {
      createTestMutation.mutate(processedData);
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
        description: 'Test must have at least one question',
        variant: 'destructive',
      });
    }
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
                          value={field.value || ''}
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
                          value={field.value || ''}
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
                  Test Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Create and manage daily tests
                </p>
              </div>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Test
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Tests</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">All tests organized by course</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingTests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {tests && tests.length > 0 ? (
                    tests.map((test) => (
                      <TestItem
                        key={test._id}
                        id={test._id as string}
                        title={test.title}
                        course={getCourseName(test.courseId)}
                        questionCount={test.questions.length}
                        isActive={true}
                        icon={FileQuestion}
                        iconColor="text-primary"
                        iconBgColor="bg-primary-light bg-opacity-10"
                        onEdit={() => setSelectedTest(test)}
                        onToggleStatus={() => toggleTestStatusMutation.mutate({ 
                          id: test._id as string, 
                          isActive: false
                        })}
                        onDelete={() => deleteTestMutation.mutate(test._id as string)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileQuestion className="h-12 w-12 opacity-20" />
                        <h3 className="text-lg font-medium">No tests found</h3>
                        <p className="text-sm">Create your first test to get started</p>
                        <Button 
                          variant="outline" 
                          className="mt-4 shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Create Test
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

      {/* Create/Edit Test Dialog */}
      <Dialog open={isDialogOpen || !!selectedTest} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setSelectedTest(null);
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-t-lg shadow-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedTest ? 'Edit Test' : 'Create New Test'}
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                {selectedTest 
                  ? 'Update test details and questions' 
                  : 'Create a new test with multiple choice, fill-in-the-blank, or coding questions'}
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
                    Test Details
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
                        <FormLabel className="text-sm font-medium">Test Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="JavaScript Arrays & Objects Test" 
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
                            placeholder="Test on JavaScript arrays and objects concepts"
                            className="resize-none focus-visible:ring-blue-500 transition-colors duration-200"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Course</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('classId', '');
                            }} 
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
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Class (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                            disabled={!selectedCourseId}
                          >
                            <FormControl>
                              <SelectTrigger className="focus-visible:ring-blue-500 transition-colors duration-200">
                                <SelectValue placeholder={selectedCourseId ? "Select a class" : "Select a course first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem 
                                value="none"
                                className="cursor-pointer transition-colors duration-200"
                              >
                                None (General test)
                              </SelectItem>
                              {isLoadingClasses ? (
                                <div className="flex justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : classes && classes.length > 0 ? (
                                classes.map((classItem) => (
                                  <SelectItem 
                                    key={classItem._id} 
                                    value={classItem._id as string}
                                    className="cursor-pointer transition-colors duration-200"
                                  >
                                    {classItem.title}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
                                  No classes available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
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
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                              value={field.value || 30}
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
                  </div>
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
                setSelectedTest(null);
              }}
              className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTestMutation.isPending || updateTestMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {(createTestMutation.isPending || updateTestMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {selectedTest ? 'Update Test' : 'Create Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}