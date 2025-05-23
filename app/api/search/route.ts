import type { NextRequest } from "next/server"
import { generateText, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import FirecrawlApp from "@mendable/firecrawl-js"
import { extractJsonFromText } from "@/lib/utils"
import { createOrUpdateSearch, savePartialResults, finalizeSearch } from "@/app/actions"
import { supabase } from "@/lib/supabase"

// Define keyword mappings
const keywordMappings: Record<string, string> = {
  corruption: "korruption",
  sanctions: "sanktion*",
  "economic-crime": "ekonomisk brottslighet",
  prosecution: "åtal*",
  bribery: "mut*",
  crime: "brott*",
  "business-ban": "näringsförbud*",
  fraud: "bedrägeri*",
  scandal: "skandal*",
  terrorism: "terrorism*",
  "criminal-networks": "kriminella nätverk*",
  crypto: "krypto",
  narcotics: "narkotika",
  weapons: "vapen",
  "accounting-crime": "bokföringsbrott*",
  "money-laundering": "penningtvätt",
}

// Initialize Firecrawl with API key
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

// Define a tool for web search
const webSearch = tool({
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    try {
      const searchResults = await firecrawl.search(query, { limit: 5 })

      // Check if search was successful and data exists
      if (!searchResults || !searchResults.data) {
        console.error("Search returned no results or invalid data")
        return { results: [], rawData: searchResults }
      }

      return {
        results: searchResults.data || [],
        rawData: searchResults,
      }
    } catch (error) {
      console.error("Error searching the web:", error)
      return {
        results: [],
        rawData: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  },
})

// Define a tool for web scraping
const webScrape = tool({
  description: "Scrape content from a URL",
  parameters: z.object({
    url: z.string().url().describe("The URL to scrape"),
  }),
  execute: async ({ url }) => {
    try {
      const scrapeResult = await firecrawl.scrapeUrl(url, {
        formats: ["markdown", "html"],
      })

      // Check if the scrape was successful and data exists
      if (!scrapeResult.success || !scrapeResult.data) {
        console.log(`Failed to scrape ${url}: ${scrapeResult.error || "No data returned"}`)
        return {
          content: "",
          metadata: {},
          rawData: scrapeResult,
          status: "failed",
        }
      }

      // Safely access the markdown property
      const content = scrapeResult.data.markdown || ""
      const html = scrapeResult.data.html || ""
      const metadata = scrapeResult.data.metadata || {}

      return {
        content,
        html,
        metadata,
        rawData: scrapeResult,
        status: "success",
      }
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error)
      return {
        content: "",
        metadata: {},
        rawData: { error: error instanceof Error ? error.message : "Unknown error" },
        status: "failed",
      }
    }
  },
})

// Define a tool for analyzing content for adverse media
const analyzeContent = tool({
  description:
    "Analyze content for adverse media mentions with strict entity verification and relationship identification",
  parameters: z.object({
    content: z.string().describe("The content to analyze"),
    individualName: z.string().describe("The individual to look for"),
    companyName: z.string().describe("The company to look for (optional)"),
    additionalInfo: z.string().describe("Additional information like location (optional)"),
    keywords: z.array(z.string()).describe("Keywords to look for in the content"),
  }),
  execute: async ({ content, individualName, companyName, additionalInfo, keywords }) => {
    try {
      // If content is empty or too short, return early with a warning
      if (!content || content.length < 50) {
        return {
          riskScore: 0,
          adverseContent: ["Unable to retrieve full content for analysis"],
          summary: "Limited content available for analysis",
          entityMatch: {
            isExactMatch: false,
            confidence: 0,
            reason: "Insufficient content",
          },
          relationships: [],
        }
      }

      // Extract first and last name for better matching
      const nameParts = individualName.split(" ")
      const firstName = nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""

      const prompt = `
        You are performing an adverse media check for KYC (Know Your Customer) compliance.
        
        TARGET INDIVIDUAL: "${individualName}"
        ${additionalInfo ? `ADDITIONAL CONTEXT: ${additionalInfo}` : ""}
        ${companyName ? `ASSOCIATED COMPANY: ${companyName}` : ""}
        ${keywords.length > 0 ? `SPECIFIC KEYWORDS TO LOOK FOR: ${keywords.join(", ")}` : ""}
        
        STEP 1: ENTITY VERIFICATION
        First, determine if the content is definitely about the target individual. Consider:
        - Full name match (exact match is strongest)
        - Context alignment (location, profession, company, etc.)
        - Uniqueness of the name
        - Temporal relevance (recent vs. old information)
        
        STEP 2: ADVERSE MEDIA ANALYSIS
        Only if the content is about the target individual, analyze for adverse media mentions such as:
        - Criminal activities or allegations
        - Fraud or financial misconduct
        - Sanctions or watchlist appearances
        - Political exposure or corruption
        - Negative press or reputation issues
        - Litigation or legal troubles
        - Regulatory violations
        ${keywords.length > 0 ? `- Specific mentions of any of these keywords: ${keywords.join(", ")}` : ""}
        
        STEP 3: RELATIONSHIP IDENTIFICATION
        Identify any relationships mentioned between the target individual and other people or organizations:
        - Family relationships (spouse, children, siblings, parents, etc.)
        - Business relationships (partners, associates, employees, etc.)
        - Political relationships (allies, opponents, etc.)
        - Criminal relationships (accomplices, co-defendants, etc.)
        - Other significant relationships
        
        CONTENT TO ANALYZE:
        ${content}
        
        Return a JSON object with:
        - riskScore: number from 0-100 indicating the level of risk (0 if not about target individual)
        - adverseContent: array of strings with specific adverse media mentions found (empty if not about target individual)
        - summary: brief summary of findings
        - entityMatch: {
            isExactMatch: boolean indicating if this is definitely about the target individual,
            confidence: number from 0-100 indicating confidence in the match,
            reason: string explaining the match assessment
          }
        - relationships: array of objects with the following structure:
            {
              name: string (name of the related person or organization),
              type: string (type of relationship, e.g., "family", "business", "political", "criminal"),
              description: string (description of the relationship),
              confidence: number from 0-100 indicating confidence in this relationship
            }
        
        IMPORTANT: Return ONLY the JSON object with no markdown formatting, code blocks, or additional text.
      `

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      try {
        // Use the utility function to extract JSON from the response
        const parsedResult = extractJsonFromText(text)
        if (parsedResult) {
          // If it's not a match, ensure risk score is 0
          if (!parsedResult.entityMatch?.isExactMatch && parsedResult.entityMatch?.confidence < 70) {
            parsedResult.riskScore = 0
            parsedResult.adverseContent = []
            parsedResult.relationships = []
          }

          // Ensure relationships is always an array
          if (!parsedResult.relationships) {
            parsedResult.relationships = []
          }

          return parsedResult
        }

        // If extraction fails, return a default response
        console.error("Failed to parse analysis result, returning default response")
        return {
          riskScore: 0,
          adverseContent: ["Error analyzing content"],
          summary: "Error analyzing content",
          entityMatch: {
            isExactMatch: false,
            confidence: 0,
            reason: "Error in analysis",
          },
          relationships: [],
        }
      } catch (e) {
        console.error("Error parsing analysis result:", e)
        return {
          riskScore: 0,
          adverseContent: ["Error analyzing content"],
          summary: "Error analyzing content",
          entityMatch: {
            isExactMatch: false,
            confidence: 0,
            reason: "Error in analysis",
          },
          relationships: [],
        }
      }
    } catch (error) {
      console.error("Error analyzing content:", error)
      return {
        riskScore: 0,
        adverseContent: ["Error during content analysis"],
        summary: "Error analyzing content",
        entityMatch: {
          isExactMatch: false,
          confidence: 0,
          reason: "Error in analysis",
        },
        relationships: [],
      }
    }
  },
})

// Tool to analyze search result metadata when scraping fails
const analyzeSearchResult = tool({
  description: "Analyze search result metadata for adverse media indicators with strict entity verification",
  parameters: z.object({
    title: z.string().describe("The title of the search result"),
    description: z.string().describe("The description of the search result"),
    url: z.string().describe("The URL of the search result"),
    individualName: z.string().describe("The individual to look for"),
    companyName: z.string().describe("The company to look for (optional)"),
    additionalInfo: z.string().describe("Additional information like location (optional)"),
    keywords: z.array(z.string()).describe("Keywords to look for in the content"),
  }),
  execute: async ({ title, description, url, individualName, companyName, additionalInfo, keywords }) => {
    try {
      // Extract first and last name for better matching
      const nameParts = individualName.split(" ")
      const firstName = nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""

      const prompt = `
        You are performing an adverse media check for KYC (Know Your Customer) compliance.
        
        TARGET INDIVIDUAL: "${individualName}"
        ${additionalInfo ? `ADDITIONAL CONTEXT: ${additionalInfo}` : ""}
        ${companyName ? `ASSOCIATED COMPANY: ${companyName}` : ""}
        ${keywords.length > 0 ? `SPECIFIC KEYWORDS TO LOOK FOR: ${keywords.join(", ")}` : ""}
        
        STEP 1: ENTITY VERIFICATION
        First, determine if the search result is definitely about the target individual. Consider:
        - Full name match (exact match is strongest)
        - Context alignment (location, profession, company, etc.)
        - Uniqueness of the name
        - Temporal relevance (recent vs. old information)
        
        STEP 2: ADVERSE MEDIA ANALYSIS
        Only if the search result is about the target individual, analyze for adverse media indicators such as:
        - Criminal activities or allegations
        - Fraud or financial misconduct
        - Sanctions or watchlist appearances
        - Political exposure or corruption
        - Negative press or reputation issues
        - Litigation or legal troubles
        - Regulatory violations
        ${keywords.length > 0 ? `- Specific mentions of any of these keywords: ${keywords.join(", ")}` : ""}
        
        STEP 3: RELATIONSHIP IDENTIFICATION
        Try to identify any relationships mentioned between the target individual and other people or organizations.
        
        SEARCH RESULT:
        Title: ${title}
        Description: ${description}
        URL: ${url}
        
        Return a JSON object with:
        - riskScore: number from 0-100 indicating the level of risk (0 if not about target individual)
        - adverseContent: array of strings with specific adverse media indicators found (empty if not about target individual)
        - summary: brief summary of findings
        - entityMatch: {
            isExactMatch: boolean indicating if this is definitely about the target individual,
            confidence: number from 0-100 indicating confidence in the match,
            reason: string explaining the match assessment
          }
        - relationships: array of objects with the following structure:
            {
              name: string (name of the related person or organization),
              type: string (type of relationship, e.g., "family", "business", "political", "criminal"),
              description: string (description of the relationship),
              confidence: number from 0-100 indicating confidence in this relationship
            }
        
        IMPORTANT: Return ONLY the JSON object with no markdown formatting, code blocks, or additional text.
      `

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      try {
        // Use the utility function to extract JSON from the response
        const parsedResult = extractJsonFromText(text)
        if (parsedResult) {
          // If it's not a match, ensure risk score is 0
          if (!parsedResult.entityMatch?.isExactMatch && parsedResult.entityMatch?.confidence < 70) {
            parsedResult.riskScore = 0
            parsedResult.adverseContent = []
            parsedResult.relationships = []
          }

          // Ensure relationships is always an array
          if (!parsedResult.relationships) {
            parsedResult.relationships = []
          }

          return parsedResult
        }

        // If extraction fails, log the raw text and return a default response
        console.error("Failed to parse search result analysis, raw text:", text)
        return {
          riskScore: 0,
          adverseContent: ["Error analyzing search result"],
          summary: "Error analyzing search result",
          entityMatch: {
            isExactMatch: false,
            confidence: 0,
            reason: "Error in analysis",
          },
          relationships: [],
        }
      } catch (e) {
        console.error("Error parsing search result analysis:", e, "Raw text:", text)
        return {
          riskScore: 0,
          adverseContent: ["Error analyzing search result"],
          summary: "Error analyzing search result",
          entityMatch: {
            isExactMatch: false,
            confidence: 0,
            reason: "Error in analysis",
          },
          relationships: [],
        }
      }
    } catch (error) {
      console.error("Error analyzing search result:", error)
      return {
        riskScore: 0,
        adverseContent: ["Error analyzing search result"],
        summary: "Error analyzing search result",
        entityMatch: {
          isExactMatch: false,
          confidence: 0,
          reason: "Error in analysis",
        },
        relationships: [],
      }
    }
  },
})

export async function POST(req: NextRequest) {
  const { individualName, companyName, additionalInfo, keywords = [], searchId = null } = await req.json()

  // Map keyword IDs to their actual Swedish terms
  const keywordTerms = keywords.map((id) => keywordMappings[id]).filter(Boolean)

  // Create a more specific search query based on the input and selected keywords
  let searchQuery = `${individualName}`

  // Add keywords if any are selected
  if (keywordTerms.length > 0) {
    searchQuery += ` AND (${keywordTerms.join(" OR ")})`
  }

  // Add company name if provided
  if (companyName) {
    if (keywordTerms.length > 0) {
      // If we have keywords, create a separate clause for the company
      searchQuery += ` OR (${companyName} AND (${keywordTerms.join(" OR ")}))`
    } else {
      // Otherwise just add the company name
      searchQuery += ` OR ${companyName}`
    }
  }

  // Add additional context terms
  if (additionalInfo) {
    searchQuery += ` ${additionalInfo}`
  }

  console.log("Generated search query:", searchQuery)

  // Set up the streaming response
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Function to send updates to the client
  const sendUpdate = async (data: any) => {
    await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Track all sources
  const sources = {
    search: {
      query: searchQuery,
      results: [] as any[],
      rawData: null as any,
    },
    crawl: [] as any[],
  }

  // Track all relationships found
  let allRelationships: any[] = []

  // Start the search and analysis process
  ;(async () => {
    let currentSearchId = searchId

    try {
      // Create or update the search record if we don't have an ID yet
      if (!currentSearchId) {
        const result = await createOrUpdateSearch(
          null,
          individualName,
          companyName,
          additionalInfo,
          "in_progress",
          keywordTerms,
        )

        if (!result.success) {
          throw new Error(`Failed to create search record: ${result.error}`)
        }

        currentSearchId = result.searchId
      }

      // Initial update
      await sendUpdate({
        status: "searching",
        progress: 5,
        results: [],
        sources: sources,
        searchId: currentSearchId,
      })

      // Step 1: Search the web
      const searchResponse = await webSearch.execute({ query: searchQuery })
      const searchResults = searchResponse.results
      sources.search.rawData = searchResponse.rawData
      sources.search.results = searchResults

      // Save progress after search
      await savePartialResults(currentSearchId, [], sources, 10)

      // Check if we got any search results
      if (!searchResults || searchResults.length === 0) {
        // Finalize with empty results
        const summary = {
          riskLevel: "low" as const,
          adverseFindings: 0,
          recommendation: "No search results found. Consider refining your search terms.",
          entityMatchStats: {
            totalResults: 0,
            validEntityMatches: 0,
          },
          keywords: keywordTerms,
        }

        await finalizeSearch(currentSearchId, summary)

        await sendUpdate({
          status: "complete",
          progress: 100,
          results: [],
          sources: sources,
          summary,
          searchId: currentSearchId,
          autoSaved: true,
          relationships: [],
        })
        return
      }

      await sendUpdate({
        status: "searching",
        progress: 30,
        results: searchResults.map((result: any) => ({
          url: result.url,
          title: result.title || "No title",
          description: result.description || "No description",
          riskScore: 0,
          status: "analyzing",
        })),
        sources: sources,
        searchId: currentSearchId,
      })

      // Step 2: Scrape and analyze each result
      const analyzedResults = []
      let totalRiskScore = 0
      let adverseFindings = 0
      let scrapingFailures = 0
      let validEntityMatches = 0
      let totalResults = 0

      // Save progress after every few results to avoid losing data
      const SAVE_INTERVAL = 2 // Save after every 2 results
      let lastSaveIndex = -1

      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i]
        const progress = 30 + Math.floor((i / searchResults.length) * 60)

        // Update progress
        await sendUpdate({
          status: "analyzing",
          progress,
          results: [
            ...analyzedResults,
            ...searchResults.slice(i).map((r: any) => ({
              url: r.url,
              title: r.title || "No title",
              description: r.description || "No description",
              riskScore: 0,
              status: "analyzing",
            })),
          ],
          sources: sources,
          searchId: currentSearchId,
        })

        // Scrape the URL
        const scrapeResult = await webScrape.execute({ url: result.url })

        // Add to sources
        sources.crawl.push({
          url: result.url,
          status: scrapeResult.status,
          metadata: scrapeResult.metadata,
          rawData: scrapeResult.rawData,
        })

        let analysis

        // Check if we got any content back
        if (scrapeResult.status === "success" && scrapeResult.content && scrapeResult.content.length > 100) {
          // Analyze the content
          analysis = await analyzeContent.execute({
            content: scrapeResult.content,
            individualName: individualName,
            companyName: companyName,
            additionalInfo: additionalInfo || "",
            keywords: keywordTerms,
          })
        } else {
          // If scraping failed or returned insufficient content, analyze the search result metadata instead
          scrapingFailures++
          analysis = await analyzeSearchResult.execute({
            title: result.title || "",
            description: result.description || "",
            url: result.url,
            individualName: individualName,
            companyName: companyName,
            additionalInfo: additionalInfo || "",
            keywords: keywordTerms,
          })
        }

        totalResults++

        // Check if this is a valid entity match
        const isValidMatch = analysis.entityMatch?.isExactMatch || analysis.entityMatch?.confidence >= 70
        if (isValidMatch) {
          validEntityMatches++

          // If this is a valid match and has relationships, add them to our collection
          if (analysis.relationships && analysis.relationships.length > 0) {
            // Add source URL to each relationship
            const relationshipsWithSource = analysis.relationships.map((rel: any) => ({
              ...rel,
              sourceUrl: result.url,
              sourceTitle: result.title || "No title",
            }))

            allRelationships = [...allRelationships, ...relationshipsWithSource]
          }
        }

        const analyzedResult = {
          url: result.url,
          title: result.title || "No title",
          description: result.description || "No description",
          riskScore: analysis.riskScore || 0,
          adverseContent: analysis.adverseContent || [],
          status: "complete" as const,
          entityMatch: analysis.entityMatch || {
            isExactMatch: false,
            confidence: 0,
            reason: "No entity match information",
          },
          relationships: analysis.relationships || [],
          rawSearchData: result,
          rawCrawlData:
            scrapeResult.status === "success"
              ? {
                  content: scrapeResult.content,
                  html: scrapeResult.html,
                  metadata: scrapeResult.metadata,
                }
              : null,
        }

        analyzedResults.push(analyzedResult)

        // Only count risk scores and adverse findings for valid entity matches
        if (isValidMatch) {
          totalRiskScore += analyzedResult.riskScore
          if (analyzedResult.adverseContent.length > 0) {
            adverseFindings += analyzedResult.adverseContent.length
          }
        }

        // Send update with the new analyzed result
        await sendUpdate({
          status: "analyzing",
          progress,
          results: [
            ...analyzedResults,
            ...searchResults.slice(i + 1).map((r: any) => ({
              url: r.url,
              title: r.title || "No title",
              description: r.description || "No description",
              riskScore: 0,
              status: "analyzing",
            })),
          ],
          sources: sources,
          searchId: currentSearchId,
          relationships: allRelationships,
        })

        // Save partial results periodically
        if (i - lastSaveIndex >= SAVE_INTERVAL) {
          await savePartialResults(currentSearchId, analyzedResults.slice(lastSaveIndex + 1), sources, progress)
          lastSaveIndex = i
        }
      }

      // Save any remaining results
      if (lastSaveIndex < analyzedResults.length - 1) {
        await savePartialResults(currentSearchId, analyzedResults.slice(lastSaveIndex + 1), sources, 90)
      }

      // Step 3: Generate a summary
      // Calculate average risk score only from valid entity matches
      const avgRiskScore = validEntityMatches > 0 ? totalRiskScore / validEntityMatches : 0

      // Adjust risk level calculation
      let riskLevel = avgRiskScore > 70 ? "high" : avgRiskScore > 40 ? "medium" : "low"

      // If we have a significant number of scraping failures but found some adverse content,
      // increase the risk level as a precaution
      if (scrapingFailures > 0 && adverseFindings > 0 && validEntityMatches > 0) {
        if (riskLevel === "low") riskLevel = "medium"
      }

      let recommendation = ""
      if (validEntityMatches === 0) {
        riskLevel = "low"
        recommendation = `No relevant information found about ${individualName}. The search results appear to reference different individuals.`
        adverseFindings = 0
      } else if (riskLevel === "high") {
        recommendation = `Significant adverse media found. Recommend enhanced due diligence and escalation to compliance team.`
      } else if (riskLevel === "medium") {
        recommendation = `Some adverse media detected. Consider additional verification and monitoring.`
      } else {
        if (scrapingFailures > 0) {
          recommendation = `No significant adverse media detected, but some sources could not be fully analyzed. Consider manual review of search results.`
        } else {
          recommendation = `No significant adverse media detected. Standard KYC procedures appear sufficient.`
        }
      }

      // Add information about relationships if any were found
      if (allRelationships.length > 0) {
        recommendation += ` ${allRelationships.length} relationships to other individuals or organizations were identified.`
      }

      // Create the final summary
      const summary = {
        riskLevel: riskLevel as "low" | "medium" | "high",
        adverseFindings,
        recommendation,
        entityMatchStats: {
          totalResults,
          validEntityMatches,
        },
        keywords: keywordTerms,
      }

      // Finalize the search
      await finalizeSearch(currentSearchId, summary)

      // Final update with complete results and summary
      await sendUpdate({
        status: "complete",
        progress: 100,
        results: analyzedResults,
        sources: sources,
        summary,
        searchId: currentSearchId,
        autoSaved: true,
        relationships: allRelationships,
      })
    } catch (error) {
      console.error("Error in search process:", error)

      // Try to save what we have so far if we have a search ID
      if (currentSearchId) {
        try {
          await savePartialResults(currentSearchId, [], sources, 50)

          // Update the search record to indicate an error
          await supabase
            .from("searches")
            .update({
              status: "error",
              recommendation: `Error during search: ${error instanceof Error ? error.message : "Unknown error"}`,
            })
            .eq("id", currentSearchId)
        } catch (saveError) {
          console.error("Error saving partial results after error:", saveError)
        }
      }

      await sendUpdate({
        status: "complete",
        progress: 100,
        results: [],
        sources: sources,
        error: `An error occurred during the search process: ${error instanceof Error ? error.message : "Unknown error"}`,
        searchId: currentSearchId,
      })
    } finally {
      writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
