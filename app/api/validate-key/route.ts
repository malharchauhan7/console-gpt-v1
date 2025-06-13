export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "No API key provided",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Simple validation based on provider
    if (provider === "openai") {
      // OpenAI keys typically start with "sk-" and are at least 20 chars
      const isValid = apiKey.startsWith("sk-") && apiKey.length >= 20
      return new Response(
        JSON.stringify({
          valid: isValid,
          error: isValid ? null : "OpenAI API keys should start with 'sk-' and be at least 20 characters long",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    } else if (provider === "gemini") {
      // Gemini keys are typically long alphanumeric strings
      // Just check for minimum length as a basic validation
      const isValid = apiKey.length >= 10
      return new Response(
        JSON.stringify({
          valid: isValid,
          error: isValid ? null : "Gemini API key should be at least 10 characters long",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    } else {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Unknown provider: ${provider}`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }
  } catch (error) {
    console.error("Error validating API key:", error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: `Error validating API key: ${error.message}`,
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
