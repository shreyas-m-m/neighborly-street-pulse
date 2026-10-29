import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple "coming soon" block used by pages that aren't built yet.
export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <Construction className="mx-auto h-10 w-10 text-accent" />
      <h1 className="mt-4 text-3xl font-bold text-primary">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">Back to home</Link>
      </Button>
    </section>
  );
}
