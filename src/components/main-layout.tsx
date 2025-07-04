

'use client';

import Link from 'next/link';
import { Skull, Menu, Upload, Download, BookCopy, Dices, FlaskConical, Square, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useMemo, useRef, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { importData, exportAllData } from '@/lib/idb';


export default function MainLayout({ children, showSidebarTrigger = true }: { children: React.ReactNode, showSidebarTrigger?: boolean }) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const dataToExport = await exportAllData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "tresspasser_bestiary.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "Your data has been downloaded." });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not export the data." });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error("File content could not be read as text.");
        }
        const importedData = JSON.parse(content);
        
        await importData(importedData);
        
        toast({ title: "Import Successful", description: "Data has been overwritten. The application will now reload." });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (error: any) {
        console.error("Import failed:", error);
        toast({ variant: "destructive", title: "Import Failed", description: error.message || "Please check the file format and content." });
      } finally {
        if(fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };
  
  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/random/encounter-tables')) return 'Encounter Tables';
    if (pathname.startsWith('/random/treasures')) return 'Treasures';
    if (pathname.startsWith('/random/commoners')) return 'Commoners';
    if (pathname.startsWith('/alchemy')) return 'Alchemy';
    if (pathname.startsWith('/rooms')) return 'Rooms';
    if (pathname.startsWith('/dungeons')) return 'Dungeons';
    switch (pathname) {
      case '/':
        return 'Bestiary';
      case '/deeds':
        return 'Deeds';
      case '/encounters':
        return 'Encounters';
      default:
        return 'Bestiary';
    }
  }, [pathname]);

  const navLinks = [
    { href: '/alchemy', label: 'Alchemy', group: 'Compendium' },
    { href: '/deeds', label: 'Creature Deeds', group: 'Compendium' },
    { href: '/', label: 'Bestiary', group: 'Compendium' },
    { href: '/rooms', label: 'Rooms', group: 'Compendium' },
    { href: '/dungeons', label: 'Dungeons', group: 'Compendium' },
    { href: '/random/encounter-tables', label: 'Encounter Tables', group: 'Random' },
    { href: '/random/treasures', label: 'Treasures', group: 'Random' },
    { href: '/random/commoners', label: 'Commoners', group: 'Random' },
    { href: '/encounters', label: 'Encounters' },
  ];

  const compendiumLinks = navLinks.filter(link => link.group === 'Compendium');
  const randomLinks = navLinks.filter(link => link.group === 'Random');
  const otherLinks = navLinks.filter(link => !link.group);

  const desktopNav = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">Compendium</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {compendiumLinks.map(link => (
            <Link href={link.href} key={link.href} passHref>
              <DropdownMenuItem>{link.label}</DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">Random</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {randomLinks.map(link => (
            <Link href={link.href} key={link.href} passHref>
              <DropdownMenuItem>{link.label}</DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {otherLinks.map(link => (
        <Link href={link.href} key={link.href} passHref>
          <Button variant={pathname === link.href ? 'secondary' : 'ghost'}>
            {link.label}
          </Button>
        </Link>
      ))}
    </>
  );

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <p className="font-bold text-lg">Compendium</p>
          {compendiumLinks.map(link => (
            <Link href={link.href} key={link.href} passHref>
              <Button variant={pathname === link.href ? 'secondary' : 'ghost'} className="w-full justify-start">{link.label}</Button>
            </Link>
          ))}
          <Separator className="my-2" />
           <p className="font-bold text-lg">Random</p>
          {randomLinks.map(link => (
            <Link href={link.href} key={link.href} passHref>
              <Button variant={pathname === link.href ? 'secondary' : 'ghost'} className="w-full justify-start">{link.label}</Button>
            </Link>
          ))}
          <Separator className="my-2" />
          {otherLinks.map(link => (
            <Link href={link.href} key={link.href} passHref>
              <Button variant={pathname === link.href ? 'secondary' : 'ghost'} className="w-full justify-start">{link.label}</Button>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex flex-col h-screen" style={{'width': '100%'}}>
      <header className="py-4 px-6 md:px-8 border-b border-border flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {(pathname.startsWith('/dungeons') || pathname === '/' || pathname === '/deeds' || pathname === '/encounters' || pathname.startsWith('/random') || pathname.startsWith('/alchemy') || pathname.startsWith('/rooms')) && showSidebarTrigger && <SidebarTrigger />}
          <Link href="/" className="flex items-center gap-3">
            <Skull className="text-primary h-8 w-8" />
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary-foreground whitespace-nowrap">
                <span className="hidden sm:inline">Tresspasser </span>
                {pageTitle}
            </h1>
          </Link>
          <Separator orientation="vertical" className="h-6 mx-2 hidden md:block" />
          <nav className="hidden md:flex items-center gap-1">
            {desktopNav}
          </nav>
        </div>
        <div className="flex items-center gap-1">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
            />
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Import Data">
                        <Upload className="h-5 w-5" />
                        <span className="sr-only">Import Data</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Import Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will overwrite all existing creatures, deeds, and encounters with the data from the selected JSON file. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                        Proceed
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" onClick={handleExport} title="Export Data">
                <Download className="h-5 w-5" />
                <span className="sr-only">Export Data</span>
            </Button>
          <div className="md:hidden">
            {mobileNav}
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
