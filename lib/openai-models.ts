// Define available OpenAI models
export const openaiModels = {
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-3.5-turbo-16k": "GPT-3.5 Turbo 16K",
  "gpt-4": "GPT-4",
  "gpt-4-turbo": "GPT-4 Turbo",
  "gpt-4o": "GPT-4o",
}

export type OpenAIModelType = keyof typeof openaiModels
