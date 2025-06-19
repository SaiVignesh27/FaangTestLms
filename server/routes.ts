import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mongoStorage } from "./index";
import bcrypt from "bcrypt";
import { CircleUser } from "lucide-react";
import { submitCode, getSubmissionResult, languageIds } from './judge0';
import { Test, TestSubmission, Assignment, AssignmentSubmission } from './models.ts';

// Add authentication middleware
const authenticateUser = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // In a real app, verify JWT token here
    // For now, we'll just check if it's a valid token format
    if (!token.startsWith('student-token-') && !token.startsWith('admin-token-')) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from token (in a real app, decode JWT)
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'No user email in request' });
    }

    const user = await mongoStorage.getUserByEmail(userEmail);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify token matches user role
    const isAdmin = token.startsWith('admin-token-');
    if ((isAdmin && user.role !== 'admin') || (!isAdmin && user.role !== 'student')) {
      return res.status(403).json({ error: 'Invalid token for user role' });
    }

    // Add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to validate answers based on question type
const validateAnswer = (question: any, answer: any): boolean => {
  switch (question.type) {
    case 'mcq':
      // For MCQ, check if the selected option matches the correct answer
      return question.correctAnswer === answer;
    
    case 'fill':
      // For fill in the blank, do a case-insensitive comparison
      const studentAnswer = String(answer).toLowerCase().trim();
      const correctAnswer = String(question.correctAnswer).toLowerCase().trim();
      console.log('Fill-in-blank validation:', {
        studentAnswer,
        correctAnswer,
        isEqual: studentAnswer === correctAnswer
      });
      return studentAnswer === correctAnswer;
    
    case 'code':
      // For code questions, compare the output with the correct answer
      return String(question.correctAnswer).toLowerCase().trim() === String(answer).toLowerCase().trim();
    
    default:
      return false;
  }
};

