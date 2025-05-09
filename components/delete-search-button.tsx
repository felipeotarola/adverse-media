"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { deleteSearch } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"

export function DeleteSearchButton({ searchId, name }: { searchId: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteSearch(searchId)

      if (result.success) {
        toast({
          title: "Search deleted",
          description: `The search for "${name}" has been deleted.`,
        })
        // Close the dialog
        setIsOpen(false)
        // Force a refresh of the current route
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete search. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the search for "{name}" and all associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            className="bg-red-500 hover:bg-red-600"
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
