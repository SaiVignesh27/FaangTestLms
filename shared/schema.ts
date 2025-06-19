import { z } from "zod";

// Define MongoDB-compatible schemas

// User schema
export const userSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "student"]),
});

// Course schema
export const courseSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  duration: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  totalDuration: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  tests: z.array(z.string()).optional(),
  assignments: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  visibility: z.enum(["public", "private", "restricted"]),
  assignedTo: z.array(z.string()).optional(),
  instructor: z.object({
    name: z.string(),
    title: z.string(),
    initials: z.string()
  }).optional(),
});

// Class schema
export const classSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string(),
  content: z.object({
    type: z.enum(["video", "document", "presentation", "code", "quiz"]),
    url: z.string(),
    downloadable: z.boolean().optional(),
    duration: z.number().optional(), // in minutes for videos
    fileSize: z.number().optional(), // in KB for documents
    fileType: z.string().optional(), // e.g., "pdf", "docx", "mp4"
  }),
  materials: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(["document", "code", "resource"]),
    url: z.string(),
    fileType: z.string().optional(),
    downloadable: z.boolean().default(true),
  })).optional(),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Question schema for tests and assignments
export const questionSchema = z.object({
  _id: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["mcq", "fill", "code"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  codeTemplate: z.string().optional(),
  validationProgram: z.object({
    java: z.string().optional(),
    python: z.string().optional(),
    cpp: z.string().optional(),
    javascript: z.string().optional()
  }).optional(),
  testCases: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      description: z.string().optional()
    })
  ).optional(),
  points: z.number().default(1),
});

// Test schema
export const testSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string(),
  classId: z.string().optional(),
  questions: z.array(questionSchema),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
  createdBy: z.string(),
  timeLimit: z.number().optional(), // in minutes
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Assignment schema
export const assignmentSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  courseId: z.string(),
  questions: z.array(questionSchema),
  visibility: z.enum(["public", "private"]),
  assignedTo: z.array(z.string()).optional(),
  createdBy: z.string(),
  timeWindow: z.object({
    startTime: z.date(),
    endTime: z.date(),
  }).optional(),
  dueDate: z.date().optional(),
  type: z.string().optional(),
  allowFileUpload: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  timeLimit: z.number().optional(), // Time limit in minutes
});

// Result schema for tests and assignments
export const resultSchema = z.object({
  _id: z.string().optional(),
  studentId: z.string(),
  courseId: z.string(),
  testId: z.string().optional(),
  assignmentId: z.string().optional(),
  type: z.enum(["test", "assignment"]),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.any(),
      isCorrect: z.boolean(),
      points: z.number().default(0),
      feedback: z.string().optional(),
    })
  ),
  status: z.enum(["pending", "in-progress", "completed", "overdue"]).default("completed"),
  score: z.number(),
  maxScore: z.number(),
  submittedAt: z.date(),
  studentName: z.string(),
  title: z.string(),
  timeSpent: z.number().optional(), // in minutes
});

// Course Progress schema
export const courseProgressSchema = z.object({
  _id: z.string().optional(),
  studentId: z.string(),
  courseId: z.string(),
  completedItems: z.array(z.object({
    itemId: z.string(),
    itemType: z.enum(['class', 'test', 'assignment']),
    completedAt: z.date(),
    score: z.number().optional(),
  })),
  totalItems: z.number(),
  lastActivity: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Insert schemas (for creating new records)
export const insertUserSchema = userSchema.omit({ _id: true });
export const insertCourseSchema = courseSchema.omit({ _id: true });
export const insertClassSchema = classSchema.omit({ _id: true });
export const insertTestSchema = testSchema.omit({ _id: true });
export const insertAssignmentSchema = assignmentSchema.omit({ _id: true });
export const insertResultSchema = resultSchema.omit({ _id: true });
export const insertCourseProgressSchema = courseProgressSchema.omit({ _id: true });

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Course = z.infer<typeof courseSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Class = z.infer<typeof classSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Question = z.infer<typeof questionSchema>;

export type Test = z.infer<typeof testSchema>;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type Assignment = z.infer<typeof assignmentSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Result = z.infer<typeof resultSchema>;
export type InsertResult = z.infer<typeof insertResultSchema>;

export type CourseProgress = z.infer<typeof courseProgressSchema>;
export type InsertCourseProgress = z.infer<typeof insertCourseProgressSchema>;
