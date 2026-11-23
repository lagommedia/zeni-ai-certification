import { getCurrentUser } from "@/lib/auth";
import { fetchLabProgress, labProgressToCsv, parseLabProgressFilters } from "@/lib/lab-progress";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Admin access required", { status: 403 });

  const { searchParams } = new URL(request.url);
  const filters = parseLabProgressFilters({
    course: searchParams.get("course") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  const csv = labProgressToCsv(await fetchLabProgress(filters));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lab-progress-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
