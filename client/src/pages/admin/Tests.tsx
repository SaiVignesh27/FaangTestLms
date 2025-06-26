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
import { ValidationProgramEditor } from '@/components/dashboard/ValidationProgramEditor';

// Form schema for creating/editing tests
const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["mcq", "fill", "code"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  codeTemplate: z.string().optional(),
  validationProgram: z.object({
    java: z.string().optional(),
    python: z.string().optional(),
    cpp: z.string().optional(),
    javascript: z.string().optional()
  }).optional(),
  testCases: z.array(z.object({
    input: z.string().min(1, 'Test case input cannot be empty.'),
    output: z.string().min(1, 'Test case output cannot be empty.'),
    description: z.string().optional()
  })).optional(),
  points: z.coerce.number().min(1, "Points must be at least 1").default(1),
}).superRefine((data, ctx) => {
  switch (data.type) {
    case 'mcq':
      if (!data.options || data.options.filter(opt => opt.trim() !== '').length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least two non-empty options are required.',
          path: ['options'],
        });
      }
      if (!data.correctAnswer || data.correctAnswer.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A correct answer must be selected.',
          path: ['correctAnswer'],
        });
      }
      break;
    case 'fill':
      if (!data.correctAnswer || data.correctAnswer.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Correct answer is required and cannot be empty.',
          path: ['correctAnswer'],
        });
      }
      break;
    case 'code':
      if (!data.testCases || data.testCases.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one test case is required for code questions.',
          path: ['testCases'],
        });
      }
      break;
  }
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

interface ValidationPrograms {
  java?: string;
  python?: string;
  cpp?: string;
  javascript?: string;
}

// Add types for question bank
interface QuestionBankSet {
  _id: string;
  name: string;
  questions: string[];
}
interface QuestionBankQuestion {
  _id: string;
  text: string;
  type: string;
  points: number;
}

