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

  const { assignment, result } = resultData; // Change from test to assignment
  const courseId = assignment?.courseId;
  const backPath = courseId
    ? `/student/courses/${courseId}` // Link back to course detail if available
    : "/student/assignments"; // Link back to assignments list

  // Calculate statistics (adjust for assignments if different metrics are used)
  // Assignments might not have questions or a score percentage like tests.
  // You might display submission time, file links, feedback, etc.

  // Example: If assignments have a score
  const scorePercentage = result.score || 0;
  const maxScore = result.maxScore || 100; // Assuming max score is 100 or defined in result

  // Get score badge color and message (if applicable)
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
              Back to {courseId ? "Course" : "Assignments"}
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">{assignment?.title || "Assignment Results"}</h2> {/* Change from test to assignment */}
          <p className="text-gray-600 dark:text-gray-400">{assignment?.description}</p> {/* Optional: show assignment description */}
        </div>

        {/* --- Results Summary (Adjust based on assignment results structure) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Adjust grid layout if needed */}
          {/* Example: Score Card (if assignments have scores) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score</CardTitle>
              <CardDescription>Your performance on this assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                   {result.score !== undefined ? (
                      <Badge className={`text-lg px-3 py-1 ${getScoreBadgeColor(scorePercentage)}`}>
                          {scorePercentage}% {/* Or display score as points */}
                      </Badge>
                   ) : (
                       <Badge variant="outline" className="text-lg px-3 py-1">
                           Not Scored Yet
                       </Badge>
                   )}
                  {result.score !== undefined && (
                     <p className="text-sm text-muted-foreground">{getScoreMessage(scorePercentage)}</p>
                  )}
                </div>
                {/* You might display max score or other metrics */}
                {maxScore > 0 && (
                   <div className="flex items-center text-yellow-500">
                      <Star className="h-5 w-5 mr-1" fill="currentColor" />
                      <span className="font-semibold">{maxScore} max points</span>
                   </div>
                )}
              </div>
              {maxScore > 0 && result.score !== undefined && (
                 <Progress value={scorePercentage} className="h-2" />
              )}
            </CardContent>
          </Card>

           {/* Submission Details Card */}
           <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Details</CardTitle>
              <CardDescription>Information about your submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <span>Submitted At</span>
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
                {/* Add other submission details like file links, etc. */}
                 {/* Example: Displaying a submitted answer/text */}
                 {result.answers && result.answers.length > 0 && (
                   <div className="flex items-center justify-between">
                     <div className="flex items-center">
                        <ClipboardList className="h-5 w-5 text-primary mr-2" />
                       <span>Your Submission</span>
                     </div>
                     <div className="text-right">
                       {/* Assuming answer is text, adjust if it's a file link */}
                       <p className="font-semibold">{result.answers[0].answer || "No submission content"}</p>
                     </div>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>
         {/* --- End Results Summary --- */}


        {/* --- Question/Answer Review (Adjust or remove for assignments) --- */}
        {/* Assignments might not have a question-by-question review like tests.
            You might display overall feedback from the instructor here instead.
            If assignments involve specific questions with answers, adapt this section.
        */}
         {assignment?.questions && assignment.questions.length > 0 && (
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
            {assignment.questions.map((question: any, index: number) => {
              const answer = Array.isArray(result.answers)
                ? result.answers.find(
                    (a: Answer) => a.questionId === (question._id || index.toString()),
                  )
                : null;
              const isCorrect = answer?.isCorrect; // This might not apply to all assignments

              return (
                <Card key={index} className={`border ${isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Question {index + 1}
                      </CardTitle>
                      {isCorrect !== undefined && ( // Only show badge if isCorrect is applicable
                        <Badge className={isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}>
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{question.text}</p>
                    {/* Display student's answer and correct answer */}
                      <div className="space-y-4">
                        {/* Display Student Answer */}
                         <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                           <p className="font-medium mb-2">Your Answer:</p>
                           {question.type === 'code' ? (
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
                           ) : (
                             <p>{answer?.answer || "No answer provided"}</p>
                           )}
                         </div>
                         {/* Display Correct Answer (if applicable and not correct) */}
                        {!isCorrect && question.correctAnswer && (
                           <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                             <p className="font-medium mb-2">Correct Answer:</p>
                             <p>{question.correctAnswer}</p>
                           </div>
                        )}
                      </div>
                     {/* Options review might not be relevant for assignments */}

                    {question.type === 'code' && (
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
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
         )}
        {/* --- End Question/Answer Review --- */}

        {/* --- Instructor Feedback (Add if applicable) --- */}
         {/* result.feedback && (
           <div className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="text-xl font-semibold">Instructor Feedback</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-gray-700 dark:text-gray-300">{result.feedback}</p>
               </CardContent>
             </Card>
           </div>
         )*/}
        {/* --- End Instructor Feedback --- */}

      </div>
    </StudentLayout>
  );
}
