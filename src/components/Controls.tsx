import React, { useState, useRef, useEffect } from 'react';
import { SocItem } from '../types';
import { Search, ChevronDown, ChevronUp, Check, X, Sun, Moon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ControlsProps {
    socs: SocItem[];
    selectedSoc: string | null;
    onSocChange: (soc: string) => void;
    collection: 'all' | 'ed';
    onCollectionChange: (c: 'all' | 'ed') => void;
    wageLevel: string;
    onWageLevelChange: (l: any) => void;
    personalSalary: number | null;
    onPersonalSalaryChange: (s: number | null) => void;
    hasActiveSelection: boolean;
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
}

const Controls: React.FC<ControlsProps> = ({
    socs,
    selectedSoc,
    onSocChange,
    collection,
    onCollectionChange,
    wageLevel,
    onWageLevelChange,
    personalSalary,
    onPersonalSalaryChange,
    hasActiveSelection,
    theme,
    onThemeToggle,
}) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredSocs = socs.filter(s =>
        s.soc.includes(search) || s.title.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

    const selectedSocItem = socs.find(s => s.soc === selectedSoc);

    // Auto-collapse logic: Collapse on mobile when a county is clicked
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        if (isMobile && hasActiveSelection) {
            setIsCollapsed(true);
        }
    }, [hasActiveSelection]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("overlay-panel controls-panel", isCollapsed && "controls-collapsed")}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : '0.5rem' }}>
                <h1 className="text-xl font-bold tracking-tight" style={{ margin: 0 }}>OFLC Wage Search</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                        className="text-muted hover:text-white transition-colors"
                        onClick={onThemeToggle}
                        title={theme === 'dark' ? "Switch to Day mode" : "Switch to Night mode"}
                        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        className="text-muted hover:text-white transition-colors"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand panel" : "Collapse panel"}
                        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {isCollapsed ? (
                selectedSocItem ? (
                    <div
                        className="search-input"
                        style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', marginTop: '0.75rem' }}
                        onClick={() => setIsCollapsed(false)}
                    >
                        <span className="search-input-text font-medium text-primary">
                            {selectedSocItem.soc} - {selectedSocItem.title}
                        </span>
                    </div>
                ) : null
            ) : (
                <>
                    <div className="input-group">
                        <label>Industry Collection</label>
                        <div className="segmented-control">
                            <button
                                className={cn("segment-btn", collection === 'all' && 'active')}
                                onClick={() => onCollectionChange('all')}
                            >
                                All Industries
                            </button>
                            <button
                                className={cn("segment-btn", collection === 'ed' && 'active')}
                                onClick={() => onCollectionChange('ed')}
                            >
                                ACWIA Higher Ed
                            </button>
                        </div>
                    </div>

                    <div className="input-group" ref={dropdownRef}>
                        <label>Occupation (SOC Code)</label>
                        <div style={{ position: 'relative' }}>
                            <div
                                className="search-input"
                                onClick={() => setIsOpen(!isOpen)}
                            >
                                <span className={cn("search-input-text", !selectedSoc && "empty")}>
                                    {selectedSocItem ? `${selectedSocItem.soc} - ${selectedSocItem.title}` : "Search SOC code..."}
                                </span>
                                <div className="search-actions">
                                    {selectedSocItem && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSocChange('');
                                                setSearch('');
                                            }}
                                            className="search-clear-btn"
                                            title="Clear Selection"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </div>
                            </div>

                            {isOpen && (
                                <div className="search-dropdown-menu">
                                    <div className="search-dropdown-header">
                                        <input
                                            autoFocus
                                            className="search-dropdown-input"
                                            placeholder="Type to filter..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="search-dropdown-list">
                                        {filteredSocs.map(s => (
                                            <div
                                                key={s.soc}
                                                className="search-dropdown-item"
                                                onClick={() => {
                                                    onSocChange(s.soc);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                            >
                                                <div className="content">
                                                    <div className="soc-code">{s.soc}</div>
                                                    <div className="soc-title">{s.title}</div>
                                                </div>
                                                {selectedSoc === s.soc && <Check size={16} className="selected-icon" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Wage Level (Annual Display)</label>
                        <div className="segmented-control">
                            {[
                                { id: 'level1', label: 'L1' },
                                { id: 'level2', label: 'L2' },
                                { id: 'level3', label: 'L3' },
                                { id: 'level4', label: 'L4' },
                                { id: 'average', label: 'Avg' },
                            ].map(lvl => (
                                <button
                                    key={lvl.id}
                                    className={cn("segment-btn", wageLevel === lvl.id && 'active')}
                                    onClick={() => onWageLevelChange(lvl.id)}
                                >
                                    {lvl.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Compare Personal Salary (Optional)</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>$</span>
                            <input
                                type="text"
                                className="search-input"
                                style={{ paddingLeft: '1.75rem', margin: 0 }}
                                placeholder="e.g. 120,000"
                                value={personalSalary ? personalSalary.toLocaleString() : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/,/g, '');
                                    if (val === '') {
                                        onPersonalSalaryChange(null);
                                    } else if (!isNaN(Number(val))) {
                                        onPersonalSalaryChange(Number(val));
                                    }
                                }}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Controls;