// Combine student code with validation program
function combineCodeWithValidation(studentCode: string, validationProgram: string, languageId: number): string {
  switch (languageId) {
    case 62: // Java
      // Insert student code inside Main class, above main method
      // The validation program must have // STUDENT_CODE_PLACEHOLDER inside the Main class
      return validationProgram.replace('// STUDENT_CODE_PLACEHOLDER', studentCode);
    case 54: // C++
      return validationProgram.replace('// STUDENT_CODE_PLACEHOLDER', studentCode);
    case 71: // Python
    case 63: // JavaScript
      return `${studentCode}\n\n${validationProgram}`;
    default:
      throw new Error('Unsupported language');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize MongoDB connection
  await mongoStorage.connect();

  // Test API endpoint
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
  });

  // Admin Dashboard Endpoints
  app.get('/api/admin/dashboard/stats', async (req, res) => {
    try {
      // Get counts from MongoDB storage
      const users = await mongoStorage.listUsers('student');
      const courses = await mongoStorage.listCourses();
      const tests = await mongoStorage.listTests();
      const assignments = await mongoStorage.listAssignments();

      const stats = {
        students: users.length,
        courses: courses.length,
        tests: tests.length,
        assignments: assignments.length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/courses/recent', async (req, res) => {
    try {
      const courses = await mongoStorage.listCourses();
      // Sort by creation date (newest first) and limit to 5
      const recentCourses = courses
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, 5);

      res.json(recentCourses);
    } catch (error) {
      console.error('Error fetching recent courses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/tests/recent', async (req, res) => {
    try {
      const tests = await mongoStorage.listTests();
      // Sort by creation date (newest first) and limit to 5
      const recentTests = tests
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, 5);

      res.json(recentTests);
    } catch (error) {
      console.error('Error fetching recent tests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/activities/recent', async (req, res) => {
    try {
      // Activity data for demonstration
      const activities = [
        {
          _id: '1',
          type: 'enrollment',
          title: 'New Enrollment',
          details: 'John Doe enrolled in JavaScript Basics',
          timestamp: new Date(),
          icon: 'user-plus',
          color: 'blue'
        },
        {
          _id: '2',
          type: 'completion',
          title: 'Course Completed',
          details: 'Sarah Miller completed React Fundamentals',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          icon: 'check-circle',
          color: 'green'
        },
        {
          _id: '3',
          type: 'update',
          title: 'Course Updated',
          details: 'Node.js Advanced was updated with new content',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: 'refresh-cw',
          color: 'purple'
        },
        {
          _id: '4',
          type: 'deadline',
          title: 'Assignment Due',
          details: 'Database Design assignment is due tomorrow',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          icon: 'clock',
          color: 'orange'
        }
      ];

      res.json(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Student Dashboard Endpoints
  app.get('/api/student/courses', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get courses based on visibility and assignedTo
      const courses = await mongoStorage.listCourses({ user });
      const classes = await mongoStorage.listClasses({ visibility: 'public' });
      const tests = await mongoStorage.listTests({ visibility: 'public' });
      const assignments = await mongoStorage.listAssignments({ visibility: 'public' });

      const coursesWithProgress = courses.map(course => {
        // Get all items for this course
        const courseClasses = classes.filter(c => c.courseId === course._id);
        const courseTests = tests.filter(t => t.courseId === course._id);
        const courseAssignments = assignments.filter(a => a.courseId === course._id);
        
        const totalItems = courseClasses.length + courseTests.length + courseAssignments.length;
        const completedItems = 0; // This will be updated when we implement progress tracking
        
        return {
          ...course,
          progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          instructor: {
            name: course.instructor?.name || 'Unknown Instructor',
            initials: course.instructor?.initials || 'UI'
          }
        };
      });

      res.json(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching student courses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/tests', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const courseId = req.query.courseId as string | undefined;
      const tests = await mongoStorage.listTests({ 
        courseId,
        user
      });
      const courses = await mongoStorage.listCourses({ user });

      // Fetch student's test results
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'test'
      });

      // Merge tests with results to determine status
      const testsWithStatus = tests.map(test => {
        const result = results.find(r => r.testId === test._id);
        const course = courses.find(c => c._id === test.courseId);

        return {
          ...test,
          status: result ? 'completed' : 'pending',
          courseTitle: course?.title || 'Unknown Course'
        };
      });

      res.json(testsWithStatus);
    } catch (error) {
      console.error('Error fetching student tests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/tests/pending', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Fetching tests for user:', user._id);

      // Get all tests for the user
      const tests = await mongoStorage.listTests({ user });
      console.log('Found tests:', tests.length);

      // Get all test results for the user
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'test'
      });
      console.log('Found results:', results.length);

      // Get courses for course titles
      const courses = await mongoStorage.listCourses({ user });
      console.log('Found courses:', courses.length);

      // Create a map of test IDs to their results for faster lookup
      const testResultsMap = new Map(
        results.map(result => [result.testId, result])
      );

      // Filter and map tests
      const pendingTests = tests
        .map(test => {
          const result = testResultsMap.get(test._id);
          const course = courses.find(c => c._id === test.courseId);
          
          return {
            ...test,
            courseTitle: course?.title || 'Unknown Course',
            isCompleted: !!result,
            status: result ? 'completed' : 'pending',
            result: result || null
          };
        })
        .filter(test => !test.isCompleted);

      console.log('Returning pending tests:', pendingTests.length);
      res.json(pendingTests);
    } catch (error) {
      console.error('Error in /api/student/tests/pending:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/student/tests/:id', authenticateUser, async (req, res) => {
    try {
      const testId = req.params.id;
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const test = await mongoStorage.getTest(testId, user);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Check if user has access to the test's course
      const course = await mongoStorage.getCourse(test.courseId, user);
      if (!course) {
        return res.status(403).json({ error: 'You do not have access to this test' });
      }

      res.json(test);
    } catch (error) {
      console.error('Error fetching student test:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const courseId = req.query.courseId as string | undefined;
      
      // If courseId is provided, filter assignments by course
      // Otherwise, list all assignments relevant to the user
      const assignments = await mongoStorage.listAssignments({
        ...(courseId && { courseId }), // Include courseId in filter if provided
        user // Pass user object to filter by enrolled courses and visibility
      });

      // Fetch student's assignment results
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Merge assignments with results to determine status
      const assignmentsWithStatus = assignments.map(assignment => {
        const result = results.find(r => r.assignmentId === assignment._id);
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : undefined;
        const now = new Date();
        const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
        const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;

        let status: 'pending' | 'completed' | 'overdue' = 'pending';
        
        if (result) {
          status = 'completed';
        } else if (dueDate && dueDate < now) {
          status = 'overdue';
        } else if (startTime && endTime && now > endTime) {
          status = 'overdue';
        }

        return {
          ...assignment,
          courseId: assignment.courseId, // Explicitly include courseId
          status,
          dueDate
        };
      });

      res.json(assignmentsWithStatus);
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments/pending', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const assignments = await mongoStorage.listAssignments({ user });
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Add due dates and status
      const pendingAssignments = assignments
        .filter(assignment => {
          const result = results.find(r => r.assignmentId === assignment._id);
          if (result) return false; // Skip completed assignments

          const assignmentDueDate = assignment.dueDate ? new Date(assignment.dueDate) : undefined;
          const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
          const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;
          const now = new Date();

          // Only include assignments that are pending
          if (assignmentDueDate && assignmentDueDate < now) return false; // Skip overdue assignments
          if (startTime && endTime && now > endTime) return false; // Skip assignments past their time window
          return true; // Include all other assignments as pending
        })
        .slice(0, 3)
        .map(assignment => {
          const assignmentDueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
          const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;
          const now = new Date();

          return {
            ...assignment,
            dueDate: assignmentDueDate,
            status: 'pending'
          };
        });

      res.json(pendingAssignments);
    } catch (error) {
      console.error('Error fetching pending assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/achievements', async (req, res) => {
    try {
      // Sample achievements data
      const achievements = [
        {
          _id: '1',
          type: 'enrollment',
          title: 'New Enrollment',
          details: 'John Doe enrolled in JavaScript Basics',
          timestamp: new Date(),
          icon: 'user-plus',
          color: 'blue'
        },
        {
          _id: '2',
          title: 'Test Ace',
          description: 'Scored 100% on React Components Test',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          icon: 'check-circle',
          type: 'test'
        },
        {
          _id: '3',
          title: 'Quick Learner',
          description: 'Completed 3 classes in one day',
          date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          icon: 'zap',
          type: 'class'
        }
      ];

      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/stats', async (req, res) => {
    try {
      // Sample student stats data
      const stats = {
        enrolledCourses: 5,
        completedCourses: 2,
        averageScore: 87,
        overallProgress: 65,
        testsCompleted: 12,
        assignmentsCompleted: 8,
        classesAttended: 24,
        codingPoints: 450,
        quizPoints: 320,
        participationPoints: 180,
        skills: {
          javascript: 85,
          react: 70,
          nodejs: 60,
          database: 55,
          problemSolving: 80
        }
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching student stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/profile', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't send the password
      const { password, ...userData } = user;

      res.json(userData);
    } catch (error) {
      console.error('Error fetching student profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/student/profile', authenticateUser, async (req, res) => {
    try {
      const { name } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only update the name, preserve the existing email
      const updatedUser = await mongoStorage.updateUser(user._id, { 
        name,
        email: user.email // Preserve the existing email
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Failed to update user' });
      }

      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error('Error updating student profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/student/profile/password', authenticateUser, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update the new password
      // The hashing is handled within mongoStorage.updateUser
      const updatedUser = await mongoStorage.updateUser(user._id, { password: newPassword });

      if (!updatedUser) {
        return res.status(500).json({ error: 'Failed to update password' });
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating student password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/profile', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't send the password
      const { password, ...userData } = user;

      res.json(userData);
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/profile', authenticateUser, async (req, res) => {
    try {
      const { name} = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await mongoStorage.updateUser(user._id, { name});
      if (!updatedUser) {
        return res.status(404).json({ error: 'Failed to update user' });
      }

      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error('Error updating admin profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/profile/password', authenticateUser, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const updatedUser = await mongoStorage.updateUser(user._id, { password: newPassword });

      if (!updatedUser) {
        return res.status(500).json({ error: 'Failed to update password' });
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating admin password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin User Management Endpoints
  app.get('/api/admin/users', async (req, res) => {
    try {
      const role = req.query.role as 'admin' | 'student' | undefined;
      const users = await mongoStorage.listUsers(role);

      // Don't send passwords
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/users', async (req, res) => {
    try {
      const userData = req.body;
      const newUser = await mongoStorage.createUser(userData);

      // Don't send password
      const { password, ...userWithoutPassword } = newUser;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await mongoStorage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't send password
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const userData = req.body;

      const updatedUser = await mongoStorage.updateUser(userId, userData);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't send password
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await mongoStorage.deleteUser(userId);

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Course Management Endpoints
  app.get('/api/admin/courses', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const courses = await mongoStorage.listCourses({ user });
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/courses', authenticateUser, async (req, res) => {
    try {
      // Only admins should be able to create courses
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const courseData = req.body;
      const newCourse = await mongoStorage.createCourse(courseData);
      res.status(201).json(newCourse);
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/courses/:id', authenticateUser, async (req, res) => {
    try {
      const courseId = req.params.id;
      const user = (req as any).user;
      const course = await mongoStorage.getCourse(courseId, user);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json(course);
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/courses/:id', authenticateUser, async (req, res) => {
    try {
      const courseId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const courseData = req.body;

      const updatedCourse = await mongoStorage.updateCourse(courseId, courseData);

      if (!updatedCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json(updatedCourse);
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/courses/:id', authenticateUser, async (req, res) => {
    try {
      const courseId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const result = await mongoStorage.deleteCourse(courseId);

      if (!result) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Class Management Endpoints
  app.get('/api/admin/classes', authenticateUser, async (req, res) => {
    try {
       const user = (req as any).user;
       if (!user || user.role !== 'admin') {
           return res.status(403).json({ error: 'Access denied' });
       }
      const courseId = req.query.courseId as string | undefined;
      const classes = await mongoStorage.listClasses({ courseId });
      res.json(classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/classes', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const classData = req.body;
      const newClass = await mongoStorage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      console.error('Error creating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/classes/:id', authenticateUser, async (req, res) => {
    try {
       const user = (req as any).user;
       if (!user || user.role !== 'admin') {
           return res.status(403).json({ error: 'Access denied' });
       }
      const classId = req.params.id;
      const classData = await mongoStorage.getClass(classId);

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json(classData);
    } catch (error) {
      console.error('Error fetching class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/classes/:id', authenticateUser, async (req, res) => {
    try {
      const classId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const classData = req.body;

      const updatedClass = await mongoStorage.updateClass(classId, classData);

      if (!updatedClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json(updatedClass);
    } catch (error) {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/classes/:id', authenticateUser, async (req, res) => {
    try {
      const classId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const result = await mongoStorage.deleteClass(classId);

      if (!result) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Test Management Endpoints
  app.get('/api/admin/tests', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const courseId = req.query.courseId as string | undefined;
      const classId = req.query.classId as string | undefined;

      const tests = await mongoStorage.listTests({ courseId, classId, user });
      res.json(tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/tests', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const testData = req.body;
      const newTest = await mongoStorage.createTest(testData);
      res.status(201).json(newTest);
    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/tests/:id', authenticateUser, async (req, res) => {
    try {
      const testId = req.params.id;
      const user = (req as any).user;
      const test = await mongoStorage.getTest(testId, user);

      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.json(test);
    } catch (error) {
      console.error('Error fetching test:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/tests/:id', authenticateUser, async (req, res) => {
    try {
      const testId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const testData = req.body;

      const updatedTest = await mongoStorage.updateTest(testId, testData);

      if (!updatedTest) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.json(updatedTest);
    } catch (error) {
      console.error('Error updating test:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/tests/:id', authenticateUser, async (req, res) => {
    try {
      const testId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const result = await mongoStorage.deleteTest(testId);

      if (!result) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Assignment Management Endpoints
  app.get('/api/admin/assignments', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const courseId = req.query.courseId as string | undefined;

      const assignments = await mongoStorage.listAssignments({ courseId, user });
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/assignments', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const assignmentData = req.body;
      const newAssignment = await mongoStorage.createAssignment(assignmentData);
      res.status(201).json(newAssignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const user = (req as any).user;
      const assignment = await mongoStorage.getAssignment(assignmentId, user);

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json(assignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/admin/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const assignmentData = req.body;
      console.log('PATCH /api/admin/assignments/:id received assignmentData.questions:', JSON.stringify(assignmentData.questions, null, 2));

      // Use replaceOne for full document replacement (except _id)
      const { _id, ...rest } = assignmentData;
      const updatedAssignment = await mongoStorage.replaceAssignment(assignmentId, rest);

      if (!updatedAssignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json(updatedAssignment);
    } catch (error) {
      console.error('Error updating assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const user = (req as any).user;
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const result = await mongoStorage.deleteAssignment(assignmentId);

      if (!result) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Result Management Endpoints
  app.get('/api/admin/results', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user; // Although not used for filtering here, keeping consistent
      if (!user || user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
      }
      const studentId = req.query.studentId as string | undefined;
      const courseId = req.query.courseId as string | undefined;
      const testId = req.query.testId as string | undefined;
      const assignmentId = req.query.assignmentId as string | undefined;

      const results = await mongoStorage.listResults({ 
        studentId, 
        courseId, 
        testId, 
        assignmentId 
      });

      res.json(results);
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/results', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
       if (!user || user.role !== 'admin') {
           return res.status(403).json({ error: 'Access denied' });
       }
      const resultData = req.body;
      const newResult = await mongoStorage.createResult(resultData);
      res.status(201).json(newResult);
    } catch (error) {
      console.error('Error creating result:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Student Endpoints
  app.get('/api/student/courses/:id', authenticateUser, async (req, res) => {
    try {
      const courseId = req.params.id;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const course = await mongoStorage.getCourse(courseId, user);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check if user is assigned to the course
      if (user.role === 'student' && !course.assignedTo?.includes(user._id)) {
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }

      res.json(course);
    } catch (error) {
      console.error('Error fetching course details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const courseId = req.query.courseId as string | undefined;
      
      // If courseId is provided, filter assignments by course
      // Otherwise, list all assignments relevant to the user
      const assignments = await mongoStorage.listAssignments({
        ...(courseId && { courseId }), // Include courseId in filter if provided
        user // Pass user object to filter by enrolled courses and visibility
      });

      // Fetch student's assignment results
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Merge assignments with results to determine status
      const assignmentsWithStatus = assignments.map(assignment => {
        const result = results.find(r => r.assignmentId === assignment._id);
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : undefined;
        const now = new Date();
        const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
        const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;

        let status: 'pending' | 'completed' | 'overdue' = 'pending';
        
        if (result) {
          status = 'completed';
        } else if (dueDate && dueDate < now) {
          status = 'overdue';
        } else if (startTime && endTime && now > endTime) {
          status = 'overdue';
        }

        return {
          ...assignment,
          courseId: assignment.courseId,
          status,
          dueDate
        };
      });

      res.json(assignmentsWithStatus);
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const assignment = await mongoStorage.getAssignment(assignmentId, user);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check if user has access to the assignment's course
      const course = await mongoStorage.getCourse(assignment.courseId, user);
      if (!course) {
        return res.status(403).json({ error: 'You do not have access to this assignment' });
      }

      res.json(assignment);
    } catch (error) {
      console.error('Error fetching student assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/classes', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const courseId = req.query.courseId as string | undefined;
      
      // First get the course to check access
      if (courseId) {
        const course = await mongoStorage.getCourse(courseId, user);
        if (!course) {
          return res.status(403).json({ error: 'You do not have access to this course' });
        }
      }

      const classes = await mongoStorage.listClasses({ 
        courseId
      });

      res.json(classes);
    } catch (error) {
      console.error('Error fetching student classes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/classes/:id', authenticateUser, async (req, res) => {
    try {
      const classId = req.params.id;
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const classData = await mongoStorage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Check if user has access to the class's course
      const course = await mongoStorage.getCourse(classData.courseId, user);
      if (!course) {
        return res.status(403).json({ error: 'You do not have access to this class' });
      }

      res.json(classData);
    } catch (error) {
      console.error('Error fetching student class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/results', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Filter results to only include items from courses the student has access to
      const filteredResults = [];
      for (const result of results) {
        const course = await mongoStorage.getCourse(result.courseId, user);
        if (course) {
          filteredResults.push(result);
        }
      }

      res.json(filteredResults);
    } catch (error) {
      console.error('Error fetching student results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/tests/:id/results', authenticateUser, async (req, res) => {
    try {
      const testId = req.params.id;
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const test = await mongoStorage.getTest(testId, user);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Check if user has access to the test's course
      const course = await mongoStorage.getCourse(test.courseId, user);
      if (!course) {
        return res.status(403).json({ error: 'You do not have access to this test' });
      }

      const result = await mongoStorage.listResults({ 
        studentId: user._id,
        testId 
      }).then(results => results[0]);

      res.json({ 
        test,
        result: result || null
      });
    } catch (error) {
      console.error('Error fetching test results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments/:id/results', authenticateUser, async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const assignment = await mongoStorage.getAssignment(assignmentId, user);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check if user has access to the assignment's course
      const course = await mongoStorage.getCourse(assignment.courseId, user);
      if (!course) {
        return res.status(403).json({ error: 'You do not have access to this assignment' });
      }

      // Get the specific result for this assignment
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment',
        assignmentId: assignmentId // Add assignmentId to filter
      });

      const result = results[0]; // Get the first (and should be only) result for this assignment

      if (!result) {
        return res.status(404).json({ error: 'Result not found' });
      }

      res.json({ assignment, result });
    } catch (error) {
      console.error('Error fetching assignment results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/student/results', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if a result already exists for this test/assignment
      const existingResult = await mongoStorage.listResults({
        studentId: user._id,
        type: 'assignment'
      }).then(results => results[0]);

      if (existingResult) {
        // Update existing result
        const updatedResult = await mongoStorage.updateResult(existingResult._id!, {
          ...req.body,
          studentId: user._id,
          submittedAt: new Date()
        });
        return res.json(updatedResult);
      }

      // Create new result
      const resultData = {
        ...req.body,
        studentId: user._id,
        submittedAt: new Date()
      };

      const newResult = await mongoStorage.createResult(resultData);
      res.status(201).json(newResult);
    } catch (error) {
      console.error('Error creating student result:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/leaderboard', async (req, res) => {
    try {
      const courseId = req.query.courseId as string;
      const type = req.query.type as 'test' | 'assignment';
      const timeRange = req.query.timeRange as string;
      const itemId = req.query.itemId as string;

      // Get results with filters
      const results = await mongoStorage.listResults({
        courseId: courseId !== 'all' ? courseId : undefined,
        testId: type === 'test' && itemId !== 'all' ? itemId : undefined,
        assignmentId: type === 'assignment' && itemId !== 'all' ? itemId : undefined,
        type
      });

      // Filter by time range
      const now = new Date();
      const filteredResults = results.filter(result => {
        const submittedAt = new Date(result.submittedAt);
        switch (timeRange) {
          case 'week':
            return (now.getTime() - submittedAt.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return (now.getTime() - submittedAt.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          case 'year':
            return (now.getTime() - submittedAt.getTime()) <= 365 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      }).filter(result => {
        if (type === 'test') return result.testId;
        if (type === 'assignment') return result.assignmentId;
        return true;
      });

      // Group by student and calculate scores
      const leaderboardMap = new Map();

      for (const result of filteredResults) {
        const student = await mongoStorage.getUser(result.studentId);
        if (!student) continue;

        const key = `${result.studentId}-${result.testId || result.assignmentId}`;
        const entry = leaderboardMap.get(key) || {
          studentId: result.studentId,
          studentName: student.name,
          courseId: result.courseId,
          testId: result.testId,
          assignmentId: result.assignmentId,
          score: result.score || 0, // Include 0 scores
          completedAt: result.submittedAt,
          timeSpent: result.timeSpent || 0 // Add timeSpent from result
        };

        // Update completedAt and timeSpent if this is a more recent submission
        if (result.submittedAt > entry.completedAt) {
          entry.completedAt = result.submittedAt;
          entry.timeSpent = result.timeSpent || 0;
        }

        leaderboardMap.set(key, entry);
      }

      // Convert to array and sort by score
      const sortedLeaderboard = Array.from(leaderboardMap.values())
        .sort((a, b) => b.score - a.score);

      // Assign ranks with ties
      const leaderboard: (typeof sortedLeaderboard[0] & { rank: number })[] = [];
      let currentRank = 0;
      let previousScore = -1;

      for (let i = 0; i < sortedLeaderboard.length; i++) {
        const entry = sortedLeaderboard[i];
        if (entry.score !== previousScore) {
          currentRank = i + 1;
        }
        leaderboard.push({ ...entry, rank: currentRank });
        previousScore = entry.score;
      }

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/progress', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get all course progress for the student
      const courseProgress = await mongoStorage.listCourseProgress({ studentId: user._id });
      
      // Get all courses the student is enrolled in
      const courses = await mongoStorage.listCourses({ 
        visibility: 'public',
        createdBy: user._id 
      });

      // Get all tests and assignments for the courses
      const allTests = await mongoStorage.listTests({ user });
      const allAssignments = await mongoStorage.listAssignments({ user });
      
      // Calculate completed tests and assignments
      const completedTests = courseProgress.reduce((acc, cp) => 
        acc + cp.completedItems.filter(item => item.itemType === 'test').length, 0);
      const completedAssignments = courseProgress.reduce((acc, cp) => 
        acc + cp.completedItems.filter(item => item.itemType === 'assignment').length, 0);
      
      // Calculate total tests and assignments
      const totalTests = allTests.length;
      const totalAssignments = allAssignments.length;
      
      // Calculate overall progress based on completed items
      const totalItems = totalTests + totalAssignments;
      const completedItems = completedTests + completedAssignments;
      const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Calculate progress
      const progress = {
        overall: overallProgress,
        courses: {
          completed: courseProgress.filter(cp => cp.completedItems.length === cp.totalItems).length,
          inProgress: courseProgress.filter(cp => cp.completedItems.length > 0 && cp.completedItems.length < cp.totalItems).length,
          total: courses.length
        },
        tests: {
          completed: completedTests,
          pending: totalTests - completedTests,
          average: courseProgress.length > 0
            ? Math.round(courseProgress.reduce((acc, cp) => {
                const testScores = cp.completedItems
                  .filter(item => item.itemType === 'test' && item.score !== undefined)
                  .map(item => item.score!);
                return acc + (testScores.reduce((sum, score) => sum + score, 0) / testScores.length);
              }, 0) / courseProgress.length)
            : 0
        },
        assignments: {
          completed: completedAssignments,
          pending: totalAssignments - completedAssignments,
          average: courseProgress.length > 0
            ? Math.round(courseProgress.reduce((acc, cp) => {
                const assignmentScores = cp.completedItems
                  .filter(item => item.itemType === 'assignment' && item.score !== undefined)
                  .map(item => item.score!);
                return acc + (assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length);
              }, 0) / courseProgress.length)
            : 0
        }
      };

      res.json(progress);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update course progress endpoint
  app.post('/api/student/progress', authenticateUser, async (req, res) => {
    try {
      const { courseId, itemId, itemType, score } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get existing progress or create new
      let progress = await mongoStorage.getCourseProgressByStudentAndCourse(user._id, courseId);
      
      if (!progress) {
        // Get course to determine total items
        const course = await mongoStorage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ error: 'Course not found' });
        }

        // Calculate total items
        const totalItems = (course.classes?.length || 0) + 
          (course.tests?.length || 0) + 
          (course.assignments?.length || 0);

        // Create new progress
        progress = await mongoStorage.createCourseProgress({
          studentId: user._id,
          courseId,
          completedItems: [],
          totalItems
        });
      }

      // Check if item is already completed
      const existingItem = progress.completedItems.find((item: any) => item.itemId === itemId);
      if (existingItem) {
        // Update existing item
        existingItem.completedAt = new Date();
        if (score !== undefined) {
          existingItem.score = score;
        }
      } else {
        // Add new completed item
        progress.completedItems.push({
          itemId,
          itemType,
          completedAt: new Date(),
          score
        });
      }

      // Update progress
      progress.lastActivity = new Date();
      const updatedProgress = await mongoStorage.updateCourseProgress(progress._id!, progress);

      res.json(updatedProgress);
    } catch (error) {
      console.error('Error updating course progress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Authentication routes
  app.post('/api/auth/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user by email
      const user = await mongoStorage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Not an admin account.' });
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create token (in a real app, use JWT)
      const token = 'admin-token-' + Date.now();

      // Return user info and token
      return res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/student/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user by email
      const user = await mongoStorage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is student
      if (user.role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Not a student account.' });
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create token (in a real app, use JWT)
      const token = 'student-token-' + Date.now();

      // Return user info and token
      return res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Student login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Student Results Endpoints
  app.get('/api/student/results/tests', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all test results for this student
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'test'
      });

      // Filter results to only include items from courses the student has access to
      const filteredResults = [];
      for (const result of results) {
        const course = await mongoStorage.getCourse(result.courseId, user);
        if (course) {
          filteredResults.push(result);
        }
      }

      res.json(filteredResults);
    } catch (error) {
      console.error('Error fetching student test results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/results/assignments', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all assignment results for this student
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Filter results to only include items from courses the student has access to
      const filteredResults = [];
      for (const result of results) {
        const course = await mongoStorage.getCourse(result.courseId, user);
        if (course) {
          filteredResults.push(result);
        }
      }

      res.json(filteredResults);
    } catch (error) {
      console.error('Error fetching student assignment results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/leaderboard', async (req, res) => {
    try {
      const courseId = req.query.courseId as string;
      const type = req.query.type as 'test' | 'assignment';
      const timeRange = req.query.timeRange as string;
      const itemId = req.query.itemId as string;

      // Get results with filters
      const results = await mongoStorage.listResults({
        courseId: courseId !== 'all' ? courseId : undefined,
        testId: type === 'test' && itemId !== 'all' ? itemId : undefined,
        assignmentId: type === 'assignment' && itemId !== 'all' ? itemId : undefined,
        type
      });

      // Filter by time range
      const now = new Date();
      const filteredResults = results.filter(result => {
        const submittedAt = new Date(result.submittedAt);
        switch (timeRange) {
          case 'week':
            return (now.getTime() - submittedAt.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return (now.getTime() - submittedAt.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          case 'year':
            return (now.getTime() - submittedAt.getTime()) <= 365 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      }).filter(result => {
        if (type === 'test') return result.testId;
        if (type === 'assignment') return result.assignmentId;
        return true;
      });

      // Group by student and calculate scores
      const leaderboardMap = new Map();

      for (const result of filteredResults) {
        const student = await mongoStorage.getUser(result.studentId);
        if (!student) continue;

        const key = `${result.studentId}-${result.testId || result.assignmentId}`;
        const entry = leaderboardMap.get(key) || {
          studentId: result.studentId,
          studentName: student.name,
          courseId: result.courseId,
          testId: result.testId,
          assignmentId: result.assignmentId,
          score: result.score || 0, // Include 0 scores
          completedAt: result.submittedAt,
          timeSpent: result.timeSpent || 0 // Add timeSpent from result
        };

        // Update completedAt and timeSpent if this is a more recent submission
        if (result.submittedAt > entry.completedAt) {
          entry.completedAt = result.submittedAt;
          entry.timeSpent = result.timeSpent || 0;
        }

        leaderboardMap.set(key, entry);
      }

      // Convert to array and sort by score
      const sortedLeaderboard = Array.from(leaderboardMap.values())
        .sort((a, b) => b.score - a.score);

      // Assign ranks with ties
      const leaderboard: (typeof sortedLeaderboard[0] & { rank: number })[] = [];
      let currentRank = 0;
      let previousScore = -1;

      for (let i = 0; i < sortedLeaderboard.length; i++) {
        const entry = sortedLeaderboard[i];
        if (entry.score !== previousScore) {
          currentRank = i + 1;
        }
        leaderboard.push({ ...entry, rank: currentRank });
        previousScore = entry.score;
      }

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/tests/upcoming', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const tests = await mongoStorage.listTests({ user });

      // Add additional information for display
      const upcomingTests = tests
        .filter(test => {
          // Only include tests that haven't been completed
          const dueDate = (test as any).dueDate ? new Date((test as any).dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          return dueDate > new Date();
        })
        .slice(0, 3)
        .map(test => ({
          ...test,
          dueDate: (test as any).dueDate || new Date(Date.now() + Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
          status: 'pending'
        }));

      res.json(upcomingTests);
    } catch (error) {
      console.error('Error fetching upcoming tests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/assignments/pending', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const assignments = await mongoStorage.listAssignments({ user });
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'assignment'
      });

      // Add due dates and status
      const pendingAssignments = assignments
        .filter(assignment => {
          const result = results.find(r => r.assignmentId === assignment._id);
          if (result) return false; // Skip completed assignments

          const assignmentDueDate = assignment.dueDate ? new Date(assignment.dueDate) : undefined;
          const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
          const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;
          const now = new Date();

          // Only include assignments that are pending
          if (assignmentDueDate && assignmentDueDate < now) return false; // Skip overdue assignments
          if (startTime && endTime && now > endTime) return false; // Skip assignments past their time window
          return true; // Include all other assignments as pending
        })
        .slice(0, 3)
        .map(assignment => {
          const assignmentDueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const startTime = assignment.timeWindow?.startTime ? new Date(assignment.timeWindow.startTime) : undefined;
          const endTime = assignment.timeWindow?.endTime ? new Date(assignment.timeWindow.endTime) : undefined;
          const now = new Date();

          return {
            ...assignment,
            dueDate: assignmentDueDate,
            status: 'pending'
          };
        });

      res.json(pendingAssignments);
    } catch (error) {
      console.error('Error fetching pending assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/student/tests/pending', authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Fetching tests for user:', user._id);

      // Get all tests for the user
      const tests = await mongoStorage.listTests({ user });
      console.log('Found tests:', tests.length);

      // Get all test results for the user
      const results = await mongoStorage.listResults({ 
        studentId: user._id,
        type: 'test'
      });
      console.log('Found results:', results.length);

      // Get courses for course titles
      const courses = await mongoStorage.listCourses({ user });
      console.log('Found courses:', courses.length);

      // Create a map of test IDs to their results for faster lookup
      const testResultsMap = new Map(
        results.map(result => [result.testId, result])
      );

      // Filter and map tests
      const pendingTests = tests
        .map(test => {
          const result = testResultsMap.get(test._id);
          const course = courses.find(c => c._id === test.courseId);
          
          return {
            ...test,
            courseTitle: course?.title || 'Unknown Course',
            isCompleted: !!result,
            status: result ? 'completed' : 'pending',
            result: result || null
          };
        })
        .filter(test => !test.isCompleted);

      console.log('Returning pending tests:', pendingTests.length);
      res.json(pendingTests);
    } catch (error) {
      console.error('Error in /api/student/tests/pending:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Code execution routes
  app.post('/api/compile/test', async (req, res) => {
    try {
      const { code, languageId, testId, questionId } = req.body;
      console.log('Received compilation request:', { languageId, testId, questionId });

      // Fetch test or assignment
      let testOrAssignment = await mongoStorage.getTest(testId);
      let isAssignment = false;
      if (!testOrAssignment) {
        testOrAssignment = await mongoStorage.getAssignment(testId);
        isAssignment = true;
      }
      if (!testOrAssignment) {
        console.log('Test or Assignment not found:', testId);
        return res.status(404).json({ error: 'Test or Assignment not found' });
      }

      // Fetch question
      console.log('Questions array:', JSON.stringify(testOrAssignment.questions, null, 2));
      console.log('Looking for questionId:', questionId);
      const question = testOrAssignment.questions.find(q => {
        if (q._id) {
          return q._id.toString() === questionId;
        }
        const index = testOrAssignment.questions.indexOf(q);
        return index.toString() === questionId;
      });
      console.log('Matched question:', JSON.stringify(question, null, 2));

      if (!question) {
        console.log('Question not found:', questionId);
        return res.status(404).json({ error: 'Question not found' });
      }

      // Get validation program
      let validationProgram = '';
      switch (languageId) {
        case 62:
          validationProgram = (question as any).validationProgram?.java || '';
          console.log('Java validation program:', validationProgram);
          break;
        case 71:
          validationProgram = (question as any).validationProgram?.python || '';
          console.log('Python validation program:', validationProgram);
          break;
        case 54:
          validationProgram = (question as any).validationProgram?.cpp || '';
          break;
        case 63:
          validationProgram = (question as any).validationProgram?.javascript || '';
          break;
        default:
          return res.status(400).json({ error: 'Unsupported language' });
      }

      // For Java/C++, require the placeholder
      if ((languageId === 62 || languageId === 54) && !validationProgram.includes('// STUDENT_CODE_PLACEHOLDER')) {
        return res.status(400).json({ error: 'Validation program must include // STUDENT_CODE_PLACEHOLDER for Java or C++' });
      }

      // Defensive: ensure testCases exists
      if (!question.testCases || !Array.isArray(question.testCases)) {
        return res.status(400).json({ error: 'No test cases found for this question' });
      }

      const testResults = [];
      for (const testCase of question.testCases) {
        const combinedCode = combineCodeWithValidation(code, validationProgram, languageId);
        try {
          const token = await submitCode(combinedCode, languageId, testCase.input);
          const result = await getSubmissionResult(token);

          // Decode outputs
          let stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
          const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
          const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';
          stdout = stdout.trim();
          const output = (testCase.output || '').trim();
          const isCorrect = stdout.replace(/\r?\n/g, '') === output.replace(/\r?\n/g, '');

          testResults.push({
            passed: isCorrect,
            input: testCase.input,
            output,
            actualOutput: stdout,
            executionTime: result.time || 0,
            error: stderr || compileOutput,
            fullOutput: stdout
          });
        } catch (err) {
          console.error('Error processing test case:', err);
          testResults.push({
            passed: false,
            input: testCase.input,
            output: (testCase.output || '').trim(),
            actualOutput: '',
            executionTime: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
            fullOutput: ''
          });
        }
      }

      const totalPassed = testResults.filter(t => t.passed).length;
      const score = Math.round((totalPassed / testResults.length) * 100);

      res.json({
        output: testResults.length > 0 ? testResults[testResults.length - 1].actualOutput : '',
        testResults,
        score,
        executionTime: Math.max(...testResults.map(t => parseFloat(t.executionTime.toString()) || 0))
      });
    } catch (error) {
      console.error('Error compiling code:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update the test submission endpoint
  app.post('/api/tests/:testId/submit', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const { answers } = req.body;
      const userId = (req as any).user._id;

      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Process answers and execute code if needed
      const processedAnswers = await Promise.all(answers.map(async (answer: any, index: number) => {
        const question = test.questions[index];
        
        // For code questions
        if (question.type === 'code') {
          const answerValue = typeof answer === 'string' ? JSON.parse(answer) : answer;
          const { code, output } = answerValue;
          
          // Compare output with expected output
          const isCorrect = output.trim() === question.correctAnswer.trim();
          
          return {
            questionId: index.toString(),
            answer: answerValue,
            isCorrect,
            points: isCorrect ? question.points : 0,
            feedback: isCorrect 
              ? "Correct answer" 
              : `Incorrect. Expected output: ${question.correctAnswer}`,
            correctAnswer: question.correctAnswer
          };
        }
        
        // For non-code questions
        const answerValue = answer.answer || answer;
        let isCorrect = false;

        if (question.type === 'fill') {
          // For fill-in-blank, do case-insensitive comparison and trim whitespace
          const studentAnswer = String(answerValue).toLowerCase().trim();
          const correctAnswer = String(question.correctAnswer).toLowerCase().trim();
          isCorrect = studentAnswer === correctAnswer;
          
          console.log('Fill-in-blank submission:', {
            studentAnswer,
            correctAnswer,
            isCorrect,
            rawStudentAnswer: answerValue,
            rawCorrectAnswer: question.correctAnswer
          });
        } else if (question.type === 'mcq') {
          // For MCQ, do exact comparison
          isCorrect = question.correctAnswer === answerValue;
        }

        return {
          questionId: index.toString(),
          answer: answerValue,
          isCorrect,
          points: isCorrect ? question.points : 0,
          feedback: isCorrect 
            ? "Correct answer" 
            : `Incorrect. Correct answer: ${question.correctAnswer}`,
          correctAnswer: question.correctAnswer
        };
      }));

      // Calculate total score
      const totalScore = processedAnswers.reduce((sum, answer) => sum + answer.points, 0);

      // Save submission
      const submission = new TestSubmission({
        testId,
        userId,
        answers: processedAnswers,
        score: totalScore,
        maxScore: test.questions.reduce((sum: number, q: any) => sum + q.points, 0),
        results: processedAnswers.map(answer => ({
          questionId: answer.questionId,
          questionText: test.questions[parseInt(answer.questionId)].text,
          correctAnswer: answer.correctAnswer,
          userAnswer: answer.answer,
          isCorrect: answer.isCorrect,
          points: answer.points
        }))
      });
      await submission.save();

      res.json({
        submission,
        results: processedAnswers,
        score: totalScore,
        maxScore: test.questions.reduce((sum: number, q: any) => sum + q.points, 0)
      });
    } catch (error) {
      console.error('Error submitting test:', error);
      res.status(500).json({ error: 'Failed to submit test' });
    }
  });

  // Update the assignment submission endpoint
  app.post('/api/assignments/:assignmentId/submit', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { assignmentId } = req.params;
      const { answers, timeSpent } = req.body;
      const userId = (req as any).user._id;

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Invalid answers format' });
      }

      console.log('Submitting assignment:', { assignmentId, userId, answers, timeSpent });

      const assignment = await mongoStorage.getAssignment(assignmentId, (req as any).user);
      if (!assignment) {
        console.error('Assignment not found:', assignmentId);
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check for existing submission for this specific assignment
      const existingSubmission = await mongoStorage.listResults({
        studentId: userId,
        assignmentId: assignmentId, // Add assignmentId to filter
        type: 'assignment'
      }).then(results => results[0]);

      if (existingSubmission) {
        console.log('Existing submission found:', existingSubmission._id);
        return res.status(400).json({ 
          error: 'Assignment already submitted',
          submission: existingSubmission
        });
      }

      // Process answers
      const processedAnswers = await Promise.all(assignment.questions.map(async (question, index) => {
        const answer = answers[index.toString()];

        // For code questions
        if (question.type === 'code') {
          // ... existing code question handling ...
        }
        
        // For non-code questions
        let answerValue;
        if (question.type === 'mcq') {
          // For MCQ, the answer should be the selected option
          answerValue = answer?.selectedOption || answer || '';
        } else {
          // For fill-in-blank, use the answer directly
          answerValue = answer?.answer || answer || '';
        }

        let isCorrect = false;

        if (question.type === 'fill') {
          // For fill-in-blank, do case-insensitive comparison and trim whitespace
          const studentAnswer = String(answerValue).toLowerCase().trim();
          const correctAnswer = String(question.correctAnswer).toLowerCase().trim();
          isCorrect = studentAnswer === correctAnswer;

          console.log('Fill-in-blank validation:', {
            studentAnswer,
            correctAnswer,
            isCorrect
          });
        } else if (question.type === 'mcq') {
          // For MCQ, do exact comparison
          isCorrect = question.correctAnswer === answerValue;
          
          console.log('MCQ validation:', {
            studentAnswer: answerValue,
            correctAnswer: question.correctAnswer,
            isCorrect
          });
        }

        return {
          questionId: index.toString(),
          answer: answerValue,
          isCorrect,
          points: isCorrect ? question.points : 0,
          feedback: isCorrect 
            ? "Correct answer" 
            : `Incorrect. Correct answer: ${question.correctAnswer}`,
          correctAnswer: question.correctAnswer
        };
      }));

      // Calculate total score and percentage
      const totalScore = processedAnswers.reduce((sum, answer) => sum + answer.points, 0);
      const maxScore = assignment.questions.reduce((sum: number, q: any) => sum + q.points, 0);
      const scorePercentage = Math.round((totalScore / maxScore) * 100);

      console.log('Creating submission result:', {
        assignmentId,
        studentId: userId,
        score: totalScore,
        scorePercentage,
        maxScore,
        answersCount: processedAnswers.length,
        processedAnswers,
        timeSpent
      });

      // Create submission result
      const resultData = {
        assignmentId,
        studentId: userId,
        type: 'assignment' as const,
        status: 'completed' as const,
        courseId: assignment.courseId,
        title: assignment.title,
        studentName: (req as any).user.name,
        answers: processedAnswers,
        score: totalScore,
        scorePercentage,
        maxScore,
        timeSpent: timeSpent || null,
        submittedAt: new Date()
      };

      const submission = await mongoStorage.createResult(resultData);

      console.log('Submission created successfully:', submission._id);

      res.json({
        submission,
        results: processedAnswers,
        score: totalScore,
        scorePercentage,
        maxScore,
        timeSpent: timeSpent || null
      });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      res.status(500).json({ 
        error: 'Failed to submit assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Code execution for assignments
  app.post('/api/compile/assignment', async (req, res) => {
    try {
      const { code, languageId, assignmentId, questionId } = req.body;
      console.log('Received assignment compilation request:', { languageId, assignmentId, questionId });

      // Fetch assignment
      const assignment = await mongoStorage.getAssignment(assignmentId);
      if (!assignment) {
        console.log('Assignment not found:', assignmentId);
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Fetch question
      const question = assignment.questions.find(q => {
        if (q._id) {
          return q._id.toString() === questionId;
        }
        const index = assignment.questions.indexOf(q);
        return index.toString() === questionId;
      });

      if (!question) {
        console.log('Question not found:', questionId);
        return res.status(404).json({ error: 'Question not found' });
      }

      // Get validation program
      let validationProgram = '';
      switch (languageId) {
        case 62:
          validationProgram = (question as any).validationProgram?.java || '';
          console.log('Java validation program:', validationProgram);
          break;
        case 71:
          validationProgram = (question as any).validationProgram?.python || '';
          console.log('Python validation program:', validationProgram);
          break;
        case 54:
          validationProgram = (question as any).validationProgram?.cpp || '';
          break;
        case 63:
          validationProgram = (question as any).validationProgram?.javascript || '';
          break;
        default:
          return res.status(400).json({ error: 'Unsupported language' });
      }

      // For Java/C++, require the placeholder
      if ((languageId === 62 || languageId === 54) && !validationProgram.includes('// STUDENT_CODE_PLACEHOLDER')) {
        return res.status(400).json({ error: 'Validation program must include // STUDENT_CODE_PLACEHOLDER for Java or C++' });
      }

      // Defensive: ensure testCases exists
      if (!question.testCases || !Array.isArray(question.testCases)) {
        return res.status(400).json({ error: 'No test cases found for this question' });
      }

      const testResults = [];
      for (const testCase of question.testCases) {
        const combinedCode = combineCodeWithValidation(code, validationProgram, languageId);
        console.log('Sending to Judge0:', { languageId, combinedCode, input: testCase.input });
        try {
          const token = await submitCode(combinedCode, languageId, testCase.input);
          const result = await getSubmissionResult(token);
          console.log('Received from Judge0:', result);

          // Decode outputs
          let stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
          const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
          const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';
          stdout = stdout.trim();
          const output = (testCase.output || '').trim();
          const isCorrect = stdout.replace(/\r?\n/g, '') === output.replace(/\r?\n/g, '');

          testResults.push({
            passed: isCorrect,
            input: testCase.input,
            output,
            actualOutput: stdout,
            executionTime: result.time || 0,
            error: stderr || compileOutput,
            fullOutput: stdout
          });
        } catch (err) {
          console.error('Error processing test case:', err);
          testResults.push({
            passed: false,
            input: testCase.input,
            output: (testCase.output || '').trim(),
            actualOutput: '',
            executionTime: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
            fullOutput: ''
          });
        }
      }

      const totalPassed = testResults.filter(t => t.passed).length;
      const score = Math.round((totalPassed / testResults.length) * 100);

      res.json({
        output: testResults.length > 0 ? testResults[testResults.length - 1].actualOutput : '',
        testResults,
        score,
        executionTime: Math.max(...testResults.map(t => parseFloat(t.executionTime.toString()) || 0))
      });
    } catch (error) {
      console.error('Error compiling assignment code:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}