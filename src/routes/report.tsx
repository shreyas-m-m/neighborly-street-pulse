import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/data/demo";
import { SEVERITIES } from "@/lib/incidents";
import { PhotoPicker } from "@/components/PhotoPicker";
import { createIncident } from "@/lib/incidents-api";
import { INCIDENTS_KEY } from "@/hooks/use-incidents";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an Issue — DataPulse" },
      { name: "description", content: "Report a civic incident in your area." },
      { property: "og:title", content: "Report an Issue — DataPulse" },
      { property: "og:description", content: "Report a civic incident in your area." },
    ],
  }),
  component: ReportPage,
});

const schema = z.object({
  category: z.enum(["garbage", "roads", "water", "lights"], {
    errorMap: () => ({ message: "Please choose a category." }),
  }),
  title: z
    .string()
    .trim()
    .min(5, "Title should be at least 5 characters.")
    .max(80, "Keep the title under 80 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the issue in at least 10 characters.")
    .max(1000, "Keep it under 1000 characters."),
  location: z
    .string()
    .trim()
    .min(3, "Please enter a location or address.")
    .max(150, "Keep it under 150 characters."),
  severity: z.enum(["low", "medium", "high", "critical"], {
    errorMap: () => ({ message: "Please choose a severity." }),
  }),
  peopleAffected: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .int("Use a whole number.")
    .min(1, "At least 1 person.")
    .max(1_000_000, "That number seems too large."),
});

type Field = keyof z.infer<typeof schema>;
const EMPTY: Record<Field, string> = {
  category: "",
  title: "",
  description: "",
  location: "",
  severity: "",
  peopleAffected: "",
};

function ReportPage() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      setCreatedId(incident.id);
      window.scrollTo({ top: 0 });
    },
  });

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Field;
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.getElementById(Object.keys(next)[0] ?? "")?.focus();
      return;
    }
    mutation.mutate({ ...result.data, photo });
  };

  if (createdId) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-sev-low" />
        <h1 className="mt-4 text-3xl font-bold text-primary">Report submitted</h1>
        <p className="mt-3 text-muted-foreground">
          Your incident ID is <strong className="font-mono text-foreground">{createdId}</strong>. It
          is saved to the shared database and visible on every device.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/incidents/$id" params={{ id: createdId }}>
              View incident
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setValues(EMPTY);
              setPhoto(null);
              setCreatedId(null);
              mutation.reset();
            }}
          >
            Report another
          </Button>
        </div>
      </section>
    );
  }

  const err = (f: Field) =>
    errors[f] ? (
      <p id={`${f}-error`} className="mt-1.5 text-sm text-destructive">
        {errors[f]}
      </p>
    ) : null;
  const aria = (f: Field) => ({
    "aria-invalid": !!errors[f],
    "aria-describedby": errors[f] ? `${f}-error` : undefined,
  });

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Report an Issue</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us what's wrong and where. Fields marked * are required.
      </p>
      <div className="mt-4 flex gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Hackathon demo: reports go to a shared public database, so anyone using the app can see
        them. Please don't include personal information.
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6 rounded-xl border bg-card p-6">
        <fieldset>
          <legend className="text-sm font-medium">Category *</legend>
          <div
            id="category"
            tabIndex={-1}
            className="mt-2 grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            {...aria("category")}
          >
            {CATEGORIES.map(({ id, name, icon: Icon }) => (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${errors.category ? "border-destructive" : ""}`}
              >
                <input
                  type="radio"
                  name="category"
                  value={id}
                  checked={values.category === id}
                  onChange={() => set("category", id)}
                  className="sr-only"
                />
                <Icon className="h-5 w-5 text-primary" /> {name}
              </label>
            ))}
          </div>
          {err("category")}
        </fieldset>

        <div>
          <Label htmlFor="title">Short title *</Label>
          <Input
            id="title"
            className="mt-1.5"
            placeholder="e.g. Pothole near the bus stop"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={80}
            {...aria("title")}
          />
          {err("title")}
        </div>

        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            className="mt-1.5"
            rows={4}
            placeholder="What did you see? How long has it been like this?"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={1000}
            {...aria("description")}
          />
          {err("description")}
        </div>

        <div>
          <Label htmlFor="location">Location / address *</Label>
          <Input
            id="location"
            className="mt-1.5"
            placeholder="e.g. MG Road, Ward 12"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={150}
            {...aria("location")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: end with the area or ward (after a comma) so it groups into hotspots.
          </p>
          {err("location")}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Severity *</legend>
          <div
            id="severity"
            tabIndex={-1}
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="radiogroup"
            {...aria("severity")}
          >
            {[...SEVERITIES].reverse().map((s) => (
              <label
                key={s}
                className={`cursor-pointer rounded-lg border p-2.5 text-center text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${errors.severity ? "border-destructive" : ""}`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s}
                  checked={values.severity === s}
                  onChange={() => set("severity", s)}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
          {err("severity")}
        </fieldset>

        <div>
          <Label htmlFor="peopleAffected">Estimated people affected *</Label>
          <Input
            id="peopleAffected"
            type="number"
            inputMode="numeric"
            min={1}
            className="mt-1.5 max-w-48"
            placeholder="e.g. 200"
            value={values.peopleAffected}
            onChange={(e) => set("peopleAffected", e.target.value)}
            {...aria("peopleAffected")}
          />
          {err("peopleAffected")}
        </div>

        <PhotoPicker
          label="Photo of the issue (optional)"
          hint="JPEG, PNG or WebP, up to 5 MB."
          file={photo}
          onChange={setPhoto}
          disabled={mutation.isPending}
        />

        {mutation.isError && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>
              Your report was not saved: {mutation.error.message}. Please check your connection and
              try again.
            </span>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" /> Saving…
            </>
          ) : (
            "Submit report"
          )}
        </Button>
      </form>
    </section>
  );
}
