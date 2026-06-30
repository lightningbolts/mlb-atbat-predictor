import { TeamNerdCardView } from "@/components/features/TeamNerdCardView";
import { getTeamById } from "@/lib/mlb/teams";
import { notFound } from "next/navigation";

interface TeamNerdPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamNerdPage({ params }: TeamNerdPageProps) {
  const { teamId } = await params;
  const id = Number.parseInt(teamId, 10);
  if (!Number.isFinite(id) || !getTeamById(id)) notFound();
  return <TeamNerdCardView teamId={id} />;
}
