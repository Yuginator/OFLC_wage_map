import React, { useState, useEffect, useMemo } from 'react';
import { SocItem, WageResponse } from './types';
import MapView from './components/Map';
import Controls from './components/Controls';
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        soc: params.get('soc') || null,
        collection: (params.get('collection') as 'all' | 'ed') || 'all',
        wageLevel: (params.get('level') as any) || 'level1',
        salary: params.get('salary') ? Number(params.get('salary')) : null
    };
};

const App: React.FC = () => {
    const init = getInitialState();

    const [socs, setSocs] = useState<SocItem[]>([]);
    const [selectedSoc, setSelectedSoc] = useState<string | null>(init.soc);
    const [collection, setCollection] = useState<'all' | 'ed'>(init.collection);
    const [wageLevel, setWageLevel] = useState<'level1' | 'level2' | 'level3' | 'level4' | 'average'>(init.wageLevel);
    const [wageData, setWageData] = useState<WageResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedFips, setSelectedFips] = useState<string | null>(null);
    const [personalSalary, setPersonalSalary] = useState<number | null>(init.salary);
    const [legendOpen, setLegendOpen] = useState(true);

    useEffect(() => {
        fetch('/api/soc-index')
            .then(res => res.json())
            .then(data => setSocs(data))
            .catch(err => console.error('Failed to load SOC index', err));
    }, []);

    useEffect(() => {
        if (selectedSoc) {
            setLoading(true);
            fetch(`/api/wages?soc=${selectedSoc}&collection=${collection}`)
                .then(res => res.json())
                .then(data => {
                    setWageData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load wages', err);
                    setLoading(false);
                });
        } else {
            // Explicitly reset the map layers and selection when the user clears the SOC code
            setWageData(null);
            setSelectedFips(null);
        }
    }, [selectedSoc, collection]);

    const activeCountyData = useMemo(() => {
        if (!wageData || !selectedFips) return null;
        return wageData.data[selectedFips] || null;
    }, [wageData, selectedFips]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (selectedSoc) params.set('soc', selectedSoc); else params.delete('soc');
        if (collection !== 'all') params.set('collection', collection); else params.delete('collection');
        if (wageLevel !== 'level1') params.set('level', wageLevel); else params.delete('level');
        if (personalSalary) params.set('salary', personalSalary.toString()); else params.delete('salary');

        let newUrl = window.location.pathname;
        const qStr = params.toString();
        if (qStr) newUrl += `?${qStr}`;
        if (window.location.hash) newUrl += window.location.hash;

        window.history.replaceState({}, '', newUrl);
    }, [selectedSoc, collection, wageLevel, personalSalary]);

    return (
        <div className="app-container">
            <Controls
                socs={socs}
                selectedSoc={selectedSoc}
                onSocChange={setSelectedSoc}
                collection={collection}
                onCollectionChange={setCollection}
                wageLevel={wageLevel}
                onWageLevelChange={setWageLevel}
                personalSalary={personalSalary}
                onPersonalSalaryChange={setPersonalSalary}
                hasActiveSelection={activeCountyData ? true : false}
                scale={wageData?.scale}
            />

            <div className="map-container">
                {loading && (
                    <div className="loading-shade">
                        <Loader2 className="spinner-icon" size={32} />
                    </div>
                )}

                <MapView
                    wageData={wageData}
                    activeLevel={wageLevel}
                    selectedFips={selectedFips}
                    onFipsSelect={setSelectedFips}
                    personalSalary={personalSalary}
                    meta={wageData?.meta}
                />

                {!selectedSoc && (
                    <div className="empty-state-panel">
                        <Search size={48} className="empty-state-icon" />
                        <h2>Search for an occupation to begin</h2>
                        <p>Select an industry collection and SOC code to see prevailing wages across the U.S.</p>
                    </div>
                )}

            </div>

            <div className="footer-note">
                Wages are defined by BLS statistical areas and may apply to multiple counties.
            </div>
        </div>
    );
};

export default App;
