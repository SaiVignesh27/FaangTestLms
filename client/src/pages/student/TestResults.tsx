import React from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/StudentLayout";
import { Test, Result } from "@shared/schema";
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
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Award, FileQuestion, Star } from "lucide-react";

interface ResultData {
  test?: Test;
  result: Result;
}

interface Answer {
  questionId: string;
  isCorrect: boolean;
  points: number;
  answer?: any;
  feedback?: string;
}

export default function TestResults() {
  const { id } = useParams();
  const [location] = useLocation();

  const {
    data: resultData,
    isLoading,
    error,
  } = useQuery<ResultData>({
    queryKey: [`/api/student/tests/${id}/results`],
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
            <Link href="/student/daily-tests">
              Back to Tests
            </Link>
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const { test, result } = resultData;
  const courseId = test?.courseId;
  const backPath = courseId
    ? `/student/courses/${courseId}`
    : "/student/daily-tests";

  // Calculate statistics
  const totalQuestions = test?.questions?.length || 0;
  const correctAnswers = result.answers?.filter((a: Answer) => a.isCorrect).length || 0;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const scorePercentage = result.score || 0;
  const timeSpent = result.timeSpent ? Math.floor(result.timeSpent / 60) : null;
  const averageTimePerQuestion = timeSpent ? Math.round(timeSpent / totalQuestions) : null;

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

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <Button variant="outline" asChild className="mb-4">
            <Link href={backPath}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {courseId ? "Course" : "Tests"}
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">{test?.title || "Results"}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score</CardTitle>
              <CardDescription>Your overall performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Badge className={`text-lg px-3 py-1 ${getScoreBadgeColor(scorePercentage)}`}>
                    {scorePercentage}%
                  </Badge>
                  <p className="text-sm text-muted-foreground">{getScoreMessage(scorePercentage)}</p>
                </div>
                <div className="flex items-center text-yellow-500">
                  <Star className="h-5 w-5 mr-1" fill="currentColor" />
                  <span className="font-semibold">{result.maxScore} points</span>
                </div>
              </div>
              <Progress value={scorePercentage} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Analysis</CardTitle>
              <CardDescription>Breakdown of your answers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileQuestion className="h-5 w-5 text-primary mr-2" />
                    <span>Total Questions</span>
                  </div>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Details</CardTitle>
              <CardDescription>Additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <span>Time Spent</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">
                      {result.timeSpent ? new Date(result.timeSpent * 1000).toISOString().substr(11, 8) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-primary mr-2" />
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
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Question Review</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Correct
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Incorrect
              </Badge>
            </div>
          </div>
          {test?.questions?.map((question: any, index: number) => {
            const answer = Array.isArray(result.answers)
              ? result.answers.find(
                  (a: Answer) => a.questionId === (question._id || index.toString()),
                )
              : null;
            const isCorrect = answer?.isCorrect;

            return (
              <Card key={index} className={`border ${isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Question {index + 1}
                    </CardTitle>
                    <Badge className={isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{question.text}</p>
                  <div className="space-y-4">
                    {question.type === 'mcq' && (
                      <div>
                        <p className="font-medium mb-2">Options:</p>
                        <ul className="list-disc pl-5">
                          {question.options?.map((option: string, optIndex: number) => (
                            <li 
                              key={optIndex} 
                              className={
                                option === answer?.answer ? 
                                (isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400 font-semibold') : 
                                (question.correctAnswer === option ? 'text-green-600 dark:text-green-400 font-semibold' : '')
                              }
                            >
                              {option}
                              {option === answer?.answer && (
                                isCorrect ? ' (Your Answer - Correct)' : ' (Your Answer)'
                              )}
                              {question.correctAnswer === option && !isCorrect && (
                                ' (Correct Answer)'
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.type === 'fill' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                          <p className="font-medium mb-2">Your Answer:</p>
                          <p>{answer?.answer || "No answer provided"}</p>
                        </div>
                        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                          <p className="font-medium mb-2">Correct Answer:</p>
                          <p>{question.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {question.type === 'code' && (
                      <>
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                          <p className="font-medium mb-2">Your Code:</p>
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {(() => {
                              try {
                                const parsedAnswer = JSON.parse(answer?.answer || '{}');
                                return parsedAnswer.code || "No code provided";
                              } catch (e) {
                                return "No code provided";
                              }
                            })()}
                          </pre>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                            <p className="font-medium mb-2">Your Output:</p>
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {(() => {
                                try {
                                  const parsedAnswer = JSON.parse(answer?.answer || '{}');
                                  return parsedAnswer.output || "No output";
                                } catch (e) {
                                  return "No output";
                                }
                              })()}
                            </pre>
                          </div>
                          <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                            <p className="font-medium mb-2">Expected Output:</p>
                            <pre className="whitespace-pre-wrap text-sm font-mono">{question.correctAnswer}</pre>
                          </div>
                        </div>
                      </>
                    )}

                    {answer?.feedback && (
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium mb-2">Feedback:</p>
                        <p>{answer.feedback}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
} 