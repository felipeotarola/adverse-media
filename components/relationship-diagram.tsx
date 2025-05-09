"use client"

import { useEffect, useState } from "react"
import mermaid from "mermaid"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Network, Users, Building, AlertTriangle, Shield, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Relationship {
  id: string
  search_id: string
  target_name: string
  related_name: string
  relationship_type: string
  description: string
  confidence: number
  source_url?: string
  source_title?: string
}

interface RelationshipDiagramProps {
  relationships: Relationship[]
  targetName: string
}

export function RelationshipDiagram({ relationships, targetName }: RelationshipDiagramProps) {
  const [activeTab, setActiveTab] = useState("diagram")
  const [diagramRendered, setDiagramRendered] = useState(false)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "inherit",
    })
  }, [])

  useEffect(() => {
    if (relationships.length > 0 && activeTab === "diagram") {
      try {
        mermaid.contentLoaded()
        setDiagramRendered(true)
      } catch (error) {
        console.error("Error rendering mermaid diagram:", error)
      }
    }
  }, [relationships, activeTab])

  // Group relationships by type
  const relationshipsByType = relationships.reduce(
    (acc, rel) => {
      if (!acc[rel.relationship_type]) {
        acc[rel.relationship_type] = []
      }
      acc[rel.relationship_type].push(rel)
      return acc
    },
    {} as Record<string, Relationship[]>,
  )

  // Generate mermaid diagram
  const generateMermaidDiagram = () => {
    if (relationships.length === 0) {
      return 'graph TD\nA["No relationships found"]'
    }

    let diagram = "graph TD\n"

    // Add the target individual as the central node
    diagram += `Target[\"${targetName}\"]\n`

    // Add nodes for each relationship type
    Object.keys(relationshipsByType).forEach((type, index) => {
      diagram += `Type${index}[\"${type.charAt(0).toUpperCase() + type.slice(1)} Relationships\"]\n`
      diagram += `Target --- Type${index}\n`

      // Add nodes for each related person
      relationshipsByType[type].forEach((rel, relIndex) => {
        const nodeId = `${type}_${relIndex}`
        diagram += `${nodeId}[\"${rel.related_name}\"]\n`
        diagram += `Type${index} --- ${nodeId}\n`

        // Add tooltip with description if available
        if (rel.description) {
          diagram += `click ${nodeId} callback "${rel.description.replace(/"/g, '\\"')}"\n`
        }
      })
    })

    return diagram
  }

  // Get relationship icon based on type
  const getRelationshipIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "family":
        return <Users className="h-4 w-4 mr-2" />
      case "business":
        return <Building className="h-4 w-4 mr-2" />
      case "political":
        return <Shield className="h-4 w-4 mr-2" />
      case "criminal":
        return <AlertTriangle className="h-4 w-4 mr-2" />
      default:
        return <Network className="h-4 w-4 mr-2" />
    }
  }

  if (relationships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Network className="h-5 w-5 mr-2 text-primary" />
            Relationship Analysis
          </CardTitle>
          <CardDescription>No relationships were identified for this individual.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="h-5 w-5 mr-2 text-primary" />
          Relationship Analysis
          <Badge className="ml-2">{relationships.length} relationships found</Badge>
        </CardTitle>
        <CardDescription>
          Relationships identified between {targetName} and other individuals or organizations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagram" className="flex items-center">
              <Network className="h-4 w-4 mr-2" />
              Relationship Diagram
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Relationship List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="mt-4">
            <div className="border rounded-md p-4 bg-card/50 overflow-auto">
              {!diagramRendered && (
                <div className="flex flex-col items-center justify-center p-8">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              )}
              <div className="mermaid text-center">{generateMermaidDiagram()}</div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="space-y-6">
              {Object.entries(relationshipsByType).map(([type, rels]) => (
                <div key={type} className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center">
                    {getRelationshipIcon(type)}
                    {type.charAt(0).toUpperCase() + type.slice(1)} Relationships
                  </h3>
                  <div className="space-y-2">
                    {rels.map((rel) => (
                      <div key={rel.id} className="border rounded-md p-3 bg-card/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-primary" />
                            <span className="font-medium">{rel.related_name}</span>
                          </div>
                          <Badge variant="outline">{rel.confidence}% confidence</Badge>
                        </div>
                        {rel.description && <p className="mt-2 text-sm text-muted-foreground">{rel.description}</p>}
                        {rel.source_url && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Source: {rel.source_title || rel.source_url}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
