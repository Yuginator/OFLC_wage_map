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
    theme: 'dark' | 'light';
    meta?: any;
}

const MapView: React.FC<MapProps> = ({ wageData, activeLevel, selectedFips, onFipsSelect, personalSalary, theme, meta }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const wageDataRef = useRef<WageResponse | null>(null);
    const activeLevelRef = useRef(activeLevel);
    const personalSalaryRef = useRef(personalSalary);

    const clickPopupRef = useRef<maplibregl.Popup | null>(null);
    const activeFeatureRef = useRef<{ fips: string; properties: any; lngLat: maplibregl.LngLat } | null>(null);

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
                            'line-color': 'rgba(255,255,255,0.08)',
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

        clickPopupRef.current = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'map-click-popup',
            maxWidth: '320px'
        });

        clickPopupRef.current.on('close', () => {
            onFipsSelect(null);
        });

        map.current.on('click', 'counties-fill', (e) => {
            if (!wageDataRef.current) return; // Ignore clicks if no occupation is selected
            if (e.features && e.features.length > 0) {
                const properties = e.features[0].properties || {};
                const fips = properties.STATE && properties.COUNTY
                    ? `${properties.STATE}${properties.COUNTY}`
                    : undefined;
                if (fips) {
                    activeFeatureRef.current = { fips, properties, lngLat: e.lngLat };
                    onFipsSelect(fips);
                }
            }
        });

        // Use standard black tooltip background, but text colors adapt to CSS variables
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

                let tooltipHTML = `<div style="font-weight: 500; font-size: 13px; color: var(--text);">`;

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
                                tooltipHTML += `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 2px;">${subtext}</div>`;
                            } else {
                                tooltipHTML += `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">No wage data</div>`;
                            }
                        } else {
                            if (typeof wagVal === 'number' && wagVal > 0) {
                                tooltipHTML += `<div style="font-family: var(--font-mono); font-size: 13px; color: var(--primary); margin-top: 4px;">Wage: $${wagVal.toLocaleString()}</div>`;
                            } else {
                                tooltipHTML += `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">No wage data</div>`;
                            }
                        }
                    } else {
                        tooltipHTML += `${props.NAME}</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">No matching data</div>`;
                    }
                } else {
                    tooltipHTML += `${props.NAME}</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">No wage data</div>`;
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
            clickPopupRef.current?.remove();
            map.current?.remove();
            // @ts-ignore
            window.myMap = null;
        };
    }, []);

    // Effect for Rendering Click Popup
    useEffect(() => {
        if (!map.current || !clickPopupRef.current) return;

        if (!selectedFips) {
            clickPopupRef.current.remove();
            activeFeatureRef.current = null;
            return;
        }

        const featureContext = activeFeatureRef.current;
        if (!wageData || !featureContext || featureContext.fips !== selectedFips) return;

        const props = featureContext.properties;
        const cData = wageData.data[selectedFips];
        const ps = personalSalary;

        let userTier: number | null = null;
        if (ps && cData && cData.level1 > 0) {
            if (ps >= cData.level4) userTier = 4;
            else if (ps >= cData.level3) userTier = 3;
            else if (ps >= cData.level2) userTier = 2;
            else if (ps >= cData.level1) userTier = 1;
            else userTier = 0;
        }

        const formatWage = (v: number) => `$${v.toLocaleString()}`;

        const rowStyle = (levelKey: string) => {
            const isActive = activeLevel === levelKey;
            return `
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 13px;
                border-left: ${isActive ? '3px solid var(--primary)' : '0'};
                padding-left: ${isActive ? '8px' : '0'};
                background: ${isActive ? 'var(--bg-panel-hover)' : 'transparent'};
                color: ${isActive ? 'var(--text)' : 'var(--text-muted)'};
            `;
        };

        const valStyle = `font-family: var(--font-mono); color: var(--text); font-weight: 500;`;

        const tierBadge = userTier !== null ? `
            <div style="background: ${userTier === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'}; border: 1px solid ${userTier === 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}; border-radius: 6px; padding: 10px; margin-top: 14px;">
                <div style="font-size: 10px; font-weight: 600; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase;">Your Salary: ${formatWage(ps!)}</div>
                <div style="font-size: 13px; font-weight: 500; color: ${userTier === 0 ? '#ef4444' : '#3b82f6'};">
                    ${userTier === 4 ? 'Exceeds Level 4' : userTier === 3 ? 'Meets Level 3' : userTier === 2 ? 'Meets Level 2' : userTier === 1 ? 'Meets Level 1' : 'Fails Level 1 minimum requirement'}
                </div>
            </div>
        ` : '';

        const html = `
            <div style="display: flex; flex-direction: column;">
                <div style="font-size: 18px; font-weight: 600; padding-right: 20px; color: var(--text);">${cData ? cData.county : props.NAME + ' County'}</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">${cData ? cData.state : props.STATE}</div>
                
                <div style="font-size: 10px; text-transform: uppercase; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.02em;">Occupation</div>
                <div style="font-size: 13px; margin-bottom: 14px; line-height: 1.4; color: var(--text);">
                    <span style="font-family: var(--font-mono); color: var(--primary); margin-right: 6px;">${meta?.soc}</span>
                    ${meta?.soc_title}
                </div>
                
                ${cData && cData.level1 > 0 ? `
                    <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 2px;">
                        <div style="${rowStyle('level1')}">
                            <span>Level I</span>
                            <span style="${valStyle}">${formatWage(cData.level1)}</span>
                        </div>
                        <div style="${rowStyle('level2')}">
                            <span>Level II</span>
                            <span style="${valStyle}">${formatWage(cData.level2)}</span>
                        </div>
                        <div style="${rowStyle('level3')}">
                            <span>Level III</span>
                            <span style="${valStyle}">${formatWage(cData.level3)}</span>
                        </div>
                        <div style="${rowStyle('level4')}">
                            <span>Level IV</span>
                            <span style="${valStyle}">${formatWage(cData.level4)}</span>
                        </div>
                        <div style="${rowStyle('average')} border-top: 1px solid var(--border); margin-top: 4px; padding-top: 6px;">
                            <span style="color: var(--primary);">Average Annual Wage</span>
                            <span style="${valStyle} color: var(--primary);">${formatWage(cData.average)}</span>
                        </div>
                    </div>
                ` : `
                    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">No wage data available</div>
                `}
                
                ${tierBadge}

                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 10px; color: var(--text-muted); line-height: 1.4;">
                    <div>Wage Year: ${meta?.wage_year || '2025-2026'}</div>
                    <div style="margin-bottom: 4px;">Source: ${meta?.source || 'U.S. DOL OFLC (FLAG wage data)'}</div>
                    <div style="font-style: italic;">Note: Annual wages = hourly × 2080 (OFLC standard)</div>
                    <a href="https://flag.dol.gov/wage-data/wage-data-downloads" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-block; margin-top: 4px;">Visit DOL FLAG ↗</a>
                </div>
            </div>
        `;

        clickPopupRef.current
            .setLngLat(featureContext.lngLat)
            .setHTML(html)
            .addTo(map.current);

    }, [selectedFips, wageData, activeLevel, personalSalary, theme, meta]);

    // Effect for handling static base layer theme repaints (Background, Borders, Text)
    useEffect(() => {
        if (!map.current) return;
        const m = map.current;
        if (m.getStyle()) {
            m.setPaintProperty('background', 'background-color', theme === 'dark' ? '#000000' : '#e2e8f0');
            m.setPaintProperty('counties-outline', 'line-color', theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)');
        }
    }, [theme]);

    // Update coloring when data, level, or theme changes
    useEffect(() => {
        if (!map.current || !wageData) return;

        const { data, scale } = wageData;

        // Ensure missing fallback colors adhere to the current theme
        const emptyCountyFill = theme === 'dark' ? '#1e293b' : '#f1f5f9';
        const emptyCountyHover = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';

        const fipsExpr = ['concat', ['get', 'STATE'], ['get', 'COUNTY']];
        // MapLibre struggles with deeply nested object lookups when keys are missing (evaluates to null and crashes interpolate).
        // Instead, we build a flat 'match' expression: ['match', fipsExpr, '01001', 50000, '01003', 60000, ..., 0]
        let colorExpression: any;

        if (scale.min === scale.max || scale.max === 0) {
            colorExpression = emptyCountyFill;
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
            matchExpr.push(emptyCountyHover); // Default missing
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

            const range = scale.max - scale.min;
            const q1 = scale.min + range * 0.2;
            const q2 = scale.min + range * 0.4;
            const q3 = scale.min + range * 0.6;
            const q4 = scale.min + range * 0.8;

            const c1 = theme === 'dark' ? '#f8fafc' : '#e0e7ff';
            const c2 = theme === 'dark' ? '#bae6fd' : '#a5b4fc';
            const c3 = theme === 'dark' ? '#3b82f6' : '#6366f1';
            const c4 = theme === 'dark' ? '#4338ca' : '#3730a3';
            const c5 = theme === 'dark' ? '#312e81' : '#1e1b4b';

            colorExpression = [
                'case',
                ['>', matchExpr, 0],
                [
                    'step',
                    matchExpr,
                    c1, // below q1
                    q1, c2,
                    q2, c3,
                    q3, c4,
                    q4, c5
                ],
                emptyCountyHover // fallback when wage is 0/null
            ];
        }

        if (map.current.getLayer('counties-fill')) {
            map.current.setPaintProperty('counties-fill', 'fill-color', colorExpression);
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
