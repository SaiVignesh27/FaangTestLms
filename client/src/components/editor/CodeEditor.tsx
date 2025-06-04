import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Select, message, Card, Progress, Space, Typography } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { CodeExecutionResult } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';

const { Option } = Select;
const { Text, Title } = Typography;

interface Language {
  id: number;
  name: string;
  version?: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
}

interface CodeEditorProps {
  initialCode: string;
  language?: string;
  readOnly?: boolean;
  question?: string;
  description?: string;
  testCases?: string[];
  questionId?: string;
  onSubmit?: (code: string, languageId: number, result: CodeExecutionResult) => void;
  onAnswerChange?: (answer: { code?: string; output?: string }) => void;
}

const languages: Language[] = [
  { id: 71, name: 'Python', version: '3.11.4' },
  { id: 62, name: 'Java', version: '17' },
];

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  language = 'java',
  readOnly = false,
  question,
  description,
  testCases = [],
  questionId,
  onSubmit,
  onAnswerChange
}) => {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<CodeExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      setError(null);

      // Submit code to Judge0
      const response = await apiRequest('POST', '/api/code/execute', {
        code,
        language: selectedLanguage,
      });

      const { token } = await response.json();

      // Poll for results
      let submissionResult = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const resultResponse = await apiRequest('GET', `/api/code/result/${token}`);
        submissionResult = await resultResponse.json();

        if (submissionResult.status.id !== 1 && submissionResult.status.id !== 2) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (submissionResult) {
        setResult(submissionResult);
        // Get the output from the result and clean it
        let output = submissionResult.stdout || submissionResult.stderr || submissionResult.compile_output || 'No output';
        // Remove "Your Output:" prefix if it exists
        output = output.replace(/^Your Output:\s*/i, '').trim();
        setOutput(output);
        
        // Call onAnswerChange with both code and cleaned output
        if (onAnswerChange) {
          onAnswerChange({ code, output });
        }
        
        // Also call onSubmit if provided
        if (onSubmit) {
          onSubmit(code, languages.find(l => l.name === selectedLanguage)?.id || 0, {
            ...submissionResult,
            output: output
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setCode(initialCode);
    setOutput('');
    setTestResults([]);
    setScore(0);
  };

  const handleRunCode = async () => {
    if (!code) {
      message.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    setOutput('');

    try {
      const selectedLang = languages.find((lang: Language) => 
        lang.name.toLowerCase() === selectedLanguage.toLowerCase()
      );

      if (!selectedLang) {
        throw new Error('Selected language not supported');
      }

      // For Java, ensure the class name matches the file name
      let processedCode = code;
      if (selectedLanguage.toLowerCase() === 'java') {
        const classNameMatch = code.match(/public\s+class\s+(\w+)/);
        if (classNameMatch && classNameMatch[1] !== 'Main') {
          processedCode = code.replace(/public\s+class\s+\w+/, 'public class Main');
        }
      }

      const response = await fetch('/api/compile/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-User-Email': localStorage.getItem('userEmail') || ''
        },
        body: JSON.stringify({
          sourceCode: processedCode,
          languageId: selectedLang.id,
          testCases,
          questionId: '1'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run code');
      }

      const data = await response.json();
      // Clean the output
      let output = data.output;
      // Remove "Your Output:" prefix if it exists
      output = output.replace(/^Your Output:\s*/i, '').trim();
      setOutput(output);
      setTestResults(data.testResults);
      setScore(data.score);

      // Call onAnswerChange with both code and cleaned output
      if (onAnswerChange) {
        onAnswerChange({ code, output });
      }

      // Also call onSubmit if provided
      if (onSubmit) {
        const result: CodeExecutionResult = {
          stdout: output,
          stderr: null,
          compile_output: null,
          message: null,
          time: data.executionTime?.toString() || '0',
          memory: 0,
          status: data.status || { id: 3, description: 'Accepted' }
        };
        onSubmit(code, selectedLang.id, result);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (onAnswerChange) {
      onAnswerChange({ code: newCode });
    }
  };

  return (
    <div className="code-editor">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Select
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              style={{ width: 200 }}
              disabled={readOnly}
              defaultValue="java"
            >
              {languages.map(lang => (
                <Option key={lang.id} value={lang.name.toLowerCase()}>
                  {lang.name}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRunCode}
              loading={isRunning}
              disabled={readOnly}
            >
              Run Code
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={readOnly}
            >
              Reset
            </Button>
            {onSubmit && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleExecute}
                disabled={readOnly || score < 100}
              >
                Submit
              </Button>
            )}
          </Space>
        </Card>

        <Card>
          <Editor
            height="400px"
            language={selectedLanguage}
            value={code}
            onChange={handleCodeChange}
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </Card>

        <Card>
          <Title level={4}>Output</Title>
          {testResults.length > 0 && (
            <>
              <Progress
                percent={score}
                status={score === 100 ? 'success' : 'active'}
                format={(percent?: number) => `${percent || 0}%`}
              />
              <Text>
                Passed {testResults.filter(t => t.passed).length} of {testResults.length} test cases
              </Text>
            </>
          )}
          <pre style={{ 
            marginTop: 16,
            padding: 16,
            backgroundColor: '#f5f5f5',
            borderRadius: 4,
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {output || 'No output yet'}
          </pre>
        </Card>
      </Space>
    </div>
  );
};

export default CodeEditor;
