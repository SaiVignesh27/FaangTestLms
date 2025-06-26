import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Test, Result } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, ButtonProps } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Timer, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { apiRequest } from '@/lib/queryClient';
import CodeEditor from '@/components/editor/CodeEditor';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TestView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem(`answers-${id}`) || '{}'));
  const [startTime] = useState(() => parseInt(localStorage.getItem(`startTime-${id}`) || `${Date.now()}`));
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);
  const [currentCodeIndex, setCurrentCodeIndex] = useState(0);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const queryClient = useQueryClient();
  const { data: test, isLoading } = useQuery<Test>({ queryKey: [`/api/student/tests/${id}`] });
  const { data: resultData } = useQuery<{ result: Result }>({ queryKey: [`/api/student/tests/${id}/results`], retry: false });
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [navAnimation, setNavAnimation] = useState('');
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const timeUpSubmitted = useRef(false);

  const [show5MinWarning, setShow5MinWarning] = useState(false);
  const [hasShown5MinWarning, setHasShown5MinWarning] = useState(false);
  const [show1MinWarning, setShow1MinWarning] = useState(false);
  const [hasShown1MinWarning, setHasShown1MinWarning] = useState(false);
  const [showTimeUpWarning, setShowTimeUpWarning] = useState(false);

  const hasCodeQuestions = test?.questions.some(q => q.type === 'code');
  const hasNonCodeQuestions = test?.questions.some(q => q.type !== 'code');

  useEffect(() => {
    if (test && !hasNonCodeQuestions && hasCodeQuestions) {
      setCurrentSection(2);
    }
  }, [test, hasNonCodeQuestions, hasCodeQuestions]);

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

  useEffect(() => {
    if (resultData?.result) setLocation(`/student/tests/${id}/results`);
  }, [resultData, id, setLocation]);

  useEffect(() => {
    if (test?.timeLimit) {
      const duration = test.timeLimit * 60 * 1000;
      const endTime = startTime + duration;
      const remaining = Math.floor((endTime - Date.now()) / 1000);
      setTimeLeft(Math.max(remaining, 0));
      localStorage.setItem(`startTime-${id}`, `${startTime}`);
    }
  }, [test, id, startTime]);

  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0) {
      if (!timeUpSubmitted.current && !isTestSubmitted) {
        setShowTimeUpWarning(true);
        timeUpSubmitted.current = true;
        setTimeout(() => handleSubmit(), 3000);
      }
      return; // Stop the timer.
    }

    // 5-minute warning
    if (timeLeft <= 300 && !hasShown5MinWarning) {
      setShow5MinWarning(true);
      setHasShown5MinWarning(true);
    }

    // 1-minute warning
    if (timeLeft <= 60 && !hasShown1MinWarning) {
      setShow1MinWarning(true);
      setHasShown1MinWarning(true);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, hasShown5MinWarning, hasShown1MinWarning, isTestSubmitted]);

  useEffect(() => {
    // Debounce saving to localStorage to avoid performance issues on rapid changes
    const handler = setTimeout(() => {
      localStorage.setItem(`answers-${id}`, JSON.stringify(answers));
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [answers, id]);

  useEffect(() => {
    // Automatically enter full screen when the test starts
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable full-screen:', err.message);
      });
    }
  }, []);

  useEffect(() => {
    // Listen for exiting full screen and force re-enter with warning
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        toast({
          title: 'Full Screen Required',
          description: 'You must stay in full screen mode during the test.',
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

  const handleEnterFullScreen = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error('Error attempting to enable full-screen:', err.message);
    });
  };

  const handleExitFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit full-screen:', err.message);
      });
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const submitTest = useMutation({
    mutationFn: async () => {
      if (!test || !user) throw new Error('Test or user not found');

      const questionResults = test.questions.map((question, index) => {
        const answerKey = `q${index}`;
        const studentAnswer = answers[answerKey];
        const correctAnswer = question.correctAnswer;
        let isCorrect = false;
        let feedback = '';
        let processedAnswer = studentAnswer;

        if (question.type === 'mcq') {
          const selectedIndex = question.options?.findIndex(opt => opt === studentAnswer) ?? -1;
          const correctIndex = parseInt(correctAnswer.toString());
          isCorrect = selectedIndex === correctIndex;
          feedback = isCorrect ? 'Correct' : `Incorrect. Correct answer: ${question.options?.[correctIndex] || correctAnswer}`;
        } else if (question.type === 'fill') {
          const studentStr = typeof studentAnswer === 'string' ? studentAnswer : '';
          const correctStr = typeof correctAnswer === 'string' ? correctAnswer : '';
          isCorrect = studentStr.trim().toLowerCase() === correctStr.trim().toLowerCase();
          feedback = isCorrect ? 'Correct' : `Incorrect. Correct answer: ${correctAnswer}`;
        } else if (question.type === 'code') {
          try {
            // For code questions, the answer is stored as a JSON string with code, output, testResults, etc.
            const parsedAnswer = typeof studentAnswer === 'string' ? JSON.parse(studentAnswer) : {};
            // If testResults are present, use them for scoring
            if (parsedAnswer && Array.isArray(parsedAnswer.testResults)) {
              const testResults = parsedAnswer.testResults;
              const testCasesPassed = parsedAnswer.testCasesPassed ?? testResults.filter((t: any) => t.passed).length;
              const testCasesTotal = parsedAnswer.testCasesTotal ?? testResults.length;
              const points = parsedAnswer.points ?? (testCasesTotal > 0 ? (testCasesPassed / testCasesTotal) * (question.points || 1) : 0);
              const isCorrect = testCasesPassed === testCasesTotal && testCasesTotal > 0;
              feedback = `Passed ${testCasesPassed} of ${testCasesTotal} test cases`;
              return {
                questionId: answerKey,
                answer: JSON.stringify({ ...parsedAnswer, testCasesPassed, testCasesTotal, points }),
                isCorrect,
                points,
                feedback
              };
            }
            // Fallback: old logic if testResults missing
            const output = parsedAnswer.output || '';
            const code = parsedAnswer.code || '';
            const isCorrect = false;
            feedback = 'No code submitted or not executed. No test cases run.';
            return {
              questionId: answerKey,
              answer: JSON.stringify({ code, output }),
              isCorrect,
              points: 0,
              feedback
            };
          } catch {
            feedback = 'Invalid code answer format';
            return {
              questionId: answerKey,
              answer: studentAnswer,
              isCorrect: false,
              points: 0,
              feedback
            };
          }
        }

        return {
          questionId: answerKey,
          answer: processedAnswer,
          isCorrect,
          points: isCorrect ? (question.points || 1) : 0,
          feedback
        };
      });

      // Calculate score using the same logic as TestResults page
      let totalScore = 0;
      let maxScore = 0;
      if (test?.questions) {
        maxScore = test.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        totalScore = test.questions.reduce((sum, q, idx) => {
          const answer = questionResults.find((a) => a.questionId === `q${idx}`);
          return sum + (answer && answer.isCorrect ? (q.points || 0) : 0);
        }, 0);
      }
      let scorePercentage = 0;
      if (maxScore > 0) {
        scorePercentage = Math.round((totalScore / maxScore) * 100);
        if (scorePercentage > 100) scorePercentage = 100;
        if (scorePercentage < 0) scorePercentage = 0;
      }

      return apiRequest('POST', '/api/student/results', {
        studentId: user._id,
        courseId: test.courseId,
        testId: id,
        type: 'test',
        answers: questionResults,
        status: 'completed',
        score: scorePercentage,
        maxScore: maxScore,
        submittedAt: new Date(),
        studentName: user.name,
        title: test.title,
        timeSpent: test.timeLimit ? (test.timeLimit * 60 - timeLeft!) : undefined
      });
    },
    onSuccess: () => {
      setIsTestSubmitted(true);
      localStorage.removeItem(`answers-${id}`);
      localStorage.removeItem(`startTime-${id}`);
      queryClient.invalidateQueries();
      // Exit full screen after submission
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error('Error attempting to exit full-screen after submission:', err.message);
        });
      }
    }
  });

  const handleSubmit = async () => {
    if (!test || isSubmitting || isTestSubmitted) return;
    setValidationError('');
    setIsSubmitting(true);
    try {
      await submitTest.mutateAsync();
    } catch (e) {
      console.error('Submit failed:', e);
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isTestSubmitted) setLocation(`/student/tests/${id}/results`);
  }, [isTestSubmitted, id, setLocation]);

  const getSectionQuestions = () => {
    if (!test?.questions) return [];
    const allQuestions = test.questions;
    // Attach original index to each question
    const numberedQuestions = allQuestions.map((question, index) => ({
      ...question,
      questionNumber: index + 1,
      __originalIndex: index,
    }));
    // Then filter by section
    if (currentSection === 1) {
      return numberedQuestions.filter(question => question.type !== 'code');
    } else {
      return numberedQuestions.filter(question => question.type === 'code');
    }
  };

  const renderQuestion = (question: any, index: number) => {
    const answerKey = `q${index}`;
    if ((currentSection === 1 && question.type === 'code') || (currentSection === 2 && question.type !== 'code')) return null;

    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-lg font-medium bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent animate-gradient">
              {question.text}
            </div>
            <RadioGroup
              value={answers[answerKey] || ''}
              onValueChange={val => setAnswers((prev: Record<string, string>) => ({ ...prev, [answerKey]: val }))}
              className="space-y-3"
            >
              {question.options?.map((opt: string, i: number) => {
                const isSelected = answers[answerKey] === opt;
                return (
                  <Label
                    key={i}
                    htmlFor={`q${index}-opt${i}`}
                    className={cn(
                      'flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-md hover:border-blue-500',
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                        : 'border-gray-200'
                    )}
                  >
                    <RadioGroupItem value={opt} id={`q${index}-opt${i}`} className="transition-transform duration-300 group-hover:scale-110" />
                    <span
                      className={cn(
                        'flex-1 cursor-pointer transition-all duration-300',
                        isSelected ? 'text-blue-700 font-semibold' : 'group-hover:text-blue-600'
                      )}
                    >
                      {opt}
                    </span>
                  </Label>
                );
              })}
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
              onChange={e => setAnswers((prev: Record<string, string>) => ({ ...prev, [answerKey]: e.target.value }))}
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
              {((question as any)?.description) && (
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                  <h3 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Description
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-700">{((question as any)?.description) || ''}</div>
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
                language={(question as any)?.language || 'java'}
                readOnly={false}
                question={question.text}
                description={(question as any)?.description || ''}
                testId={id}
                questionId={answerKey}
                onAnswerChange={(answer) => handleCodeAnswerChange(answerKey, answer)}
              />
            </div>
          </div>
        );
    }
  };

  // Debounced auto-save effect for Section 2
  useEffect(() => {
    if (currentSection !== 2) return;
    setIsSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(Date.now());
    }, 700);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [answers, currentSection]);

  // Animation on code question navigation
  useEffect(() => {
    if (currentSection !== 2) return;
    setNavAnimation('nav-animate');
    const timeout = setTimeout(() => setNavAnimation(''), 400);
    return () => clearTimeout(timeout);
  }, [currentCodeIndex, currentSection]);

  if (isLoading) return (
    <StudentLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </StudentLayout>
  );

  return (
    <div className="bg-gray-50 w-full min-h-screen p-4">
      {/* Time Warning Dialogs */}
      <Dialog open={show5MinWarning} onOpenChange={setShow5MinWarning}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
            <DialogTitle className="text-2xl">Time Warning</DialogTitle>
            <DialogDescription className="text-md mt-2">
              You have less than 5 minutes remaining. Please review your answers and prepare to submit.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShow5MinWarning(false)} className="mt-4 w-full">Continue Test</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={show1MinWarning} onOpenChange={setShow1MinWarning}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <DialogTitle className="text-2xl">Final Minute!</DialogTitle>
            <DialogDescription className="text-md mt-2">
              You have less than 1 minute remaining. The test will automatically submit when time is up.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShow1MinWarning(false)} className="mt-4 w-full">Continue Test</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showTimeUpWarning}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center text-center">
            <Timer className="w-12 h-12 text-red-600 mb-4" />
            <DialogTitle className="text-2xl">Time's Up!</DialogTitle>
            <DialogDescription className="text-md mt-2">
              Your time has expired. Your test will now be submitted automatically.
            </DialogDescription>
          </DialogHeader>
          <Button disabled className="mt-4 w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </Button>
        </DialogContent>
      </Dialog>

      {/* Full Screen Enforcement Modal */}
      <Dialog open={!isFullScreen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Screen Required</DialogTitle>
            <DialogDescription>
              You must be in full screen mode to continue your test. Please click the button below to re-enter full screen.
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

      <div className="flex flex-col md:flex-row md:justify-between md:items-center sticky top-0 bg-white z-50 p-6 shadow-lg backdrop-blur-sm bg-white/90 rounded-xl mx-4 -mt-4 mb-8 animate-slideDown">
        <div className="text-center md:text-left text-xl font-bold mb-4 md:mb-0">
          <span className="text-gray-600">Test:</span> {test?.title}
          <div className="text-sm font-normal text-gray-500 mt-1">{user?.name}</div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {hasCodeQuestions && hasNonCodeQuestions && (
            <div className="flex justify-center gap-3">
              <Button
                variant={currentSection === 1 ? 'default' : 'outline'}
                onClick={() => setCurrentSection(1)}
                className="transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Section 1
              </Button>
              <Button
                variant={currentSection === 2 ? 'default' : 'outline'}
                onClick={() => setCurrentSection(2)}
                className="transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Section 2
              </Button>
            </div>
          )}
          <div className="flex items-center gap-3 text-red-600 font-bold text-lg bg-red-50 px-4 py-2 rounded-lg animate-pulse">
            <Timer className="w-5 h-5" /> {formatTime(timeLeft ?? 0)}
          </div>
          {(!(hasCodeQuestions && hasNonCodeQuestions) || currentSection === 2) && (
            <Button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="md:ml-4 transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Test'
              )}
            </Button>
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
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-in-out animate-gradient-x" 
            style={{ width: `${((test?.questions?.filter(q => answers[q._id || '']).length || 0) / (test?.questions?.length || 1)) * 100}%` }}
          />
        </div>

        <div className="mt-8 space-y-8">
          {currentSection === 1 ? (
            getSectionQuestions().map((question, idx) => {
              const originalIndex = question.__originalIndex;
              if (typeof originalIndex !== 'number') {
                console.error('Question missing __originalIndex:', question);
                return null;
              }
              return (
                <Card key={originalIndex} className="mb-4 transition-all duration-300 hover:shadow-xl border-gray-200 animate-fadeIn">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm ">
                        {question.questionNumber}
                      </span>
                      Question {question.questionNumber}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
                    {renderQuestion(question, originalIndex)}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            (() => {
              const codeQuestions = getSectionQuestions();
              const question = codeQuestions[currentCodeIndex];
              if (!question) return null;
              const originalIndex = question.__originalIndex;
              // Extract test case summary
              let testCasesPassed = 0, testCasesTotal = 0;
              const answerKey = `q${originalIndex}`;
              const storedAnswer = answers[answerKey];
              if (storedAnswer) {
                try {
                  const parsed = JSON.parse(storedAnswer);
                  if (Array.isArray(parsed.testResults)) {
                    testCasesPassed = parsed.testResults.filter((t: any) => t.passed).length;
                    testCasesTotal = parsed.testResults.length;
                  }
                } catch {}
              }
              return (
                <Card key={originalIndex} className={`mb-4 transition-all duration-300 hover:shadow-xl border-gray-200 rounded-xl bg-white ${navAnimation}`}>
                  {/* Sticky nav & progress */}
                  <CardHeader className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 rounded-t-xl p-6 flex flex-col md:flex-row justify-between items-center mb-2 gap-2" style={{minHeight:'64px'}}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm">
                        {question.questionNumber}
                      </span>
                      <span className="text-lg font-semibold">Question {currentCodeIndex + 1} of {codeQuestions.length}</span>
                      {/* Test case summary badge */}
                      {testCasesTotal > 0 && (
                        <span className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${testCasesPassed === testCasesTotal ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}
                          title="Test case results summary">
                          {testCasesPassed}/{testCasesTotal} test cases passed
                        </span>
                      )}
                      {/* Auto-save indicator */}
                      <span className="ml-4 text-xs text-gray-400 flex items-center gap-1">
                        {isSaving ? <span className="animate-pulse">Saving…</span> : <span>Saved</span>}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentCodeIndex((idx) => Math.max(0, idx - 1))}
                        disabled={currentCodeIndex === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentCodeIndex((idx) => Math.min(codeQuestions.length - 1, idx + 1))}
                        disabled={currentCodeIndex === codeQuestions.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[70vh]">
                      {/* Question column */}
                      <div className="space-y-6 overflow-y-auto max-h-[65vh] pr-2 border-r border-gray-100">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                          <h3 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Question
                          </h3>
                          <div className="whitespace-pre-wrap text-gray-700">{question.text}</div>
                        </div>
                        {((question as any)?.description) && (
                          <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                            <h3 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                              Description
                            </h3>
                            <div className="whitespace-pre-wrap text-gray-700">{((question as any)?.description) || ''}</div>
                          </div>
                        )}
                      </div>
                      {/* Code editor + testcase column */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] overflow-y-auto max-h-[65vh]">
                        {(() => {
                          // Extract output, testResults, score from answers if present
                          let initialOutput = '';
                          let initialTestResults = [];
                          let initialScore = 0;
                          const storedAnswer = answers[answerKey];
                          if (storedAnswer) {
                            try {
                              const parsed = JSON.parse(storedAnswer);
                              initialOutput = parsed.output || '';
                              initialTestResults = parsed.testResults || [];
                              initialScore = parsed.score || 0;
                            } catch {}
                          }
                          return (
                            <CodeEditor
                              initialCode={(() => {
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
                              language={(question as any)?.language || 'java'}
                              readOnly={false}
                              question={question.text}
                              description={(question as any)?.description || ''}
                              testId={id}
                              questionId={`q${originalIndex}`}
                              initialOutput={initialOutput}
                              initialTestResults={initialTestResults}
                              initialScore={initialScore}
                              onAnswerChange={(answer) => handleCodeAnswerChange(`q${originalIndex}`, answer)}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()
          )}
        </div>

        {currentSection === 2 && validationError && (
          <div className="text-red-600 font-semibold mt-6 text-center p-6 bg-red-50 rounded-xl border border-red-200 shadow-sm animate-shake">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {validationError}
            </div>
          </div>
        )}
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
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
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .nav-animate {
          animation: navHighlight 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes navHighlight {
          0% { box-shadow: 0 0 0 0 #3b82f6; }
          50% { box-shadow: 0 0 16px 4px #3b82f6; }
          100% { box-shadow: 0 0 0 0 #3b82f6; }
        }
      `}</style>
    </div>
  );
}