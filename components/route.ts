import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { createGeminiProvider, type GeminiModelType } from "@/lib/gemini-provider"
import type { OpenAIModelType } from "@/lib/openai-models"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json().catch((error) => {
      console.error("Failed to parse request body:", error)
      return {}
    })

    const { messages, provider, apiKey, systemPrompt, model } = body

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid or missing messages array",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Use custom system prompt if provided, otherwise use default
    const defaultSystemPrompt =
      "You are a helpful AI assistant in a console-based chat application. Provide concise, helpful responses. You can use simple markdown formatting like **bold** and *italic* when appropriate."

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt

    // Handle different providers
    try {
      // Default to OpenAI
      if (provider !== "gemini") {
        // Use OpenAI with either user-provided key or environment variable
        const openaiKey = apiKey || process.env.OPENAI_API_KEY
        if (!openaiKey) {
          return new Response(
            JSON.stringify({
              error: "No OpenAI API key provided. Please add an API key in settings.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }

        const openaiModelName = model || "gpt-3.5-turbo"
        console.log(`Using OpenAI provider with model: ${openaiModelName}`)

        try {
          // Create the OpenAI model provider
          const modelProvider = openai(openaiModelName as OpenAIModelType, { apiKey: openaiKey })

          // Generate the response
          try {
            // Make sure messages are in the correct format
            const validMessages = messages.filter((msg) => msg && typeof msg === "object" && msg.role && msg.content)

            // Generate the response
            const result = streamText({
              model: modelProvider,
              messages: validMessages,
              system: finalSystemPrompt,
            })

            return result.toDataStreamResponse({
              onError: (error) => {
                console.error("Stream error:", error)
                return `Error during streaming: ${error.message || "Unknown error"}`
              },
            })
          } catch (streamError) {
            console.error("Error streaming text:", streamError)
            return new Response(
              JSON.stringify({
                error: `Error generating response: ${streamError.message || "Unknown error"}`,
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )
          }
        } catch (openaiError) {
          console.error("Error initializing OpenAI:", openaiError)
          return new Response(
            JSON.stringify({
              error: `Failed to initialize OpenAI: ${openaiError.message || "Unknown error"}`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }
      } else {
        // Handle Gemini provider
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: "No Gemini API key provided. Please add an API key in settings.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }

        console.log(`Using Gemini provider with model: ${model || "gemini-1.0-pro"}`)
        try {
          const geminiProvider = createGeminiProvider(apiKey, model as GeminiModelType)

          // Generate the response
          try {
            const result = streamText({
              model: geminiProvider,
              messages,
              system: finalSystemPrompt,
            })

            return result.toDataStreamResponse({
              onError: (error) => {
                console.error("Stream error:", error)
                return `Error during streaming: ${error.message || "Unknown error"}`
              },
            })
          } catch (streamError) {
            console.error("Error streaming text with Gemini:", streamError)
            return new Response(
              JSON.stringify({
                error: `Error generating response with Gemini: ${streamError.message || "Unknown error"}`,
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )
          }
        } catch (geminiError) {
          console.error("Error creating Gemini provider:", geminiError)
          return new Response(
            JSON.stringify({
              error: `Failed to initialize Gemini: ${geminiError.message || "Unknown error"}`,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }
      }
    } catch (modelError) {
      console.error("Model initialization error:", modelError)
      return new Response(
        JSON.stringify({
          error: `Error with AI provider: ${modelError.message || "Unknown error"}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }
  } catch (error) {
    console.error("General error in chat API route:", error)
    return new Response(
      JSON.stringify({
        error: `Server error: ${error.message || "Unknown error"}`,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
