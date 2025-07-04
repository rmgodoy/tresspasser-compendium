

"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { EncounterTable, Creature } from "@/lib/types";
import { getAllCreatures, addEncounterTable, getEncounterTableById, updateEncounterTable, deleteEncounterTable, addTags } from "@/lib/idb";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Edit, Tag, X, ArrowLeft, Plus } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { TagInput } from "./ui/tag-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";

const getExpectedQuantity = (quantityStr: string): number => {
  if (!quantityStr) return 1;
  const q = quantityStr.toLowerCase().trim();

  const diceMatch = q.match(/(\d*)d(\d+)/);
  if (diceMatch) {
    const numDice = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
    const dieSize = parseInt(diceMatch[2], 10);
    if (!isNaN(numDice) && !isNaN(dieSize) && dieSize > 0) {
      return numDice * Math.floor(dieSize / 2);
    }
  }

  const fixedQty = parseInt(q, 10);
  if (!isNaN(fixedQty)) {
    return fixedQty;
  }
  
  return 1;
};

const encounterTableEntrySchema = z.object({
  id: z.string(),
  creatureId: z.string().min(1, "Creature is required"),
  quantity: z.string().min(1, "Quantity is required (e.g., '3' or 'd6')"),
  weight: z.coerce.number().min(1, "Weight must be at least 1"),
});

const encounterTableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  totalTR: z.coerce.number().optional(),
  entries: z.array(encounterTableEntrySchema).min(1, "At least one entry is required"),
});

type EncounterTableFormData = z.infer<typeof encounterTableSchema>;

