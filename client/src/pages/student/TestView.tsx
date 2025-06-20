import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Test, Result } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, ButtonProps } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Timer } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { apiRequest } from '@/lib/queryClient';
import CodeEditor from '@/components/editor/CodeEditor';

export default function TestView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem(`answers-${id}`) || '{}'));
  const [startTime] = useState(() => parseInt(localStorage.getItem(`startTime-${id}`) || `${Date.now()}`));
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  const queryClient = useQueryClient();
  const { data: test, isLoading } = useQuery<Test>({ queryKey: [`/api/student/tests/${id}`] });
  const { data: resultData } = useQuery<{ result: Result }>({ queryKey: [`/api/student/tests/${id}/results`], retry: false });

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
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem(`answers-${id}`, JSON.stringify(answers));
  }, [answers, id]);

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
                feedback,
                correctAnswer: question.correctAnswer
              };
            }
            // Fallback: old logic if testResults missing
            const output = parsedAnswer.output || '';
            const code = parsedAnswer.code || '';
            const outputStr = typeof output === 'string' ? output.trim() : '';
            const correctAnswerStr = typeof correctAnswer === 'string' ? correctAnswer.trim() : '';
            const isCorrect = outputStr === correctAnswerStr;
            feedback = isCorrect ? 'Correct output' : `Incorrect output. Expected: ${correctAnswer}`;
            return {
              questionId: answerKey,
              answer: JSON.stringify({ code, output }),
              isCorrect,
              points: isCorrect ? (question.points || 1) : 0,
              feedback,
              correctAnswer: question.correctAnswer
            };
          } catch {
            feedback = 'Invalid code answer format';
            return {
              questionId: answerKey,
              answer: studentAnswer,
              isCorrect: false,
              points: 0,
              feedback,
              correctAnswer: question.correctAnswer
            };
          }
        }

        return {
          questionId: answerKey,
          answer: processedAnswer,
          isCorrect,
          points: isCorrect ? (question.points || 1) : 0,
          feedback,
          correctAnswer: question.type === 'mcq' ? question.options?.[parseInt(correctAnswer.toString())] || correctAnswer : correctAnswer
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
    }
  });

  const handleSubmit = async () => {
    if (!test) return;
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
    return numberedQuestions.filter(question => {
      if (currentSection === 1) {
        return question.type !== 'code';
      } else {
        return question.type === 'code';
      }
    });
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
              {question.options?.map((opt: string, i: number) => (
                <div 
                  key={i} 
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-md"
                >
                  <RadioGroupItem value={opt} id={`q${index}-opt${i}`} className="group-hover:border-blue-500 transition-transform duration-300 group-hover:scale-110" />
                  <Label 
                    htmlFor={`q${index}-opt${i}`} 
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
                question={question}
                description={question.description}
                testId={id}
                questionId={answerKey}
                onAnswerChange={(answer) => handleCodeAnswerChange(answerKey, answer)}
              />
            </div>
          </div>
        );
    }
  };

  if (isLoading) return (
    <StudentLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </StudentLayout>
  );

  return (
    <div className="bg-gray-50 w-full min-h-screen p-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center sticky top-0 bg-white z-50 p-6 shadow-lg backdrop-blur-sm bg-white/90 rounded-xl mx-4 -mt-4 mb-8 animate-slideDown">
        <div className="text-center md:text-left text-xl font-bold mb-4 md:mb-0">
          <span className="text-gray-600">Test:</span> {test?.title}
          <div className="text-sm font-normal text-gray-500 mt-1">{user?.name}</div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6">
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
          <div className="flex items-center gap-3 text-red-600 font-bold text-lg bg-red-50 px-4 py-2 rounded-lg animate-pulse">
            <Timer className="w-5 h-5" /> {formatTime(timeLeft ?? 0)}
          </div>
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
            ) : 'Submit Test'}
          </Button>
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
          {getSectionQuestions().map((question, idx) => {
            const originalIndex = question.__originalIndex;
            if (typeof originalIndex !== 'number') {
              console.error('Question missing __originalIndex:', question);
              return null;
            }
            // WARNING: Using array index as answer key is fragile! If questions are reordered, added, or removed, answer mapping will break.
            return (
              <Card key={originalIndex} className="mb-4 transition-all duration-300 hover:shadow-xl border-gray-200 animate-fadeIn">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm animate-bounce">
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
          })}
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
      `}</style>
    </div>
  );
}