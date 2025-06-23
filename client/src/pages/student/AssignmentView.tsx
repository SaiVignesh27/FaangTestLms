import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Assignment, Result } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Timer, Maximize2, Minimize2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import CodeEditor from '@/components/editor/CodeEditor';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Question {
  type: 'mcq' | 'fill' | 'code';
  text: string;
  correctAnswer: string | string[];
  points: number;
  _id?: string;
  options?: string[];
  codeTemplate?: string;
  testCases?: { input: string; output: string }[];
  questionNumber?: number;
  description?: string;
  language?: string;
}

export default function AssignmentView() {
  const { id } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`answers-${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState(1);
  const [startTime] = useState(() => {
    const saved = localStorage.getItem(`startTime-${id}`);
    if (saved) {
      return parseInt(saved);
    }
    const now = Date.now();
    localStorage.setItem(`startTime-${id}`, `${now}`);
    return now;
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Result | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
  const { toast } = useToast();
  const reenteringFullScreen = useRef(false);

  const { data: assignment, isLoading } = useQuery<Assignment>({
    queryKey: [`/api/student/assignments/${id}`],
  });

  // Timer effect
  useEffect(() => {
    if (assignment?.timeLimit) {
      const duration = assignment.timeLimit * 60 * 1000; // Convert minutes to milliseconds
      const endTime = startTime + duration;
      const remaining = Math.floor((endTime - Date.now()) / 1000);
      setTimeLeft(Math.max(remaining, 0));
      localStorage.setItem(`startTime-${id}`, `${startTime}`);
    }
  }, [assignment, id, startTime]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    // Automatically enter full screen when the assignment starts
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable full-screen:', err.message);
      });
    }
  }, []);

  useEffect(() => {
    // Listen for exiting full screen and force re-enter with warning
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        toast({
          title: 'Full Screen Required',
          description: 'You must stay in full screen mode during the assignment.',
          variant: 'destructive',
        });
        document.documentElement.requestFullscreen().catch((err) => {
          console.error('Error attempting to re-enable full-screen:', err.message);
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [toast]);

  const handleExitFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit full-screen:', err.message);
      });
    }
  };

  // Get all questions for proper numbering
  const getAllQuestions = () => {
    if (!assignment?.questions) return [];
    return assignment.questions;
  };

  // Get section questions with proper numbering and original index
  const getSectionQuestions = () => {
    if (!assignment?.questions) return [];
    const allQuestions = assignment.questions;
    // Attach original index to each question
    const numberedQuestions = allQuestions.map((question, index) => ({
      ...question,
      questionNumber: index + 1,
      __originalIndex: index,
    }));
    // Then filter by section
    return numberedQuestions.filter(question => {
      if (currentSection === 1) {
        return question.type === 'mcq' || question.type === 'fill';
      } else {
        return question.type === 'code';
      }
    });
  };

  // Handler for updating answers from CodeEditor
  const handleCodeAnswerChange = (questionIdentifier: string, answer: { code?: string; output?: string; testResults?: any[]; score?: number }) => {
    setAnswers((prev: Record<string, string>) => {
      const existingAnswer = prev[questionIdentifier];
      let parsedExisting: { code?: string; output?: string; testResults?: any[]; score?: number } = {};
      try {
        if (existingAnswer) {
          parsedExisting = JSON.parse(existingAnswer);
        }
      } catch (e) {
        console.error('Failed to parse existing answer for', questionIdentifier, e);
      }
      // Merge existing answer parts with new changes
      const updatedAnswer = { ...parsedExisting, ...answer };
      // Add testCasesPassed, testCasesTotal, points if testResults present
      if (updatedAnswer.testResults) {
        (updatedAnswer as any).testCasesPassed = updatedAnswer.testResults.filter((t: any) => t.passed).length;
        (updatedAnswer as any).testCasesTotal = updatedAnswer.testResults.length;
        (updatedAnswer as any).points = updatedAnswer.score ?? ((updatedAnswer as any).testCasesTotal > 0 ? ((updatedAnswer as any).testCasesPassed / (updatedAnswer as any).testCasesTotal) : 0);
      }
      const updatedAnswers = { ...prev, [questionIdentifier]: JSON.stringify(updatedAnswer) };
      localStorage.setItem(`answers-${id}`, JSON.stringify(updatedAnswers));
      return updatedAnswers;
    });
  };

  // Save answers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`answers-${id}`, JSON.stringify(answers));
  }, [answers, id]);

  const submitAssignment = useMutation({
    mutationFn: async (data: { answers: any[]; score: number; maxScore: number; timeSpent: number }) => {
      const response = await apiRequest('POST', `/api/assignments/${id}/submit`, data);
      const submission = await response.json();
      return submission as { submission: Result; results: any[]; score: number; scorePercentage: number; maxScore: number };
    },
    onError: (error: any) => {
      if (error.response?.status === 400 && error.response?.data?.submission) {
        // Redirect to results page for existing submission
        setLocation(`/student/assignments/${id}/results`);
        toast({
          title: "Assignment Already Submitted",
          description: "You have already submitted this assignment. Redirecting to results...",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit assignment. Please try again.",
          variant: "destructive"
        });
      }
    },
    onSuccess: (data) => {
      // Clear saved answers and start time
      localStorage.removeItem(`answers-${id}`);
      localStorage.removeItem(`startTime-${id}`);
      // Exit full screen after submission
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error('Error attempting to exit full-screen after submission:', err.message);
        });
      }
      // Redirect to results page
      setLocation(`/student/assignments/${id}/results`);
      toast({
        title: "Success",
        description: "Assignment submitted successfully! Redirecting to results...",
        variant: "default"
      });
    }
  });

  const handleSubmit = async () => {
    if (!assignment) return;
    // Debug log: print answers state and assignment questions
    console.log('Answers before submission:', answers);
    console.log('Assignment questions:', assignment.questions.map((q, i) => ({ id: q._id, idx: i, type: q.type, text: q.text })));
    // Check for unanswered questions
    const unanswered = assignment.questions.filter((q, idx) => !answers[`q${idx}`]);
    if (unanswered.length > 0) {
      alert(`You have ${unanswered.length} unanswered question(s)! Please answer all questions before submitting.`);
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    try {
      // Build processed answers array using TestView logic
      console.log('Answers before submission:', answers);
      const questionResults = assignment.questions.map((question, index) => {
        const questionId = question._id || index.toString();
        const answerKey = `q${index}`;
        const studentAnswer = answers[answerKey];
        const correctAnswer = question.correctAnswer;
        let isCorrect = false;
        let feedback = '';
        let processedAnswer: string = '';
        let correctValue = correctAnswer;
        let points = 0;
        if (question.type === 'mcq') {
          const selectedValue = typeof studentAnswer === 'string' ? studentAnswer : '';
          const correctIndex = parseInt(correctAnswer.toString());
          correctValue = question.options?.[correctIndex] || '';
          isCorrect = selectedValue === correctValue;
          feedback = isCorrect ? 'Correct' : `Incorrect. Correct answer: ${correctValue}`;
          processedAnswer = selectedValue;
          points = isCorrect ? (question.points || 1) : 0;
        } else if (question.type === 'fill') {
          const studentStr = typeof studentAnswer === 'string' ? studentAnswer : '';
          const correctStr = typeof correctAnswer === 'string' ? correctAnswer : '';
          isCorrect = studentStr.trim().toLowerCase() === correctStr.trim().toLowerCase();
          feedback = isCorrect ? 'Correct' : `Incorrect. Correct answer: ${correctStr}`;
          processedAnswer = studentStr;
          correctValue = correctStr;
          points = isCorrect ? (question.points || 1) : 0;
        } else if (question.type === 'code') {
          let parsedAnswer: any = {};
          try { parsedAnswer = studentAnswer ? JSON.parse(studentAnswer) : {}; } catch { parsedAnswer = {}; }
          if (parsedAnswer && Array.isArray(parsedAnswer.testResults)) {
            const testResults = parsedAnswer.testResults;
            const testCasesPassed = parsedAnswer.testCasesPassed ?? testResults.filter((t: any) => t.passed).length;
            const testCasesTotal = parsedAnswer.testCasesTotal ?? testResults.length;
            points = parsedAnswer.points ?? (testCasesTotal > 0 ? (testCasesPassed / testCasesTotal) * (question.points || 1) : 0);
            isCorrect = testCasesPassed === testCasesTotal && testCasesTotal > 0;
            feedback = `Passed ${testCasesPassed} of ${testCasesTotal} test cases`;
          } else {
            points = 0;
            isCorrect = false;
            feedback = 'No code provided.';
          }
          processedAnswer = studentAnswer || '';
        }
        return {
          questionId,
          answer: processedAnswer,
          isCorrect,
          points,
          feedback,
          correctAnswer: correctValue
        };
      });
      // Calculate totalScore, maxScore, scorePercentage
      let totalScore = 0;
      let maxScore = 0;
      if (assignment?.questions) {
        maxScore = assignment.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        totalScore = assignment.questions.reduce((sum, q, idx) => {
          const answer = questionResults.find((a) => a.questionId === (q._id || idx.toString()));
          return sum + (answer && answer.isCorrect ? (q.points || 0) : 0);
        }, 0);
      }
      let scorePercentage = 0;
      if (maxScore > 0) {
        scorePercentage = Math.round((totalScore / maxScore) * 100);
        if (scorePercentage > 100) scorePercentage = 100;
        if (scorePercentage < 0) scorePercentage = 0;
      }
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      // Submit processed answers and score to backend
      await submitAssignment.mutateAsync({
        answers: questionResults,
        score: scorePercentage,
        maxScore,
        timeSpent,
      });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit full-screen: ${err.message}`);
        });
      }
    } catch (error) {
      console.error('Failed to submit assignment:', error);
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // Render question based on type
  const renderQuestion = (question: Question, index: number) => {
    const answerKey = `q${index}`;
    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-lg font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">
              {question.text}
            </div>
            <RadioGroup
              value={answers[answerKey] || ''}
              onValueChange={val => {
                setAnswers(prev => {
                  const newAnswers = { ...prev };
                  newAnswers[answerKey] = val;
                  localStorage.setItem(`answers-${id}`, JSON.stringify(newAnswers));
                  return newAnswers;
                });
              }}
              className="space-y-3"
            >
              {question.options?.map((opt: string, i: number) => (
                <div 
                  key={i} 
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-md"
                >
                  <RadioGroupItem value={opt} id={`q${answerKey}-opt${i}`} className="group-hover:border-blue-500 transition-transform duration-300 group-hover:scale-110" />
                  <Label 
                    htmlFor={`q${answerKey}-opt${i}`} 
                    className="flex-1 cursor-pointer group-hover:text-blue-600 transition-all duration-300"
                  >
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case 'fill':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-lg font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">
              {question.text}
            </div>
            <textarea
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none hover:shadow-md focus:shadow-lg"
              rows={4}
              placeholder="Type your answer here..."
              aria-label="Answer input"
              value={answers[answerKey] || ''}
              onChange={e => {
                setAnswers(prev => {
                  const newAnswers = { ...prev };
                  newAnswers[answerKey] = e.target.value;
                  localStorage.setItem(`answers-${id}`, JSON.stringify(newAnswers));
                  return newAnswers;
                });
              }}
            />
          </div>
        );

      case 'code':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                <h3 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Question
                </h3>
                <div className="whitespace-pre-wrap text-gray-700">{question.text}</div>
              </div>
              {question.description && (
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                  <h3 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Description
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-700">{question.description}</div>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] overflow-x-auto">
              <CodeEditor
                initialCode={(() => {
                  const storedAnswer = answers[answerKey];
                  if (storedAnswer) {
                    try {
                      const parsed = JSON.parse(storedAnswer);
                      return parsed.code || question.codeTemplate || '';
                    } catch (e) {
                      return question.codeTemplate || '';
                    }
                  }
                  return question.codeTemplate || '';
                })()}
                language={question.language || 'java'}
                readOnly={false}
                question={question.text}
                description={question.description}
                testId={id}
                questionId={question._id || index.toString()}
                onAnswerChange={(answer) => handleCodeAnswerChange(answerKey, answer)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <StudentLayout hideSidebarAndHeader={true}>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!assignment) {
    return (
      <StudentLayout hideSidebarAndHeader={true}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Assignment Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The assignment you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link href="/student/assignments">Back to Assignments</Link>
          </Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout hideSidebarAndHeader={true}>
      {/* Full Screen Enforcement Modal */}
      <Dialog open={!isFullScreen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Screen Required</DialogTitle>
            <DialogDescription>
              You must be in full screen mode to continue your assignment. Please click the button below to re-enter full screen.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            onClick={() => {
              document.documentElement.requestFullscreen().catch((err) => {
                console.error('Error attempting to enable full-screen:', err.message);
              });
            }}
            className="w-full mt-4 flex items-center gap-2 justify-center"
            aria-label="Enter Full Screen"
          >
            <Maximize2 className="w-5 h-5" />
            Enter Full Screen
          </Button>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center sticky top-0 bg-white z-50 p-6 shadow-lg backdrop-blur-sm bg-white/90 rounded-xl mx-4 -mt-4 mb-8 animate-slideDown">
          <div className="text-center md:text-left text-xl font-bold mb-4 md:mb-0">
            <span className="text-gray-600">Assignment:</span> {assignment?.title}
            <div className="text-sm font-normal text-gray-500 mt-1">{user?.name}</div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex justify-center gap-3">
              <Button 
                variant={currentSection === 1 ? 'default' : 'outline'} 
                onClick={() => setCurrentSection(1)}
                className="transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Section 1 (MCQ & Fill)
              </Button>
              <Button 
                variant={currentSection === 2 ? 'default' : 'outline'} 
                onClick={() => setCurrentSection(2)}
                className="transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Section 2 (Code)
              </Button>
            </div>
            {assignment?.timeLimit && (
              <div className="flex items-center gap-3 text-red-600 font-bold text-lg bg-red-50 px-4 py-2 rounded-lg animate-pulse">
                <Timer className="w-5 h-5" /> {formatTime(timeLeft ?? 0)}
              </div>
            )}
            {/* Full Screen Button: Only show when not in full screen */}
            {!isFullScreen && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  document.documentElement.requestFullscreen().catch((err) => {
                    console.error('Error attempting to enable full-screen:', err.message);
                  });
                }}
                className="flex items-center gap-2"
                aria-label="Enter Full Screen"
              >
                <Maximize2 className="w-5 h-5" />
                Enter Full Screen
              </Button>
            )}
            {/* Exit Full Screen Button: Only show when in full screen */}
            {isFullScreen && (
              <Button
                type="button"
                variant="outline"
                onClick={handleExitFullScreen}
                className="flex items-center gap-2"
                aria-label="Exit Full Screen"
              >
                <Minimize2 className="w-5 h-5" />
                Exit Full Screen
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : 'Submit Assignment'}
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-in-out animate-gradient-x" 
              style={{ width: `${((assignment?.questions?.filter((q, idx) => { const k = `q${idx}`; console.log('Question render key:', k); return answers[k]; }).length || 0) / (assignment?.questions?.length || 1)) * 100}%` }}
            />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>
                {currentSection === 1 ? 'Multiple Choice & Fill in the Blank Questions' : 'Coding Questions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getSectionQuestions().map((question, idx) => {
                const originalIndex = question.__originalIndex;
                if (typeof originalIndex !== 'number') {
                  console.error('Question missing __originalIndex:', question);
                  return null;
                }
                // WARNING: Using array index as answer key is fragile! If questions are reordered, added, or removed, answer mapping will break.
                return (
                  <div key={originalIndex} className="mb-6">
                    <h3 className="font-medium mb-2">Question {question.questionNumber ?? (originalIndex + 1)}</h3>
                    {renderQuestion(question, originalIndex)}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradient-x {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 2s linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>
    </StudentLayout>
  );
}
