import { BallparkHitsDetail } from "@/components/features/BallparkHitsDetail";

interface BallparkPageProps {
  params: Promise<{ venueId: string }>;
}

export default async function BallparkDetailPage({ params }: BallparkPageProps) {
  const { venueId: venueIdParam } = await params;
  const venueId = Number.parseInt(venueIdParam, 10);

  if (!Number.isFinite(venueId) || venueId <= 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Invalid ballpark.
      </div>
    );
  }

  return <BallparkHitsDetail venueId={venueId} />;
}
