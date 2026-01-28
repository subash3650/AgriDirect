import { useState, useEffect, useRef, useCallback } from 'react';
import './LocationPicker.css';

const LocationPicker = ({ value, onChange, disabled = false }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [gpsProgress, setGpsProgress] = useState(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const leafletRef = useRef(null);
    const watchIdRef = useRef(null);
    const gpsTimeoutRef = useRef(null);

    
    useEffect(() => {
        if (window.L) {
            leafletRef.current = window.L;
            setMapLoaded(true);
            return;
        }

        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
            leafletRef.current = window.L;
            setMapLoaded(true);
        };
        document.head.appendChild(script);
    }, []);

    
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !leafletRef.current) return;

        const L = leafletRef.current;
        const initialCenter = value?.coordinates?.length === 2
            ? [value.coordinates[1], value.coordinates[0]]
            : [20.5937, 78.9629]; 

        mapInstanceRef.current = L.map(mapRef.current).setView(initialCenter, value?.coordinates?.length === 2 ? 15 : 5);

        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        
        if (value?.coordinates?.length === 2) {
            markerRef.current = L.marker(initialCenter, { draggable: !disabled })
                .addTo(mapInstanceRef.current)
                .bindPopup('Your location');

            if (!disabled) {
                markerRef.current.on('dragend', (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    updateLocation(lat, lng);
                });
            }
        }

        
        if (!disabled) {
            mapInstanceRef.current.on('click', (e) => {
                const { lat, lng } = e.latlng;
                placeMarker(lat, lng);
            });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapLoaded]);

    const placeMarker = (lat, lng) => {
        const L = leafletRef.current;
        if (!L || !mapInstanceRef.current || disabled) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], { draggable: true })
                .addTo(mapInstanceRef.current)
                .bindPopup('Selected location')
                .openPopup();

            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                updateLocation(lat, lng);
            });
        }

        mapInstanceRef.current.setView([lat, lng], 15);
        updateLocation(lat, lng);
    };

    const updateLocation = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

            onChange({ coordinates: [lng, lat], address });
        } catch {
            onChange({ coordinates: [lng, lat], address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
    };

    
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (gpsTimeoutRef.current) {
                clearTimeout(gpsTimeoutRef.current);
            }
        };
    }, []);

    
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'Geolocation not supported' });
            return;
        }

        
        const GPS_CONFIG = {
            maxSamples: 15,              
            maxDuration: 30000,          
            targetAccuracy: 50,          
            minSamplesForAverage: 3,     
            maxAcceptableAccuracy: 500,  
        };

        const samples = [];
        let bestSample = null;
        let startTime = Date.now();

        
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (gpsTimeoutRef.current) {
            clearTimeout(gpsTimeoutRef.current);
            gpsTimeoutRef.current = null;
        }

        setMessage({ type: 'info', text: 'Acquiring GPS signal...' });
        setGpsProgress({ samples: 0, accuracy: null, status: 'initializing' });

        
        const calculateWeightedAverage = (sampleArray) => {
            if (sampleArray.length === 0) return null;
            if (sampleArray.length === 1) return sampleArray[0];

            
            const sorted = [...sampleArray].sort((a, b) => a.accuracy - b.accuracy);

            
            const bestSamples = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)));

            
            const totalWeight = bestSamples.reduce((sum, s) => sum + (1 / s.accuracy), 0);

            
            const avgLat = bestSamples.reduce((sum, s) => sum + (s.lat * (1 / s.accuracy)), 0) / totalWeight;
            const avgLng = bestSamples.reduce((sum, s) => sum + (s.lng * (1 / s.accuracy)), 0) / totalWeight;
            const avgAccuracy = bestSamples.reduce((sum, s) => sum + s.accuracy, 0) / bestSamples.length;

            return {
                lat: avgLat,
                lng: avgLng,
                accuracy: avgAccuracy,
                sampleCount: sampleArray.length,
                method: 'averaged'
            };
        };

        
        const finalizeLocation = (reason) => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (gpsTimeoutRef.current) {
                clearTimeout(gpsTimeoutRef.current);
                gpsTimeoutRef.current = null;
            }

            let finalLocation = null;

            
            const goodSamples = samples.filter(s => s.accuracy <= GPS_CONFIG.maxAcceptableAccuracy);

            if (goodSamples.length >= GPS_CONFIG.minSamplesForAverage) {
                
                finalLocation = calculateWeightedAverage(goodSamples);
            } else if (goodSamples.length > 0) {
                
                finalLocation = goodSamples.sort((a, b) => a.accuracy - b.accuracy)[0];
            } else if (samples.length > 0) {
                
                const bestApprox = samples.sort((a, b) => a.accuracy - b.accuracy)[0];
                placeMarker(bestApprox.lat, bestApprox.lng);

                setMessage({
                    type: 'error',
                    text: `⚠️ Poor GPS signal (${Math.round(bestApprox.accuracy)}m). This is likely WiFi/IP location. Please go outdoors for accurate GPS, or select location manually on the map.`
                });
                setGpsProgress(null);
                return;
            } else if (bestSample) {
                if (bestSample.accuracy > GPS_CONFIG.maxAcceptableAccuracy) {
                    placeMarker(bestSample.lat, bestSample.lng);
                    setMessage({
                        type: 'error',
                        text: `⚠️ No GPS signal detected (${Math.round(bestSample.accuracy)}m accuracy). Please go outdoors or enable GPS on your device, or select location manually.`
                    });
                    setGpsProgress(null);
                    return;
                }
                finalLocation = bestSample;
            }

            if (finalLocation) {
                placeMarker(finalLocation.lat, finalLocation.lng);

                const accuracyText = finalLocation.accuracy <= 20
                    ? `🎯 Excellent GPS accuracy (${Math.round(finalLocation.accuracy)}m)`
                    : finalLocation.accuracy <= 50
                        ? `✓ Good GPS accuracy (${Math.round(finalLocation.accuracy)}m)`
                        : finalLocation.accuracy <= 100
                            ? `⚡ Moderate accuracy (${Math.round(finalLocation.accuracy)}m)`
                            : `📍 Location set (${Math.round(finalLocation.accuracy)}m)`;

                const sampleInfo = goodSamples.length > 1
                    ? ` - averaged from ${goodSamples.length} GPS readings`
                    : '';

                setMessage({
                    type: finalLocation.accuracy <= 100 ? 'success' : 'info',
                    text: accuracyText + sampleInfo
                });
                setGpsProgress(null);

                
                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            } else {
                setMessage({ type: 'error', text: 'Failed to get GPS location. Please select manually on the map.' });
                setGpsProgress(null);
            }
        };

        
        const onSuccess = (position) => {
            const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
            const elapsed = Date.now() - startTime;

            
            const likelySource = accuracy <= 50 ? 'GPS' :
                accuracy <= 500 ? 'WiFi/Cell' :
                    'IP-based';

            console.log(`Location Sample #${samples.length + 1} (${likelySource}):`, {
                lat: latitude.toFixed(6),
                lng: longitude.toFixed(6),
                accuracy: `${Math.round(accuracy)}m`,
                altitude,
                heading,
                speed,
                elapsed: `${Math.round(elapsed / 1000)}s`
            });

            const sample = {
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                timestamp: position.timestamp,
                source: likelySource
            };

            
            const isGPSQuality = accuracy <= GPS_CONFIG.maxAcceptableAccuracy;

            if (!bestSample ||
                (isGPSQuality && (!bestSample || accuracy < bestSample.accuracy)) ||
                (!bestSample && accuracy < Infinity)) {
                bestSample = sample;

                
                if (isGPSQuality) {
                    placeMarker(latitude, longitude);
                }
            }

            
            samples.push(sample);

            
            const goodCount = samples.filter(s => s.accuracy <= GPS_CONFIG.maxAcceptableAccuracy).length;
            const badCount = samples.length - goodCount;

            
            const currentStatus = accuracy <= GPS_CONFIG.targetAccuracy ? 'excellent' :
                accuracy <= 100 ? 'good' :
                    accuracy <= 500 ? 'moderate' : 'acquiring';

            setGpsProgress({
                samples: samples.length,
                goodSamples: goodCount,
                accuracy: bestSample ? Math.round(bestSample.accuracy) : null,
                status: currentStatus
            });

            
            if (accuracy > GPS_CONFIG.maxAcceptableAccuracy) {
                setMessage({
                    type: 'info',
                    text: `📡 Waiting for GPS signal... (Currently using ${likelySource}: ${Math.round(accuracy)}m) - Go outdoors for better accuracy`
                });
            } else {
                setMessage({
                    type: 'info',
                    text: `📡 GPS acquiring... (${Math.round(bestSample?.accuracy || accuracy)}m accuracy, ${goodCount} good readings)`
                });
            }

            
            if (isGPSQuality && accuracy <= GPS_CONFIG.targetAccuracy && goodCount >= GPS_CONFIG.minSamplesForAverage) {
                console.log('Excellent GPS accuracy achieved, finalizing...');
                finalizeLocation('target_accuracy_reached');
                return;
            }

            
            if (samples.length >= GPS_CONFIG.maxSamples) {
                if (goodCount >= GPS_CONFIG.minSamplesForAverage) {
                    console.log('Max samples with good GPS readings, finalizing...');
                    finalizeLocation('max_samples');
                } else {
                    console.log('Max samples reached but poor GPS, waiting longer...');
                    
                }
                return;
            }
        };

        
        const onError = (error) => {
            console.error('GPS Error:', error);

            const goodSamples = samples.filter(s => s.accuracy <= GPS_CONFIG.maxAcceptableAccuracy);

            if (goodSamples.length > 0) {
                
                finalizeLocation('error_with_fallback');
            } else if (samples.length > 0) {
                
                const bestApprox = samples.sort((a, b) => a.accuracy - b.accuracy)[0];
                placeMarker(bestApprox.lat, bestApprox.lng);
                setMessage({
                    type: 'error',
                    text: `⚠️ GPS unavailable. Showing approximate location (${Math.round(bestApprox.accuracy)}m). Please select your exact location on the map.`
                });
                setGpsProgress(null);
            } else {
                let errorText = 'GPS Error: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorText = '🚫 Location permission denied. Please enable location access in your browser settings and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorText = '📵 GPS signal unavailable. Please go outdoors or check if GPS is enabled on your device.';
                        break;
                    case error.TIMEOUT:
                        errorText = '⏱️ GPS timed out. Please ensure you are outdoors with clear sky view and try again.';
                        break;
                    default:
                        errorText += 'Unknown error. Please try again.';
                }
                setMessage({ type: 'error', text: errorText });
                setGpsProgress(null);
            }
        };

        
        const gpsOptions = {
            enableHighAccuracy: true,  
            timeout: 60000,            
            maximumAge: 0              
        };

        
        watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess,
            onError,
            gpsOptions
        );

        
        gpsTimeoutRef.current = setTimeout(() => {
            console.log('GPS acquisition timeout reached...');
            const goodSamples = samples.filter(s => s.accuracy <= GPS_CONFIG.maxAcceptableAccuracy);

            if (goodSamples.length > 0) {
                finalizeLocation('timeout_with_gps');
            } else if (samples.length > 0) {
                
                const bestApprox = samples.sort((a, b) => a.accuracy - b.accuracy)[0];
                placeMarker(bestApprox.lat, bestApprox.lng);
                setMessage({
                    type: 'error',
                    text: `⚠️ Could not get GPS signal (best: ${Math.round(bestApprox.accuracy)}m). Showing approximate location. For better accuracy: go outdoors, enable GPS, or select manually on map.`
                });
                setGpsProgress(null);

                
                if (watchIdRef.current) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            } else {
                setMessage({ type: 'error', text: 'GPS timeout. Please check location permissions and try again outdoors.' });
                setGpsProgress(null);

                if (watchIdRef.current) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            }
        }, GPS_CONFIG.maxDuration);

    }, [placeMarker]);


    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setMessage({ type: 'info', text: 'Searching...' });
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                placeMarker(parseFloat(lat), parseFloat(lon));
                onChange({ coordinates: [parseFloat(lon), parseFloat(lat)], address: display_name });
                setMessage({ type: 'success', text: 'Found!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 2000);
            } else {
                setMessage({ type: 'error', text: 'Not found' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Search error' });
        }
    };

    return (
        <div className="location-picker">
            <div className="location-picker-controls">
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="btn btn-secondary location-picker-btn"
                    disabled={disabled}
                >
                    📍 Use GPS
                </button>

                <div className="location-picker-search">
                    <input
                        type="text"
                        placeholder="Search address..."
                        className="form-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                searchLocation();
                            }
                        }}
                        disabled={disabled}
                    />
                    <button
                        type="button"
                        onClick={searchLocation}
                        className="btn btn-primary"
                        disabled={disabled}
                    >
                        🔍
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`location-picker-message location-picker-message-${message.type}`}>
                    {message.text}
                </div>
            )}

            {gpsProgress && (
                <div className="gps-progress-container">
                    <div className="gps-progress-bar">
                        <div
                            className={`gps-progress-fill gps-progress-${gpsProgress.status}`}
                            style={{ width: `${Math.min(100, (gpsProgress.samples / 10) * 100)}%` }}
                        />
                    </div>
                    <div className="gps-progress-info">
                        <span className="gps-progress-samples">
                            📊 {gpsProgress.samples}/10 readings
                        </span>
                        {gpsProgress.accuracy && (
                            <span className={`gps-progress-accuracy gps-accuracy-${gpsProgress.status}`}>
                                🎯 {gpsProgress.accuracy}m accuracy
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div ref={mapRef} className="location-picker-map"></div>

            {value?.address && (
                <div className="location-picker-display">
                    <strong>📍 Selected:</strong> {value.address}
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
