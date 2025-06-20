import React from 'react';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Course, Class, Test, Assignment } from '@shared/schema';
import { useAuth } from '@/providers/AuthProvider';
import { Link, useParams } from 'wouter';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import {
  School,
  Loader2,
  FileVideo,
  FileText,
  FileQuestion,
  ClipboardList,
  BookOpen,
  Users,
  Star,
  CheckCircle,
  Gauge,
} from 'lucide-react';

interface CourseWithProgress extends Course {
  progress: number;
  completedItems: number;
  totalItems: number;
  instructor: {
    name: string;
    title: string;
    initials: string;
  };
  completedTests: number;
  totalTests: number;
  completedAssignments: number;
  totalAssignments: number;
}

interface ProgressData {
  overall: number;
  courses: {
    completed: number;
    inProgress: number;
    total: number;
  };
  tests: {
    completed: number;
    pending: number;
    average: number;
  };
  assignments: {
    completed: number;
    pending: number;
    average: number;
  };
}

export default function MyCourses() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ['/api/student/courses'],
  });

  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/student/classes'],
  });

  const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
    queryKey: ['/api/student/tests'],
  });

  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/student/assignments'],
  });

  const { data: progressData, isLoading: isLoadingProgress } = useQuery<ProgressData>({
    queryKey: ['/api/student/progress'],
  });

  // Calculate course-specific progress
  const calculateCourseProgress = React.useCallback((courseId: string) => {
    if (!tests || !assignments) return {
      completedTests: 0,
      totalTests: 0,
      completedAssignments: 0,
      totalAssignments: 0
    };

    // Filter tests for this course
    const courseTests = tests.filter(test => test.courseId === courseId);
    const completedTests = courseTests.filter(test => test.status === 'completed').length;
    const totalTests = courseTests.length;

    // Filter assignments for this course
    const courseAssignments = assignments.filter(assignment => assignment.courseId === courseId);
    const completedAssignments = courseAssignments.filter(assignment => assignment.status === 'completed').length;
    const totalAssignments = courseAssignments.length;

    return {
      completedTests,
      totalTests,
      completedAssignments,
      totalAssignments
    };
  }, [tests, assignments]);

  // Process courses with progress data
  const coursesWithProgress = React.useMemo(() => {
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
        completedTests: courseProgress.completedTests,
        totalTests: courseProgress.totalTests,
        completedAssignments: courseProgress.completedAssignments,
        totalAssignments: courseProgress.totalAssignments
      };
    });
  }, [courses, calculateCourseProgress]);

  // Filter courses by progress for tabs
  const allCourses = coursesWithProgress;
  const inProgressCourses = coursesWithProgress.filter(c => c.progress > 0 && c.progress < 100);
  const completedCourses = coursesWithProgress.filter(c => c.progress === 100);

  // Category color helper
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'java programming':
        return 'bg-primary-light bg-opacity-10 text-primary';
      case 'react':
        return 'bg-secondary bg-opacity-10 text-secondary';
      case 'node.js':
        return 'bg-green-500 bg-opacity-10 text-green-500';
      case 'python':
        return 'bg-blue-500 bg-opacity-10 text-blue-500';
      case 'database':
        return 'bg-purple-500 bg-opacity-10 text-purple-500';
      default:
        return 'bg-gray-500 bg-opacity-10 text-gray-500';
    }
  };
  const getSkillLevelColor = (skillLevel: string) => {
    switch (skillLevel.toLowerCase()) {
      case 'Advanced':
        return 'bg-green-500 bg-opacity-10 text-green-500';
      case 'Intermediate':
        return 'bg-blue-500 bg-opacity-10 text-blue-500';
      case 'Beginner':
        return 'bg-purple-500 bg-opacity-10 text-purple-500';
      default:
        return 'bg-gray-500 bg-opacity-10 text-gray-500';
    }
  };

  // Count content items by type
  const getCourseContentCount = (courseId: string, type: 'class' | 'test' | 'assignment') => {
    if (type === 'class') return classes?.filter(c => c.courseId === courseId).length ?? 0;
    if (type === 'test') return tests?.filter(t => t.courseId === courseId).length ?? 0;
    if (type === 'assignment') return assignments?.filter(a => a.courseId === courseId).length ?? 0;
    return 0;
  };

  const isLoading = isLoadingCourses || isLoadingClasses || isLoadingTests || isLoadingAssignments || isLoadingProgress;

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">My Courses</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and continue learning</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>{allCourses.length} Total Courses</span>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{completedCourses.length} Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-md">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300"
            >
              All Courses
            </TabsTrigger>
            <TabsTrigger 
              value="in-progress" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300"
            >
              In Progress
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300"
            >
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : allCourses.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-white dark:bg-gray-800 shadow-md animate-fadeIn">
                <School className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-medium mb-2">No Courses Found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Start learning to see courses here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses.map((course, index) => (
                  <Card 
                    key={course._id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-fadeIn group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <Button asChild variant="secondary" className="w-full bg-white/90 hover:bg-white text-gray-900">
                          <Link href={`/student/courses/${course._id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getCategoryColor(course.category ?? '')}>
                          {course.category ?? 'General'}
                        </Badge>
                        <Badge className={getSkillLevelColor(course.skillLevel ?? '')}>
                          <Gauge className="h-4 w-4 mr-1" />
                          {course.skillLevel}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Tests: {course.completedTests}/{course.totalTests}
                            </span>
                            <span className="flex items-center">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Assignments: {course.completedAssignments}/{course.totalAssignments}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileVideo className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'class')} Classes</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileQuestion className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'test')} Tests</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ClipboardList className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'assignment')} Assignments</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between pt-4 border-t bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {course.instructor?.initials || 'IN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {course.instructor?.name || 'Instructor'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {course.instructor?.title || 'Course Instructor'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" asChild className="transition-all duration-300 hover:scale-105">
                        <Link href={`/student/courses/${course._id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : inProgressCourses.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-white dark:bg-gray-800 shadow-md animate-fadeIn">
                <School className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-medium mb-2">No Courses in Progress</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Start learning to see courses here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressCourses.map((course, index) => (
                  <Card 
                    key={course._id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-fadeIn group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <Button asChild variant="secondary" className="w-full bg-white/90 hover:bg-white text-gray-900">
                          <Link href={`/student/courses/${course._id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getCategoryColor(course.category ?? '')}>
                          {course.category ?? 'General'}
                        </Badge>
                        <Badge className={getSkillLevelColor(course.skillLevel ?? '')}>
                          <Gauge className="h-4 w-4 mr-1" />
                          {course.skillLevel}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Tests: {course.completedTests}/{course.totalTests}
                            </span>
                            <span className="flex items-center">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Assignments: {course.completedAssignments}/{course.totalAssignments}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileVideo className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'class')} Classes</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileQuestion className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'test')} Tests</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ClipboardList className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'assignment')} Assignments</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between pt-4 border-t bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {course.instructor?.initials || 'IN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {course.instructor?.name || 'Instructor'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {course.instructor?.title || 'Course Instructor'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" asChild className="transition-all duration-300 hover:scale-105">
                        <Link href={`/student/courses/${course._id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : completedCourses.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-white dark:bg-gray-800 shadow-md animate-fadeIn">
                <School className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-medium mb-2">No Completed Courses</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Complete courses to see them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map((course, index) => (
                  <Card 
                    key={course._id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-fadeIn group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <Button asChild variant="secondary" className="w-full bg-white/90 hover:bg-white text-gray-900">
                          <Link href={`/student/courses/${course._id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getCategoryColor(course.category ?? '')}>
                          {course.category ?? 'General'}
                        </Badge>
                        <Badge className={getSkillLevelColor(course.skillLevel ?? '')}>
                          <Gauge className="h-4 w-4 mr-1" />
                          {course.skillLevel}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Tests: {course.completedTests}/{course.totalTests}
                            </span>
                            <span className="flex items-center">
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Assignments: {course.completedAssignments}/{course.totalAssignments}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileVideo className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'class')} Classes</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileQuestion className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'test')} Tests</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ClipboardList className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <span>{getCourseContentCount(course._id ?? '', 'assignment')} Assignments</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between pt-4 border-t bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {course.instructor?.initials || 'IN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {course.instructor?.name || 'Instructor'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {course.instructor?.title || 'Course Instructor'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" asChild className="transition-all duration-300 hover:scale-105">
                        <Link href={`/student/courses/${course._id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </StudentLayout>
  );
}
