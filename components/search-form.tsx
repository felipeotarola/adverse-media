"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, User, Building, Info, Loader2 } from "lucide-react"
import { KeywordSelector, type SelectedKeywords } from "./keyword-selector"

export function SearchForm() {
  const router = useRouter()
  const [individualName, setIndividualName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [selectedKeywords, setSelectedKeywords] = useState<SelectedKeywords>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!individualName) {
      setIsSubmitting(false)
      return
    }

    // Convert selected keywords to a query string parameter
    const keywordsParam = Object.entries(selectedKeywords)
      .filter(([_, isSelected]) => isSelected)
      .map(([keywordId]) => keywordId)
      .join(",")

    router.push(
      `/search?individual=${encodeURIComponent(individualName)}&company=${encodeURIComponent(companyName)}&info=${encodeURIComponent(additionalInfo)}&keywords=${encodeURIComponent(keywordsParam)}`,
    )
  }

  return (
    <div className="p-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="individual-name" className="flex items-center text-sm">
            <User className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Individual Name <span className="text-destructive ml-1">*</span>
          </Label>
          <div className="relative">
            <Input
              id="individual-name"
              placeholder="John Doe"
              value={individualName}
              onChange={(e) => setIndividualName(e.target.value)}
              required
              className="bg-input border-border focus:border-primary pl-3"
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter the full name of the individual to search</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-name" className="flex items-center text-sm">
            <Building className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Company Name (Optional)
          </Label>
          <Input
            id="company-name"
            placeholder="Acme Corporation"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="bg-input border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">Associated company or organization</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-info" className="flex items-center text-sm">
            <Info className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Additional Information (Optional)
          </Label>
          <Input
            id="additional-info"
            placeholder="Industry, location, etc."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="bg-input border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">Any additional context to improve search accuracy</p>
        </div>

        {/* Add the keyword selector */}
        <KeywordSelector onChange={setSelectedKeywords} />

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing Search...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Run Threat Intelligence Search
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
