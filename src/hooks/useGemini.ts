import { useState, useCallback } from "react";
import { getGenerativeModel, vertexAI } from "@/lib/firebase";

export function useGemini(modelName: string = "gemini-1.5-flash-latest") {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateText = useCallback(
    async (prompt: string) => {
      if (!vertexAI) {
        setError(new Error("Vertex AI is not initialized. Please check your Firebase configuration."));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const model = getGenerativeModel(vertexAI, { model: modelName });
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (err: any) {
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [modelName]
  );

  const generateTextStream = useCallback(
    async (prompt: string, onUpdate: (text: string) => void) => {
      if (!vertexAI) {
        setError(new Error("Vertex AI is not initialized. Please check your Firebase configuration."));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const model = getGenerativeModel(vertexAI, { model: modelName });
        const result = await model.generateContentStream(prompt);

        let fullText = "";
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          onUpdate(fullText);
        }
        return fullText;
      } catch (err: any) {
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [modelName]
  );

  return {
    generateText,
    generateTextStream,
    isLoading,
    error,
  };
}
