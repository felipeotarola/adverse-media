import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Search Not Found</h1>
        <p className="text-gray-500 mb-6">The search you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/history">Return to History</Link>
        </Button>
      </div>
    </div>
  )
}