export default function Tests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [currentTab, setCurrentTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState<string>('all');

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
      questions: [],
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
        questions: selectedTest.questions.map(q => ({
          ...q,
          correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : Array.isArray(q.correctAnswer) ? (q.correctAnswer[0] ? String(q.correctAnswer[0]) : '') : '',
        })),
        visibility: selectedTest.visibility,
        assignedTo: selectedTest.assignedTo || [],
        timeLimit: selectedTest.timeLimit || 30,
      });
      setCurrentTab('details');
    } else if (isDialogOpen) {
      form.reset({
        title: '',
        description: '',
        courseId: '',
        classId: '',
        questions: [],
        visibility: 'public',
        assignedTo: [],
        timeLimit: 30,
      });
      setCurrentTab('details');
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

  // Question bank state
  const [bankSets, setBankSets] = useState<QuestionBankSet[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankQuestion[]>([]);
  const [selectedBankSet, setSelectedBankSet] = useState<string | null>(null);
  const [addedSetIds, setAddedSetIds] = useState<string[]>([]);

  // Reset addedSetIds when dialog closes or new test is started
  React.useEffect(() => {
    if (!isDialogOpen && !selectedTest) {
      setAddedSetIds([]);
    }
  }, [isDialogOpen, selectedTest]);

  // Remove set from addedSetIds if all its questions are removed from the test
  React.useEffect(() => {
    if (bankSets.length === 0) return; // Only run if sets are loaded
    const subscription = form.watch((value) => {
      const currentQuestions = value.questions || [];
      setAddedSetIds(prevAddedSetIds => {
        return prevAddedSetIds.filter(setId => {
          const set = bankSets.find(s => s._id === setId);
          if (!set) return false;
          return set.questions.some(qid => currentQuestions.some((q: any) => q._id === qid));
        });
      });
    });
    return () => subscription.unsubscribe();
  }, [form, bankSets]);

  // Helper to get headers for admin API (reuse from QuestionBank)
  const getAdminHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
    'x-user-email': localStorage.getItem('userEmail') || ''
  });

  // Fetch sets and questions from the bank
  React.useEffect(() => {
    if (isDialogOpen || selectedTest) {
      const headers = getAdminHeaders();
      console.log('Fetching sets with headers:', headers);
      fetch('/api/admin/question-bank/sets', { headers })
        .then(res => res.json())
        .then(data => {
          console.log('Fetched sets:', data);
          setBankSets(Array.isArray(data) ? data : []);
        });
    }
  }, [isDialogOpen, selectedTest]);

  // When a set is selected, fetch its questions and add them to the test's question list
  React.useEffect(() => {
    if (selectedBankSet && !addedSetIds.includes(selectedBankSet)) {
      fetch(`/api/admin/question-bank/sets/${selectedBankSet}/questions`, { headers: getAdminHeaders() })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Remove deduplication: always append all questions from the set
            data.forEach(q => append({
              ...q,
              correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : Array.isArray(q.correctAnswer) ? (q.correctAnswer[0] ? String(q.correctAnswer[0]) : '') : '',
            }));
            setAddedSetIds(prev => [...prev, selectedBankSet]);
            setSelectedBankSet(null);
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBankSet]);

  // Replace onSubmit with onValid and onInvalid handlers
  const onValid = (data: TestFormValues) => {
    setSubmitAttempted(false);
    // Extra check for MCQ correctAnswer
    const invalidMCQ = data.questions.find(
      q => q.type === 'mcq' && (!q.correctAnswer || q.correctAnswer.trim() === '')
    );
    if (invalidMCQ) {
      toast({
        title: 'Error',
        description: 'All MCQ questions must have a correct answer selected.',
        variant: 'destructive',
      });
      return;
    }
    const processedData = {
      ...data,
      questions: data.questions.map(q => {
        // Always clone: strip _id from each question
        const { _id, ...qWithoutId } = q as any;
        if (qWithoutId.type === 'mcq') {
          return { ...qWithoutId, correctAnswer: qWithoutId.correctAnswer.toString() };
        }
        return qWithoutId;
      }),
    };
    if (selectedTest) {
      updateTestMutation.mutate({ id: selectedTest._id as string, testData: processedData });
    } else {
      createTestMutation.mutate(processedData);
    }
  };
  const onInvalid = () => {
    setSubmitAttempted(true);
  };
  const isFormValid = Object.keys(form.formState.errors).length === 0;


  // Find course name by ID
  const getCourseName = (courseId: string) => {
    const course = courses?.find(c => c._id === courseId);
    return course?.title || 'Unknown Cluster';
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
  const renderQuestionForm = (index: number) => {
    const question = form.watch(`questions.${index}`);
    const questionType = question?.type || "mcq";

    return (
      <div key={index} className="space-y-4 p-4 border rounded-lg bg-white">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Question {index + 1}</h3>
        </div>

        <FormField
          control={form.control}
          name={`questions.${index}.text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter your question" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`questions.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select question type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="fill">Fill in the Blank</SelectItem>
                  <SelectItem value="code">Coding Question</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {questionType === "mcq" && (
          <>
            <FormField
              control={form.control}
              name={`questions.${index}.options`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Options <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormDescription>At least two options are required.</FormDescription>
                  <FormControl>
                    <div className="space-y-2">
                      {field.value?.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2 items-center">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(field.value || [])];
                              newOptions[optionIndex] = e.target.value;
                              field.onChange(newOptions);
                            }}
                            placeholder={`Option ${optionIndex + 1}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={(field.value || []).filter(opt => opt.trim() !== '').length <= 2}
                            onClick={() => {
                              if ((field.value || []).filter(opt => opt.trim() !== '').length > 2) {
                                const newOptions = [...(field.value || [])];
                                newOptions.splice(optionIndex, 1);
                                field.onChange(newOptions);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if ((field.value || []).filter(opt => opt.trim() !== '').length >= 10) return;
                          field.onChange([...(field.value || []), ""]);
                        }}
                        disabled={(field.value || []).filter(opt => opt.trim() !== '').length >= 10}
                      >
                        Add Option
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`questions.${index}.correctAnswer`}
              render={({ field }) => {
                const options = form.watch(`questions.${index}.options`)?.filter(opt => opt.trim() !== '');
                const canSelect = options && options.length >= 2;
                return (
                  <FormItem>
                    <FormLabel>
                      Correct Answer <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormDescription>Select the correct answer for this question.</FormDescription>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      disabled={!canSelect}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={canSelect ? "Select correct answer" : "Add at least two options first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options?.map((option, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </>
        )}

        {questionType === "fill" && (
          <FormField
            control={form.control}
            name={`questions.${index}.correctAnswer`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correct Answer</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter correct answer" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {questionType === "code" && (
          <>
            <FormField
              control={form.control}
              name={`questions.${index}.codeTemplate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code Template</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter code template"
                      className="font-mono"
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`questions.${index}.validationProgram`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validation Program</FormLabel>
                  <FormControl>
                    <ValidationProgramEditor
                      initialPrograms={field.value}
                      onSave={(programs: ValidationPrograms) => {
                        field.onChange(programs);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`questions.${index}.testCases`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Cases</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {field.value?.map((testCase, testCaseIndex) => (
                        <div key={testCaseIndex} className="space-y-2 p-4 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Test Case {testCaseIndex + 1}</h4>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const newTestCases = [...(field.value || [])];
                                newTestCases.splice(testCaseIndex, 1);
                                field.onChange(newTestCases);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <FormField
                            control={form.control}
                            name={`questions.${index}.testCases.${testCaseIndex}.input`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Input</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Enter test input"
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`questions.${index}.testCases.${testCaseIndex}.output`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Output</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Enter test output"
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`questions.${index}.testCases.${testCaseIndex}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter test case description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          field.onChange([
                            ...(field.value || []),
                            { input: "", output: "", description: "" }
                          ]);
                        }}
                      >
                        Add Test Case
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name={`questions.${index}.points`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Points <span className="text-red-500">*</span>
              </FormLabel>
              <FormDescription>Points must be at least 1.</FormDescription>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  min={1}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const getDefaultCode = (language: string) => {
    switch (language.toLowerCase()) {
      case 'python':
        return `def multiply(a, b):
    return a * b

# Read input
inputs = input().split()
num1 = float(inputs[0])
num2 = float(inputs[1])

# Calculate and print result
result = multiply(num1, num2)
print(result)`;
      case 'java':
        return `import java.util.Scanner;

public class Main {
    public static double multiply(double a, double b) {
        return a * b;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String[] inputs = scanner.nextLine().split(" ");
        double num1 = Double.parseDouble(inputs[0]);
        double num2 = Double.parseDouble(inputs[1]);
        double result = multiply(num1, num2);
        System.out.println(result);
        scanner.close();
    }
}`;
      default:
        return '';
    }
  };

  // Filtered tests
  const filteredTests = React.useMemo(() => {
    if (!tests) return [];
    return tests.filter(test => {
      const searchMatch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
      const courseMatch = filterCourse === 'all' || test.courseId === filterCourse;
      return searchMatch && courseMatch;
    });
  }, [tests, searchTerm, filterCourse]);

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
          {/* Filter Controls */}
          <Card className="p-4 sm:p-6 bg-white dark:bg-gray-800/50 rounded-xl shadow-md border dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Search by Test Name</Label>
                <Input
                  placeholder="e.g. JavaScript Arrays"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={filterCourse} onValueChange={v => setFilterCourse(v || 'all')}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses?.map(course => (
                      <SelectItem key={String(course._id)} value={String(course._id)}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Tests</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">All tests organized by cluster</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingTests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTests && filteredTests.length > 0 ? (
                    [...filteredTests].reverse().map((test) => (
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
          {submitAttempted && (form.formState.errors.title || form.formState.errors.courseId || form.formState.errors.classId || form.formState.errors.timeLimit || form.formState.errors.visibility || form.formState.errors.questions) && (
            <div className="relative flex flex-col gap-2 mb-6 animate-fadeIn">
              <div className="flex items-start gap-3 p-5 rounded-lg border-l-8 border-red-500 bg-gradient-to-r from-red-50 to-white shadow-md">
                <svg className="w-7 h-7 text-red-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-lg font-bold text-red-700 mb-1 flex items-center gap-2">
                    <span>Form Incomplete</span>
                    {(form.formState.errors.title || form.formState.errors.courseId || form.formState.errors.classId || form.formState.errors.timeLimit || form.formState.errors.visibility) && <span className="px-2 py-1 bg-red-200 rounded font-bold text-xs">Test Details</span>}
                    {form.formState.errors.questions && <span className="px-2 py-1 bg-red-200 rounded font-bold text-xs">Questions</span>}
                  </div>
                  <div className="text-sm text-red-700 mb-2">Please fix the issues in above section before submitting</div>
                </div>
              </div>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.4s ease; }
              `}</style>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid, onInvalid)} className="space-y-6 p-6 overflow-y-auto">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
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
                  <div className="gap-4">
                    <FormField
                      control={form.control}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Cluster</FormLabel>
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
                                    key={String(course._id)} 
                                    value={String(course._id)}
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
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
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

                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Add Questions from Question Bank</h3>
                    <div className="flex gap-4">
                      <label htmlFor="bank-set-select" className="sr-only">Select Question Set</label>
                      <Select
                        value={selectedBankSet || ''}
                        onValueChange={value => setSelectedBankSet(value)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select Set" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(bankSets) ? bankSets : []).map(set => (
                            <SelectItem key={set._id} value={set._id} disabled={addedSetIds.includes(set._id)}>
                              {set.name} {addedSetIds.includes(set._id) ? '(Added)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {fields.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No questions yet. Click "Add Question" or import from the Question Bank.
                    </div>
                  )}

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

                            {renderQuestionForm(index)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Add Question button at the bottom */}
                  <div className="mt-4 flex justify-end">
                    <Button type="button" onClick={addQuestion} variant="outline">
                      <Plus className="h-4 w-4 mr-2" /> Add Question
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t px-6 pb-6">
            {currentTab === 'questions' && (
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setCurrentTab('details')}
                className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm transition-colors duration-200"
              >
                Back to Details
              </Button>
            )}
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
            {currentTab === 'details' && (
              <Button 
                type="button"
                onClick={() => setCurrentTab('questions')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                Next: Questions
              </Button>
            )}
            {currentTab === 'questions' && (
              <Button 
                type="submit" 
                disabled={createTestMutation.isPending || updateTestMutation.isPending}
                onClick={form.handleSubmit(onValid, onInvalid)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                {(createTestMutation.isPending || updateTestMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedTest ? 'Update Test' : 'Create Test'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}