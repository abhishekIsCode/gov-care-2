import React, { useState } from 'react';
import { APIProvider, useMapsLibrary, Map } from '@vis.gl/react-google-maps';
import { AlertTriangle, Loader2, Navigation } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

function EmergencyContent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>([]);

  const findNearestHospital = async () => {
    if (!placesLib || !routesLib) return;
    setLoading(true);
    setError(null);
    try {
      // Get user location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLoc(userLocation);

      // Search nearby hospitals
      const { places } = await placesLib.Place.searchNearby({
        fields: ['displayName', 'location', 'formattedAddress'],
        locationRestriction: {
          center: userLocation,
          radius: 10000, // 10km
        },
        includedTypes: ['hospital'],
        maxResultCount: 1, // Want the nearest
      });

      if (places && places.length > 0) {
         const hospital = places[0];
         
         // Calculate route
         const { routes } = await routesLib.Route.computeRoutes({
            origin: userLocation,
            destination: hospital.location!,
            travelMode: 'DRIVING',
            fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
         });
         
         if (routes?.[0]) {
            setResult({
              hospital,
              route: routes[0]
            });
            const newPolylines = routes[0].createPolylines();
            setRoutePolylines(newPolylines);
         }
      } else {
         setError("No hospitals found nearby.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to locate emergency services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-red-950 relative overflow-hidden">
       {/* Background Map layer */}
       {result && (
          <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
             <Map
                defaultCenter={userLoc || {lat: 0, lng: 0}}
                defaultZoom={13}
                mapId="EMERGENCY_MAP"
                colorScheme="DARK"
                disableDefaultUI={true}
                onIdle={(map) => {
                   if (result?.route?.viewport) {
                       map.map.fitBounds(result.route.viewport);
                   }
                   routePolylines.forEach(p => p.setMap(map.map));
                }}
             />
          </div>
       )}

       <div className="relative z-10">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-500 relative rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-stone-800" />
                  </div>
                  <div>
                    <h3 className="font-medium text-2xl  tracking-tight text-red-500">Emergency Mode</h3>
                    <p className="text-red-500/60 font-medium text-sm">One-touch incident response</p>
                  </div>
                </div>
              </div>
              <button 
                 onClick={findNearestHospital}
                 disabled={loading}
                 className="px-8 py-4 w-full sm:w-auto bg-red-500 hover:bg-red-400 text-stone-800 font-medium  tracking-wide rounded-2xl shadow-md shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "SOS: Nearest Hospital"}
              </button>
           </div>

           {error && <p className="mt-6 text-red-600 italic font-medium">Error: {error}</p>}

           {result && (
             <div className="mt-8 p-6 bg-red-50/80 backdrop-blur-xl rounded-3xl border border-red-500/30">
                <h4 className="text-red-600 font-medium  tracking-wide mb-4">Response Dispatched</h4>
                <div className="space-y-4">
                   <div>
                     <p className="text-red-500/60 text-xs font-medium  tracking-wide">Routing To</p>
                     <p className="text-xl font-medium">{result.hospital.displayName}</p>
                     <p className="text-red-800/60 text-sm">{result.hospital.formattedAddress}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-red-500/10 p-4 rounded-xl">
                       <p className="text-red-500/60 text-[10px] font-medium  tracking-wide">ETA</p>
                       <p className="text-2xl font-medium text-red-600 font-mono">
                         {Math.ceil(Number(result.route.durationMillis) / 60000)} MIN
                       </p>
                     </div>
                     <div className="bg-red-500/10 p-4 rounded-xl">
                       <p className="text-red-500/60 text-[10px] font-medium  tracking-wide">Distance</p>
                       <p className="text-2xl font-medium text-red-600 font-mono">
                         {(Number(result.route.distanceMeters) / 1000).toFixed(1)} KM
                       </p>
                     </div>
                   </div>
                   <a 
                     href={`https://www.google.com/maps/dir/?api=1&destination=${result.hospital.location?.lat()},${result.hospital.location?.lng()}`}
                     target="_blank"
                     rel="noreferrer"
                     className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-stone-800 font-medium rounded-xl hover:bg-red-400 transition-all  tracking-wide mt-4 shadow-md"
                   >
                     <Navigation className="w-5 h-5" />
                     Start Google Maps Navigation
                   </a>
                </div>
             </div>
           )}
       </div>
    </div>
  );
}

export default function EmergencyLocator() {
  if (!API_KEY) {
     return (
       <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-red-950">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-500 relative rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-stone-800" />
                  </div>
                  <div>
                    <h3 className="font-medium text-2xl  tracking-tight text-red-500">Emergency Mode (Demo)</h3>
                    <p className="text-red-500/60 font-medium text-sm">Google Maps API key not detected</p>
                  </div>
                </div>
              </div>
              <button 
                 disabled
                 className="px-8 py-4 w-full sm:w-auto bg-red-500/50 text-stone-800 font-medium  tracking-wide rounded-2xl shadow-md shadow-red-500/20 transition-all opacity-50 cursor-not-allowed"
              >
                 SOS: Nearest Hospital
              </button>
           </div>
           
           <div className="mt-8 p-6 bg-red-50/80 backdrop-blur-xl rounded-3xl border border-red-500/30">
                <h4 className="text-red-600 font-medium  tracking-wide mb-4">Demo Response Dispatched</h4>
                <div className="space-y-4">
                   <div>
                     <p className="text-red-500/60 text-xs font-medium  tracking-wide">Routing To</p>
                     <p className="text-xl font-medium">Central City General Hospital</p>
                     <p className="text-red-800/60 text-sm">100 Main St, Central City</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-red-500/10 p-4 rounded-xl">
                       <p className="text-red-500/60 text-[10px] font-medium  tracking-wide">ETA</p>
                       <p className="text-2xl font-medium text-red-600 font-mono">
                         8 MIN
                       </p>
                     </div>
                     <div className="bg-red-500/10 p-4 rounded-xl">
                       <p className="text-red-500/60 text-[10px] font-medium  tracking-wide">Distance</p>
                       <p className="text-2xl font-medium text-red-600 font-mono">
                         4.2 KM
                       </p>
                     </div>
                   </div>
                </div>
             </div>
       </div>
     );
  }
  return (
    <APIProvider apiKey={API_KEY} version="weekly">
       <EmergencyContent />
    </APIProvider>
  );
}
