import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Trash2, MapPin, Route as RouteIcon, Car, Footprints, Bike } from "lucide-react";
import { useHistory, useDeleteHistory } from "@/hooks/use-history";
import { useRoutes, useDeleteRoute } from "@/hooks/use-routes";
import { format } from "date-fns";
import type { HistoryItem, Route } from "@shared/schema";
import { useState } from "react";

interface HistorySidebarProps {
  onSelectLocation: (item: HistoryItem) => void;
  onSelectRoute?: (route: Route) => void;
}

export function HistorySidebar({ onSelectLocation, onSelectRoute }: HistorySidebarProps) {
  const { data: history, isLoading } = useHistory();
  const { data: routes, isLoading: routesLoading } = useRoutes();
  const deleteMutation = useDeleteHistory();
  const deleteRouteMutation = useDeleteRoute();
  const [activeTab, setActiveTab] = useState("locations");

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "car": return <Car className="w-4 h-4" />;
      case "bike": return <Bike className="w-4 h-4" />;
      default: return <Footprints className="w-4 h-4" />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed top-4 right-4 z-[900] h-12 w-12 rounded-full bg-card/90 backdrop-blur border shadow-lg hover:shadow-xl transition-all"
          data-testid="button-history"
        >
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-sm">
        <SheetHeader className="p-6 pb-0 border-b-0">
          <SheetTitle className="font-display text-2xl">Your Discoveries</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-2" style={{ width: 'calc(100% - 48px)' }}>
            <TabsTrigger value="locations" className="gap-2" data-testid="tab-locations">
              <MapPin className="w-4 h-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="routes" className="gap-2" data-testid="tab-routes">
              <RouteIcon className="w-4 h-4" />
              Routes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {isLoading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : history?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No discoveries yet.</p>
                    <p className="text-sm">Start exploring the map!</p>
                  </div>
                ) : (
                  history?.map((item) => (
                    <div 
                      key={item.id}
                      className="group relative bg-card border hover:border-primary/20 rounded-xl p-4 transition-all hover:shadow-md"
                      data-testid={`card-location-${item.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display font-bold text-lg leading-tight pr-8">
                          {item.locationName}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(item.id);
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-location-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {item.content}
                      </p>
                      
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{item.createdAt && format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="h-7 text-xs bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
                          onClick={() => onSelectLocation(item)}
                          data-testid={`button-view-location-${item.id}`}
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="routes" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {routesLoading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : routes?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RouteIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No saved routes yet.</p>
                    <p className="text-sm">Plan a route and save it!</p>
                  </div>
                ) : (
                  routes?.map((route) => (
                    <div 
                      key={route.id}
                      className="group relative bg-card border hover:border-primary/20 rounded-xl p-4 transition-all hover:shadow-md"
                      data-testid={`card-route-${route.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {getTransportIcon(route.transportMode)}
                          <h3 className="font-display font-bold text-lg leading-tight">
                            {route.name}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRouteMutation.mutate(route.id);
                          }}
                          disabled={deleteRouteMutation.isPending}
                          data-testid={`button-delete-route-${route.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{route.createdAt && format(new Date(route.createdAt), 'MMM d, yyyy')}</span>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="h-7 text-xs bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
                          onClick={() => onSelectRoute?.(route)}
                          data-testid={`button-view-route-${route.id}`}
                        >
                          <RouteIcon className="w-3 h-3 mr-1" />
                          View Route
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