const CreatureSelectionDialog = ({ onAddCreature, existingCreatureIds }: { onAddCreature: (creature: Creature) => void, existingCreatureIds: Set<string> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allCreatures, setAllCreatures] = useState<Creature[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      getAllCreatures().then(setAllCreatures);
    }
  }, [isOpen]);

  const filteredCreatures = useMemo(() => {
    return allCreatures.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !existingCreatureIds.has(c.id)
    );
  }, [allCreatures, searchTerm, existingCreatureIds]);

  const handleAddClick = (creature: Creature) => {
    onAddCreature(creature);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Creature</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Creature</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search creatures..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="mb-4 shrink-0"
        />
        <ScrollArea className="flex-1 border rounded-md p-2">
          <div className="space-y-1">
            {filteredCreatures.map(creature => (
              <Button 
                key={creature.id} 
                variant="ghost" 
                className="w-full justify-start h-auto py-2"
                onClick={() => handleAddClick(creature)}
              >
                <div>
                  <p className="font-semibold">{creature.name}</p>
                  <p className="text-xs text-muted-foreground text-left">Lvl {creature.level} {creature.role} (TR {creature.TR})</p>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

interface EncounterTableEditorPanelProps {
  tableId: string | null;
  isCreatingNew: boolean;
  onSaveSuccess: (id: string) => void;
  onDeleteSuccess: () => void;
  onEditCancel: () => void;
  onBack?: () => void;
  dataVersion: number;
  onFilterByClick: (updates: Partial<{ minTR: number; maxTR: number; tagFilter: string }>, e: React.MouseEvent) => void;
}

const defaultValues: EncounterTableFormData = {
  name: "",
  description: "",
  location: "",
  tags: [],
  totalTR: 0,
  entries: [],
};

export default function EncounterTableEditorPanel({ tableId, isCreatingNew, onSaveSuccess, onDeleteSuccess, onEditCancel, onBack, dataVersion, onFilterByClick }: EncounterTableEditorPanelProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(isCreatingNew);
  const [loading, setLoading] = useState(!isCreatingNew && !!tableId);
  const [tableData, setTableData] = useState<EncounterTable | null>(null);
  const [allCreatures, setAllCreatures] = useState<Creature[]>([]);
  const creatureMap = useMemo(() => new Map(allCreatures.map(c => [c.id, c])), [allCreatures]);
  const isMobile = useIsMobile();

  const form = useForm<EncounterTableFormData>({
    resolver: zodResolver(encounterTableSchema),
    defaultValues,
  });

  const { control, watch, setValue } = form;
  const { fields: entryFields, append: appendEntry, remove: removeEntry } = useFieldArray({ control, name: "entries" });
  const watchedEntriesString = JSON.stringify(watch("entries"));

  useEffect(() => {
    getAllCreatures().then(setAllCreatures);
  }, []);

  useEffect(() => {
    const currentEntries = JSON.parse(watchedEntriesString);
    
    if (!currentEntries || currentEntries.length === 0 || creatureMap.size === 0) {
      if (form.getValues('totalTR') !== 0) setValue('totalTR', 0);
      return;
    };

    const totalWeight = currentEntries.reduce((sum: number, entry: any) => sum + (Number(entry.weight) || 0), 0);

    if (totalWeight === 0) {
        if (form.getValues('totalTR') !== 0) setValue('totalTR', 0);
        return;
    }

    const weightedTRSum = currentEntries.reduce((sum: number, entry: any) => {
        const creature = creatureMap.get(entry.creatureId);
        const expectedQuantity = getExpectedQuantity(entry.quantity || '1');
        const weight = Number(entry.weight) || 0;
        return sum + ((creature?.TR || 0) * expectedQuantity * weight);
    }, 0);
    
    const newTR = Math.floor(weightedTRSum / totalWeight);

    if (form.getValues('totalTR') !== newTR) {
        setValue('totalTR', newTR, { shouldValidate: false });
    }
  }, [watchedEntriesString, creatureMap, form, setValue]);

  useEffect(() => {
    const fetchTableData = async () => {
      if (isCreatingNew) {
        form.reset(defaultValues);
        setTableData(null);
        setIsEditing(true);
        setLoading(false);
        return;
      }
      
      if (!tableId) {
        setIsEditing(false);
        setLoading(false);
        setTableData(null);
        return;
      }

      setLoading(true);
      setIsEditing(false);
      try {
        const tableFromDb = await getEncounterTableById(tableId);
        if (tableFromDb) {
          form.reset(tableFromDb);
          setTableData(tableFromDb);
        } else {
          setTableData(null);
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not load table data." });
      } finally {
        setLoading(false);
      }
    };
    fetchTableData();
  }, [tableId, isCreatingNew, form, toast, dataVersion]);
  
  const handleCancel = () => {
    if (isCreatingNew) {
        onEditCancel();
    } else if (tableData) {
        form.reset(tableData);
        setIsEditing(false);
    }
  };

  const onSubmit = async (data: EncounterTableFormData) => {
    try {
      const tableToSave = { ...data, totalTR: data.totalTR || 0, tags: data.tags || [] };
      const tagsToSave = data.tags || [];
      if (tagsToSave.length > 0) {
        await addTags(tagsToSave, 'encounterTable');
      }
      
      let savedId: string;
      if (isCreatingNew) {
        savedId = await addEncounterTable(tableToSave);
        toast({ title: "Table Created!", description: `${data.name} has been saved.` });
      } else if (tableId) {
        savedId = tableId;
        await updateEncounterTable({ ...tableToSave, id: tableId });
        toast({ title: "Save Successful", description: `${data.name} has been updated.` });
      } else {
        return; 
      }
      onSaveSuccess(savedId);
      setIsEditing(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: `Could not save changes.` });
    }
  };

  const handleDelete = async () => {
    if (!tableId) return;
    try {
      await deleteEncounterTable(tableId);
      toast({ title: "Table Deleted", description: "The encounter table has been removed." });
      onDeleteSuccess();
    } catch (error) {
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the table." });
    }
  };
  
  const addEntry = (creature: Creature) => {
    appendEntry({
      id: crypto.randomUUID(),
      creatureId: creature.id,
      quantity: 'd6',
      weight: 10,
    });
  };
  const existingCreatureIds = useMemo(() => new Set(entryFields.map(field => field.creatureId)), [entryFields]);

  if (loading) return <div className="w-full max-w-5xl mx-auto"><Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card></div>;
  
  if (!tableId && !isCreatingNew) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <Card className="h-full flex items-center justify-center min-h-[300px]">
          <CardContent className="text-center pt-6">
              <p className="text-xl text-muted-foreground">Select a table to view</p>
              <p className="text-muted-foreground">or create a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEditing && tableData) {
    const totalWeight = tableData.entries.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0);
    return (
        <div className="w-full max-w-5xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex flex-row items-start justify-between">
                        <div className="flex items-center gap-2">
                             {isMobile && onBack && (
                                <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2 -mt-1">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <div>
                                <CardTitle className="text-3xl font-bold">{tableData.name}</CardTitle>
                                <CardDescription className="flex flex-col sm:flex-row sm:gap-4">
                                    <button onClick={(e) => onFilterByClick({ minTR: tableData.totalTR, maxTR: tableData.totalTR }, e)} className="hover:underline p-0 bg-transparent text-inherit text-sm">
                                      TR {tableData.totalTR}
                                    </button>
                                    {tableData.location && <span>Location: {tableData.location}</span>}
                                </CardDescription>
                            </div>
                        </div>
                         <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4"/>
                            <span className="hidden sm:inline ml-2">Edit</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {tableData.description && <div>
                          <h3 className="text-lg font-semibold text-primary-foreground mb-2">Description</h3>
                          <p className="text-foreground/80 whitespace-pre-wrap">{tableData.description}</p>
                        </div>}
                        <Separator/>
                         <div>
                          <h3 className="text-lg font-semibold text-primary-foreground mb-2">Table Entries</h3>
                            <div className="space-y-3">
                                {tableData.entries.map(entry => {
                                  const creature = creatureMap.get(entry.creatureId);
                                  const percentage = totalWeight > 0 ? ((entry.weight / totalWeight) * 100).toFixed(1) : '0.0';
                                  return (
                                    <div key={entry.id} className="grid grid-cols-4 items-center gap-4 p-2 bg-card-foreground/5 rounded-md">
                                        <p className="font-semibold">{creature?.name || 'Unknown'}</p>
                                        <p className="text-center">x {entry.quantity}</p>
                                        <p className="text-center">Weight: {entry.weight}</p>
                                        <p className="text-center text-muted-foreground">{percentage}%</p>
                                    </div>
                                  )
                                })}
                            </div>
                        </div>
                        {tableData.tags && tableData.tags.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/50">
                                <div className="flex flex-wrap gap-2">
                                    {tableData.tags.map(tag => (
                                        <button key={tag} onClick={(e) => onFilterByClick({ tagFilter: tag }, e)} className="bg-transparent border-none p-0 m-0">
                                          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">{tag}</Badge>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                     <AlertDialog>
                      <AlertDialogTrigger asChild><Button type="button" variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{tableData.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
  }
  
  const watchedEntries = JSON.parse(watchedEntriesString);
  const totalWeight = watchedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.weight) || 0), 0);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardHeader>
              <div className="flex flex-row justify-between items-start">
                  <div className="flex items-center gap-2">
                    {isMobile && onBack && (
                        <Button type="button" variant="ghost" size="icon" onClick={onEditCancel} className="shrink-0 -ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div>
                      <CardTitle>{isCreatingNew ? (isMobile ? "New Table" : "Create New Encounter Table") : `Editing: ${form.getValues("name") || "..."}`}</CardTitle>
                    </div>
                  </div>
                  {!isMobile && (
                    <Button type="button" variant="ghost" size="icon" onClick={handleCancel} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></Button>
                  )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Table Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="location" control={form.control} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="totalTR" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Average TR</FormLabel>
                      <FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>)} />
              <FormField
                name="tags"
                control={form.control}
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-2"><Tag className="h-4 w-4 text-accent" />Tags</FormLabel>
                    <FormControl>
                        <TagInput 
                            value={field.value || []} 
                            onChange={field.onChange} 
                            placeholder="Add tags..." 
                            tagSource="encounterTable"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-primary-foreground">Table Entries</h3>
                  <CreatureSelectionDialog onAddCreature={addEntry} existingCreatureIds={existingCreatureIds} />
                </div>
                <div className="space-y-3">
                  {entryFields.map((field, index) => {
                    const creature = creatureMap.get(field.creatureId);
                    const currentWeight = Number(watchedEntries[index]?.weight) || 0;
                    const percentage = totalWeight > 0 ? ((currentWeight / totalWeight) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={field.id} className="grid grid-cols-2 md:grid-cols-5 items-end gap-3 p-3 border rounded-lg bg-card-foreground/5">
                        <div className="col-span-2 md:col-span-1">
                          <Label>Creature</Label>
                          <p className="font-semibold truncate" title={creature?.name}>{creature?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">Lvl {creature?.level} (TR {creature?.TR})</p>
                        </div>
                        <FormField name={`entries.${index}.quantity`} control={form.control} render={({ field: quantityField }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl><Input placeholder="e.g., 3 or d8" {...quantityField} /></FormControl>
                          </FormItem>
                        )}/>
                        <FormField name={`entries.${index}.weight`} control={form.control} render={({ field: weightField }) => (
                          <FormItem>
                            <FormLabel>Weight</FormLabel>
                            <FormControl><Input type="number" min="1" {...weightField} value={weightField.value ?? ''} /></FormControl>
                          </FormItem>
                        )}/>
                        <div>
                           <Label>Chance</Label>
                           <p className="font-semibold text-muted-foreground h-10 flex items-center">{percentage}%</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)} className="text-muted-foreground hover:text-destructive place-self-end md:place-self-auto"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )
                  })}
                  {entryFields.length === 0 && <p className="text-muted-foreground text-center text-sm py-4">No creatures added to this table.</p>}
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex items-center gap-2">
              {!isCreatingNew && (<AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{form.getValues("name")}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
              <div className="flex-grow" />
              {!isMobile && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
              <Button type="submit">{isCreatingNew ? "Create Table" : "Save Changes"}</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
