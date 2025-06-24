import React from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/StudentLayout";
import { Assignment, Result } from "@shared/schema"; // Import Assignment instead of Test
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Award, FileQuestion, Star, ClipboardList } from "lucide-react"; // Add ClipboardList

interface ResultData {
  assignment?: Assignment; // Change from test to assignment
  result: Result;
}

interface Answer {
  questionId: string;
  isCorrect: boolean; // Assignments might not have isCorrect, adjust if needed
  points: number;
  answer?: any; // This might be the submitted file URL or text
  feedback?: string;
  // Add any other assignment-specific result fields
}

export default function AssignmentResults() {
  const { id } = useParams();
  const [location] = useLocation();

  const {
    data: resultData,
    isLoading,
    error,
  } = useQuery<ResultData>({
    queryKey: [`/api/student/assignments/${id}/results`], // API endpoint for assignment results
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !resultData || !resultData.result) {
    return (
      <StudentLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Results Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The results you're looking for don't exist or you don't have access to them.
          </p>
          <Button asChild>
            <Link href="/student/assignments"> {/* Link back to assignments */}
              Back to Assignments
            </Link>
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const { assignment, result } = resultData;
  const courseId = assignment?.courseId;

  // Calculate statistics
  const totalQuestions = assignment?.questions?.length || 0;
  const correctAnswers = result.answers?.filter((a: Answer) => a.isCorrect).length || 0;
  const incorrectAnswers = totalQuestions - correctAnswers;
  // Calculate score and maxScore on the frontend for clarity
  const answersArr = Array.isArray(result.answers) ? result.answers : [];
  let totalScore = 0;
  let maxScore = 0;
  if (assignment?.questions) {
    maxScore = assignment.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    totalScore = assignment.questions.reduce((sum, q, idx) => {
      const answer = answersArr.find((a) => a.questionId === (q._id || idx.toString()));
      return sum + (answer && answer.isCorrect ? (q.points || 0) : 0);
    }, 0);
  }
  let scorePercentage = 0;
  if (maxScore > 0) {
    scorePercentage = Math.round((totalScore / maxScore) * 100);
    if (scorePercentage > 100) scorePercentage = 100;
    if (scorePercentage < 0) scorePercentage = 0;
  }
  
  // Format time spent
  const formatTimeSpent = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return "N/A";
    
    // Convert to hours, minutes, seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  };

  // Get score badge color and message
  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score >= 70) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Excellent!";
    if (score >= 70) return "Good job!";
    if (score >= 50) return "Keep practicing!";
    return "Needs improvement";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs improvement";
    return "Poor";
  };

  return (
    <StudentLayout>
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg animate-fadeIn">
          <Button variant="outline" asChild className="mb-4 hover:scale-105 transition-transform">
            <Link href="/student/assignments">
              <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assignments
            </Link>
          </Button>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">
            {assignment?.title || "Results"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                Score
              </CardTitle>
              <CardDescription>Your overall performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Badge className={`text-lg px-3 py-1 ${getScoreBadgeColor(scorePercentage)} animate-bounce`}>
                    {scorePercentage}%
                  </Badge>
                  <p className="text-sm text-muted-foreground">{getScoreMessage(scorePercentage)}</p>
                </div>
                <div className="flex items-center text-yellow-500">
                  <Star className="h-5 w-5 mr-1" fill="currentColor" />
                  <span className="font-semibold">{totalScore} / {maxScore} points</span>
                </div>
              </div>
              <Progress value={scorePercentage} className="h-2 bg-blue-100 dark:bg-blue-900" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp" style={{ animationDelay: '100ms' }}>
            <CardHeader className="bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Question Analysis
              </CardTitle>
              <CardDescription>Breakdown of your answers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>Correct Answers</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold">{correctAnswers}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({Math.round((correctAnswers / totalQuestions) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span>Incorrect Answers</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold">{incorrectAnswers}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({Math.round((incorrectAnswers / totalQuestions) * 100)}%)
                    </span>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center">
                    <FileQuestion className="h-5 w-5 text-blue-500 mr-2" />
                    <span>Total Questions</span>
                  </div>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 animate-slideUp" style={{ animationDelay: '200ms' }}>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Assignment Details
              </CardTitle>
              <CardDescription>Additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-purple-500 mr-2" />
                    <span>Time Spent</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {formatTimeSpent(result.timeSpent)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-purple-500 mr-2" />
                    <span>Submission Date</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {new Date(result.submittedAt).toLocaleDateString()}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <h3 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Question Review
            </h3>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Correct
                </Badge>
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-500" />
                  Incorrect
                </Badge>
              </div>
            </div>

          {assignment?.questions?.map((question: any, index: number) => {
              const answer = Array.isArray(result.answers)
                ? result.answers.find(
                    (a: Answer) => a.questionId === (question._id || index.toString()),
                  )
                : null;
            const isCorrect = answer?.isCorrect;

              return (
              <Card 
                key={index} 
                className={`border transition-all duration-300 hover:shadow-lg animate-fadeIn ${
                  isCorrect 
                    ? 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700' 
                    : 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                        {index + 1}
                      </span>
                        Question {index + 1}
                      </CardTitle>
                    <Badge className={`px-3 py-1 ${
                      isCorrect 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                    }`}>
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <pre className="whitespace-pre-wrap text-base font-sans text-gray-700 dark:text-gray-300 bg-transparent p-0">
                      {question.text}
                    </pre>
                  </div>
                  <div className="space-y-6">
                    {question.type === 'mcq' && (
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Options:</p>
                        <ul className="space-y-2">
                          {question.options?.map((option: string, optIndex: number) => (
                            <li 
                              key={optIndex} 
                              className={`p-3 rounded-lg transition-all duration-300 ${
                                option === (typeof answer?.answer === 'string' ? answer.answer : '')
                                  ? (isCorrect 
                                      ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
                                      : 'bg-red-100 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800')
                                  : (question.correctAnswer === option && !isCorrect
                                      ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700')
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`
                                  ${option === (typeof answer?.answer === 'string' ? answer.answer : '')
                                    ? (isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')
                                    : (question.correctAnswer === option && !isCorrect ? 'text-green-700 dark:text-green-300' : '')
                                  }
                                `}>
                                  {option}
                                </span>
                                <div className="flex items-center gap-2">
                                  {option === (typeof answer?.answer === 'string' ? answer.answer : '') && (
                                    <span className={`text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                      {isCorrect ? '✓ Your Answer' : '✗ Your Answer'}
                                    </span>
                                  )}
                                  {question.correctAnswer === option && !isCorrect && (
                                    <span className="text-sm text-green-600">✓ Correct Answer</span>
                      )}
                    </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.type === 'fill' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg transition-all duration-300 ${
                          isCorrect 
                            ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
                            : 'bg-red-100 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                        }`}>
                           <p className="font-medium mb-2">Your Answer:</p>
                          <p className="text-gray-700 dark:text-gray-300">{
                            typeof answer?.answer === 'string'
                              ? answer.answer
                              : (answer?.answer ? JSON.stringify(answer.answer) : "No answer provided")
                          }</p>
                         </div>
                        <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
                             <p className="font-medium mb-2">Correct Answer:</p>
                          <p className="text-gray-700 dark:text-gray-300">{question.correctAnswer}</p>
                        </div>
                           </div>
                        )}

                    {question.type === 'code' && (
                      (() => {
                        let parsedAnswer: any = {};
                        try {
                          parsedAnswer = typeof answer?.answer === 'string' ? JSON.parse(answer.answer) : answer?.answer || {};
                        } catch (e) {
                          parsedAnswer = {};
                        }
                        const testResults = parsedAnswer.testResults || [];
                        const testCasesPassed = parsedAnswer.testCasesPassed ?? testResults.filter((t: any) => t.passed).length;
                        const testCasesTotal = parsedAnswer.testCasesTotal ?? testResults.length;
                        const points = answer?.points ?? 0;
                        return (
                          <>
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                              <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">Your Code:</p>
                              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                {parsedAnswer.code || "No code provided"}
                              </pre>
                            </div>
                            <div className="mb-4">
                              <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">Test Case Results:</p>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border rounded-lg">
                                  <thead>
                                    <tr className="bg-gray-200 dark:bg-gray-700">
                                      <th className="px-3 py-2 text-left">#</th>
                                      <th className="px-3 py-2 text-left">Input</th>
                                      <th className="px-3 py-2 text-left">Expected Output</th>
                                      <th className="px-3 py-2 text-left">Your Output</th>
                                      <th className="px-3 py-2 text-left">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {testResults.map((tr: any, idx: number) => (
                                      <tr key={idx} className="border-b last:border-b-0">
                                        <td className="px-3 py-2">{idx + 1}</td>
                                        <td className="px-3 py-2 whitespace-pre-wrap">{tr.input}</td>
                                        <td className="px-3 py-2 whitespace-pre-wrap">{tr.output}</td>
                                        <td className="px-3 py-2 whitespace-pre-wrap">{tr.actualOutput}</td>
                                        <td className={`px-3 py-2 font-bold ${tr.passed ? 'text-green-600' : 'text-red-600'}`}>{tr.passed ? 'Pass' : 'Fail'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Test Cases Passed:</span> {testCasesPassed} / {testCasesTotal}
                              </div>
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Score for this question:</span> {points.toFixed(2)}
                              </div>
                            </div>
                          </>
                        );
                      })()
                    )}

                    {answer?.feedback && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <p className="font-medium mb-2 text-blue-700 dark:text-blue-300">Feedback:</p>
                        <p className="text-gray-700 dark:text-gray-300">{answer.feedback}</p>
                      </div>
                    )}
                  </div>
                  </CardContent>
                </Card>
              );
            })}
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
