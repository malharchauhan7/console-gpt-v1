import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ChatMessage } from "ai"

// Define available Gemini models
export const geminiModels = {
  "gemini-1.0-pro": "Gemini 1.0 Pro",
  "gemini-1.0-pro-vision": "Gemini 1.0 Pro Vision",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
}

export type GeminiModelType = keyof typeof geminiModels

// Custom provider for Gemini API that works with AI SDK
export function createGeminiProvider(apiKey: string, modelName: GeminiModelType = "gemini-1.0-pro") {
  if (!apiKey) {
    throw new Error("Gemini API key is required")
  }

  // Validate model name
  if (!Object.keys(geminiModels).includes(modelName)) {
    console.warn(`Invalid Gemini model: ${modelName}. Falling back to gemini-1.0-pro.`)
    modelName = "gemini-1.0-pro"
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    return {
      id: "gemini",
      generateText: async ({ messages }: { messages: ChatMessage[] }) => {
        if (!messages || messages.length === 0) {
          throw new Error("No messages provided to Gemini")
        }

        try {
          // Initialize the model with the selected model name
          const model = genAI.getGenerativeModel({ model: modelName })

          // Convert AI SDK message format to Gemini format
          const geminiMessages = messages.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          }))

          // Start a chat session
          const chat = model.startChat({
            history: geminiMessages.slice(0, -1),
            generationConfig: {
              maxOutputTokens: 1000,
            },
          })

          // Get the response
          const lastMessage = geminiMessages[geminiMessages.length - 1]
          const result = await chat.sendMessage(lastMessage.parts[0].text)
          const response = await result.response
          const text = response.text()

          return {
            text,
            usage: {
              promptTokens: 0, // Gemini doesn't provide token counts in the same way
              completionTokens: 0,
              totalTokens: 0,
            },
          }
        } catch (error) {
          console.error("Error with Gemini API generateText:", error)

          // Provide more specific error messages based on common issues
          if (error.message?.includes("API key")) {
            throw new Error("Invalid Gemini API key. Please check your API key and try again.")
          } else if (error.message?.includes("quota")) {
            throw new Error("Gemini API quota exceeded. Please try again later or check your quota limits.")
          } else if (error.message?.includes("not available")) {
            throw new Error(`The selected model (${modelName}) is not available. Try a different model.`)
          }

          throw new Error(`Gemini API error: ${error.message || "Unknown error"}`)
        }
      },
      streamText: async ({ messages }: { messages: ChatMessage[] }) => {
        if (!messages || messages.length === 0) {
          throw new Error("No messages provided to Gemini")
        }

        try {
          // Initialize the model with the selected model name
          const model = genAI.getGenerativeModel({ model: modelName })

          // Convert AI SDK message format to Gemini format
          const geminiMessages = messages.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          }))

          // Start a chat session
          const chat = model.startChat({
            history: geminiMessages.slice(0, -1),
            generationConfig: {
              maxOutputTokens: 1000,
            },
          })

          // Get the response with streaming
          const lastMessage = geminiMessages[geminiMessages.length - 1]

          try {
            const result = await chat.sendMessageStream(lastMessage.parts[0].text)
            let fullText = ""

            // Create a ReadableStream for streaming the response
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  for await (const chunk of result.stream) {
                    const chunkText = chunk.text()
                    fullText += chunkText
                    controller.enqueue(new TextEncoder().encode(chunkText))
                  }
                  controller.close()
                } catch (error) {
                  console.error("Error in Gemini stream:", error)
                  controller.error(error)
                }
              },
            })

            return {
              async text() {
                // If stream hasn't been consumed, get the full text
                if (!fullText) {
                  try {
                    for await (const chunk of result.stream) {
                      fullText += chunk.text()
                    }
                  } catch (error) {
                    console.error("Error getting full text:", error)
                    throw new Error(`Error getting full text: ${error.message || "Unknown error"}`)
                  }
                }
                return fullText
              },
              stream,
            }
          } catch (streamError) {
            console.error("Error in Gemini sendMessageStream:", streamError)

            // Fall back to non-streaming if streaming fails
            console.log("Falling back to non-streaming response")
            const result = await chat.sendMessage(lastMessage.parts[0].text)
            const response = await result.response
            const text = response.text()

            // Create a ReadableStream with the full response
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(text))
                controller.close()
              },
            })

            return {
              text: async () => text,
              stream,
            }
          }
        } catch (error) {
          console.error("Error creating Gemini stream:", error)

          // Provide more specific error messages based on common issues
          if (error.message?.includes("API key")) {
            throw new Error("Invalid Gemini API key. Please check your API key and try again.")
          } else if (error.message?.includes("quota")) {
            throw new Error("Gemini API quota exceeded. Please try again later or check your quota limits.")
          } else if (error.message?.includes("not available")) {
            throw new Error(`The selected model (${modelName}) is not available. Try a different model.`)
          }

          throw new Error(`Error creating Gemini stream: ${error.message || "Unknown error"}`)
        }
      },
    }
  } catch (error) {
    console.error("Error creating Gemini provider:", error)
    throw new Error(`Error creating Gemini provider: ${error.message || "Unknown error"}`)
  }
}
