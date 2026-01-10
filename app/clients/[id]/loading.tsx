import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DealDetailLoading() {
  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-card">
            <div className="p-6">
              <Skeleton className="mb-4 h-4 w-48" />
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-32" />
                    <Skeleton className="mt-3 h-6 w-48" />
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <Skeleton className="h-10 w-full" />
            <Card className="mt-6">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
