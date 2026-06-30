import { NerdStatDetailView } from "@/components/features/NerdStatDetailView";
import { getNerdStatDefinition } from "@/lib/mlb/nerdStats/definitions";
import { notFound } from "next/navigation";

interface NerdStatPageProps {
  params: Promise<{ statId: string }>;
}

export default async function NerdStatPage({ params }: NerdStatPageProps) {
  const { statId } = await params;
  if (!getNerdStatDefinition(statId)) notFound();
  return <NerdStatDetailView statId={statId} />;
}
