import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/StudentLayout";
import { Test, Result, Course, User } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileQuestion,
  Loader2,
  Clock,
  Search,
  ChevronRight,
  CheckCircle,
  Star,
  Calendar,
} from "lucide-react";
import { mongoStorage } from "server";

// Interface for test with optional result, completion status, and score
interface TestWithResult extends Test {
  result?: Result;
  isCompleted: boolean;
  score?: number;
}

export default function DailyTests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const { user } = useAuth();

  // Fetch courses for filter
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/student/courses"],
  });

   // Fetch available tests
   const { data: tests, isLoading: isLoadingTests } = useQuery<Test[]>({
    queryKey: ["/api/student/tests"],
  });

  // Fetch test results
  const { data: results, isLoading: isLoadingResults } = useQuery<Result[]>({
    queryKey: ["/api/student/results/tests"],
  });

  // Combine tests with their results and calculate completion and score
  const testsWithResults: TestWithResult[] = React.useMemo(() => {
    if (!tests || !results) return [];

    return tests.map((test) => {
      const result = results.find((r) => r.testId === test._id);
      return {
        ...test,
        result,
        isCompleted: !!result,
        score: result?.score ?? 0,
      };
    });
  }, [tests, results]);

  // Filter tests based on search query, course filter, and course access
  const filteredTests = React.useMemo(() => {
    return testsWithResults.filter((test) => {
      const matchesSearch = test.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCourse =
        courseFilter === "all" || test.courseId === courseFilter;
      
      // Get the course for this test
      const course = courses?.find(c => c._id === test.courseId);
      
      // Only show tests if:
      // 1. Course is public, OR
      // 2. Course is private and student is assigned to it
      const hasAccess = course && (
        course.visibility === 'public' || 
        (course.visibility === 'private' && course.assignedTo?.includes(user?._id || ''))
      );
      
      return matchesSearch && matchesCourse && hasAccess;
    });
  }, [testsWithResults, searchQuery, courseFilter, courses, user?._id]);

  // Separate pending and completed tests
  const pendingTests = filteredTests.filter((test) => !test.isCompleted);
  const completedTests = filteredTests.filter((test) => test.isCompleted);

  // Aggregate loading states
  const isLoading = isLoadingTests || isLoadingResults || isLoadingCourses;

  // Format date helper
  const formatDate = (date: Date) => {
    return format(date, "MMM dd, yyyy");
  };

  // Retrieve course title by id
  const getCourseName = (courseId: string) => {
    const course = courses?.find((c) => c._id === courseId);
    return course?.title || "Unknown Course";
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg animate-fadeIn">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">
            Daily Tests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Practice and improve your skills with daily tests
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md animate-slideUp">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tests..."
              className="pl-8 transition-all duration-300 hover:shadow-md focus:shadow-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-60 transition-all duration-300 hover:shadow-md">
              <SelectValue placeholder="Filter by Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clusters</SelectItem>
              {courses?.filter(course => course._id).map((course) => (
                <SelectItem key={course._id || ''} value={course._id || ''}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-md">
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300">
              Pending Tests
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-300">
              Completed Tests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingTests.reverse().map((test, index) => (
                  <Card 
                    key={test._id} 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-primary-light bg-opacity-10 text-primary">
                          {getCourseName(test.courseId)}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{test.timeLimit || 30} min</span>
                        </div>
                      </div>
                      <CardTitle className="mt-2 text-lg bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        {test.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {test.description || "Test your knowledge with this daily test."}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <FileQuestion className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">
                            {test.questions.length} questions
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" fill="currentColor" />
                          <span className="text-gray-500 dark:text-gray-400">
                            {test.questions.reduce((sum, q) => sum + (q.points || 0), 0)} points
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="border-t bg-gray-50 dark:bg-dark-border pt-4">
                      <Button asChild className="w-full transition-all duration-300 hover:scale-105 hover:shadow-md bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900">
                        <Link href={`/student/tests/${test._id}`}>
                          Start Test <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-xl bg-white dark:bg-gray-800 shadow-md animate-fadeIn">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium mb-1">No Tests Available</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  You've completed all available tests!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : completedTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTests.map((test, index) => {
                  // Calculate weighted score percentage for display
                  let totalScore = 0;
                  let maxScore = 0;
                  if (test.questions && test.result && Array.isArray(test.result.answers)) {
                    maxScore = test.questions.reduce((sum, q) => sum + (q.points || 0), 0);
                    totalScore = test.questions.reduce((sum, q, idx) => {
                      const answer = test.result?.answers.find((a) => a.questionId === `q${idx}`);
                      return sum + (answer && answer.isCorrect ? (q.points || 0) : 0);
                    }, 0);
                  }
                  let scorePercentage = 0;
                  if (maxScore > 0) {
                    scorePercentage = Math.round((totalScore / maxScore) * 100);
                    if (scorePercentage > 100) scorePercentage = 100;
                    if (scorePercentage < 0) scorePercentage = 0;
                  }

                  return (
                    <Card 
                      key={test._id} 
                      className="overflow-hidden relative hover:shadow-lg transition-all duration-300 animate-fadeIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" /> Completed
                        </Badge>
                      </div>

                      <CardHeader className="pb-2">
                        <Badge className="bg-primary-light bg-opacity-10 text-primary">
                          {getCourseName(test.courseId)}
                        </Badge>
                        <CardTitle className="mt-2 text-lg bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                          {test.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {test.description || "Test your knowledge with this daily test."}
                        </CardDescription>
                      </CardHeader>

                      <CardContent>
                        <div className="bg-gray-50 dark:bg-dark-border rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Your Score
                            </span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                              <span className="font-semibold">{scorePercentage}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                (scorePercentage >= 70)
                                  ? "bg-green-500"
                                  : (scorePercentage >= 40)
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${scorePercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{test.questions.length} questions</span>
                          <span>
                            Completed on{" "}
                            {test.result?.submittedAt
                              ? formatDate(new Date(test.result.submittedAt))
                              : "Unknown"}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="border-t bg-gray-50 dark:bg-dark-border pt-4">
                        <Button asChild size="sm" className="w-full transition-all duration-300 hover:scale-105 hover:shadow-md">
                          <Link href={`/student/tests/${test._id}/results`}>
                            View Results
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-xl bg-white dark:bg-gray-800 shadow-md animate-fadeIn">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-medium mb-1">No Completed Tests</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Start taking tests to see your results here!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
