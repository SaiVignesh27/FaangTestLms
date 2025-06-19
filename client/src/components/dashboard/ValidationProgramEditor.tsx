import React, { useState } from 'react';
import { Card, Tabs, Input, Button, message, Space, Typography } from 'antd';
import Editor from '@monaco-editor/react';
import { SaveOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface ValidationProgramEditorProps {
  initialPrograms?: {
    java?: string;
    python?: string;
    cpp?: string;
    javascript?: string;
  };
  onSave: (programs: {
    java?: string;
    python?: string;
    cpp?: string;
    javascript?: string;
  }) => void;
}

export const ValidationProgramEditor: React.FC<ValidationProgramEditorProps> = ({
  initialPrograms = {},
  onSave
}) => {
  const [programs, setPrograms] = useState({
    java: initialPrograms.java || '',
    python: initialPrograms.python || '',
    cpp: initialPrograms.cpp || '',
    javascript: initialPrograms.javascript || ''
  });

  const handleProgramChange = (language: string, value: string | undefined) => {
    setPrograms(prev => ({
      ...prev,
      [language]: value || ''
    }));
  };

  const handleSave = () => {
    onSave(programs);
    message.success('Validation programs saved successfully');
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Validation Programs</Title>
          <Text type="secondary">
            Define validation programs for each supported language. Use the placeholder
            <code>// STUDENT_CODE_PLACEHOLDER</code> to indicate where student code should be inserted.
          </Text>
        </div>

        <Tabs defaultActiveKey="python">
          <TabPane tab="Python" key="python">
            <Editor
              height="400px"
              language="python"
              value={programs.python}
              onChange={(value) => handleProgramChange('python', value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </TabPane>

          <TabPane tab="Java" key="java">
            <Editor
              height="400px"
              language="java"
              value={programs.java}
              onChange={(value) => handleProgramChange('java', value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </TabPane>

          <TabPane tab="C++" key="cpp">
            <Editor
              height="400px"
              language="cpp"
              value={programs.cpp}
              onChange={(value) => handleProgramChange('cpp', value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </TabPane>

          <TabPane tab="JavaScript" key="javascript">
            <Editor
              height="400px"
              language="javascript"
              value={programs.javascript}
              onChange={(value) => handleProgramChange('javascript', value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </TabPane>
        </Tabs>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
        >
          Save Validation Programs
        </Button>
      </Space>
    </Card>
  );
}; 