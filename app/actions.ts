"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

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
}

interface SearchSources {
  search: {
    query: string
    results: any[]
    rawData: any
  }
  crawl: any[]
}

export async function saveSearchResults(
  individualName: string,
  companyName: string | null,
  additionalInfo: string | null,
  results: SearchResult[],
  summary: SearchSummary,
  sources: SearchSources,
) {
  try {
    // Insert the search record
    const { data: search, error: searchError } = await supabase
      .from("searches")
      .insert({
        individual_name: individualName,
        company_name: companyName || null,
        additional_info: additionalInfo || null,
        risk_level: summary.riskLevel,
        adverse_findings: summary.adverseFindings,
        recommendation: summary.recommendation,
        entity_match_total: summary.entityMatchStats?.totalResults || 0,
        entity_match_valid: summary.entityMatchStats?.validEntityMatches || 0,
        // You can add user_id here if you have authentication
      })
      .select()
      .single()

    if (searchError) {
      console.error("Error saving search:", searchError)
      return { success: false, error: searchError.message }
    }

    // Insert the search results
    const searchResultsToInsert = results.map((result) => ({
      search_id: search.id,
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
    }))

    const { error: resultsError } = await supabase.from("search_results").insert(searchResultsToInsert)

    if (resultsError) {
      console.error("Error saving search results:", resultsError)
      return { success: false, error: resultsError.message }
    }

    // Save search sources
    const searchSourcesToInsert = [
      // Save the search query as a source
      {
        search_id: search.id,
        source_type: "search",
        url: "query:" + sources.search.query,
        status: "success",
        raw_data: sources.search.rawData,
        metadata: { query: sources.search.query },
      },
      // Save each crawl source
      ...sources.crawl.map((crawl) => ({
        search_id: search.id,
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
      return { success: false, error: sourcesError.message }
    }

    revalidatePath("/history")
    return { success: true, searchId: search.id }
  } catch (error) {
    console.error("Error in saveSearchResults:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getSearchHistory() {
  try {
    const { data, error } = await supabase.from("searches").select("*").order("created_at", { ascending: false })

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
    // Get the search record
    const { data: search, error: searchError } = await supabase.from("searches").select("*").eq("id", searchId).single()

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
