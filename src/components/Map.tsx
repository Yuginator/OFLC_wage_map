import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Home } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { WageResponse } from '../types';

interface MapProps {
    wageData: WageResponse | null;
    activeLevel: 'level1' | 'level2' | 'level3' | 'level4' | 'average';
    selectedFips: string | null;
    onFipsSelect: (fips: string | null) => void;
    personalSalary: number | null;
}

const MapView: React.FC<MapProps> = ({ wageData, activeLevel, selectedFips, onFipsSelect, personalSalary }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const wageDataRef = useRef<WageResponse | null>(null);
    const activeLevelRef = useRef(activeLevel);
    const personalSalaryRef = useRef(personalSalary);

    useEffect(() => {
        wageDataRef.current = wageData;
    }, [wageData]);

    useEffect(() => {
        activeLevelRef.current = activeLevel;
    }, [activeLevel]);

    useEffect(() => {
        personalSalaryRef.current = personalSalary;
    }, [personalSalary]);

    useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
                sources: {
                    'counties': {
                        type: 'geojson',
                        data: '/geo/us-counties.json', // We'll need a GeoJSON version or TopoJSON-to-GeoJSON convert
                        generateId: true
                    },
                    'states': {
                        type: 'geojson',
                        data: '/geo/us-states.json',
                        generateId: true
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: { 'background-color': '#000000' }
                    },
                    {
                        id: 'counties-fill',
                        type: 'fill',
                        source: 'counties',
                        paint: {
                            'fill-color': '#1e293b',
                            'fill-opacity': 0.8,
                            'fill-color-transition': { duration: 500 }
                        }
                    },
                    {
                        id: 'counties-outline',
                        type: 'line',
                        source: 'counties',
                        paint: {
                            'line-color': 'rgba(255,255,255,0.05)',
                        }
                    },
                    {
                        id: 'states-outline',
                        type: 'line',
                        source: 'states',
                        paint: {
                            'line-color': '#475569',
                            'line-width': 1.5
                        }
                    },
                    {
                        id: 'counties-labels',
                        type: 'symbol',
                        source: 'counties',
                        minzoom: 5,
                        layout: {
                            'text-field': '',
                            'text-font': ['Open Sans Regular'], // Use exactly what the demotiles glyphs server provides
                            'text-size': 12,
                            'text-max-width': 8,
                            'text-overlap': 'never', // Prevent dense cluster overlapping
                        },
                        paint: {
                            'text-color': '#ffffff',
                            'text-halo-color': 'rgba(15, 23, 42, 0.8)', // slate-900 halo for readability against dark blue
                            'text-halo-width': 1.5,
                        }
                    }
                ]
            },
            center: [-98.5795, 39.8283],
            zoom: 3.5,
            pitch: 0,
            hash: true, // Enables native URL syncing for center/zoom/pitch/bearing
            attributionControl: false // Removes MapLibre logo footprint
        });

        // Add native Map Navigation Controls (Zoom & Pitch)
        map.current.addControl(
            new maplibregl.NavigationControl({
                visualizePitch: true,
            }),
            'top-right'
        );

        // Add "Locate Me" Geolocate Control
        map.current.addControl(
            new maplibregl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: false,
                fitBoundsOptions: {
                    maxZoom: 6 // Capped so users maintain regional context instead of zooming into a building
                }
            }),
            'top-right'
        );

        map.current.on('click', 'counties-fill', (e) => {
            if (!wageDataRef.current) return; // Ignore clicks if no occupation is selected
            if (e.features && e.features.length > 0) {
                const properties = e.features[0].properties || {};
                const fips = properties.STATE && properties.COUNTY
                    ? `${properties.STATE}${properties.COUNTY}`
                    : undefined;
                if (fips) onFipsSelect(fips);
            }
        });

        const tooltipPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'map-hover-tooltip'
        });

        map.current.on('mousemove', 'counties-fill', (e) => {
            if (map.current && e.features && e.features.length > 0) {
                map.current.getCanvas().style.cursor = 'pointer';
                const props = e.features[0].properties || {};
                const stateGeo = props.STATE;
                const countyGeo = props.COUNTY;
                const fips = stateGeo && countyGeo ? `${stateGeo}${countyGeo}` : null;

                let tooltipHTML = `<div style="font-weight: 500; font-size: 13px; color: white;">`;

                if (fips && wageDataRef.current) {
                    const cData = wageDataRef.current.data[fips];
                    if (cData) {
                        const wagVal = cData[activeLevelRef.current as keyof typeof cData];
                        tooltipHTML += `${cData.county}, ${cData.state}</div>`;

                        if (personalSalaryRef.current && personalSalaryRef.current > 0) {
                            const ps = personalSalaryRef.current;
                            let tierText = '';
                            let color = '';
                            let subtext = '';

                            if (cData.level1 > 0) {
                                if (ps >= cData.level4) {
                                    tierText = 'Meets Level 4';
                                    color = '#3b82f6'; // Blue L4
                                    subtext = 'Highest H-1B Tier';
                                } else if (ps >= cData.level3) {
                                    tierText = 'Meets Level 3';
                                    color = '#14b8a6'; // Teal L3
                                    subtext = `Short of Level 4: $${cData.level4.toLocaleString()}`;
                                } else if (ps >= cData.level2) {
                                    tierText = 'Meets Level 2';
                                    color = '#eab308'; // Yellow L2
                                    subtext = `Short of Level 3: $${cData.level3.toLocaleString()}`;
                                } else if (ps >= cData.level1) {
                                    tierText = 'Meets Level 1';
                                    color = '#f97316'; // Orange L1
                                    subtext = `Short of Level 2: $${cData.level2.toLocaleString()}`;
                                } else {
                                    tierText = 'Fails Level 1';
                                    color = '#ef4444'; // Fails L1 (default)
                                    subtext = `Prevailing Wage is $${cData.level1.toLocaleString()}`;
                                }
                                tooltipHTML += `<div style="font-family: var(--font-mono); font-size: 13px; color: ${color}; margin-top: 4px;">${tierText}</div>`;
                                tooltipHTML += `<div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px;">${subtext}</div>`;
                            } else {
                                tooltipHTML += `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">No wage data</div>`;
                            }
                        } else {
                            if (typeof wagVal === 'number' && wagVal > 0) {
                                tooltipHTML += `<div style="font-family: var(--font-mono); font-size: 13px; color: #60a5fa; margin-top: 4px;">Wage: $${wagVal.toLocaleString()}</div>`;
                            } else {
                                tooltipHTML += `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">No wage data</div>`;
                            }
                        }
                    } else {
                        tooltipHTML += `${props.NAME}</div><div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">No matching data</div>`;
                    }
                } else {
                    tooltipHTML += `${props.NAME}</div><div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">No wage data</div>`;
                }

                tooltipPopup.setLngLat(e.lngLat).setHTML(tooltipHTML).addTo(map.current);
            }
        });

        map.current.on('mouseleave', 'counties-fill', () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
            tooltipPopup.remove();
        });

        // @ts-ignore
        window.myMap = map.current; // Expose for debugging

        return () => {
            map.current?.remove();
            // @ts-ignore
            window.myMap = null;
        };
    }, []);

    // Update coloring when data or level changes
    useEffect(() => {
        if (!map.current || !wageData) return;

        const { data, scale } = wageData;

        const fipsExpr = ['concat', ['get', 'STATE'], ['get', 'COUNTY']];
        // MapLibre struggles with deeply nested object lookups when keys are missing (evaluates to null and crashes interpolate).
        // Instead, we build a flat 'match' expression: ['match', fipsExpr, '01001', 50000, '01003', 60000, ..., 0]
        let colorExpression: any;

        if (scale.min === scale.max || scale.max === 0) {
            colorExpression = '#1e293b';
        } else if (personalSalary && personalSalary > 0) {
            const matchExpr: any[] = ['match', fipsExpr];

            for (const [fips, countyData] of Object.entries(data)) {
                if (countyData.level1 > 0) {
                    let color = '#ef4444'; // Fails L1 (default)
                    if (personalSalary >= countyData.level4) {
                        color = '#3b82f6'; // Blue L4
                    } else if (personalSalary >= countyData.level3) {
                        color = '#14b8a6'; // Teal L3
                    } else if (personalSalary >= countyData.level2) {
                        color = '#eab308'; // Yellow L2
                    } else if (personalSalary >= countyData.level1) {
                        color = '#f97316'; // Orange L1
                    }
                    matchExpr.push(fips, color);
                }
            }
            matchExpr.push('rgba(255, 255, 255, 0.05)'); // Default missing
            colorExpression = matchExpr;

        } else {
            const matchExpr: any[] = ['match', fipsExpr];

            for (const [fips, countyData] of Object.entries(data)) {
                // @ts-ignore dynamic key access
                const wage = countyData[activeLevel];
                if (typeof wage === 'number' && wage > 0) {
                    matchExpr.push(fips, wage);
                }
            }
            matchExpr.push(0); // completely fallback wage is 0 if not matched

            colorExpression = [
                'case',
                ['>', matchExpr, 0],
                [
                    'interpolate',
                    ['linear'],
                    matchExpr,
                    scale.min, '#f8fafc',
                    scale.min + (scale.max - scale.min) * 0.25, '#bae6fd',
                    scale.min + (scale.max - scale.min) * 0.5, '#3b82f6',
                    scale.min + (scale.max - scale.min) * 0.75, '#4338ca',
                    scale.max, '#312e81'
                ],
                'rgba(255, 255, 255, 0.05)' // fallback when wage is 0/null (renders as an ultra faint grey on black)
            ];
        }

        if (map.current.getLayer('counties-fill')) {
            map.current.setPaintProperty('counties-fill', 'fill-color', colorExpression);
        }

        // Generate the text layout match expression mapping FIPS -> formatted text (e.g. "$105k")
        // We only show labels for valid, non-zero wages.
        const formatWageText = (wage: number) => {
            if (wage >= 1000) {
                return `$${Math.round(wage / 1000)}k`;
            }
            return `$${wage}`;
        };

        const textMatchExpr: any[] = ['match', fipsExpr];
        for (const [fips, countyData] of Object.entries(data)) {
            if (personalSalary && personalSalary > 0) {
                if (countyData.level1 > 0) {
                    let label = 'Fail';
                    if (personalSalary >= countyData.level4) label = 'L4+';
                    else if (personalSalary >= countyData.level3) label = 'L3';
                    else if (personalSalary >= countyData.level2) label = 'L2';
                    else if (personalSalary >= countyData.level1) label = 'L1';
                    textMatchExpr.push(fips, label);
                }
            } else {
                // @ts-ignore dynamic key access
                const wage = countyData[activeLevel];
                if (typeof wage === 'number' && wage > 0) {
                    textMatchExpr.push(fips, formatWageText(wage));
                }
            }
        }
        textMatchExpr.push(''); // fallback empty string

        if (map.current.getLayer('counties-labels')) {
            map.current.setLayoutProperty('counties-labels', 'text-field', textMatchExpr);
        }

        // Highlight selected county
        if (map.current.getLayer('counties-highlight')) {
            map.current.removeLayer('counties-highlight');
        }

        if (selectedFips) {
            map.current.addLayer({
                id: 'counties-highlight',
                type: 'line',
                source: 'counties',
                filter: ['==', ['concat', ['get', 'STATE'], ['get', 'COUNTY']], selectedFips],
                paint: {
                    'line-color': '#fff',
                    'line-width': 2
                }
            });
        }

    }, [wageData, activeLevel, selectedFips, personalSalary]);

    return (
        <>
            <div ref={mapContainer} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%', cursor: 'crosshair' }} />
            <div className="map-controls">
                <button
                    onClick={() => {
                        if (map.current) {
                            map.current.flyTo({ center: [-98.5795, 39.8283], zoom: 4 });
                            onFipsSelect(null);
                        }
                    }}
                    className="map-btn"
                    title="Reset Map View"
                >
                    <Home size={20} />
                </button>
            </div>
        </>
    );
};

export default MapView;
