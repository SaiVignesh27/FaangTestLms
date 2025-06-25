import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Plus, Minus, Info } from 'lucide-react';
import { ValidationProgramEditor } from '@/components/dashboard/ValidationProgramEditor';
import { Dialog } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  type: z.enum(['mcq', 'fill', 'code']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  codeTemplate: z.string().optional(),
  validationProgram: z.object({
    java: z.string().optional(),
    python: z.string().optional(),
    cpp: z.string().optional(),
    javascript: z.string().optional()
  }).optional(),
  testCases: z.array(z.object({
    input: z.string(),
    output: z.string(),
    description: z.string().optional()
  })).optional(),
  points: z.number().default(1),
  _id: z.string().optional(),
});

const setFormSchema = z.object({
  name: z.string().min(1, 'Module name is required'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

type SetFormValues = z.infer<typeof setFormSchema>;

type QuestionSet = {
  _id: string;
  name: string;
  description?: string;
  questions: string[];
};

// Helper to get headers for admin API
const getAdminHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + localStorage.getItem('token'),
  'x-user-email': localStorage.getItem('userEmail') || ''
});

export default function QuestionBank() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<string[]>([]);

  // react-hook-form for set and questions
  const form = useForm<SetFormValues>({
    resolver: zodResolver(setFormSchema),
    defaultValues: {
      name: '',
      description: '',
      questions: [
        {
          text: '',
          type: 'mcq',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1,
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  // Fetch all sets
  const fetchSets = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/question-bank/sets', { headers: getAdminHeaders() });
    let data = await res.json();
    if (!Array.isArray(data)) data = [];
    setSets(data);
    setLoading(false);
  };

  // Fetch set details for editing
  const fetchSetDetails = async (setId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/question-bank/sets/${setId}/questions`, { headers: getAdminHeaders() });
    const questions = await res.json();
    setLoading(false);
    return questions;
  };

  useEffect(() => {
    fetchSets();
  }, []);

  // Set CRUD
  const handleCreateSet = async (data: SetFormValues) => {
    setLoading(true);
    try {
      console.log('Creating module with data:', data);
      // 1. Create the set (name, description)
      const setRes = await fetch('/api/admin/question-bank/sets', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      const set = await setRes.json();
      console.log('Created module:', set);
      // 2. For each question, create it and collect IDs
      const questionIds: string[] = [];
      for (const q of data.questions) {
        console.log('Creating question:', q);
        const res = await fetch('/api/admin/question-bank/questions', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify(q),
        });
        const newQ = await res.json();
        console.log('Created question:', newQ);
        if (newQ._id) questionIds.push(newQ._id);
      }
      // 3. Update the set's questions array
      console.log('Updating module with question IDs:', questionIds);
      const updateRes = await fetch(`/api/admin/question-bank/sets/${set._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ questions: questionIds }),
      });
      const updatedSet = await updateRes.json();
      console.log('Updated module:', updatedSet);
      setLoading(false);
      fetchSets();
      form.reset();
    } catch (error) {
      setLoading(false);
      console.error('Error creating module:', error);
      alert('Error creating module. See console for details.');
    }
  };
  const handleEditSet = async (set: QuestionSet) => {
    setEditingSet(set);
    form.setValue('name', set.name);
    form.setValue('description', set.description || '');
    const questions = await fetchSetDetails(set._id);
    form.setValue('questions', questions.length ? questions : [{ text: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: '', points: 1 }]);
    setOriginalQuestionIds(Array.isArray(questions) ? questions.map((q: any) => q._id).filter(Boolean) : []);
  };
  const handleUpdateSet = async (data: SetFormValues) => {
    if (!editingSet) return;
    setLoading(true);
    try {
      // 1. Update set name/description
      await fetch(`/api/admin/question-bank/sets/${editingSet._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      // 2. For each question, update or create as needed
      const questionIds: string[] = [];
      for (const q of data.questions) {
        if (q._id) {
          // Update existing question (do not send _id in body)
          const { _id, ...qWithoutId } = q;
          const res = await fetch(`/api/admin/question-bank/questions/${_id}`, {
            method: 'PUT',
            headers: getAdminHeaders(),
            body: JSON.stringify(qWithoutId),
          });
          const updatedQ = await res.json();
          if (updatedQ._id) questionIds.push(updatedQ._id);
        } else {
          // Create new question
          const res = await fetch('/api/admin/question-bank/questions', {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify(q),
          });
          const newQ = await res.json();
          if (newQ._id) questionIds.push(newQ._id);
        }
      }
      // 3. Delete removed questions
      const removedIds = originalQuestionIds.filter(id => !questionIds.includes(id));
      for (const id of removedIds) {
        await fetch(`/api/admin/question-bank/questions/${id}`, {
          method: 'DELETE',
          headers: getAdminHeaders(),
        });
      }
      // 4. Update the set's questions array
      await fetch(`/api/admin/question-bank/sets/${editingSet._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ questions: questionIds }),
      });
      setEditingSet(null);
      setOriginalQuestionIds([]);
      setLoading(false);
      form.reset();
      fetchSets();
    } catch (error) {
      setLoading(false);
      console.error('Error updating module:', error);
      alert('Error updating module. See console for details.');
    }
  };
  const handleDeleteSet = async (setId: string) => {
    setLoading(true);
    try {
      console.log('Deleting set:', setId);
      const res = await fetch(`/api/admin/question-bank/sets/${setId}`, { 
        method: 'DELETE',
        headers: getAdminHeaders() 
      });
      const result = await res.json();
      console.log('Delete set result:', result);
      if (selectedSet?._id === setId) setSelectedSet(null);
      setLoading(false);
      fetchSets();
    } catch (error) {
      setLoading(false);
      console.error('Error deleting module:', error);
      alert('Error deleting module. See console for details.');
    }
  };

  // Add question to set
  const addQuestion = () => {
    append({ text: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: '', points: 1 });
  };
  // Remove question from set
  const removeQuestionFromSet = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <AdminLayout>
      {/* Gradient Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 rounded-xl shadow-lg text-white border border-gray-200 dark:border-gray-700 mb-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-200 to-blue-100 bg-clip-text text-white dark:from-blue-400 dark:to-blue-600">
                Question Bank
              </h2>
              <p className="text-sm text-blue-100">
                Create, edit, and manage question modules for use in tests
              </p>
            </div>
            <Button 
              variant="default"
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200 mt-4 md:mt-0"
              onClick={() => { setEditingSet(null); form.reset(); }}
            >
              + New Module
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content Card Grid */}
      <div className="container mx-auto px-4 py-6 flex gap-8 min-h-[70vh]">
        {/* Sets List Card */}
        <div className="w-1/3">
          <div className="rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0 transition-shadow duration-200 hover:shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Question Modules</h3>
            </div>
            <div className="p-4">
              {loading && <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-blue-600" /></div>}
              {!loading && sets.length === 0 && <div className="text-gray-500 text-center py-8">No Modules found. Create your first Module!</div>}
              <ul className="space-y-2">
                {(Array.isArray(sets) ? sets : []).map(set => (
                  <li
                    key={set._id}
                    className={`p-4 rounded-lg shadow-sm border cursor-pointer transition-all flex flex-col gap-1 group hover:shadow-lg duration-200 ${selectedSet?._id === set._id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    onClick={() => setSelectedSet(set)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">{set.name}</span>
                      <div className="flex gap-2">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleEditSet(set); }}><span className="sr-only">Edit</span>✏️</Button></TooltipTrigger><TooltipContent>Edit Module</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="text-red-600" onClick={e => { e.stopPropagation(); setDeleteSetId(set._id); }}><span className="sr-only">Delete</span>🗑️</Button></TooltipTrigger><TooltipContent>Delete Set</TooltipContent></Tooltip></TooltipProvider>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">{Array.isArray(set.questions) ? set.questions.length : 0}</span>
                      <span>questions</span>
                    </div>
                    <div className="text-xs text-gray-400">{set.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Set Form Card */}
        <div className="w-2/3">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 transition-shadow duration-200 hover:shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                {editingSet ? 'Edit Module' : 'Add Module'}
              </h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingSet ? handleUpdateSet : handleCreateSet)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Module Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Module Name" />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-6 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Questions in Module</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent side="top">These questions will be available for use when creating tests.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button type="button" onClick={addQuestion} variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
                  </div>
                  <Accordion type="multiple" className="w-full transition-all duration-200">
                    {fields.length === 0 && <div className="text-gray-500 text-center py-8">No questions in this set yet.</div>}
                    {fields.map((field, index) => (
                      <AccordionItem key={field.id} value={`question-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900/30 transition-all duration-200">
                        <AccordionTrigger className="transition-all duration-200">
                          <div className="flex items-center text-left">
                            <span className="text-sm font-medium text-gray-900 dark:text-white"> Question {index + 1}</span>
                            <span className="ml-2 text-xs text-gray-500 truncate max-w-[200px]">
                              {form.getValues(`questions.${index}.text`) || 'New Question'}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="transition-all duration-200">
                          <div className="space-y-4 p-4 border-t bg-white dark:bg-gray-800 rounded-b-lg">
                            <div className="flex justify-end">
                              <Button type="button" onClick={() => removeQuestionFromSet(index)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"><Minus className="h-4 w-4 mr-1" /> Remove</Button>
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
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select question type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="mcq">MCQ</SelectItem>
                                      <SelectItem value="fill">Fill in the Blank</SelectItem>
                                      <SelectItem value="code">Code</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {form.watch(`questions.${index}.type`) === 'mcq' && (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`questions.${index}.options`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Options</FormLabel>
                                      <FormControl>
                                        <div className="space-y-2">
                                          {field.value?.map((option: string, optionIndex: number) => (
                                            <div key={optionIndex} className="flex gap-2">
                                              <Input
                                                value={option}
                                                onChange={(e) => {
                                                  const newOptions = [...(field.value || [])];
                                                  newOptions[optionIndex] = e.target.value;
                                                  field.onChange(newOptions);
                                                }}
                                                placeholder={`Option ${optionIndex + 1}`}
                                              />
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                  const newOptions = [...(field.value || [])];
                                                  newOptions.splice(optionIndex, 1);
                                                  field.onChange(newOptions);
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
                                              field.onChange([...(field.value || []), ""]);
                                            }}
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
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Correct Answer</FormLabel>
                                      <select
                                        {...field}
                                        className="border p-1 rounded w-full"
                                        value={field.value?.toString()}
                                        onChange={e => field.onChange(e.target.value)}
                                      >
                                        <option value="">Select correct answer</option>
                                        {form.watch(`questions.${index}.options`)?.filter((opt: string) => opt !== '').map((option: string, i: number) => (
                                          <option key={i} value={i.toString()}>{option}</option>
                                        ))}
                                      </select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                            {form.watch(`questions.${index}.type`) === 'fill' && (
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
                            {form.watch(`questions.${index}.type`) === 'code' && (
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
                                          onSave={field.onChange}
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
                                          {field.value?.map((testCase: any, testCaseIndex: number) => (
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
                                              <Input
                                                value={testCase.input}
                                                onChange={e => {
                                                  const newTestCases = [...(field.value || [])];
                                                  newTestCases[testCaseIndex].input = e.target.value;
                                                  field.onChange(newTestCases);
                                                }}
                                                placeholder="Input"
                                              />
                                              <Input
                                                value={testCase.output}
                                                onChange={e => {
                                                  const newTestCases = [...(field.value || [])];
                                                  newTestCases[testCaseIndex].output = e.target.value;
                                                  field.onChange(newTestCases);
                                                }}
                                                placeholder="Expected Output"
                                              />
                                              <Input
                                                value={testCase.description || ''}
                                                onChange={e => {
                                                  const newTestCases = [...(field.value || [])];
                                                  newTestCases[testCaseIndex].description = e.target.value;
                                                  field.onChange(newTestCases);
                                                }}
                                                placeholder="Description (optional)"
                                              />
                                            </div>
                                          ))}
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              field.onChange([...(field.value || []), { input: '', output: '', description: '' }]);
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
                                  <FormLabel>Points</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={1} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="flex gap-2 mt-8">
                    <Button type="submit" className="w-full">{editingSet ? 'Update Module' : 'Create Module'}</Button>
                    {editingSet && <Button type="button" variant="ghost" className="w-full" onClick={() => { setEditingSet(null); form.reset(); }}>Cancel</Button>}
                  </div>
                </form>
              </Form>
            </div>
            {/* Questions in selected set (read-only) */}
            {!editingSet && selectedSet && (
              <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Questions in <span className="text-blue-700 dark:text-blue-300">{selectedSet.name}</span></h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="top">These are the questions currently in this module.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {Array.isArray(selectedSet.questions) && selectedSet.questions.length === 0 && (
                  <div className="text-gray-500 text-center py-8">No questions in this Module yet.</div>
                )}
                {/* Optionally, you can fetch and display the full question details here if needed */}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Confirmation Modal for Delete */}
      {deleteSetId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-all duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-sm border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Delete Module</h3>
            <div className="text-gray-700 dark:text-gray-300">Are you sure you want to delete this Module?</div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="outline" onClick={() => setDeleteSetId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteSet(deleteSetId);
                  setDeleteSetId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 