import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
  try {
    const { messages, apiKey, model, systemPrompt } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Valid messages array is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    try {
      // Initialize the Gemini API
      const genAI = new GoogleGenerativeAI(apiKey)

      // Use the specified model or default to gemini-1.0-pro
      const modelName = model || "gemini-2.0-flash"
      const geminiModel = genAI.getGenerativeModel({ model: modelName })

      // Get the last message (which should be the user's input)
      const lastMessage = messages[messages.length - 1]

      // Verify that the last message is from the user
      if (lastMessage.role !== "user") {
        return new Response(
          JSON.stringify({
            error: "The last message must be from the user",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
      }

      // Extract the user's input
      const userInput = lastMessage.content

      // Prepare the user's message, potentially with the system prompt
      let userMessage = userInput
      if (systemPrompt) {
        userMessage = `[System: ${systemPrompt}]\n\n${userInput}`
      }

      // For the first message, we'll just use the user's input directly
      if (messages.length === 1) {
        try {
          // For a single message, we can use the simple generateContent method
          const result = await geminiModel.generateContent(userMessage)
          const response = await result.response
          const text = response.text()

          return new Response(
            JSON.stringify({
              text,
              id: Date.now().toString(),
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        } catch (error) {
          console.error("Gemini generateContent error:", error)
          return new Response(
            JSON.stringify({
              error: `Gemini API error: ${error.message || "Unknown error"}`,
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

      // For conversations with history, we need to prepare the chat history
      // Convert previous messages to Gemini format (excluding the last user message)
      const previousMessages = messages.slice(0, -1)

      // Build a valid history for Gemini
      const history = []
      let hasUserMessage = false

      // Process previous messages to create a valid history
      for (let i = 0; i < previousMessages.length; i++) {
        const msg = previousMessages[i]

        // Skip invalid messages
        if (!msg || typeof msg !== "object" || !msg.role || !msg.content) {
          console.warn("Skipping invalid message:", msg)
          continue
        }

        // Skip system messages as Gemini doesn't support them directly
        if (msg.role === "system") continue

        // If this is the first message and it's not from a user, we need to skip it
        // as Gemini requires the first message to be from a user
        if (history.length === 0 && msg.role !== "user") continue

        // Add the message to history with the appropriate role
        history.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })

        // Track if we have at least one user message
        if (msg.role === "user") hasUserMessage = true
      }

      // If we don't have any user messages in the history, we can't use chat
      // In this case, we'll fall back to the simple generateContent method
      if (!hasUserMessage || history.length === 0) {
        try {
          const result = await geminiModel.generateContent(userMessage)
          const response = await result.response
          const text = response.text()

          return new Response(
            JSON.stringify({
              text,
              id: Date.now().toString(),
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        } catch (error) {
          console.error("Gemini generateContent error:", error)
          return new Response(
            JSON.stringify({
              error: `Gemini API error: ${error.message || "Unknown error"}`,
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

      // Start a chat session with the valid history
      try {
        const chat = geminiModel.startChat({
          history,
          generationConfig: {
            maxOutputTokens: 1000,
          },
        })

        // Send the user message and get the response
        const result = await chat.sendMessage(userMessage)
        const response = await result.response
        const text = response.text()

        // Return the response
        return new Response(
          JSON.stringify({
            text,
            id: Date.now().toString(),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
      } catch (error) {
        console.error("Gemini chat error:", error)

        // If chat fails, fall back to simple generation
        console.log("Falling back to simple generation")
        try {
          const result = await geminiModel.generateContent(userMessage)
          const response = await result.response
          const text = response.text()

          return new Response(
            JSON.stringify({
              text,
              id: Date.now().toString(),
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        } catch (fallbackError) {
          console.error("Gemini fallback error:", fallbackError)
          return new Response(
            JSON.stringify({
              error: `Gemini API error: ${fallbackError.message || "Unknown error"}`,
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
    } catch (error) {
      console.error("Gemini API error:", error)
      return new Response(
        JSON.stringify({
          error: `Gemini API error: ${error.message || "Unknown error"}`,
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
    console.error("Server error:", error)
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
