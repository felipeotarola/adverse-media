import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-2/3 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-8" />

        <Card className="mb-6">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3 mb-2" />

          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
