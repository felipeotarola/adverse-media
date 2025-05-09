"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Save,
  Search,
  FileText,
  UserCheck,
  UserX,
  Terminal,
  Shield,
  Database,
  RefreshCw,
  FileWarning,
  Code,
} from "lucide-react"
import { saveSearchResults } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

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

interface SearchSources {
  search: {
    query: string
    results: any[]
    rawData: any
  }
  crawl: any[]
}

interface SearchStatus {
  status: "searching" | "analyzing" | "complete"
  progress: number
  results: SearchResult[]
  sources?: SearchSources
  summary?: {
    riskLevel: "low" | "medium" | "high"
    adverseFindings: number
    recommendation: string
    entityMatchStats?: {
      totalResults: number
      validEntityMatches: number
    }
  }
  error?: string
}

export function SearchResults({
  individualName,
  companyName,
  additionalInfo,
}: {
  individualName: string
  companyName: string
  additionalInfo: string
}) {
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    status: "searching",
    progress: 0,
    results: [],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("results")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            individualName,
            companyName,
            additionalInfo,
          }),
        })

        if (!response.body) {
          throw new Error("Response body is null")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n").filter((line) => line.trim() !== "")

          for (const line of lines) {
            try {
              if (line.startsWith("data: ")) {
                const data = JSON.parse(line.substring(6))
                setSearchStatus((prev) => ({ ...prev, ...data }))
              }
            } catch (e) {
              console.error("Error parsing chunk:", e)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching search results:", error)
        setSearchStatus((prev) => ({
          ...prev,
          status: "complete",
          progress: 100,
          error: "Failed to connect to search service. Please try again later.",
        }))
      }
    }

    fetchResults()
  }, [individualName, companyName, additionalInfo])

  // Calculate the highest risk score from all results with valid entity matches
  const highestRiskScore = searchStatus.results
    .filter((result) => result.entityMatch?.isExactMatch || result.entityMatch?.confidence >= 70)
    .reduce((max, result) => (result.riskScore > max ? result.riskScore : max), 0)

  const handleSaveResults = async () => {
    if (!searchStatus.summary || !searchStatus.sources) return

    setIsSaving(true)
    try {
      const result = await saveSearchResults(
        individualName,
        companyName || null,
        additionalInfo || null,
        searchStatus.results,
        searchStatus.summary,
        searchStatus.sources,
      )

      if (result.success) {
        setIsSaved(true)
        toast({
          title: "Search results saved",
          description: "You can view this search in your history.",
        })
      } else {
        toast({
          title: "Error saving results",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving search results:", error)
      toast({
        title: "Error saving results",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const viewHistory = () => {
    router.push("/history")
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Terminal className="h-5 w-5 mr-2 text-primary" />
              Threat Intelligence Scan
            </div>
            <Badge
              variant={
                searchStatus.status === "searching"
                  ? "outline"
                  : searchStatus.status === "analyzing"
                    ? "secondary"
                    : "default"
              }
            >
              {searchStatus.status === "searching"
                ? "Scanning Network"
                : searchStatus.status === "analyzing"
                  ? "Analyzing Data"
                  : "Scan Complete"}
            </Badge>
          </CardTitle>
          <CardDescription className="flex items-center text-xs">
            <Code className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            {searchStatus.status === "searching"
              ? "Accessing secure databases and scanning for relevant information..."
              : searchStatus.status === "analyzing"
                ? "Running threat analysis algorithms on retrieved data..."
                : "Analysis complete. Results compiled and threat assessment generated."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Scan Progress</span>
            <span className="text-primary">{searchStatus.progress}%</span>
          </div>
          <Progress value={searchStatus.progress} className="h-1.5 mb-2" />

          <div className="mt-4 text-xs text-muted-foreground grid grid-cols-2 gap-2">
            <div className="flex items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mr-1.5"></div>
              <span>Target: {individualName}</span>
            </div>
            {companyName && (
              <div className="flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mr-1.5"></div>
                <span>Organization: {companyName}</span>
              </div>
            )}
          </div>

          {searchStatus.status === "complete" && (
            <div className="flex justify-end mt-4 space-x-2">
              {!isSaved ? (
                <Button onClick={handleSaveResults} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-3.5 w-3.5" />
                      Save Intelligence Report
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={viewHistory} size="sm" variant="outline">
                  View History
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {searchStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{searchStatus.error}</p>
            <Button onClick={() => window.location.reload()} size="sm" variant="outline" className="self-start">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {searchStatus.summary && (
        <Alert
          variant={
            searchStatus.summary.riskLevel === "low"
              ? "default"
              : searchStatus.summary.riskLevel === "medium"
                ? "warning"
                : "destructive"
          }
          className={
            searchStatus.summary.riskLevel === "low"
              ? "risk-low"
              : searchStatus.summary.riskLevel === "medium"
                ? "risk-medium"
                : "risk-high"
          }
        >
          {searchStatus.summary.riskLevel === "low" ? (
            <Shield className="h-4 w-4 text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle className="flex items-center">
            {searchStatus.summary.riskLevel === "low"
              ? "Low Risk Profile"
              : searchStatus.summary.riskLevel === "medium"
                ? "Medium Risk Profile"
                : "High Risk Profile"}
            <Badge
              className="ml-2"
              variant={
                searchStatus.summary.riskLevel === "low"
                  ? "outline"
                  : searchStatus.summary.riskLevel === "medium"
                    ? "warning"
                    : "destructive"
              }
            >
              Threat Level: {searchStatus.summary.riskLevel.toUpperCase()}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-1 text-sm">
              Found <span className="font-semibold">{searchStatus.summary.adverseFindings}</span> adverse media
              mentions.
            </div>
            <p className="mt-2 text-sm">{searchStatus.summary.recommendation}</p>
            {searchStatus.summary.entityMatchStats && (
              <div className="mt-2 text-xs border-t border-border pt-2">
                <span className="font-medium">Entity Match Analysis:</span>{" "}
                {searchStatus.summary.entityMatchStats.validEntityMatches} of{" "}
                {searchStatus.summary.entityMatchStats.totalResults} results matched the target individual
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Display a warning if there's a high risk score but low risk assessment */}
      {searchStatus.summary && searchStatus.summary.riskLevel === "low" && highestRiskScore > 50 && (
        <Alert variant="warning">
          <FileWarning className="h-4 w-4 text-warning" />
          <AlertTitle>Risk Assessment Warning</AlertTitle>
          <AlertDescription>
            Some search results indicate potential risk factors that may require manual review.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="border rounded-lg">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="results" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Threat Analysis
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Raw Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4 p-4">
          <div className="space-y-4">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold flex items-center">
                <Shield className="h-4 w-4 mr-2 text-primary" />
                {searchStatus.results.length > 0 ? "Threat Intelligence Report" : "Scanning..."}
              </h2>
              <div className="ml-auto text-xs text-muted-foreground">
                {searchStatus.results.length} sources analyzed
              </div>
            </div>

            {searchStatus.results.length === 0 && searchStatus.status !== "complete" && (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <div className="text-sm text-center max-w-md">
                  <p className="font-medium mb-1">Scanning secure databases</p>
                  <p className="text-muted-foreground text-xs">
                    Accessing global intelligence networks and analyzing potential threats...
                  </p>
                </div>
              </div>
            )}

            {searchStatus.results.map((result, index) => (
              <Card
                key={index}
                className={result.riskScore > 70 ? "risk-high" : result.riskScore > 40 ? "risk-medium" : "risk-low"}
              >
                <CardHeader className="pb-2 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{result.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-primary transition-colors"
                        >
                          {result.url.length > 50 ? `${result.url.substring(0, 50)}...` : result.url}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={result.riskScore > 70 ? "destructive" : result.riskScore > 40 ? "warning" : "outline"}
                    >
                      Risk: {result.riskScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="text-sm text-foreground/80 mb-3">{result.description}</p>

                  {result.status === "analyzing" ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Running threat analysis...
                    </div>
                  ) : result.adverseContent && result.adverseContent.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-warning" />
                        Adverse Content Detected:
                      </p>
                      <ul className="text-sm space-y-1 pl-5 list-disc">
                        {result.adverseContent.map((content, i) => (
                          <li key={i} className="text-foreground/80">
                            {content}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      No significant adverse content detected
                    </p>
                  )}
                </CardContent>
                {result.entityMatch && (
                  <CardFooter className="border-t pt-3 pb-3">
                    <div className="flex items-center text-sm">
                      {result.entityMatch.isExactMatch || result.entityMatch.confidence >= 70 ? (
                        <UserCheck className="h-4 w-4 text-primary mr-2" />
                      ) : (
                        <UserX className="h-4 w-4 text-warning mr-2" />
                      )}
                      <div>
                        <span className="font-medium">Entity Match:</span>{" "}
                        <Badge
                          variant={
                            result.entityMatch.isExactMatch || result.entityMatch.confidence >= 70
                              ? "outline"
                              : "secondary"
                          }
                          className="ml-1"
                        >
                          {result.entityMatch.confidence}% confidence
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{result.entityMatch.reason}</p>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}

            {searchStatus.status === "complete" && searchStatus.results.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-8 w-8 text-primary mb-2" />
                    <p className="text-foreground/80">No adverse media or risk factors detected.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try broadening your search terms for more results.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-4 p-4">
          <div className="space-y-6">
            {searchStatus.sources ? (
              <>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Search className="h-4 w-4 mr-2 text-primary" />
                    Intelligence Query
                  </h2>
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base flex items-center">
                        <Terminal className="h-4 w-4 mr-2 text-primary" />
                        Search Parameters
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">
                        query: {searchStatus.sources.search.query}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center">
                        <Database className="h-3.5 w-3.5 mr-1.5" />
                        Found {searchStatus.sources.search.results.length} intelligence sources
                      </p>
                      <div className="space-y-2 mt-3">
                        {searchStatus.sources.search.results.map((result, index) => (
                          <div key={index} className="text-sm border p-2 rounded bg-card/50">
                            <p className="font-medium text-primary">{result.title || "No title"}</p>
                            <p className="text-xs text-muted-foreground">{result.url}</p>
                            <p className="text-foreground/80 mt-1 text-xs">{result.description || "No description"}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" />
                    Raw Intelligence Data
                  </h2>
                  {searchStatus.sources.crawl.length > 0 ? (
                    searchStatus.sources.crawl.map((crawl, index) => (
                      <Card key={index} className={crawl.status === "success" ? "risk-low" : "border-muted"}>
                        <CardHeader className="pb-2 border-b">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{crawl.metadata?.title || "URL: " + crawl.url}</CardTitle>
                            <Badge variant={crawl.status === "success" ? "outline" : "secondary"}>
                              {crawl.status === "success" ? "Data Retrieved" : "Retrieval Failed"}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1 text-xs">
                            <a
                              href={crawl.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center hover:text-primary transition-colors"
                            >
                              {crawl.url.length > 50 ? `${crawl.url.substring(0, 50)}...` : crawl.url}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-3">
                          {crawl.status === "success" ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {crawl.metadata &&
                                  Object.entries(crawl.metadata).map(
                                    ([key, value]) =>
                                      key !== "title" &&
                                      value && (
                                        <Badge key={key} variant="outline" className="bg-background/50">
                                          {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                                        </Badge>
                                      ),
                                  )}
                              </div>
                              <div className="mt-2">
                                <p className="text-sm font-medium flex items-center">
                                  <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
                                  Content Preview:
                                </p>
                                <div className="text-xs text-foreground/80 mt-1 border p-2 rounded bg-card/50 max-h-24 overflow-y-auto font-mono">
                                  {crawl.rawData?.data?.markdown
                                    ? crawl.rawData.data.markdown.substring(0, 300) + "..."
                                    : "No content preview available"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-warning flex items-center">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                              Failed to retrieve content from this source.
                              {crawl.rawData?.error && (
                                <span className="block mt-1 text-xs text-muted-foreground">
                                  Error: {crawl.rawData.error}
                                </span>
                              )}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No raw intelligence data available yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-12 border rounded-lg bg-card/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
