import { useParams } from "wouter";
import { IntakeWizard } from "@/components/intake-wizard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function ProjectIntake() {
  const params = useParams<{ clientId: string }>();
  const clientId = Number(params.clientId);

  return (
    <div className="p-6 max-w-3xl mx-auto" data-testid="page-project-intake">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-muted-foreground mb-4"
          data-testid="button-back-client"
        >
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="w-4 h-4" />
            Terug naar klant
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Nieuw project starten</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vul de intake in om een marketingstrategie te genereren
        </p>
      </div>

      <IntakeWizard clientId={clientId} />
    </div>
  );
}
