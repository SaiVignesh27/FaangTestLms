import React from 'react';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/providers/AuthProvider';
import { TestStatus, AssignmentStatus } from '@shared/types';
import { Calendar, Clock, Star, BookOpen, CheckCircle, FileQuestion, ClipboardList, Loader2, FileText, Award } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Course } from '@shared/schema';
import { Link } from 'wouter';

interface CourseProgress {
  courseId: string;
  completed: number;
  total: number;
  lastActivity?: Date;
  completedTests: number;
  totalTests: number;
  completedAssignments: number;
  totalAssignments: number;
}

interface CourseWithProgress extends Course {
  progress: number;
  completedItems: number;
  totalItems: number;
  lastActivity?: Date;
  completedTests: number;
  totalTests: number;
  completedAssignments: number;
  totalAssignments: number;
}

interface Task {
  id: string;
  title: string;
  type: 'assignment' | 'test';
  courseTitle: string;
  dueDate?: Date;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // Fetch enrolled courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/student/courses'],
  });
  
  // Fetch course progress
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<Record<string, CourseProgress>>({
    queryKey: ['/api/student/progress'],
  });
  
  // Fetch pending assignments
  const { data: pendingAssignments, isLoading: isLoadingAssignments } = useQuery<AssignmentStatus[]>({
    queryKey: ['/api/student/assignments/pending'],
  });

  // Fetch all assignments for counting
  const { data: allAssignments } = useQuery<AssignmentStatus[]>({
    queryKey: ['/api/student/assignments'],
  });

  // Fetch pending tests
  const { data: pendingTests, isLoading: isLoadingTests } = useQuery<TestStatus[]>({
    queryKey: ['/api/student/tests/pending'],
    enabled: !!user,
  });

  
  // Fetch all tests for counting
  const { data: allTests } = useQuery<TestStatus[]>({
    queryKey: ['/api/student/tests'],
    enabled: !!user,
  });

  // Calculate test stats
  const testStats = React.useMemo(() => {
    if (!allTests) return { total: 0, completed: 0, pending: 0 };
    
    return {
      total: allTests.length,
      completed: allTests.filter(t => t.status === 'completed').length,
      pending: allTests.filter(t => t.status === 'pending').length
    };
  }, [allTests]);

  // Calculate course-specific progress
  const calculateCourseProgress = React.useCallback((courseId: string) => {
    if (!allTests || !allAssignments || !courses) return {
      completedTests: 0,
      totalTests: 0,
      completedAssignments: 0,
      totalAssignments: 0
    };

    // Filter tests for this course
    const courseTests = allTests.filter(test => test.courseId === courseId);
    const completedTests = courseTests.filter(test => test.status === 'completed').length;
    const totalTests = courseTests.length;

    // Find the course title for the given courseId
    const course = courses.find(c => c._id === courseId);
    const courseTitle = course?.title;

    // Filter assignments for this course using courseId
    const courseAssignments = allAssignments.filter(assignment => assignment.courseId === courseId);
    const completedAssignments = courseAssignments.filter(assignment => assignment.status === 'completed').length;
    const totalAssignments = courseAssignments.length;

    return {
      completedTests,
      totalTests,
      completedAssignments,
      totalAssignments
    };
  }, [allTests, allAssignments, courses]);

  // Calculate assignment stats
  const assignmentStats = React.useMemo(() => {
    if (!allAssignments) return { total: 0, completed: 0, pending: 0, overdue: 0 };
    
    return {
      total: allAssignments.length,
      completed: allAssignments.filter(a => a.status === 'completed').length,
      pending: allAssignments.filter(a => a.status === 'pending').length,
      overdue: allAssignments.filter(a => a.status === 'overdue').length
    };
  }, [allAssignments]);

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    if (!testStats || !assignmentStats) return 0;
    
    const totalItems = testStats.total + assignmentStats.total;
    const completedItems = testStats.completed + assignmentStats.completed;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [testStats, assignmentStats]);

  // Separate upcoming assignments and tests
  const upcomingAssignments = React.useMemo(() => {
    if (!pendingAssignments) return [];
    return pendingAssignments.map(assignment => ({
      id: assignment._id,
      title: assignment.title,
      type: 'assignment' as const,
      dueDate: assignment.dueDate,
      courseTitle: assignment.courseTitle
    }));
  }, [pendingAssignments]);

  const upcomingTests = React.useMemo(() => {
    if (!pendingTests) return [];
    return pendingTests.map(test => ({
      id: test._id,
      title: test.title,
      type: 'test' as const,
      courseTitle: test.courseTitle
    }));
  }, [pendingTests]);

  // Process courses with progress data
  const coursesWithProgress: CourseWithProgress[] = React.useMemo(() => {
    if (!courses) return [];
    
    return courses.map(course => {
      const courseProgress = calculateCourseProgress(course._id as string);
      const totalItems = courseProgress.totalTests + courseProgress.totalAssignments;
      const completedItems = courseProgress.completedTests + courseProgress.completedAssignments;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...course,
        progress,
        completedItems,
        totalItems,
        lastActivity: progressData?.[course._id as string]?.lastActivity,
        completedTests: courseProgress.completedTests,
        totalTests: courseProgress.totalTests,
        completedAssignments: courseProgress.completedAssignments,
        totalAssignments: courseProgress.totalAssignments
      };
    });
  }, [courses, calculateCourseProgress, progressData]);

  // Check if all data is loading
  const isLoading = isLoadingAssignments || isLoadingTests || isLoadingCourses;

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'Student'}! 👋</h2>
              <p className="text-blue-100">
                Continue your learning journey and track your progress
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                asChild 
                className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
              >
                <Link href="/student/daily-tests">Continue Learning</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-purple-500" />
                Total Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  {assignmentStats.total}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{assignmentStats.completed} completed</span>
                </div>
                <div className="flex items-center text-yellow-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">{assignmentStats.pending} pending</span>
                </div>
              </div>
            </CardContent>
          </Card> */}
          
          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Enrolled Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  {courses?.length || 0}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center text-blue-600">
                  <Star className="h-4 w-4 mr-1" />
                  <span className="text-sm">Active Learning</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp" style={{ animationDelay: '200ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Number of Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                  {testStats.total}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{testStats.completed} completed</span>
                </div>
                <div className="flex items-center text-yellow-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">{testStats.pending} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp" style={{ animationDelay: '300ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-500" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                  {overallProgress}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center text-orange-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {testStats.completed + assignmentStats.completed} completed
                  </span>
                </div>
                <div className="flex items-center text-orange-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {testStats.total + assignmentStats.total} total
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Course Progress and Upcoming Tasks */}
        <div className="space-y-6">
          {/* Current Course Progress */}
          <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Cluster Progress
              </CardTitle>
              <CardDescription>Your most recent cluster activities</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : coursesWithProgress.length > 0 ? (
                <div className="space-y-6">
                  {coursesWithProgress.map((course, index) => (
                    <div 
                      key={course._id}
                      className="animate-fadeIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium text-gray-800 dark:text-white">{course.title}</h4>
                        <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                          {course.progress}% Complete
                        </span>
                      </div>
                      <Progress 
                        value={course.progress} 
                        className="h-2 bg-blue-100 dark:bg-blue-900"
                      />
                      <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Last activity: {course.lastActivity 
                            ? formatDistanceToNow(new Date(course.lastActivity), { addSuffix: true })
                            : 'No activity yet'}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            Tests: {course.completedTests}/{course.totalTests}
                          </span>
                          {/* <span className="flex items-center">
                            <ClipboardList className="h-3 w-3 mr-1" />
                            Assignments: {course.completedAssignments}/{course.totalAssignments}
                          </span> */}
                          <span className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Total: {course.completedItems}/{course.totalItems}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                    <BookOpen className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Clusters enrolled</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enroll in Clusters to start learning</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tests and Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Available Tests */}
            <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Available Tests
                </CardTitle>
                <CardDescription>Tests ready to be taken</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : upcomingTests.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingTests.map((test, index) => (
                      <div 
                        key={test.id} 
                        className="group relative overflow-hidden rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:shadow-md transition-all duration-300 animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                                  {test.title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {test.courseTitle}
                                </p>
                              </div>
                            </div>
                            <Button 
                              asChild 
                              size="sm"
                              variant="secondary"
                              className="group-hover:scale-105 transition-transform bg-purple-50 hover:bg-purple-100 text-purple-600"
                            >
                              <Link href={`/student/tests/${test.id}`}>
                                Take Test
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 mb-4">
                      <CheckCircle className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No available tests</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You've completed all available tests!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Assignments
            <Card className="hover:shadow-lg transition-all duration-300 animate-fadeIn">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Pending Assignments
                </CardTitle>
                <CardDescription>Your upcoming assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : upcomingAssignments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAssignments.map((assignment, index) => (
                      <div 
                        key={assignment.id} 
                        className="group relative overflow-hidden rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:shadow-md transition-all duration-300 animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <ClipboardList className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                  {assignment.title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {assignment.courseTitle}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {assignment.dueDate && (
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}
                                </div>
                              )}
                              <Button 
                                asChild 
                                size="sm"
                                className="group-hover:scale-105 transition-transform bg-blue-50 hover:bg-blue-100 text-blue-600"
                              >
                                <Link href={`/student/assignments/${assignment.id}`}>
                                  Start Assignment
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                      <CheckCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No pending assignments</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You're all caught up with your assignments!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
        }
      `}</style>
    </StudentLayout>
  );
}
