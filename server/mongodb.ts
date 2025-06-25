import { MongoClient, Collection, ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { 
  User, Course, Class, Test, Assignment, Result, 
  InsertUser, InsertCourse, InsertClass, InsertTest, InsertAssignment, InsertResult,
  userSchema, courseSchema, classSchema, testSchema, assignmentSchema, resultSchema,
  CourseProgress
} from '@shared/schema';
import { IStorage } from './storage';
import dotenv from 'dotenv'
dotenv.config()

export class MongoDBStorage implements IStorage {
  private client: MongoClient;
  private dbName = 'codegym';
  private connected = false;
  
  // Collections
  private users!: Collection<User>;
  private courses!: Collection<Course>;
  private classes!: Collection<Class>;
  private tests!: Collection<Test>;
  private assignments!: Collection<Assignment>;
  private results!: Collection<Result>;
  private courseProgress!: Collection<CourseProgress>;
  private questionBankQuestions!: Collection<any>;
  private questionSets!: Collection<any>;
  
  constructor(uri: string) {
    this.client = new MongoClient(uri);
  }
  
  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      await this.client.connect();
      console.log('Connected to MongoDB Atlas');
      
      const db = this.client.db(this.dbName);
      
      // Initialize collections
      this.users = db.collection('users');
      this.courses = db.collection('courses');
      this.classes = db.collection('classes');
      this.tests = db.collection('tests');
      this.assignments = db.collection('assignments');
      this.results = db.collection('results');
      this.courseProgress = db.collection('courseProgress');
      this.questionBankQuestions = db.collection('questionBankQuestions');
      this.questionSets = db.collection('questionSets');
      
      // Create indexes
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.courses.createIndex({ createdBy: 1 });
      await this.classes.createIndex({ courseId: 1 });
      await this.tests.createIndex({ courseId: 1 });
      await this.assignments.createIndex({ courseId: 1 });
      await this.results.createIndex({ studentId: 1 });
      
      this.connected = true;
      
      // Check if admin user exists, if not seed it
      await this.seedAdminUser();
      
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
  
  async close(): Promise<void> {
    if (!this.connected) return;
    
    await this.client.close();
    this.connected = false;
    console.log('Disconnected from MongoDB Atlas');
  }
  
  private async seedAdminUser() {
    try {
      // Check if admin user exists
      const adminExists = await this.users.findOne({ email: process.env.ADMINEMAIL });
      
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(process.env.ADMINPASSWORD || '', 10);
        
        const admin: User = {
          _id: new ObjectId().toString(),
          name: process.env.ADMINNAME || '',
          email: process.env.ADMINEMAIL || '',
          password: hashedPassword,
          role: 'admin'
        };
        
        await this.users.insertOne(admin);
      }
    } catch (error) {
      // Log the error but don't throw it - we don't want to break the app if seeding fails
      console.error('Error seeding admin user:', error);
    }
  }
  
  // User methods
  async getUser(id: string): Promise<User | null> {
    await this.connect();
    return this.users.findOne({ _id: id });
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    await this.connect();
    return this.users.findOne({ email });
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    await this.connect();
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user: User = {
      _id: new ObjectId().toString(),
      ...userData,
      password: hashedPassword
    };
    
    await this.users.insertOne(user);
    return user;
  }
  
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    await this.connect();

    // If password is being updated, hash it
    if (userData.password) {
      // Ensure the password is a string and not empty
      if (typeof userData.password !== 'string' || userData.password.trim() === '') {
        throw new Error('Invalid password');
      }

      // Generate a new hash for the password
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const result = await this.users.findOneAndUpdate(
      { _id: id },
      { $set: userData },
      { returnDocument: 'after' }
    );

    return result || null;
  }
  
  async deleteUser(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.users.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listUsers(role?: 'admin' | 'student'): Promise<User[]> {
    await this.connect();
    
    const query = role ? { role } : {};
    return this.users.find(query).toArray();
  }
  
  // Course methods
  async getCourse(id: string, user?: any): Promise<Course | null> {
    await this.connect();
    const course = await this.courses.findOne({ _id: id });

    if (!course) {
      return null;
    }

    if (user && user.role === 'student') {
      // Check if student is assigned to the course
      if (!course.assignedTo?.includes(user._id)) {
        return null; // Student is not assigned to this course
      }
    }
    // Admins can see all courses
    
    return course;
  }
  
  async createCourse(courseData: InsertCourse): Promise<Course> {
    await this.connect();
    
    // Handle assignedTo based on visibility
    let assignedTo: string[] = [];
    if (courseData.visibility === 'public') {
      // For public courses, get all student IDs
      const students = await this.users.find({ role: 'student' }).toArray();
      assignedTo = students.map(student => student._id);
    } else if (courseData.visibility === 'private') {
      // For private courses, use the provided assignedTo array
      assignedTo = courseData.assignedTo || [];
    }
    // For restricted courses, assignedTo remains empty

    const course: Course = {
      _id: new ObjectId().toString(),
      ...courseData,
      assignedTo,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.courses.insertOne(course);
    return course;
  }
  
  async updateCourse(id: string, courseData: Partial<Course>): Promise<Course | null> {
    await this.connect();
    
    // Get the current course data
    const currentCourse = await this.courses.findOne({ _id: id });
    if (!currentCourse) {
      return null;
    }

    // Handle assignedTo based on visibility
    if (courseData.visibility) {
      if (courseData.visibility === 'public') {
        // For public courses, get all student IDs
        const students = await this.users.find({ role: 'student' }).toArray();
        courseData.assignedTo = students.map(student => student._id);
      } else if (courseData.visibility === 'private') {
        // For private courses, keep the provided assignedTo array or use existing one
        courseData.assignedTo = courseData.assignedTo || currentCourse.assignedTo || [];
      } else if (courseData.visibility === 'restricted') {
        // For restricted courses, clear assignedTo
        courseData.assignedTo = [];
      }
    }
    
    // Update the updatedAt field
    courseData.updatedAt = new Date();
    
    const result = await this.courses.findOneAndUpdate(
      { _id: id },
      { $set: courseData },
      { returnDocument: 'after' }
    );
    
    return result || null;
  }
  
  async deleteCourse(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.courses.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listCourses(options?: { visibility?: 'public' | 'private' | 'restricted', createdBy?: string, user?: any }): Promise<Course[]> {
    await this.connect();

    const query: any = {};

    if (options?.user && options.user.role === 'student') {
      if (options?.visibility === 'public') {
        query.visibility = 'public';
      } else if (options?.visibility === 'private') {
        // For private courses, check if student is in assignedTo array
        query.$and = [
          { visibility: 'private' },
          { assignedTo: options.user._id }
        ];
      } else {
        // If no specific visibility is requested, show public + private courses where student is assigned
        query.$or = [
          { visibility: 'public' },
          { $and: [{ visibility: 'private' }, { assignedTo: options.user._id }] }
        ];
      }
    } else if (options?.visibility) {
      // Admins can filter by visibility, and can see all courses including restricted ones
      query.visibility = options.visibility;
    }

    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }

    return this.courses.find(query).toArray();
  }
  
  // Class methods
  async getClass(id: string): Promise<Class | null> {
    await this.connect();
    return this.classes.findOne({ _id: id });
  }
  
  async createClass(classData: InsertClass): Promise<Class> {
    await this.connect();
    
    const classEntity: Class = {
      _id: new ObjectId().toString(),
      ...classData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.classes.insertOne(classEntity);
    return classEntity;
  }
  
  async updateClass(id: string, classData: Partial<Class>): Promise<Class | null> {
    await this.connect();
    
    // Update the updatedAt field
    classData.updatedAt = new Date();
    
    const result = await this.classes.findOneAndUpdate(
      { _id: id },
      { $set: classData },
      { returnDocument: 'after' }
    );
    
    return result || null;
  }
  
  async deleteClass(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.classes.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listClasses(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string }): Promise<Class[]> {
    await this.connect();
    
    const query: any = {};
    
    if (options?.courseId) {
      query.courseId = options.courseId;
    }
    
    if (options?.visibility) {
      query.visibility = options.visibility;
    }
    
    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }
    
    return this.classes.find(query).toArray();
  }
  
  // Test methods
  async getTest(id: string, user?: any): Promise<Test | null> {
    await this.connect();
    const test = await this.tests.findOne({ _id: id });

    if (!test) {
      return null;
    }

    // Admins can see all tests
    if (user && user.role === 'admin') {
        return test;
    }

    // Public tests are visible to all
    if (test.visibility === 'public') {
        return test;
    }

    // Students can see private tests in courses they are enrolled in
    if (user && user.role === 'student' && test.visibility === 'private') {
        const enrolledCourses = await this.listCourseProgress({ studentId: user._id });
        const isEnrolled = enrolledCourses.some(cp => cp.courseId === test.courseId);
        if (isEnrolled) {
            return test;
        }
    }

    // Otherwise, the user doesn't have permission
    return null;
  }
  
  async createTest(testData: InsertTest): Promise<Test> {
    await this.connect();
    
    const test: Test = {
      _id: new ObjectId().toString(),
      ...testData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.tests.insertOne(test);
    return test;
  }
  
  async updateTest(id: string, testData: Partial<Test>): Promise<Test | null> {
    await this.connect();
    
    // Update the updatedAt field
    testData.updatedAt = new Date();
    
    const result = await this.tests.findOneAndUpdate(
      { _id: id },
      { $set: testData },
      { returnDocument: 'after' }
    );
    
    return result || null;
  }
  
  async deleteTest(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.tests.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listTests(options?: { courseId?: string, classId?: string, visibility?: 'public' | 'private', createdBy?: string, user?: any }): Promise<Test[]> {
    await this.connect();

    const query: any = {};

    if (options?.courseId) {
      query.courseId = options.courseId;
    }

    if (options?.classId) {
      query.classId = options.classId;
    }

    if (options?.user && options.user.role === 'student') {
      // Students can only see public tests or private tests in courses they are enrolled in
      const enrolledCourses = await this.listCourseProgress({ studentId: options.user._id });
      const enrolledCourseIds = enrolledCourses.map(cp => cp.courseId);

      if (options?.visibility === 'public') {
        query.visibility = 'public';
      } else if (options?.visibility === 'private') {
        query.$and = [
          { visibility: 'private' },
          { courseId: { $in: enrolledCourseIds } }
        ];
      } else {
         // If no specific visibility is requested, show public + tests in enrolled private courses
         query.$or = [
          { visibility: 'public' },
          { $and: [{ visibility: 'private' }, { courseId: { $in: enrolledCourseIds } }] }
        ];
      }
    } else if (options?.visibility) {
       // Admins can filter by visibility, and can see all private tests
       query.visibility = options.visibility;
    }

    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }

    return this.tests.find(query).toArray();
  }
  
  // Assignment methods
  async getAssignment(id: string, user?: any): Promise<Assignment | null> {
    await this.connect();
    const assignment = await this.assignments.findOne({ _id: id });

    if (!assignment) {
      return null;
    }

    // Admins can see all assignments
    if (user && user.role === 'admin') {
        return assignment;
    }

    // Public assignments are visible to all
    if (assignment.visibility === 'public') {
        return assignment;
    }

    // Students can see private assignments in courses they are enrolled in
    if (user && user.role === 'student' && assignment.visibility === 'private') {
        const enrolledCourses = await this.listCourseProgress({ studentId: user._id });
        const isEnrolled = enrolledCourses.some(cp => cp.courseId === assignment.courseId);
        if (isEnrolled) {
            return assignment;
        }
    }

    // Otherwise, the user doesn't have permission
    return null;
  }
  
  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    await this.connect();
    
    const assignment: Assignment = {
      _id: new ObjectId().toString(),
      ...assignmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.assignments.insertOne(assignment);
    return assignment;
  }
  
  async updateAssignment(id: string, assignmentData: Partial<Assignment>): Promise<Assignment | null> {
    await this.connect();
    const result = await this.assignments.findOneAndUpdate(
      { _id: id },
      { $set: assignmentData },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  async replaceAssignment(id: string, assignmentData: Assignment): Promise<Assignment | null> {
    await this.connect();
    // Remove _id from the replacement document
    const { _id, ...doc } = assignmentData;
    const result = await this.assignments.findOneAndReplace(
      { _id: id },
      doc,
      { returnDocument: 'after' }
    );
    return result || null;
  }
  
  async deleteAssignment(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.assignments.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listAssignments(options?: { courseId?: string, visibility?: 'public' | 'private', createdBy?: string, user?: any }): Promise<Assignment[]> {
    await this.connect();

    const query: any = {};

    if (options?.courseId) {
      query.courseId = options.courseId;
    }

    if (options?.user && options.user.role === 'student') {
      // Students can only see public assignments or private assignments in courses they are enrolled in
      const enrolledCourses = await this.listCourseProgress({ studentId: options.user._id });
      const enrolledCourseIds = enrolledCourses.map(cp => cp.courseId);

      if (options?.visibility === 'public') {
        query.visibility = 'public';
      } else if (options?.visibility === 'private') {
        query.$and = [
          { visibility: 'private' },
          { courseId: { $in: enrolledCourseIds } }
        ];
      } else {
         // If no specific visibility is requested, show public + assignments in enrolled private courses
         query.$or = [
          { visibility: 'public' },
          { $and: [{ visibility: 'private' }, { courseId: { $in: enrolledCourseIds } }] }
        ];
      }
    } else if (options?.visibility) {
       // Admins can filter by visibility, and can see all private assignments
       query.visibility = options.visibility;
    }

    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }

    return this.assignments.find(query).toArray();
  }
  
  // Result methods
  async getResult(id: string): Promise<Result | null> {
    await this.connect();
    return this.results.findOne({ _id: id });
  }
  
  async createResult(resultData: InsertResult): Promise<Result> {
    await this.connect();
    
    const result: Result = {
      _id: new ObjectId().toString(),
      ...resultData,
    };
    
    await this.results.insertOne(result);
    return result;
  }
  
  async updateResult(id: string, resultData: Partial<Result>): Promise<Result | null> {
    await this.connect();
    
    const updateResult = await this.results.findOneAndUpdate(
      { _id: id },
      { $set: resultData },
      { returnDocument: 'after' }
    );
    
    return updateResult || null;
  }
  
  async deleteResult(id: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.results.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
  
  async listResults(options?: { 
    studentId?: string, 
    courseId?: string, 
    testId?: string, 
    assignmentId?: string,
    type?: 'test' | 'assignment'
  }): Promise<Result[]> {
    await this.connect();
    
    const query: any = {};
    
    if (options?.studentId) {
      query.studentId = options.studentId;
    }
    
    if (options?.courseId) {
      query.courseId = options.courseId;
    }
    
    if (options?.testId) {
      query.testId = options.testId;
    }
    
    if (options?.assignmentId) {
      query.assignmentId = options.assignmentId;
    }

    if (options?.type) {
      query.type = options.type;
    }
    
    return this.results.find(query).toArray();
  }

  // Course Progress methods
  async getCourseProgress(id: string): Promise<CourseProgress | null> {
    await this.connect();
    return this.courseProgress.findOne({ _id: id });
  }

  async getCourseProgressByStudentAndCourse(studentId: string, courseId: string): Promise<CourseProgress | null> {
    await this.connect();
    return this.courseProgress.findOne({ studentId, courseId });
  }

  async createCourseProgress(progressData: CourseProgress): Promise<CourseProgress> {
    await this.connect();
    const now = new Date();

    // Get the course to count total items
    const course = await this.courses.findOne({ _id: progressData.courseId });
    if (!course) {
      throw new Error('Course not found');
    }

    // Count total items in the course
    const totalItems = (course.classes?.length || 0) + 
                      (course.tests?.length || 0) + 
                      (course.assignments?.length || 0);

    const progress: CourseProgress = {
      ...progressData,
      totalItems,
      completedItems: [],
      createdAt: now,
      updatedAt: now
    };

    const result = await this.courseProgress.insertOne(progress);
    return { ...progress, _id: result.insertedId.toString() };
  }

  async updateCourseProgress(id: string, progressData: Partial<CourseProgress>): Promise<CourseProgress | null> {
    await this.connect();
    
    // Get current progress
    const currentProgress = await this.courseProgress.findOne({ _id: id });
    if (!currentProgress) {
      return null;
    }

    // Get the course to count total items
    const course = await this.courses.findOne({ _id: currentProgress.courseId });
    if (!course) {
      throw new Error('Course not found');
    }

    // Count total items in the course
    const totalItems = (course.classes?.length || 0) + 
                      (course.tests?.length || 0) + 
                      (course.assignments?.length || 0);

    const update = {
      ...progressData,
      totalItems,
      updatedAt: new Date()
    };

    const result = await this.courseProgress.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  async deleteCourseProgress(id: string): Promise<boolean> {
    await this.connect();
    const result = await this.courseProgress.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async listCourseProgress(options?: { studentId?: string, courseId?: string }): Promise<CourseProgress[]> {
    await this.connect();
    const query: any = {};
    
    if (options?.studentId) {
      query.studentId = options.studentId;
    }
    
    if (options?.courseId) {
      query.courseId = options.courseId;
    }
    
    return this.courseProgress.find(query).toArray();
  }

  // QuestionBankQuestion CRUD
  async createQuestionBankQuestion(data: any): Promise<any> {
    await this.connect();
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await this.questionBankQuestions.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }
  async getQuestionBankQuestion(id: string): Promise<any | null> {
    await this.connect();
    return this.questionBankQuestions.findOne({ _id: new ObjectId(id) });
  }
  async updateQuestionBankQuestion(id: string, data: any): Promise<any | null> {
    await this.connect();
    data.updatedAt = new Date();
    const result = await this.questionBankQuestions.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result || null;
  }
  async deleteQuestionBankQuestion(id: string): Promise<boolean> {
    await this.connect();
    const result = await this.questionBankQuestions.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
  async listQuestionBankQuestions(filter: any = {}): Promise<any[]> {
    await this.connect();
    return this.questionBankQuestions.find(filter).toArray();
  }

  // QuestionSet CRUD
  async createQuestionSet(data: any): Promise<any> {
    await this.connect();
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await this.questionSets.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }
  async getQuestionSet(id: string): Promise<any | null> {
    await this.connect();
    return this.questionSets.findOne({ _id: new ObjectId(id) });
  }
  async updateQuestionSet(id: string, data: any): Promise<any | null> {
    await this.connect();
    data.updatedAt = new Date();
    console.log('[updateQuestionSet] id:', id);
    console.log('[updateQuestionSet] data:', JSON.stringify(data, null, 2));
    const result = await this.questionSets.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    console.log('[updateQuestionSet] result:', result);
    return result || null;
  }
  async deleteQuestionSet(id: string): Promise<boolean> {
    await this.connect();
    const result = await this.questionSets.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
  async listQuestionSets(filter: any = {}): Promise<any[]> {
    await this.connect();
    return this.questionSets.find(filter).toArray();
  }
  async listQuestionsInSet(setId: string): Promise<any[]> {
    await this.connect();
    const set = await this.questionSets.findOne({ _id: new ObjectId(setId) });
    if (!set || !set.questions) return [];
    return this.questionBankQuestions.find({ _id: { $in: set.questions.map((id: string) => new ObjectId(id)) } }).toArray();
  }
}