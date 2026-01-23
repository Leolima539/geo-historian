import { divIcon } from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPin } from "lucide-react";

interface MapMarkerProps {
  position: [number, number];
  color?: string;
  popupContent?: React.ReactNode;
}

export function MapMarker({ position, color = "#ea580c", popupContent }: MapMarkerProps) {
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex items-center justify-center w-8 h-8">
      <div 
        className="absolute w-full h-full rounded-full opacity-50 animate-ping" 
        style={{ backgroundColor: color }} 
      />
      <div 
        className="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white text-white"
        style={{ backgroundColor: color }}
      >
        <MapPin size={16} fill="currentColor" />
      </div>
    </div>
  );

  const customIcon = divIcon({
    html: iconMarkup,
    className: "custom-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  return (
    <Marker position={position} icon={customIcon}>
      {popupContent && <Popup>{popupContent}</Popup>}
    </Marker>
  );
}
