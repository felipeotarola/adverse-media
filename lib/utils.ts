import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a JSON object from a string that might contain markdown formatting
 * @param text The text that might contain JSON with markdown formatting
 * @returns The parsed JSON object or null if parsing fails
 */
export function extractJsonFromText(text: string): any {
  try {
    // First try to parse the text directly as JSON
    return JSON.parse(text)
  } catch (e) {
    try {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1])
      }

      // If no code blocks, try to find anything that looks like a JSON object
      const objectMatch = text.match(/(\{[\s\S]*?\})/)
      if (objectMatch && objectMatch[1]) {
        return JSON.parse(objectMatch[1])
      }
    } catch (innerError) {
      console.error("Error extracting JSON from text:", innerError)
    }
  }
  return null
}
