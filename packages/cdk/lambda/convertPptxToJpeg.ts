import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({});
const CONVERTER_FUNCTION_ARN = process.env.CONVERTER_FUNCTION_ARN!;

interface ConvertRequest {
  bucketName: string;
  fileKey: string;
  fileName: string;
}

interface ConvertResponse {
  statusCode: number;
  body: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[convertPptxToJpeg] Start');

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: ConvertRequest = JSON.parse(event.body);

    // Validate request
    if (!request.bucketName || !request.fileKey || !request.fileName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'bucketName, fileKey, and fileName are required'
        }),
      };
    }

    console.log('[convertPptxToJpeg] Invoking converter Lambda:', {
      bucketName: request.bucketName,
      fileKey: request.fileKey,
      fileName: request.fileName,
    });

    // Invoke Python Lambda for conversion
    const invokeResponse = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: CONVERTER_FUNCTION_ARN,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(request),
      })
    );

    if (!invokeResponse.Payload) {
      throw new Error('No response from converter Lambda');
    }

    const payload = JSON.parse(
      new TextDecoder().decode(invokeResponse.Payload)
    ) as ConvertResponse;

    console.log('[convertPptxToJpeg] Conversion response:', payload);

    // Return the response from converter Lambda
    return {
      statusCode: payload.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: payload.body,
    };

  } catch (error) {
    console.error('[convertPptxToJpeg] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'PowerPointの変換中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
