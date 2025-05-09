"use client"

import type React from "react"

import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Filter, Check, X } from "lucide-react"

export type SelectedKeywords = Record<string, boolean>

interface KeywordSelectorProps {
  onChange: (selectedKeywords: SelectedKeywords) => void
}

// Define keyword categories and their items
const keywordCategories = [
  {
    id: "economic-crime",
    name: "Economic Crime",
    keywords: [
      { id: "korruption", label: "korruption" },
      { id: "sanktion", label: "sanktion*" },
      { id: "ekonomisk-brottslighet", label: "ekonomisk brottslighet" },
      { id: "atal", label: "åtal*" },
      { id: "mut", label: "mut*" },
      { id: "brott", label: "brott*" },
      { id: "naringsforbud", label: "näringsförbud*" },
      { id: "bedrageri", label: "bedrägeri*" },
      { id: "skandal", label: "skandal*" },
      { id: "bokforingsbrott", label: "bokföringsbrott*" },
      { id: "penningtvatt", label: "penningtvätt" },
    ],
  },
  {
    id: "security-threats",
    name: "Security Threats",
    keywords: [
      { id: "terrorism", label: "terrorism*" },
      { id: "kriminella-natverk", label: "kriminella nätverk*" },
      { id: "krypto", label: "krypto" },
      { id: "narkotika", label: "narkotika" },
      { id: "vapen", label: "vapen" },
    ],
  },
]

export function KeywordSelector({ onChange }: KeywordSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<SelectedKeywords>({})

  const handleKeywordChange = (keywordId: string, checked: boolean) => {
    const newSelectedKeywords = { ...selectedKeywords, [keywordId]: checked }
    setSelectedKeywords(newSelectedKeywords)
    onChange(newSelectedKeywords)
  }

  const handleSelectAllInCategory = (e: React.MouseEvent, categoryId: string) => {
    // Prevent the event from bubbling up to the form
    e.preventDefault()
    e.stopPropagation()

    const category = keywordCategories.find((cat) => cat.id === categoryId)
    if (!category) return

    const newSelectedKeywords = { ...selectedKeywords }
    category.keywords.forEach((keyword) => {
      newSelectedKeywords[keyword.id] = true
    })

    setSelectedKeywords(newSelectedKeywords)
    onChange(newSelectedKeywords)
  }

  const handleClearCategory = (e: React.MouseEvent, categoryId: string) => {
    // Prevent the event from bubbling up to the form
    e.preventDefault()
    e.stopPropagation()

    const category = keywordCategories.find((cat) => cat.id === categoryId)
    if (!category) return

    const newSelectedKeywords = { ...selectedKeywords }
    category.keywords.forEach((keyword) => {
      newSelectedKeywords[keyword.id] = false
    })

    setSelectedKeywords(newSelectedKeywords)
    onChange(newSelectedKeywords)
  }

  const getSelectedCount = () => {
    return Object.values(selectedKeywords).filter(Boolean).length
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-2 text-primary" />
            <span className="font-medium text-sm">Search Keywords</span>
            {getSelectedCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getSelectedCount()} selected
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 pt-0 border-t">
        <div className="text-xs text-muted-foreground mb-3">
          Select keywords to include in your search query. These will be combined with the individual and company names.
        </div>

        <div className="space-y-4">
          {keywordCategories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{category.name}</h4>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="xs"
                    type="button" // Explicitly set type to button
                    onClick={(e) => handleSelectAllInCategory(e, category.id)}
                    className="h-6 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    type="button" // Explicitly set type to button
                    onClick={(e) => handleClearCategory(e, category.id)}
                    className="h-6 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {category.keywords.map((keyword) => (
                  <div key={keyword.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={keyword.id}
                      checked={selectedKeywords[keyword.id] || false}
                      onCheckedChange={(checked) => handleKeywordChange(keyword.id, checked === true)}
                    />
                    <label htmlFor={keyword.id} className="text-sm font-mono cursor-pointer">
                      {keyword.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
