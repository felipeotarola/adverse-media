import { SearchResults } from "@/components/search-results"

export default function SearchPage({
  searchParams,
}: {
  searchParams: { individual: string; company?: string; info?: string }
}) {
  const { individual, company, info } = searchParams

  if (!individual) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">No individual name provided</h1>
          <p>Please go back and enter an individual name.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Adverse Media Search Results</h1>
        <p className="text-gray-500 mb-8">
          Individual: <strong>{individual}</strong>
          {company && ` • Company: ${company}`}
          {info && ` • Additional info: ${info}`}
        </p>
        <SearchResults individualName={individual} companyName={company || ""} additionalInfo={info || ""} />
      </div>
    </div>
  )
}
