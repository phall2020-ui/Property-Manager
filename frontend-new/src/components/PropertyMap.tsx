import { useEffect, useState } from 'react';
import type { MapPin } from '../lib/types';

interface PropertyMapProps {
  pins: MapPin[];
}

export default function PropertyMap({ pins }: PropertyMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Dynamically import the map component to avoid SSR issues with Leaflet
    import('./PropertyMapInner').then((mod) => {
      setMapComponent(() => mod.default);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="h-96 w-full bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-brand-subtle">Loading map...</p>
      </div>
    );
  }

  return <MapComponent pins={pins} />;
}
