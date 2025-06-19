// import axios from 'axios';

// interface SubmissionRequest {
//   source_code: string;
//   language_id: number;
//   stdin?: string;
// }

// interface SubmissionResponse {
//   token: string;
// }

// interface SubmissionResult {
//   stdout: string | null;
//   stderr: string | null;
//   compile_output: string | null;
//   status: {
//     id: number;
//     description: string;
//   };
// }

// export const submitCode = async (code: string, languageId: number, input?: string): Promise<string> => {
//   try {
//     const response = await axios.post(
//       'http://localhost:3000/submissions',
//       {
//         source_code: code,
//         language_id: languageId,
//         stdin: input || '',
//       },
//       {
//         headers: {
//           'content-type': 'application/json',
//         },
//       }
//     );

//     return response.data.token;
//   } catch (error) {
//     console.error('Error submitting code:', error);
//     throw new Error('Failed to submit code to Judge0');
//   }
// };

// export const getSubmissionResult = async (token: string): Promise<SubmissionResult> => {
//   try {
//     let result;
//     let attempts = 0;
//     const maxAttempts = 10; // Maximum number of attempts to check status

//     while (attempts < maxAttempts) {
//       const response = await axios.get(
//         `http://localhost:3000/submissions/${token}?base64_encoded=true&fields=*`,
//         {
//           headers: {
//             'content-type': 'application/json',
//           },
//         }
//       );

//       result = response.data;
      
//       // If status is 1 (In Queue) or 2 (Processing), wait and try again
//       if (result.status_id === 1 || result.status_id === 2) {
//         await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
//         attempts++;
//         continue;
//       }

//       // If we get here, the execution is complete
//       return result;
//     }

//     throw new Error('Execution timed out');
//   } catch (error) {
//     console.error('Error getting submission result:', error);
//     throw new Error('Failed to get submission result from Judge0');
//   }
// };

// export const languageIds = {
//   python: 71,
//   javascript: 63,
//   java: 62,
//   cpp: 54,
//   c: 50,
// }; 

// Updated judge.ts
import axios from 'axios';

interface SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
}

interface SubmissionResponse {
  token: string;
}

interface SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  status: {
    id: number;
    description: string;
  };
}

export const submitCode = async (code: string, languageId: number, input: string): Promise<string> => {
  try {
    console.log('Submitting to Judge0:', {
      languageId,
      code: Buffer.from(code).toString('base64'),
      input: Buffer.from(input).toString('base64'),
      codeDecoded: code,
      inputDecoded: input
    });
    const response = await axios.post(
      'http://localhost:3000/submissions?base64_encoded=true&wait=false',
      {
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: Buffer.from(input).toString('base64'),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.token;
  } catch (error) {
    console.error('Error submitting code:', error);
    throw new Error('Failed to submit code to Judge0');
  }
};

export const getSubmissionResult = async (token: string): Promise<SubmissionResult> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const response = await axios.get(
      `http://localhost:3000/submissions/${token}?base64_encoded=true&fields=*`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;
    console.log('Received from Judge0:', JSON.stringify(result, null, 2));

    if (result.status.id === 1 || result.status.id === 2) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } else {
      return result;
    }
  }

  throw new Error('Execution timed out');
};

export const languageIds = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  c: 50,
};
