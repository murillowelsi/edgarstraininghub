import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  catalogMuscleFilters,
  filterCatalog,
  loadCatalog,
  type CatalogExercise,
} from "@/services/exerciseCatalogService";
import { catalogExerciseDbId, importExerciseFromCatalog } from "@/services/exercisesService";
import type { Exercise, MuscleGroup } from "@/types/exercise";
import { muscleGroupLabels } from "@/types/exercise";
import { AlertCircle, Loader2, Plus, RotateCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddExerciseButton } from "./AddExerciseButton";
import { ExerciseFrames } from "./ExerciseFrames";

interface ExerciseCatalogBrowserProps {
  onExerciseImported: (exercise: Exercise) => void;
  /** How many times each catalog exercise (by its exerciseDbId) is already in the workout */
  addedCounts?: Record<string, number>;
}

const PAGE = 40;

/** Browse the free exercise catalog; adding one copies it (and its photos) into the library */
const ExerciseCatalogBrowser = ({ onExerciseImported, addedCounts = {} }: ExerciseCatalogBrowserProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tl = t.workout.library;
  const muscleLabel = (m: MuscleGroup) => t.workout.muscleGroups[m] || muscleGroupLabels[m];
  const equipmentLabel = (e: string) =>
    (t.workout.equipmentTypes as Record<string, string>)[e] || e;

  const [all, setAll] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | undefined>();
  const [limit, setLimit] = useState(PAGE);
  const [importing, setImporting] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogExercise | null>(null);

  const load = () => {
    setLoading(true);
    setFailed(false);
    loadCatalog()
      .then(setAll)
      .catch((error) => {
        console.error("Error loading exercise catalog:", error);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const results = useMemo(() => filterCatalog(all, { query, muscle }), [all, query, muscle]);
  useEffect(() => setLimit(PAGE), [query, muscle]);

  const handleAdd = async (item: CatalogExercise) => {
    if (!user || importing) return;
    setImporting(item.id);
    try {
      const exercise = await importExerciseFromCatalog(item, user.uid);
      onExerciseImported(exercise);
    } catch (error) {
      console.error("Error importing exercise:", error);
      toast({ title: t.workout.common.error, description: t.workout.toast.failedToImport, variant: "destructive" });
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tl.searchExercises}
            className="pl-8 pr-8 h-10 rounded-full"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t.admin.assign.clearAll}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[undefined, ...catalogMuscleFilters].map((m) => (
            <button
              key={m ?? "all"}
              type="button"
              onClick={() => setMuscle(m)}
              className={cn(
                "shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                muscle === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {m ? muscleLabel(m) : t.admin.assign.allTypes}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : failed ? (
            <div className="flex flex-col items-center text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-3 opacity-60" />
              <p className="text-sm">{tl.catalogUnavailable}</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={load}>
                <RotateCw className="h-4 w-4 mr-1.5" />
                {tl.retry}
              </Button>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{tl.noExercisesFound}</p>
              <p className="text-sm mt-1">{tl.tryDifferentSearch}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{tl.catalogCount.replace("{{n}}", String(results.length))}</p>
              {results.slice(0, limit).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPreview(item)}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                >
                  <img
                    src={item.images[0]}
                    alt=""
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {item.muscleGroups.slice(0, 2).map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {muscleLabel(m)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <AddExerciseButton
                    count={addedCounts[catalogExerciseDbId(item.id)] ?? 0}
                    loading={importing === item.id}
                    onClick={() => handleAdd(item)}
                    label={tl.addToWorkout}
                  />
                </div>
              ))}
              {results.length > limit && (
                <Button variant="ghost" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
                  {tl.showMore}
                </Button>
              )}
              <p className="pt-2 text-center text-[11px] text-muted-foreground">{tl.catalogSource}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview: the movement plays as start ↔ end photos */}
      <ResponsiveModal
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        title={preview?.name ?? ""}
        description={preview ? preview.muscleGroups.map(muscleLabel).join(" · ") : undefined}
        className="sm:w-[520px]"
        footer={
          preview && (
            <Button
              className="w-full rounded-full h-11"
              disabled={importing === preview.id}
              onClick={async () => {
                await handleAdd(preview);
                setPreview(null);
              }}
            >
              {importing === preview.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {tl.addToWorkout}
            </Button>
          )
        }
      >
        {preview && (
          <div className="space-y-4">
            <ExerciseFrames images={preview.images} alt={preview.name} className="aspect-[4/3] rounded-2xl" />
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{equipmentLabel(preview.equipment)}</Badge>
              {preview.secondaryMuscles.map((m) => (
                <Badge key={m} variant="secondary" className="capitalize">
                  {m}
                </Badge>
              ))}
            </div>
            {preview.instructions.length > 0 && (
              <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground">
                {preview.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
};

export default ExerciseCatalogBrowser;
