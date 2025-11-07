import { useEffect, useState } from 'react';

interface PropertyMiniMapProps {
  lat: number;
  lng: number;
}

export default function PropertyMiniMap({ lat, lng }: PropertyMiniMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Dynamically import the map component to avoid SSR issues
    import('./PropertyMiniMapInner').then((mod) => {
      setMapComponent(() => mod.default);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="h-56 w-full bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-brand-subtle text-sm">Loading map...</p>
      </div>
    );
  }

  return <MapComponent lat={lat} lng={lng} />;
}
