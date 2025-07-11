
"use client";

import { useState, useEffect, useMemo } from 'react';
import { getAllDeeds } from '@/lib/idb';
import type { Deed } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { TagInput } from '@/components/ui/tag-input';

interface DeedListPanelProps {
  onSelectDeed: (id: string | null) => void;
  onNewDeed: () => void;
  selectedDeedId: string | null;
  dataVersion: number;
  filters: {
    searchTerm: string;
    tierFilter: string;
    tagFilter: string;
    sortBy: 'name' | 'tier';
    sortOrder: 'asc' | 'desc';
  };
  setFilters: {
    setSearchTerm: (value: string) => void;
    setTierFilter: (value: string) => void;
    setTagFilter: (value: string) => void;
    setSortBy: (value: 'name' | 'tier') => void;
    setSortOrder: (value: 'asc' | 'desc' | ((prev: 'asc' | 'desc') => 'asc' | 'desc')) => void;
  };
  onClearFilters: () => void;
}

export default function DeedListPanel({ 
  onSelectDeed, 
  onNewDeed, 
  selectedDeedId, 
  dataVersion,
  filters,
  setFilters,
  onClearFilters
}: DeedListPanelProps) {
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeeds = async () => {
      setIsLoading(true);
      try {
        const deedsData = await getAllDeeds();
        setDeeds(deedsData);
      } catch (error) {
        console.error("Error fetching deeds:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch deeds from database." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeeds();
  }, [dataVersion, toast]);
  
  const filteredAndSortedDeeds = useMemo(() => {
    let filtered = deeds.filter(deed => {
        const matchesSearch = deed.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
        const matchesTier = filters.tierFilter === 'all' || deed.tier === filters.tierFilter;
        
        let matchesTags = true;
        const tags = filters.tagFilter.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
        if (tags.length > 0) {
          matchesTags = deed.tags ? tags.every(tag => deed.tags!.some(dt => dt.toLowerCase().includes(tag))) : false;
        }

        return matchesSearch && matchesTier && matchesTags;
    });

    const tierOrder: Record<string, number> = { light: 1, heavy: 2, mighty: 3, tyrant: 4, special: 5 };
    const sorted = filtered.sort((a, b) => {
        if (filters.sortBy === 'tier') {
            const tierA = tierOrder[a.tier] || 0;
            const tierB = tierOrder[b.tier] || 0;
            const tierDiff = tierA - tierB;
            if (tierDiff !== 0) return tierDiff;
        }
        return a.name.localeCompare(b.name);
    });

    if (filters.sortOrder === 'desc') {
        sorted.reverse();
    }

    return sorted;
  }, [deeds, filters]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <Button onClick={onNewDeed} className="w-full">
          <PlusCircle /> New Deed
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deeds..."
            value={filters.searchTerm}
            onChange={(e) => setFilters.setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Filter</Label>
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-xs h-auto p-1">Clear</Button>
            </div>
            <Select value={filters.tierFilter} onValueChange={setFilters.setTierFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                    <SelectItem value="mighty">Mighty</SelectItem>
                    <SelectItem value="tyrant">Tyrant</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                </SelectContent>
            </Select>
            <TagInput
              value={filters.tagFilter ? filters.tagFilter.split(',').map(t => t.trim()).filter(Boolean) : []}
              onChange={(tags) => setFilters.setTagFilter(tags.join(','))}
              placeholder="Tags (e.g. fire, control)"
              tagSource="deed"
            />
        </div>
         <div>
            <Label>Sort by</Label>
            <div className="flex items-center gap-2">
              <Select value={filters.sortBy} onValueChange={(value: 'name' | 'tier') => setFilters.setSortBy(value)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="tier">Tier</SelectItem>
                  </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setFilters.setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}>
                  {filters.sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle sort order</span>
              </Button>
            </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center">Loading deeds...</p>
          ) : filteredAndSortedDeeds.length > 0 ? (
            <ul className="space-y-1">
              {filteredAndSortedDeeds.map(deed => (
                <li key={deed.id}>
                  <button
                    onClick={() => onSelectDeed(deed.id)}
                    className={`w-full text-left p-2 rounded-md transition-colors ${selectedDeedId === deed.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'}`}
                  >
                    {deed.name} <span className="text-xs opacity-70">({deed.tier})</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center">No deeds found.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
