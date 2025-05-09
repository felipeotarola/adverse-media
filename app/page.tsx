import { SearchForm } from "@/components/search-form"
import { Shield, AlertTriangle, Search, Database, Lock, FileSearch } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-primary/5 rounded-full mb-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">KYC Threat Intelligence</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Advanced threat detection system for identifying adverse media mentions and risk factors for individuals and
          organizations.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border shadow-sm">
          <div className="bg-card rounded-lg">
            <div className="p-1 border-b">
              <div className="flex items-center px-3 py-1">
                <Search className="h-4 w-4 text-primary mr-2" />
                <span className="text-xs text-primary">SECURE SEARCH</span>
              </div>
            </div>
            <SearchForm />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-card rounded-lg p-6 border shadow-sm">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-primary mr-2" />
            <h3 className="font-semibold">Risk Detection</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Advanced algorithms identify potential risk factors and adverse media mentions across multiple sources.
          </p>
        </div>

        <div className="bg-card rounded-lg p-6 border shadow-sm">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-primary mr-2" />
            <h3 className="font-semibold">Comprehensive Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Access to global databases, news sources, and regulatory information for thorough background checks.
          </p>
        </div>

        <div className="bg-card rounded-lg p-6 border shadow-sm">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 text-primary mr-2" />
            <h3 className="font-semibold">Secure Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            All searches are encrypted and processed with advanced security protocols to ensure data protection.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-block border rounded-lg p-4 bg-card/50">
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
              <span>System Online</span>
            </div>
            <div className="h-3 w-px bg-border"></div>
            <div className="flex items-center">
              <FileSearch className="h-3 w-3 mr-1" />
              <span>Database Updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
