import { KeywordManager } from "@/components/KeywordManager";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const user = await getDefaultUser();
  const keywords = await prisma.keyword.findMany({
    where: { userId: user.id },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Keywords</h1>
          <p>Travis Scott, Jordan, Nike SB</p>
        </div>
      </header>
      <KeywordManager initialKeywords={keywords.map(({ id, text, active }) => ({ id, text, active }))} />
    </div>
  );
}
