import { getSearchHistory } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteSearchButton } from "@/components/delete-search-button"
import Link from "next/link"
import { AlertTriangle, CheckCircle, Clock, User, Building, Info } from "lucide-react"

export default async function HistoryPage() {
  const { success, data: searches, error } = await getSearchHistory()

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Search History</h1>
          <Button asChild>
            <Link href="/">New Search</Link>
          </Button>
        </div>

        {!success ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-red-500">Error loading search history: {error}</p>
            </CardContent>
          </Card>
        ) : searches && searches.length > 0 ? (
          <div className="space-y-4">
            {searches.map((search) => (
              <Card key={search.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{search.individual_name}</CardTitle>
                    <Badge
                      variant={
                        search.risk_level === "high"
                          ? "destructive"
                          : search.risk_level === "medium"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {search.risk_level.charAt(0).toUpperCase() + search.risk_level.slice(1)} Risk
                    </Badge>
                  </div>
                  <CardDescription>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <div className="flex items-center text-sm">
                        <Clock className="mr-1 h-4 w-4 text-gray-500" />
                        {new Date(search.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center text-sm">
                        <User className="mr-1 h-4 w-4 text-gray-500" />
                        {search.individual_name}
                      </div>
                      {search.company_name && (
                        <div className="flex items-center text-sm">
                          <Building className="mr-1 h-4 w-4 text-gray-500" />
                          {search.company_name}
                        </div>
                      )}
                      {search.additional_info && (
                        <div className="flex items-center text-sm">
                          <Info className="mr-1 h-4 w-4 text-gray-500" />
                          {search.additional_info}
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-start space-x-2">
                    {search.risk_level === "low" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-gray-700">Found {search.adverse_findings} adverse media mentions.</p>
                      <p className="text-sm text-gray-700 mt-1">{search.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/history/${search.id}`}>View Details</Link>
                  </Button>

                  <DeleteSearchButton searchId={search.id} name={search.individual_name} />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">No search history found. Start by performing a search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
