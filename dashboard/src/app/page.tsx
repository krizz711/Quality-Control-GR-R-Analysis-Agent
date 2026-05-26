import QueryProvider from "@/providers/QueryProvider";
import AppShell from "@/components/AppShell";
import { prefetchDashboardQueries } from "@/lib/server-prefetch";

export default async function Home() {
  const dehydratedState = await prefetchDashboardQueries();

  return (
    <QueryProvider dehydratedState={dehydratedState}>
      <AppShell />
    </QueryProvider>
  );
}
