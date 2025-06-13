import { OpenAI } from "openai"

export async function POST(req: Request) {
  try {
    const { messages, apiKey, model, systemPrompt } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Valid messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const openai = new OpenAI({ apiKey })

    const modelName = model || "gpt-3.5-turbo"
    const defaultSystemPrompt =
      "You are a helpful AI assistant in a terminal-based chat. Reply concisely using markdown where useful."

    // Build OpenAI messages format
    const chatMessages = []

    // Add system prompt if available
    if (systemPrompt || defaultSystemPrompt) {
      chatMessages.push({
        role: "system",
        content: systemPrompt || defaultSystemPrompt,
      })
    }

    // Push all other messages
    for (const msg of messages) {
      if (!msg || typeof msg !== "object" || !msg.role || !msg.content) continue
      chatMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: chatMessages,
      })

      const responseText = completion.choices?.[0]?.message?.content ?? ""

      return new Response(
        JSON.stringify({
          text: responseText,
          id: completion.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (error: any) {
      console.error("OpenAI API error:", error)
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${error.message || "Unknown error"}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error: any) {
    console.error("Server error:", error)
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message || "Unknown error"}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
