import { type NextRequest, NextResponse } from "next/server"
import FirecrawlApp from "@mendable/firecrawl-js"

// Initialize Firecrawl with API key
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { individualName, companyName, additionalInfo } = await req.json()

    // Create a simple search query
    const searchQuery = `${individualName} ${companyName || ""} ${additionalInfo || ""}`

    console.log("Fallback search query:", searchQuery)

    // Perform a basic search
    const searchResults = await firecrawl.search(searchQuery, { limit: 3 })

    // Return the raw results
    return NextResponse.json({
      success: true,
      results: searchResults.data || [],
      query: searchQuery,
    })
  } catch (error) {
    console.error("Error in fallback search:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
