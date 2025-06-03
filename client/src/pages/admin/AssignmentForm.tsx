import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Course {
  _id: string;
  title: string;
}

interface Question {
  type: 'mcq' | 'fill' | 'code';
  text: string;
  correctAnswer: string | string[];
  points: number;
  _id?: string;
  options?: string[];
  codeTemplate?: string;
  testCases?: { input: string; output: string }[];
  questionNumber?: number;
  description?: string;
  language?: string;
}

export default function AssignmentForm() {
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    dueDate: '',
    timeLimit: '',
    questions: [] as Question[]
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter assignment title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter assignment description"
            />
          </div>
          <div>
            <Label htmlFor="courseId">Course</Label>
            <Select
              value={formData.courseId}
              onValueChange={value => setFormData(prev => ({ ...prev, courseId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map(course => (
                  <SelectItem key={course._id} value={course._id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
            <Input
              id="timeLimit"
              type="number"
              min="1"
              value={formData.timeLimit}
              onChange={e => setFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
              placeholder="Enter time limit in minutes"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 