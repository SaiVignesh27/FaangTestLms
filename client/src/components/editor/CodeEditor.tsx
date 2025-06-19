import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Select, message, Card, Progress, Space, Typography, Collapse } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, CaretRightOutlined } from '@ant-design/icons';
import { CodeExecutionResult } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;

interface Language {
  id: number;
  name: string;
  version?: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  output: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
}

interface TestCase {
  input: string;
  output: string;
}

// Add language ID mapping
const LANGUAGE_IDS = {
  python: 71,
  java: 62,
  cpp: 54,
  javascript: 63
};

// Helper function to get language ID
const getLanguageId = (lang: string): number => {
  return LANGUAGE_IDS[lang.toLowerCase() as keyof typeof LANGUAGE_IDS] || 71; // Default to Python
};

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  readOnly?: boolean;
  question?: string;
  description?: string;
  testId?: string;
  questionId?: string;
  templateType?: 'custom' | 'default';
  testCases?: Array<{
    input: string;
    output: string;
    description?: string;
  }>;
  validationProgram?: {
    java?: string;
    python?: string;
    cpp?: string;
    javascript?: string;
  };
  onAnswerChange?: (answer: {
    code?: string;
    output?: string;
    testResults?: Array<{
      input: string;
      output: string;
      passed: boolean;
      error?: string;
    }>;
    score?: number;
  }) => void;
}

const languages: Language[] = [
  { id: 71, name: 'Python', version: '3.11.4' },
  { id: 62, name: 'Java', version: '17' },
];

const getDefaultCode = (language: string): string => {
  switch (language) {
    case 'java':
      return `// Only implement the required function(s) below.
// DO NOT include a main method or any input/output logic.
// The validation program will handle testing.

public static int multiply(int a, int b) {
    // TODO: Implement the function
    return 0;
}`;
    case 'python':
      return `# Only implement the required function(s) below.
# DO NOT include any input/output logic or if __name__ == '__main__' block.
# The validation program will handle testing.

def multiply(a, b):
    # TODO: Implement the function
    return 0`;
    default:
      return '';
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  language = 'python',
  readOnly = false,
  question,
  description,
  testId,
  questionId,
  templateType,
  testCases = [],
  validationProgram,
  onAnswerChange
}) => {
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<CodeExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<Array<{
    input: string;
    output: string;
    actualOutput: string;
    passed: boolean;
    error?: string;
  }>>([]);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);

  // Update code when language changes
  useEffect(() => {
    setCode(initialCode);
  }, [selectedLanguage, initialCode]);

  const handleRunCode = async () => {
    if (!code) {
      message.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/compile/test', {
        code,
        languageId: getLanguageId(selectedLanguage),
        testId,
        questionId
      });

      const data = await response.json();
      setResult(data);
      setError(null);
      setOutput(data.output || '');
      setTestResults(data.testResults || []);
      setScore(data.score || 0);

      if (onAnswerChange) {
        onAnswerChange({
          code,
          output: data.output,
          testResults: data.testResults,
          score: data.score
        });
      }
    } catch (err) {
      console.error('Error running code:', err);
      setError(err instanceof Error ? err.message : 'Failed to run code');
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (onAnswerChange) {
        onAnswerChange({ code: value });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
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

          {testResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Title level={5}>Test Cases</Title>
              <Collapse
                expandIcon={({ isActive }) => (
                  <CaretRightOutlined rotate={isActive ? 90 : 0} />
                )}
                style={{ backgroundColor: '#fff' }}
              >
                {testResults.map((test, index) => (
                  <Panel
                    header={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Test Case {index + 1}</span>
                        {test.passed ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                      </div>
                    }
                    key={index}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <Text strong>Input:</Text>
                        <pre style={{ 
                          marginTop: 4,
                          padding: 8,
                          backgroundColor: '#f5f5f5',
                          borderRadius: 4,
                          overflow: 'auto'
                        }}>
                          {test.input}
                        </pre>
                      </div>
                      <div>
                        <Text strong>Expected Output:</Text>
                        <pre style={{ 
                          marginTop: 4,
                          padding: 8,
                          backgroundColor: '#f5f5f5',
                          borderRadius: 4,
                          overflow: 'auto'
                        }}>
                          {test.output}
                        </pre>
                      </div>
                      <div>
                        <Text strong>Actual Output:</Text>
                        <pre style={{ 
                          marginTop: 4,
                          padding: 8,
                          backgroundColor: '#f5f5f5',
                          borderRadius: 4,
                          overflow: 'auto'
                        }}>
                          {test.actualOutput}
                        </pre>
                      </div>
                      {test.error && (
                        <div>
                          <Text strong style={{ color: '#ff4d4f' }}>Error:</Text>
                          <pre style={{ 
                            marginTop: 4,
                            padding: 8,
                            backgroundColor: '#fff1f0',
                            borderRadius: 4,
                            overflow: 'auto',
                            color: '#ff4d4f'
                          }}>
                            {test.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  </Panel>
                ))}
              </Collapse>
            </div>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default CodeEditor;
