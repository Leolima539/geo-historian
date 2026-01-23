import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MapMarker } from "@/components/MapMarker";
import { LocationCard } from "@/components/LocationCard";
import { HistorySidebar } from "@/components/HistorySidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Loader2, Map as MapIcon, Car, Footprints, Bike, Navigation, Save } from "lucide-react";
import { useExplore } from "@/hooks/use-explore";
import { useCreateHistory } from "@/hooks/use-history";
import { usePreload, generateWaypoints } from "@/hooks/use-preload";
import { useCreateRoute, useRoute } from "@/hooks/use-routes";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence } from "framer-motion";
import type { HistoryItem, ExploreResponse, RelatedLocation, PreloadedDiscovery, Route } from "@shared/schema";

// Component to handle map center updates
function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// Component to track map movement for "Search Here" functionality
function MapEvents({ onMove, onMapClick }: { onMove: (pos: [number, number]) => void; onMapClick: (pos: [number, number]) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onMove([center.lat, center.lng]);
    },
    click: (e) => {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ExploreResponse | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [transportMode, setTransportMode] = useState<"walk" | "car" | "bike">("walk");
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [preloadedCache, setPreloadedCache] = useState<Map<string, PreloadedDiscovery>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routeName, setRouteName] = useState("");
  const watchId = useRef<number | null>(null);
  
  const exploreMutation = useExplore();
  const createHistoryMutation = useCreateHistory();
  const preloadMutation = usePreload();
  const createRouteMutation = useCreateRoute();
  const { data: selectedRouteData } = useRoute(selectedRouteId);
  const { toast } = useToast();

  // Helper to create cache key from coordinates
  const getCacheKey = useCallback((lat: number, lng: number) => {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }, []);

  // Check if coordinates are close to a cached location (within ~100m)
  const findCachedDiscovery = useCallback((lat: number, lng: number): PreloadedDiscovery | null => {
    const entries = Array.from(preloadedCache.values());
    for (const discovery of entries) {
      const latDiff = Math.abs(discovery.latitude - lat);
      const lngDiff = Math.abs(discovery.longitude - lng);
      if (latDiff < 0.001 && lngDiff < 0.001) {
        return discovery;
      }
    }
    return null;
  }, [preloadedCache]);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Access Required",
            description: "Please enable location services in your browser settings to use tracking.",
            variant: "destructive",
          });
          // Default to Rome
          const rome: [number, number] = [41.9028, 12.4964];
          setUserLocation(rome);
          setMapCenter(rome);
        }
      );
    }
  };

  // Get user location on mount
  useEffect(() => {
    requestLocation();
  }, [toast]);

  // Handle tracking
  useEffect(() => {
    if (isTracking && "geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
        },
        (error) => {
          console.error("Tracking error:", error);
          setIsTracking(false);
        },
        { enableHighAccuracy: true }
      );
    } else if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isTracking]);

  const handleExplore = async (coords?: [number, number]) => {
    const target = coords || mapCenter || userLocation;
    if (!target) return;
    
    // Check if we have a preloaded discovery for this location
    const cached = findCachedDiscovery(target[0], target[1]);
    if (cached) {
      setSelectedLocation({
        locationName: cached.locationName,
        content: cached.content,
        cached: true,
        historyId: cached.historyId,
      });
      setSelectedCoords(target);
      if (coords) setMapCenter(coords);
      toast({
        title: "Instant Discovery",
        description: "Using preloaded content for faster experience!",
      });
      return;
    }
    
    try {
      const result = await exploreMutation.mutateAsync({
        latitude: target[0],
        longitude: target[1],
        language,
      });
      
      setSelectedLocation(result);
      setSelectedCoords(target);
      if (coords) setMapCenter(coords);
      
    } catch (error: any) {
      if (error?.message?.includes("Rate limit")) {
        toast({
          title: "Too Many Requests",
          description: "You've reached the discovery limit. Please wait a bit before exploring more.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Exploration Failed",
          description: "Could not find historical data for this location. Try moving the map slightly.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveHistory = async () => {
    if (!selectedLocation || !selectedCoords) return;

    try {
      await createHistoryMutation.mutateAsync({
        locationName: selectedLocation.locationName,
        content: selectedLocation.content,
        latitude: selectedCoords[0],
        longitude: selectedCoords[1],
      });
      
      toast({
        title: "Discovery Saved!",
        description: "This location has been added to your history.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save this location.",
        variant: "destructive",
      });
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setMapCenter([item.latitude, item.longitude]);
    setSelectedCoords([item.latitude, item.longitude]);
    setSelectedLocation({
      locationName: item.locationName,
      content: item.content,
      historyId: item.id,
      cached: true, // History items are from database
    });
  };

  const handleRouteSelect = (route: Route) => {
    // Clear previous route state first
    setRouteWaypoints([]);
    setPreloadedCache(new Map());
    setSelectedLocation(null);
    
    setSelectedRouteId(route.id);
    setDestination([route.endLat, route.endLng]);
    setMapCenter([route.startLat, route.startLng]);
    setTransportMode(route.transportMode as "walk" | "car" | "bike");
    setPlannerOpen(true);
  };

  // Effect to load waypoints when viewing a saved route
  useEffect(() => {
    if (selectedRouteData && selectedRouteData.waypoints.length > 0) {
      const waypoints = selectedRouteData.waypoints.map(wp => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
      }));
      setRouteWaypoints(waypoints);
      
      // Cache the waypoint discoveries for instant viewing
      const newCache = new Map<string, PreloadedDiscovery>();
      selectedRouteData.waypoints.forEach(wp => {
        const key = getCacheKey(wp.latitude, wp.longitude);
        newCache.set(key, {
          latitude: wp.latitude,
          longitude: wp.longitude,
          locationName: wp.locationName,
          content: wp.content,
          cached: true,
        });
      });
      setPreloadedCache(newCache);
      
      // Show the first waypoint's content immediately and center map on it
      const firstWaypoint = selectedRouteData.waypoints[0];
      setSelectedLocation({
        locationName: firstWaypoint.locationName,
        content: firstWaypoint.content,
        cached: true,
      });
      setSelectedCoords([firstWaypoint.latitude, firstWaypoint.longitude]);
      setMapCenter([firstWaypoint.latitude, firstWaypoint.longitude]);
    }
  }, [selectedRouteData, getCacheKey]);

  const handleSaveRoute = async () => {
    if (!destination || !userLocation || routeWaypoints.length === 0) return;
    
    const waypointsData = Array.from(preloadedCache.values()).map(d => ({
      locationName: d.locationName,
      latitude: d.latitude,
      longitude: d.longitude,
      content: d.content,
    }));
    
    try {
      await createRouteMutation.mutateAsync({
        name: routeName || `Route ${new Date().toLocaleDateString()}`,
        startLat: userLocation[0],
        startLng: userLocation[1],
        endLat: destination[0],
        endLng: destination[1],
        transportMode: transportMode,
        waypoints: waypointsData,
      });
      
      toast({
        title: "Route Saved!",
        description: "Your historical route has been saved.",
      });
      setRouteName("");
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save route.",
        variant: "destructive",
      });
    }
  };

  if (!userLocation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Compass className="w-16 h-16 animate-spin text-primary" />
        <h2 className="text-2xl font-display font-bold">Locating you...</h2>
        <p className="text-muted-foreground">Preparing your historical journey.</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-100">
      <MapContainer
        center={userLocation}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {mapCenter && <MapController center={mapCenter} />}
        <MapEvents 
          onMove={(pos) => setMapCenter(pos)} 
          onMapClick={(pos) => {
            if (plannerOpen) {
              setDestination(pos);
              toast({
                title: "Destination Set",
                description: "Your route end point has been marked on the map.",
              });
            }
          }}
        />

        {/* User Marker */}
        <MapMarker position={userLocation} color="#3b82f6" />

        {/* Destination Marker */}
        {destination && (
          <MapMarker 
            position={destination} 
            color="#ef4444" 
          />
        )}

        {/* Selected Location Marker */}
        {selectedCoords && (
          <MapMarker 
            position={selectedCoords} 
            color="hsl(35, 92%, 55%)" 
          />
        )}

        {/* Route Waypoint Markers */}
        {routeWaypoints.map((waypoint, index) => (
          <MapMarker 
            key={`waypoint-${index}`}
            position={[waypoint.latitude, waypoint.longitude]} 
            color="#22c55e"
          />
        ))}
      </MapContainer>

      {/* Top Interface */}
      <div className="absolute top-0 left-0 right-0 p-3 md:p-4 z-[500] pointer-events-none flex justify-between items-start bg-gradient-to-b from-black/20 to-transparent h-32">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-card/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20">
            <h1 className="font-display font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
              <Compass className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
              Chronicle
            </h1>
          </div>
          
          <div className="bg-card/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/20 flex gap-1 w-fit">
            <Button
              variant={language === "en" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-full text-xs"
              onClick={() => setLanguage("en")}
              data-testid="button-language-en"
            >
              EN
            </Button>
            <Button
              variant={language === "es" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-full text-xs"
              onClick={() => setLanguage("es")}
              data-testid="button-language-es"
            >
              ES
            </Button>
          </div>
        </div>
        
        <div className="pointer-events-auto">
          <HistorySidebar 
            onSelectLocation={handleHistorySelect} 
            onSelectRoute={handleRouteSelect}
          />
        </div>
      </div>

      {/* Bottom Interface - Explore Button */}
      <AnimatePresence>
        {!selectedLocation && (
          <div className="absolute bottom-24 md:bottom-8 left-0 right-0 z-[500] flex justify-center pointer-events-none">
            <Button
              size="lg"
              onClick={() => handleExplore()}
              disabled={exploreMutation.isPending || (!mapCenter && !userLocation)}
              className="pointer-events-auto h-14 px-8 rounded-full shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-80 disabled:scale-100"
              data-testid="button-explore"
            >
              {exploreMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Compass className="w-5 h-5 mr-2" />
                  Explore Here
                </>
              )}
            </Button>
          </div>
        )}
      </AnimatePresence>

      {/* Result Card Overlay */}
      <AnimatePresence>
        {selectedLocation && (
          <LocationCard
            title={selectedLocation.locationName}
            content={selectedLocation.content}
            relatedLocations={selectedLocation.relatedLocations}
            onSave={selectedLocation.cached ? undefined : handleSaveHistory}
            onClose={() => setSelectedLocation(null)}
            onSelectRelated={(loc) => handleExplore([loc.latitude, loc.longitude])}
            isSaving={createHistoryMutation.isPending}
            cached={selectedLocation.cached}
          />
        )}
      </AnimatePresence>

      {/* Planner Overlay */}
      <AnimatePresence>
        {plannerOpen && (
          <div className="absolute top-20 left-4 right-4 z-[600] pointer-events-none flex justify-center">
            <div className="bg-card/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border pointer-events-auto w-full max-w-sm">
              <h3 className="font-display font-bold mb-3 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-primary" />
                Route Planner
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {destination 
                  ? "Destination selected! Confirm to see your route." 
                  : "Tap on the map to set your destination and pre-pull historical stories along your path."}
              </p>
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={transportMode === "walk" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setTransportMode("walk")}
                  data-testid="button-transport-walk"
                >
                  <Footprints className="w-4 h-4" />
                  Walk
                </Button>
                <Button 
                  variant={transportMode === "car" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setTransportMode("car")}
                  data-testid="button-transport-car"
                >
                  <Car className="w-4 h-4" />
                  Drive
                </Button>
                <Button 
                  variant={transportMode === "bike" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setTransportMode("bike")}
                  data-testid="button-transport-bike"
                >
                  <Bike className="w-4 h-4" />
                  Cycle
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full" 
                  disabled={!destination || isPreloading}
                  data-testid="button-start-navigation"
                  onClick={async () => {
                    if (destination) {
                      // Trigger preloading for waypoints along the route
                      setIsPreloading(true);
                      const waypoints = generateWaypoints(userLocation, destination, 3);
                      
                      // Store waypoints for map display
                      setRouteWaypoints(waypoints);
                      
                      try {
                        const preloaded = await preloadMutation.mutateAsync({
                          waypoints,
                          language,
                        });
                        
                        // Cache the preloaded discoveries
                        const newCache = new Map(preloadedCache);
                        preloaded.forEach(discovery => {
                          const key = getCacheKey(discovery.latitude, discovery.longitude);
                          newCache.set(key, discovery);
                        });
                        setPreloadedCache(newCache);
                        
                        toast({
                          title: "Route Prepared",
                          description: `${preloaded.length} discoveries ready along your route!`,
                        });
                      } catch (error) {
                        console.error("Preload failed:", error);
                        toast({
                          title: "Preload Failed",
                          description: "Could not prepare route discoveries. You can still navigate.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsPreloading(false);
                      }
                      
                      // Start live tracking for navigation
                      setIsNavigating(true);
                      setIsTracking(true);
                      
                      const mode = transportMode === "walk" ? "walking" : transportMode === "bike" ? "bicycling" : "driving";
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${destination[0]},${destination[1]}&travelmode=${mode}`;
                      window.open(url, '_blank');
                      setPlannerOpen(false);
                    }
                  }}
                >
                  {isPreloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Preparing Route...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Start Navigation
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setPlannerOpen(false);
                    setDestination(null);
                    setRouteWaypoints([]);
                    setPreloadedCache(new Map());
                    setSelectedRouteId(null);
                  }}
                  data-testid="button-cancel-planner"
                >
                  Cancel
                </Button>
                {isNavigating && preloadedCache.size > 0 && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Save this route for later:</p>
                    <Input
                      placeholder="Route name (optional)"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      className="mb-2 h-9 text-sm"
                      data-testid="input-route-name"
                    />
                    <Button 
                      variant="secondary"
                      className="w-full"
                      onClick={handleSaveRoute}
                      disabled={createRouteMutation.isPending}
                      data-testid="button-save-route"
                    >
                      {createRouteMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Route
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {isNavigating && (
                  <Button 
                    variant="destructive"
                    className="w-full text-xs mt-2"
                    onClick={() => {
                      setIsNavigating(false);
                      setIsTracking(false);
                      setDestination(null);
                      setRouteWaypoints([]);
                      setPreloadedCache(new Map());
                      setSelectedRouteId(null);
                      toast({
                        title: "Navigation Ended",
                        description: "Live tracking stopped.",
                      });
                    }}
                    data-testid="button-end-navigation"
                  >
                    End Navigation
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Planner Trigger Button */}
      <div className="absolute top-32 left-3 md:top-36 md:left-4 z-[500] pointer-events-auto flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/90 backdrop-blur shadow-lg border border-white/20"
          onClick={() => setPlannerOpen(!plannerOpen)}
          data-testid="button-planner"
        >
          <MapIcon className="h-5 w-5 text-primary" />
        </Button>
        <Button
          variant={isTracking ? "default" : "outline"}
          size="icon"
          className={`h-10 w-10 rounded-full bg-card/90 backdrop-blur shadow-lg border border-white/20 ${isTracking ? 'bg-primary text-primary-foreground' : ''}`}
          data-testid="button-tracking"
          onClick={() => {
            if (!isTracking) {
              requestLocation();
            }
            setIsTracking(!isTracking);
          }}
        >
          <Navigation className={`h-5 w-5 ${isTracking ? 'animate-pulse' : 'text-primary'}`} />
        </Button>
      </div>
    </div>
  );
}
