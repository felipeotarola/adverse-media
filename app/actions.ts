"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

interface EntityMatch {
  isExactMatch: boolean
  confidence: number
  reason: string
}

interface SearchResult {
  url: string
  title: string
  description: string
  riskScore: number
  adverseContent?: string[]
  status: "analyzing" | "complete"
  entityMatch?: EntityMatch
  rawSearchData?: any
  rawCrawlData?: any
}

interface SearchSummary {
  riskLevel: "low" | "medium" | "high"
  adverseFindings: number
  recommendation: string
  entityMatchStats?: {
    totalResults: number
    validEntityMatches: number
  }
  keywords?: string[]
}

interface SearchSources {
  search: {
    query: string
    results: any[]
    rawData: any
  }
  crawl: any[]
}

// Function to create a new search or update an existing one
export async function createOrUpdateSearch(
  searchId: string | null,
  individualName: string,
  companyName: string | null,
  additionalInfo: string | null,
  status: "in_progress" | "complete" = "in_progress",
  keywords: string[] = [],
) {
  try {
    // Generate a new ID if one wasn't provided
    const id = searchId || uuidv4()

    const searchData = {
      id,
      individual_name: individualName,
      company_name: companyName,
      additional_info: additionalInfo,
      status,
      keywords: keywords.length > 0 ? keywords : null,
      // Only set these fields if they're not already set (for new searches)
      ...(searchId
        ? {}
        : {
            risk_level: "unknown",
            adverse_findings: 0,
            recommendation: "Analysis in progress...",
          }),
    }

    // Upsert the search record
    const { data, error } = await supabase.from("searches").upsert(searchData).select().single()

    if (error) {
      console.error("Error creating/updating search:", error)
      return { success: false, error: error.message, searchId: id }
    }

    return { success: true, searchId: id }
  } catch (error) {
    console.error("Error in createOrUpdateSearch:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Function to save partial search results incrementally
export async function savePartialResults(
  searchId: string,
  results: SearchResult[],
  sources: SearchSources,
  progress: number,
) {
  try {
    if (!searchId) {
      return { success: false, error: "Search ID is required" }
    }

    // Update the search record with progress
    const { error: searchError } = await supabase
      .from("searches")
      .update({
        progress,
        last_updated: new Date().toISOString(),
      })
      .eq("id", searchId)

    if (searchError) {
      console.error("Error updating search progress:", searchError)
      return { success: false, error: searchError.message }
    }

    // Only save new results that haven't been saved yet
    if (results.length > 0) {
      // Get existing results to avoid duplicates
      const { data: existingResults } = await supabase.from("search_results").select("url").eq("search_id", searchId)

      const existingUrls = new Set(existingResults?.map((r) => r.url) || [])

      // Filter out results that have already been saved
      const newResults = results.filter((result) => !existingUrls.has(result.url))

      if (newResults.length > 0) {
        // Insert the new search results
        const searchResultsToInsert = newResults.map((result) => ({
          search_id: searchId,
          url: result.url,
          title: result.title,
          description: result.description,
          risk_score: result.riskScore,
          adverse_content: result.adverseContent || null,
          raw_search_data: result.rawSearchData || null,
          raw_crawl_data: result.rawCrawlData || null,
          entity_match_confidence: result.entityMatch?.confidence || 0,
          entity_match_is_exact: result.entityMatch?.isExactMatch || false,
          entity_match_reason: result.entityMatch?.reason || null,
          status: result.status,
        }))

        const { error: resultsError } = await supabase.from("search_results").insert(searchResultsToInsert)

        if (resultsError) {
          console.error("Error saving partial search results:", resultsError)
          return { success: false, error: resultsError.message }
        }
      }
    }

    // Save search sources if they haven't been saved yet
    // First check if we already have sources for this search
    const { data: existingSources, error: sourcesCheckError } = await supabase
      .from("search_sources")
      .select("id")
      .eq("search_id", searchId)
      .limit(1)

    if (sourcesCheckError) {
      console.error("Error checking existing sources:", sourcesCheckError)
      // Continue anyway, this is not critical
    }

    // Only save sources if we don't have any yet
    if (!existingSources || existingSources.length === 0) {
      const searchSourcesToInsert = [
        // Save the search query as a source
        {
          search_id: searchId,
          source_type: "search",
          url: "query:" + sources.search.query,
          status: "success",
          raw_data: sources.search.rawData,
          metadata: { query: sources.search.query },
        },
        // Save each crawl source
        ...sources.crawl.map((crawl) => ({
          search_id: searchId,
          source_type: "crawl",
          url: crawl.url,
          status: crawl.status,
          raw_data: crawl.rawData,
          metadata: crawl.metadata,
        })),
      ]

      const { error: sourcesError } = await supabase.from("search_sources").insert(searchSourcesToInsert)

      if (sourcesError) {
        console.error("Error saving search sources:", sourcesError)
        // Continue anyway, this is not critical
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in savePartialResults:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Function to finalize a search with complete results
export async function finalizeSearch(searchId: string, summary: SearchSummary) {
  try {
    if (!searchId) {
      return { success: false, error: "Search ID is required" }
    }

    // Update the search record with the final summary
    const { error: searchError } = await supabase
      .from("searches")
      .update({
        risk_level: summary.riskLevel,
        adverse_findings: summary.adverseFindings,
        recommendation: summary.recommendation,
        entity_match_total: summary.entityMatchStats?.totalResults || 0,
        entity_match_valid: summary.entityMatchStats?.validEntityMatches || 0,
        status: "complete",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchId)

    if (searchError) {
      console.error("Error finalizing search:", searchError)
      return { success: false, error: searchError.message }
    }

    revalidatePath("/history")
    revalidatePath(`/history/${searchId}`)

    return { success: true }
  } catch (error) {
    console.error("Error in finalizeSearch:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Original saveSearchResults function (now a wrapper around the new functions)
export async function saveSearchResults(
  individualName: string,
  companyName: string | null,
  additionalInfo: string | null,
  results: SearchResult[],
  summary: SearchSummary,
  sources: SearchSources,
) {
  try {
    // Create a new search
    const { success, searchId, error } = await createOrUpdateSearch(
      null,
      individualName,
      companyName,
      additionalInfo,
      "complete",
      summary.keywords,
    )

    if (!success || !searchId) {
      return { success: false, error }
    }

    // Save all results
    await savePartialResults(searchId, results, sources, 100)

    // Finalize the search
    await finalizeSearch(searchId, summary)

    revalidatePath("/history")
    return { success: true, searchId }
  } catch (error) {
    console.error("Error in saveSearchResults:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getSearchHistory() {
  try {
    // Add a cache-busting timestamp parameter to the query
    const timestamp = new Date().getTime()

    const { data, error } = await supabase
      .from("searches")
      .select("*")
      .order("created_at", { ascending: false })
      // Add a filter that always evaluates to true but includes the timestamp
      .or(`id.gt.0,timestamp.eq.${timestamp}`)

    if (error) {
      console.error("Error fetching search history:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getSearchHistory:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getSearchDetails(searchId: string) {
  try {
    // Add a cache-busting timestamp parameter to the query
    const timestamp = new Date().getTime()

    // Get the search record
    const { data: search, error: searchError } = await supabase
      .from("searches")
      .select("*")
      .eq("id", searchId)
      // Add a filter that always evaluates to true but includes the timestamp
      .or(`id.eq.${searchId},timestamp.eq.${timestamp}`)
      .single()

    if (searchError) {
      console.error("Error fetching search details:", searchError)
      return { success: false, error: searchError.message }
    }

    // Get the search results
    const { data: results, error: resultsError } = await supabase
      .from("search_results")
      .select("*")
      .eq("search_id", searchId)
      .order("risk_score", { ascending: false })
      // Add a filter that always evaluates to true but includes the timestamp
      .or(`search_id.eq.${searchId},timestamp.eq.${timestamp}`)

    if (resultsError) {
      console.error("Error fetching search results:", resultsError)
      return { success: false, error: resultsError.message }
    }

    // Get the search sources
    const { data: sources, error: sourcesError } = await supabase
      .from("search_sources")
      .select("*")
      .eq("search_id", searchId)
      .order("created_at", { ascending: true })
      // Add a filter that always evaluates to true but includes the timestamp
      .or(`search_id.eq.${searchId},timestamp.eq.${timestamp}`)

    if (sourcesError) {
      console.error("Error fetching search sources:", sourcesError)
      return { success: false, error: sourcesError.message }
    }

    return { success: true, search, results, sources }
  } catch (error) {
    console.error("Error in getSearchDetails:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteSearch(searchId: string) {
  try {
    // Delete related records first (due to foreign key constraints)

    // Delete search results
    const { error: resultsError } = await supabase.from("search_results").delete().eq("search_id", searchId)

    if (resultsError) {
      console.error("Error deleting search results:", resultsError)
      return { success: false, error: resultsError.message }
    }

    // Delete search sources
    const { error: sourcesError } = await supabase.from("search_sources").delete().eq("search_id", searchId)

    if (sourcesError) {
      console.error("Error deleting search sources:", sourcesError)
      return { success: false, error: sourcesError.message }
    }

    // Check if allabolag_sources table exists and delete records if it does
    try {
      const { error: allabolagError } = await supabase.from("allabolag_sources").delete().eq("search_id", searchId)

      if (allabolagError && !allabolagError.message.includes("does not exist")) {
        console.error("Error deleting allabolag sources:", allabolagError)
        // Continue anyway, this is not critical
      }
    } catch (error) {
      // Ignore errors if the table doesn't exist
      console.log("Allabolag sources table might not exist, continuing...")
    }

    // Finally, delete the search record
    const { error: searchError } = await supabase.from("searches").delete().eq("id", searchId)

    if (searchError) {
      console.error("Error deleting search:", searchError)
      return { success: false, error: searchError.message }
    }

    revalidatePath("/history")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteSearch:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
