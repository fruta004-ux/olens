import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContactDetailLoading() {
  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="border-b bg-card">
            <div className="p-6">
              <Skeleton className="mb-4 h-9 w-40" />

              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-96" />
                  <Skeleton className="h-4 w-80" />
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <Skeleton className="mb-6 h-10 w-full" />
            <Card>
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
