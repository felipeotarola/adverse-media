"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteSearchButton } from "@/components/delete-search-button"
import { RelationshipDiagram } from "@/components/relationship-diagram"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  Clock,
  User,
  Building,
  Info,
  FileText,
  Search,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw,
  Network,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function SearchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchId = params.id as string

  const [search, setSearch] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSearchDetails = async () => {
    setLoading(true)
    try {
      // Get the search record
      const { data: searchData, error: searchError } = await supabase
        .from("searches")
        .select("*")
        .eq("id", searchId)
        .single()

      if (searchError) {
        throw searchError
      }

      // Get the search results
      const { data: resultsData, error: resultsError } = await supabase
        .from("search_results")
        .select("*")
        .eq("search_id", searchId)
        .order("risk_score", { ascending: false })

      if (resultsError) {
        throw resultsError
      }

      // Get the search sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("search_sources")
        .select("*")
        .eq("search_id", searchId)
        .order("created_at", { ascending: true })

      if (sourcesError) {
        throw sourcesError
      }

      // Get the relationships
      const { data: relationshipsData, error: relError } = await supabase
        .from("entity_relationships")
        .select("*")
        .eq("search_id", searchId)

      if (relError && !relError.message.includes("does not exist")) {
        console.error("Error fetching relationships:", relError)
        // Continue anyway, this is not critical
      }

      setSearch(searchData)
      setResults(resultsData || [])
      setSources(sourcesData || [])
      setRelationships(relationshipsData || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching search details:", err)
      setError(err instanceof Error ? err.message : "Failed to load search details")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchId) {
      fetchSearchDetails()
    }
  }, [searchId])

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !search) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load search details: {error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Group sources by type
  const searchSources = sources.filter((s) => s.source_type === "search") || []
  const crawlSources = sources.filter((s) => s.source_type === "crawl") || []

  // Check if we have relationships
  const hasRelationships = relationships && relationships.length > 0

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/history">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Link>
            </Button>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={fetchSearchDetails}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DeleteSearchButton
                searchId={search.id}
                name={search.individual_name}
                onDelete={() => router.push("/history")}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2">Search Details</h1>
          <div className="flex flex-wrap gap-3 text-gray-500">
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {new Date(search.created_at).toLocaleString()}
            </div>
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              {search.individual_name}
            </div>
            {search.company_name && (
              <div className="flex items-center">
                <Building className="mr-1 h-4 w-4" />
                {search.company_name}
              </div>
            )}
            {search.additional_info && (
              <div className="flex items-center">
                <Info className="mr-1 h-4 w-4" />
                {search.additional_info}
              </div>
            )}
          </div>
        </div>

        <Alert
          variant={search.risk_level === "low" ? "default" : search.risk_level === "medium" ? "warning" : "destructive"}
          className="mb-6"
        >
          {search.risk_level === "low" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{search.risk_level.charAt(0).toUpperCase() + search.risk_level.slice(1)} Risk Profile</AlertTitle>
          <AlertDescription>
            Found {search.adverse_findings} adverse media mentions.
            <p className="mt-2">{search.recommendation}</p>
          </AlertDescription>
        </Alert>

        {/* Display relationship diagram if relationships were found */}
        {hasRelationships && (
          <div className="mb-6">
            <RelationshipDiagram relationships={relationships} targetName={search.individual_name} />
          </div>
        )}

        <Tabs defaultValue="results">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="results" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Analysis Results
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center" disabled={!hasRelationships}>
              <Network className="h-4 w-4 mr-2" />
              Relationships
              {hasRelationships && (
                <Badge variant="outline" className="ml-1">
                  {relationships.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Raw Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Search Results</h2>

              {results && results.length > 0 ? (
                results.map((result) => (
                  <Card
                    key={result.id}
                    className={
                      result.risk_score > 70
                        ? "border-red-300"
                        : result.risk_score > 40
                          ? "border-yellow-300"
                          : "border-gray-200"
                    }
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{result.title}</CardTitle>
                          <CardDescription className="mt-1">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center hover:underline"
                            >
                              {result.url.length > 50 ? `${result.url.substring(0, 50)}...` : result.url}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            result.risk_score > 70 ? "destructive" : result.risk_score > 40 ? "warning" : "outline"
                          }
                        >
                          Risk: {result.risk_score}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{result.description}</p>

                      {result.adverse_content && result.adverse_content.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Adverse Content Found:</p>
                          <ul className="text-sm space-y-1 pl-5 list-disc">
                            {result.adverse_content.map((content, i) => (
                              <li key={i} className="text-gray-700">
                                {content}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No significant adverse content detected</p>
                      )}
                    </CardContent>
                    {result.entity_match_confidence > 0 && (
                      <CardFooter className="border-t pt-4 pb-2">
                        <div className="flex items-center text-sm">
                          {result.entity_match_is_exact || result.entity_match_confidence >= 70 ? (
                            <UserCheck className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <UserX className="h-4 w-4 text-amber-500 mr-2" />
                          )}
                          <div>
                            <span className="font-medium">Entity Match:</span>{" "}
                            <Badge
                              variant={
                                result.entity_match_is_exact || result.entity_match_confidence >= 70
                                  ? "outline"
                                  : "secondary"
                              }
                              className="ml-1"
                            >
                              {result.entity_match_confidence}% confidence
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{result.entity_match_reason}</p>
                          </div>
                        </div>
                      </CardFooter>
                    )}
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-500">No results found for this search.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="relationships">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Relationship Analysis</h2>

              {hasRelationships ? (
                <div className="space-y-4">
                  {/* Group relationships by type */}
                  {Object.entries(
                    relationships.reduce(
                      (acc, rel) => {
                        if (!acc[rel.relationship_type]) {
                          acc[rel.relationship_type] = []
                        }
                        acc[rel.relationship_type].push(rel)
                        return acc
                      },
                      {} as Record<string, any[]>,
                    ),
                  ).map(([type, rels]) => (
                    <Card key={type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          {type.charAt(0).toUpperCase() + type.slice(1)} Relationships
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {rels.map((rel) => (
                            <div key={rel.id} className="p-3 border rounded-md bg-card/50">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-primary" />
                                  <span className="font-medium">{rel.related_name}</span>
                                </div>
                                <Badge variant="outline">{rel.confidence}% confidence</Badge>
                              </div>
                              {rel.description && (
                                <p className="mt-2 text-sm text-muted-foreground">{rel.description}</p>
                              )}
                              {rel.source_url && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Source: {rel.source_title || rel.source_url}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No relationships found for this search.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Search Query</h2>
                {searchSources.length > 0 ? (
                  searchSources.map((source) => (
                    <Card key={source.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">Web Search</CardTitle>
                        <CardDescription>
                          Query: {source.url.startsWith("query:") ? source.url.substring(6) : source.url}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {source.raw_data && source.raw_data.results && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Found {source.raw_data.results.length} results</p>
                            <div className="space-y-2">
                              {source.raw_data.results.map((result: any, index: number) => (
                                <div key={index} className="text-sm border p-2 rounded">
                                  <p className="font-medium">{result.title || "No title"}</p>
                                  <p className="text-gray-500 text-xs">{result.url}</p>
                                  <p className="text-gray-600 mt-1">{result.description || "No description"}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-gray-500">No search query information available.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Crawled Sources</h2>
                {crawlSources.length > 0 ? (
                  crawlSources.map((source) => (
                    <Card
                      key={source.id}
                      className={source.status === "success" ? "border-green-200" : "border-amber-200"}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{source.metadata?.title || "URL: " + source.url}</CardTitle>
                          <Badge variant={source.status === "success" ? "outline" : "secondary"}>
                            {source.status === "success" ? "Crawled Successfully" : "Crawl Failed"}
                          </Badge>
                        </div>
                        <CardDescription>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:underline"
                          >
                            {source.url.length > 50 ? `${source.url.substring(0, 50)}...` : source.url}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {source.status === "success" ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {source.metadata &&
                                Object.entries(source.metadata).map(
                                  ([key, value]) =>
                                    key !== "title" &&
                                    value && (
                                      <Badge key={key} variant="outline" className="bg-gray-50">
                                        {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                                      </Badge>
                                    ),
                                )}
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Content Preview:</p>
                              <p className="text-xs text-gray-600 mt-1 border p-2 rounded bg-gray-50 max-h-24 overflow-y-auto">
                                {source.raw_data?.data?.markdown
                                  ? source.raw_data.data.markdown.substring(0, 300) + "..."
                                  : "No content preview available"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-600">
                            Failed to retrieve content from this source.
                            {source.raw_data?.error && (
                              <span className="block mt-1 text-xs">Error: {source.raw_data.error}</span>
                            )}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-gray-500">No crawled sources available.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
