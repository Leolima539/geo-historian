import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RelatedLocation } from "@shared/schema";

interface LocationCardProps {
  title: string;
  content: string;
  relatedLocations?: RelatedLocation[];
  onSave?: () => void;
  onClose: () => void;
  onSelectRelated?: (loc: RelatedLocation) => void;
  isSaving?: boolean;
  cached?: boolean;
}

export function LocationCard({ 
  title, 
  content, 
  relatedLocations,
  onSave, 
  onClose, 
  onSelectRelated,
  isSaving,
  cached = false,
}: LocationCardProps) {

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[1000] p-4 md:p-6 pointer-events-none flex justify-center"
    >
      <div className="w-full max-w-2xl pointer-events-auto">
        <div className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden">
          <div className="relative p-6 md:p-8">
            <div className="absolute top-4 right-4">
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                data-testid="button-close-location"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-bold uppercase tracking-wider border border-secondary/20">
                Historical Insight
              </span>
              {cached && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium" data-testid="badge-cached">
                  Cached
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
              {title}
            </h2>

            <div className="prose prose-sm md:prose-base text-muted-foreground max-h-[40vh] md:max-h-[30vh] overflow-y-auto pr-2 mb-6 scrollbar-thin scrollbar-thumb-border">
              {content.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-3 leading-relaxed">{paragraph}</p>
              ))}
            </div>

            {relatedLocations && relatedLocations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Nearby Discoveries
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {relatedLocations.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectRelated?.(loc)}
                      className="text-left p-3 rounded-xl bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-colors group"
                      data-testid={`button-related-location-${i}`}
                    >
                      <div className="font-bold text-xs text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {loc.locationName}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                        {loc.snippet}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {onSave && (
                <Button 
                  onClick={onSave} 
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
                  data-testid="button-save-location"
                >
                  {isSaving ? "Saving..." : "Save to History"}
                </Button>
              )}
            </div>
          </div>
          
          <div className="h-1.5 bg-gradient-to-r from-secondary/40 via-secondary to-secondary/40" />
        </div>
      </div>
    </motion.div>
  );
}
