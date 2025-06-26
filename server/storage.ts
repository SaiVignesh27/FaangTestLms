import { User, Course, Class, Test, Assignment, Result, InsertUser, InsertCourse, InsertClass, InsertTest, InsertAssignment, InsertResult, CourseProgress, InsertCourseProgress } from '@shared/schema';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';

// Interface for our storage needs, whether in-memory or MongoDB
// User and InsertUser now support enrolledCourses: string[]
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  listUsers(role?: 'admin' | 'student'): Promise<User[]>;
  
  // Course methods
  getCourse(id: string): Promise<Course | null>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<Course>): Promise<Course | null>;
  deleteCourse(id: string): Promise<boolean>;
  listCourses(options?: { visibility?: 'public' | 'private', createdBy?: string }): Promise<Course[]>;
  
  // Class methods
  getClass(id: string): Promise<Class | null>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, classData: Partial<Class>): Promise<Class | null>;
  deleteClass(id: string): Promise<boolean>;
  listClasses(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Class[]>;
  
  // Test methods
  getTest(id: string): Promise<Test | null>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: string, test: Partial<Test>): Promise<Test | null>;
  deleteTest(id: string): Promise<boolean>;
  listTests(options?: { courseId?: string, classId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Test[]>;
  
  // Assignment methods
  getAssignment(id: string): Promise<Assignment | null>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<Assignment>): Promise<Assignment | null>;
  deleteAssignment(id: string): Promise<boolean>;
  listAssignments(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Assignment[]>;
  
  // Result methods
  getResult(id: string): Promise<Result | null>;
  createResult(result: InsertResult): Promise<Result>;
  updateResult(id: string, result: Partial<Result>): Promise<Result | null>;
  deleteResult(id: string): Promise<boolean>;
  listResults(options?: { 
    studentId?: string, 
    courseId?: string, 
    testId?: string, 
    assignmentId?: string,
    type?: 'test' | 'assignment'
  }): Promise<Result[]>;

  // Course Progress methods
  getCourseProgress(id: string): Promise<CourseProgress | null>;
  getCourseProgressByStudentAndCourse(studentId: string, courseId: string): Promise<CourseProgress | null>;
  createCourseProgress(progress: InsertCourseProgress): Promise<CourseProgress>;
  updateCourseProgress(id: string, progress: Partial<CourseProgress>): Promise<CourseProgress | null>;
  deleteCourseProgress(id: string): Promise<boolean>;
  listCourseProgress(options?: { studentId?: string, courseId?: string }): Promise<CourseProgress[]>;
}

// Mock in-memory implementation for development
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private courses: Map<string, Course>;
  private classes: Map<string, Class>;
  private tests: Map<string, Test>;
  private assignments: Map<string, Assignment>;
  private results: Map<string, Result>;
  private courseProgress: Map<string, CourseProgress>;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.classes = new Map();
    this.tests = new Map();
    this.assignments = new Map();
    this.results = new Map();
    this.courseProgress = new Map();
  }
  
  
  // User methods
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(user => user.email === email) || null;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = new ObjectId().toString();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user: User = {
      _id: id,
      ...userData,
      password: hashedPassword
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    // If updating password, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(role?: 'admin' | 'student'): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (role) {
      return users.filter(user => user.role === role);
    }
    return users;
  }

  // Course methods
  async getCourse(id: string): Promise<Course | null> {
    return this.courses.get(id) || null;
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const id = new ObjectId().toString();
    const now = new Date();
    
    const course: Course = {
      _id: id,
      ...courseData,
      createdAt: now,
      updatedAt: now
    };
    
    this.courses.set(id, course);
    return course;
  }

  async updateCourse(id: string, courseData: Partial<Course>): Promise<Course | null> {
    const course = this.courses.get(id);
    if (!course) return null;
    
    const updatedCourse = { 
      ...course, 
      ...courseData,
      updatedAt: new Date()
    };
    
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<boolean> {
    return this.courses.delete(id);
  }

  async listCourses(options?: { visibility?: 'public' | 'private', createdBy?: string }): Promise<Course[]> {
    let courses = Array.from(this.courses.values());
    
    if (options?.visibility) {
      courses = courses.filter(course => course.visibility === options.visibility);
    }
    
    if (options?.createdBy) {
      courses = courses.filter(course => course.createdBy === options.createdBy);
    }
    
    return courses;
  }

  // Class methods
  async getClass(id: string): Promise<Class | null> {
    return this.classes.get(id) || null;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = new ObjectId().toString();
    const now = new Date();
    
    const classEntity: Class = {
      _id: id,
      ...classData,
      createdAt: now,
      updatedAt: now
    };
    
    this.classes.set(id, classEntity);
    return classEntity;
  }

  async updateClass(id: string, classData: Partial<Class>): Promise<Class | null> {
    const classEntity = this.classes.get(id);
    if (!classEntity) return null;
    
    const updatedClass = { 
      ...classEntity, 
      ...classData,
      updatedAt: new Date()
    };
    
    this.classes.set(id, updatedClass);
    return updatedClass;
  }

  async deleteClass(id: string): Promise<boolean> {
    return this.classes.delete(id);
  }

  async listClasses(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Class[]> {
    let classes = Array.from(this.classes.values());
    
    if (options?.courseId) {
      classes = classes.filter(cls => cls.courseId === options.courseId);
    }
    
    if (options?.visibility) {
      classes = classes.filter(cls => cls.visibility === options.visibility);
    }
    
    if (options?.createdBy) {
      classes = classes.filter(cls => cls.createdBy === options.createdBy);
    }
    
    return classes;
  }

  // Test methods
  async getTest(id: string): Promise<Test | null> {
    return this.tests.get(id) || null;
  }

  async createTest(testData: InsertTest): Promise<Test> {
    const id = new ObjectId().toString();
    const now = new Date();
    
    const test: Test = {
      _id: id,
      ...testData,
      createdAt: now,
      updatedAt: now
    };
    
    this.tests.set(id, test);
    return test;
  }

  async updateTest(id: string, testData: Partial<Test>): Promise<Test | null> {
    const test = this.tests.get(id);
    if (!test) return null;
    
    const updatedTest = { 
      ...test, 
      ...testData,
      updatedAt: new Date()
    };
    
    this.tests.set(id, updatedTest);
    return updatedTest;
  }

  async deleteTest(id: string): Promise<boolean> {
    return this.tests.delete(id);
  }

  async listTests(options?: { courseId?: string, classId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Test[]> {
    let tests = Array.from(this.tests.values());
    
    if (options?.courseId) {
      tests = tests.filter(test => test.courseId === options.courseId);
    }
    
    if (options?.classId) {
      tests = tests.filter(test => test.classId === options.classId);
    }
    
    if (options?.visibility) {
      tests = tests.filter(test => test.visibility === options.visibility);
    }
    
    if (options?.createdBy) {
      tests = tests.filter(test => test.createdBy === options.createdBy);
    }
    
    return tests;
  }

  // Assignment methods
  async getAssignment(id: string): Promise<Assignment | null> {
    return this.assignments.get(id) || null;
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const id = new ObjectId().toString();
    const now = new Date();
    
    const assignment: Assignment = {
      _id: id,
      ...assignmentData,
      createdAt: now,
      updatedAt: now
    };
    
    this.assignments.set(id, assignment);
    return assignment;
  }

  async updateAssignment(id: string, assignmentData: Partial<Assignment>): Promise<Assignment | null> {
    const assignment = this.assignments.get(id);
    if (!assignment) return null;
    
    const updatedAssignment = { 
      ...assignment, 
      ...assignmentData,
      updatedAt: new Date()
    };
    
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    return this.assignments.delete(id);
  }

  async listAssignments(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Assignment[]> {
    let assignments = Array.from(this.assignments.values());
    
    if (options?.courseId) {
      assignments = assignments.filter(assignment => assignment.courseId === options.courseId);
    }
    
    if (options?.visibility) {
      assignments = assignments.filter(assignment => assignment.visibility === options.visibility);
    }
    
    if (options?.createdBy) {
      assignments = assignments.filter(assignment => assignment.createdBy === options.createdBy);
    }
    
    return assignments;
  }

  // Result methods
  async getResult(id: string): Promise<Result | null> {
    return this.results.get(id) || null;
  }

  async createResult(resultData: InsertResult): Promise<Result> {
    const id = new ObjectId().toString();
    
    const result: Result = {
      _id: id,
      ...resultData
    };
    
    this.results.set(id, result);
    return result;
  }

  async updateResult(id: string, resultData: Partial<Result>): Promise<Result | null> {
    const result = this.results.get(id);
    if (!result) return null;
    
    const updatedResult = { ...result, ...resultData };
    this.results.set(id, updatedResult);
    return updatedResult;
  }

  async deleteResult(id: string): Promise<boolean> {
    return this.results.delete(id);
  }

  async listResults(options?: { 
    studentId?: string, 
    courseId?: string, 
    testId?: string, 
    assignmentId?: string,
    type?: 'test' | 'assignment'
  }): Promise<Result[]> {
    let results = Array.from(this.results.values());
    
    if (options?.studentId) {
      results = results.filter(result => result.studentId === options.studentId);
    }
    
    if (options?.courseId) {
      results = results.filter(result => result.courseId === options.courseId);
    }
    
    if (options?.testId) {
      results = results.filter(result => result.testId === options.testId);
    }
    
    if (options?.assignmentId) {
      results = results.filter(result => result.assignmentId === options.assignmentId);
    }
    
    return results;
  }

  // Course Progress methods
  async getCourseProgress(id: string): Promise<CourseProgress | null> {
    return this.courseProgress.get(id) || null;
  }

  async getCourseProgressByStudentAndCourse(studentId: string, courseId: string): Promise<CourseProgress | null> {
    const progress = Array.from(this.courseProgress.values()).find(
      p => p.studentId === studentId && p.courseId === courseId
    );
    return progress || null;
  }

  async createCourseProgress(progressData: InsertCourseProgress): Promise<CourseProgress> {
    const id = new ObjectId().toString();
    const now = new Date();
    
    const progress: CourseProgress = {
      _id: id,
      ...progressData,
      createdAt: now,
      updatedAt: now
    };
    
    this.courseProgress.set(id, progress);
    return progress;
  }

  async updateCourseProgress(id: string, progressData: Partial<CourseProgress>): Promise<CourseProgress | null> {
    const progress = this.courseProgress.get(id);
    if (!progress) return null;
    
    const updatedProgress = { 
      ...progress, 
      ...progressData,
      updatedAt: new Date()
    };
    
    this.courseProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  async deleteCourseProgress(id: string): Promise<boolean> {
    return this.courseProgress.delete(id);
  }

  async listCourseProgress(options?: { studentId?: string, courseId?: string }): Promise<CourseProgress[]> {
    let progress = Array.from(this.courseProgress.values());
    
    if (options?.studentId) {
      progress = progress.filter(p => p.studentId === options.studentId);
    }
    
    if (options?.courseId) {
      progress = progress.filter(p => p.courseId === options.courseId);
    }
    
    return progress;
  }
}

export const storage = new MemStorage();
