
'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { pixelToHex, hexToPixel, getHexCorner, getHexNeighbors, type Hex } from '@/lib/hex-utils';
import type { HexTile, Map } from '@/lib/types';
import { cn } from '@/lib/utils';

const drawIcon = (ctx: CanvasRenderingContext2D, center: { x: number; y: number }, icon: string, size: number, foregroundColor: string) => {
    const iconSize = size * 0.9;
    const scale = iconSize / 24; // Lucide icons are in a 24x24 viewbox.
    const { x, y } = center;

    ctx.save();
    ctx.translate(x - iconSize / 2, y - iconSize / 2);
    ctx.scale(scale, scale);
    ctx.strokeStyle = foregroundColor;
    ctx.lineWidth = 1.5 / scale; // Keep stroke width consistent

    type IconData = string[] | { paths: string[]; circles: { cx: number; cy: number; r: number }[] };
    let iconData: IconData = [];

    switch (icon) {
        case 'Home':
            iconData = ["m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"];
            break;
        case 'Trees':
            iconData = ["M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z", "M7 16v6", "M13 19v3", "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"];
            break;
        case 'Mountain':
            iconData = ["m8 3 4 8 5-5 5 15H2L8 3z"];
            break;
        case 'Castle':
             iconData = ["M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z", "M18 11V4H6v7", "M15 22v-4a3 3 0 0 0-3-3a3 3 0 0 0-3 3v4", "M22 11V9", "M2 11V9", "M6 4V2", "M18 4V2", "M10 4V2", "M14 4V2"];
            break;
        case 'TowerControl':
            iconData = ["M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z","M8 13v9","M16 22v-9","m9 6 1 7","m15 6-1 7","M12 6V2","M13 2h-2"];
            break;
        case 'Tent':
            iconData = ["M3.5 21 14 3","M20.5 21 10 3","M15.5 21 12 15l-3.5 6","M2 21h20"];
            break;
        case 'Waves':
            iconData = ["M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1", "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1", "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"];
            break;
        case 'MapPin':
            iconData = ["M12 17v5", "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1 1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"];
            break;
        case 'Landmark':
            iconData = ["M10 18v-7", "M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z", "M14 18v-7", "M18 18v-7", "M3 22h18", "M6 18v-7"];
            break;
        case 'Skull':
            iconData = {
                paths: ["m12.5 17-.5-1-.5 1h1z", "M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"],
                circles: [{cx: 15, cy: 12, r: 1}, {cx: 9, cy: 12, r: 1}]
            };
            break;
    }
    
    if (Array.isArray(iconData)) {
        iconData.forEach(pathData => {
            const path = new Path2D(pathData);
            ctx.stroke(path);
        });
    } else { // Handles complex icons with paths and circles
        iconData.paths.forEach(pathData => {
            const path = new Path2D(pathData);
            ctx.stroke(path);
        });
        iconData.circles.forEach(circle => {
            ctx.beginPath();
            ctx.arc(circle.cx, circle.cy, circle.r, 0, 2 * Math.PI);
            ctx.fillStyle = foregroundColor;
            ctx.fill();
        });
    }

    ctx.restore();
};

interface HexGridProps {
  mapData: Map;
  hexSize?: number;
  className?: string;
  style?: React.CSSProperties;
  onGridUpdate: (grid: HexTile[]) => void;
  onHexClick: (hex: Hex | null) => void;
  onAddPointToPath: (point: { x: number, y: number }) => void;
  activeTool: 'settings' | 'paint' | 'path' | 'data';
  paintMode: 'brush' | 'bucket' | 'erase';
  paintColor: string;
  paintIcon: string | null;
  paintIconColor: string;
  selectedHex: Hex | null;
  isCtrlPressed: boolean;
  isAltPressed: boolean;
  isShiftPressed: boolean;
  isEyedropperActive: boolean;
  onEyedropperClick: (hex: Hex) => void;
  pathDrawingId: string | null;
}

const HexGrid: React.FC<HexGridProps> = ({ 
    mapData,
    hexSize = 25, 
    className, 
    style,
    onGridUpdate, 
    onHexClick,
    onAddPointToPath, 
    activeTool, 
    paintMode, 
    paintColor, 
    paintIcon, 
    paintIconColor, 
    selectedHex, 
    isCtrlPressed, 
    isAltPressed,
    isShiftPressed,
    isEyedropperActive, 
    onEyedropperClick,
    pathDrawingId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasSimpleRef = useRef<HTMLCanvasElement | null>(null);
  
  const [themeColors, setThemeColors] = useState({
    background: '#1A0024',
    border: '#4B0082',
    accent: '#8A2BE2',
    foreground: '#E0D6F0',
  });

  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const viewRef = useRef(view);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  
  const [isPainting, setIsPainting] = useState(false);
  const [lastPaintedHex, setLastPaintedHex] = useState<Hex | null>(null);

  const gridMap = useMemo(() => new Map(mapData.tiles.map(tile => [`${tile.hex.q},${tile.hex.r}`, tile])), [mapData.tiles]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement);
      setThemeColors({ 
        background: `hsl(${computedStyle.getPropertyValue('--background').trim()})`,
        border: `hsl(${computedStyle.getPropertyValue('--border').trim()})`,
        accent: `hsl(${computedStyle.getPropertyValue('--accent').trim()})`,
        foreground: `hsl(${computedStyle.getPropertyValue('--foreground').trim()})` 
      });
    }
  }, []);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const getWorldCoordinates = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const currentView = viewRef.current;
    const rect = canvas.getBoundingClientRect();

    const worldX = (canvasX - (rect.width / 2 + currentView.x)) / currentView.zoom;
    const worldY = (canvasY - (rect.height / 2 + currentView.y)) / currentView.zoom;

    return { x: worldX, y: worldY };
  }, []);

  const getHexFromCanvasCoordinates = useCallback((canvasX: number, canvasY: number): Hex | null => {
      const {x, y} = getWorldCoordinates(canvasX, canvasY);
      return pixelToHex(x, y, hexSize);
  }, [hexSize, getWorldCoordinates]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentView = viewRef.current;

    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    ctx.fillStyle = themeColors.background;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(width / 2 + currentView.x, height / 2 + currentView.y);
    ctx.scale(currentView.zoom, currentView.zoom);
    
    const LOD_THRESHOLD = 0.4;
    const canvasToDraw = currentView.zoom > LOD_THRESHOLD ? offscreenCanvasRef.current : offscreenCanvasSimpleRef.current;
    
    if (canvasToDraw && canvasToDraw.width > 0 && canvasToDraw.height > 0) {
        const worldWidth = canvasToDraw.width;
        const worldHeight = canvasToDraw.height;
        ctx.drawImage(canvasToDraw, -worldWidth / 2, -worldHeight / 2);
    }
    
    // Draw paths
    if (mapData.paths && mapData.paths.length > 0) {
        mapData.paths.forEach(path => {
            if (path.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.strokeWidth / currentView.zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        });
    }

    // Draw points for the currently drawing path
    if (pathDrawingId) {
      const activePath = mapData.paths.find(p => p.id === pathDrawingId);
      if (activePath && activePath.points.length > 0) {
        activePath.points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 / currentView.zoom, 0, 2 * Math.PI);
          ctx.fillStyle = activePath.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1 / currentView.zoom;
          ctx.stroke();
        });
      }
    }

    if (selectedHex) {
        const center = hexToPixel(selectedHex, hexSize);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const corner = getHexCorner(center, hexSize, i);
            if (i === 0) ctx.moveTo(corner.x, corner.y); else ctx.lineTo(corner.x, corner.y);
        }
        ctx.closePath();
        ctx.strokeStyle = themeColors.accent;
        ctx.lineWidth = 3 / currentView.zoom;
        ctx.stroke();
    }
    
    ctx.restore();

  }, [hexSize, themeColors, selectedHex, mapData.paths, pathDrawingId]);

  useEffect(() => {
      if (!mapData.tiles.length || !canvasRef.current) return;
      
      let worldPixelWidth, worldPixelHeight;
      let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
      
      mapData.tiles.forEach(({ hex }) => {
        minQ = Math.min(minQ, hex.q);
        maxQ = Math.max(maxQ, hex.q);
        minR = Math.min(minR, hex.r);
        maxR = Math.max(maxR, hex.r);
      });
      if (!isFinite(minQ)) return;

      const qRange = maxQ - minQ + 1;
      const rRange = maxR - minR + 1;
      
      if (mapData.shape === 'rectangular') {
          worldPixelWidth = (qRange * 1.5 + 2) * hexSize;
          worldPixelHeight = (rRange + qRange / 2) * Math.sqrt(3) * hexSize;
      } else { // radial
          worldPixelWidth = (qRange * 1.5 + 0.5) * hexSize;
          worldPixelHeight = (rRange + qRange/2 + 0.5) * hexSize * Math.sqrt(3);
      }

      if (worldPixelWidth <= 0 || worldPixelHeight <= 0) return;

      if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement('canvas');
      const offscreenCanvas = offscreenCanvasRef.current;
      offscreenCanvas.width = worldPixelWidth;
      offscreenCanvas.height = worldPixelHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');

      if (!offscreenCanvasSimpleRef.current) offscreenCanvasSimpleRef.current = document.createElement('canvas');
      const offscreenSimpleCanvas = offscreenCanvasSimpleRef.current;
      offscreenSimpleCanvas.width = worldPixelWidth;
      offscreenSimpleCanvas.height = worldPixelHeight;
      const offscreenSimpleCtx = offscreenSimpleCanvas.getContext('2d');
      
      if (!offscreenCtx || !offscreenSimpleCtx) return;

      offscreenCtx.clearRect(0, 0, worldPixelWidth, worldPixelHeight);
      offscreenSimpleCtx.clearRect(0, 0, worldPixelWidth, worldPixelHeight);
      
      offscreenCtx.translate(worldPixelWidth / 2, worldPixelHeight / 2);
      offscreenSimpleCtx.translate(worldPixelWidth / 2, worldPixelHeight / 2);

      const detailedColorMap = new Map<string, Path2D>();
      const simpleColorMap = new Map<string, Path2D>();
      const iconsToDraw: { center: {x:number, y:number}, icon: string, iconColor: string }[] = [];
      const allHexPaths = new Path2D();

      mapData.tiles.forEach(tile => {
          const { hex, data } = tile;
          const center = hexToPixel(hex, hexSize);
          const hexPath = new Path2D();
          for (let i = 0; i < 6; i++) {
              const corner = getHexCorner(center, hexSize, i);
              if (i === 0) hexPath.moveTo(corner.x, corner.y); else hexPath.lineTo(corner.x, corner.y);
          }
          hexPath.closePath();
          allHexPaths.addPath(hexPath);

          const detailedColor = data.color || themeColors.background;
          if (!detailedColorMap.has(detailedColor)) detailedColorMap.set(detailedColor, new Path2D());
          detailedColorMap.get(detailedColor)!.addPath(hexPath);

          if (data.icon) {
              iconsToDraw.push({ center, icon: data.icon, iconColor: data.iconColor || themeColors.foreground });
          }

          const simpleColor = data.color || themeColors.background;
          if (!simpleColorMap.has(simpleColor)) simpleColorMap.set(simpleColor, new Path2D());
          simpleColorMap.get(simpleColor)!.addPath(hexPath);
      });

      detailedColorMap.forEach((path, color) => {
          offscreenCtx.fillStyle = color;
          offscreenCtx.fill(path);
      });
      offscreenCtx.strokeStyle = themeColors.border;
      offscreenCtx.lineWidth = 1;
      offscreenCtx.stroke(allHexPaths);
      iconsToDraw.forEach(({ center, icon, iconColor }) => {
          drawIcon(offscreenCtx, center, icon, hexSize, iconColor);
      });

      simpleColorMap.forEach((path, color) => {
          offscreenSimpleCtx.fillStyle = color;
          offscreenSimpleCtx.fill(path);
      });

      draw();
  }, [mapData.tiles, mapData.shape, mapData.width, mapData.height, hexSize, themeColors, draw]);

  useEffect(() => {
    draw();
  }, [view, draw, mapData.paths, pathDrawingId]);

  const bucketFill = useCallback((startHex: Hex) => {
    const startTile = gridMap.get(`${startHex.q},${startHex.r}`);
    if (!startTile) return;

    const originalColor = startTile.data.color;
    const originalIcon = startTile.data.icon;

    if (originalColor === paintColor && originalIcon === paintIcon) return;

    const tilesToPaint = new Set<string>();
    const queue: Hex[] = [startHex];
    const visited = new Set<string>([`${startHex.q},${startHex.r}`]);
    
    tilesToPaint.add(`${startHex.q},${startHex.r}`);

    while (queue.length > 0) {
        const currentHex = queue.shift()!;
        const neighbors = getHexNeighbors(currentHex);

        for (const neighborHex of neighbors) {
            const neighborKey = `${neighborHex.q},${neighborHex.r}`;
            if (!visited.has(neighborKey)) {
                visited.add(neighborKey);
                const neighborTile = gridMap.get(neighborKey);

                if (neighborTile && neighborTile.data.color === originalColor && neighborTile.data.icon === originalIcon) {
                    tilesToPaint.add(neighborKey);
                    queue.push(neighborHex);
                }
            }
        }
    }

    if (tilesToPaint.size > 0) {
        const newGrid = mapData.tiles.map(tile => {
            if (tilesToPaint.has(`${tile.hex.q},${tile.hex.r}`)) {
                return { ...tile, data: { ...tile.data, color: paintColor, icon: paintIcon, iconColor: paintIconColor } };
            }
            return tile;
        });
        onGridUpdate(newGrid);
    }
  }, [mapData.tiles, gridMap, paintColor, paintIcon, paintIconColor, onGridUpdate]);
  
  const paintTile = useCallback((hex: Hex, currentPaintMode: 'brush' | 'bucket' | 'erase') => {
    const newGrid = mapData.tiles.map(tile => {
        if (tile.hex.q === hex.q && tile.hex.r === hex.r) {
            if (currentPaintMode === 'erase') {
                return { ...tile, data: { ...tile.data, color: undefined, icon: undefined, iconColor: undefined } };
            }
            return { ...tile, data: { ...tile.data, color: paintColor, icon: paintIcon, iconColor: paintIconColor } };
        }
        return tile;
    });
    onGridUpdate(newGrid);
  }, [mapData.tiles, paintColor, paintIcon, paintIconColor, onGridUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);

    if (e.button === 2 || e.button === 1) { // Right or Middle click for panning
      setIsPanning(true);
      lastPanPointRef.current = { x, y };
      return;
    }

    if (activeTool === 'path' && pathDrawingId) {
        const worldPos = getWorldCoordinates(x, y);
        onAddPointToPath(worldPos);
        return;
    }
    
    const clickedHex = getHexFromCanvasCoordinates(x, y);
    if (!clickedHex) return;
    
    if (isEyedropperActive || (isAltPressed && activeTool === 'paint' && paintMode === 'brush')) {
        onEyedropperClick(clickedHex);
        return;
    }

    if (activeTool === 'paint') {
      const isTempBucketMode = paintMode === 'brush' && isCtrlPressed;
      const isTempEraseMode = paintMode === 'brush' && isShiftPressed;

      if (isTempBucketMode || paintMode === 'bucket') {
        bucketFill(clickedHex);
      } else if (isTempEraseMode || paintMode === 'brush' || paintMode === 'erase') {
        setIsPainting(true);
        const currentPaintMode = isTempEraseMode ? 'erase' : paintMode;
        paintTile(clickedHex, currentPaintMode);
        setLastPaintedHex(clickedHex);
      }
    } else {
      onHexClick(clickedHex);
    }
  }, [getCanvasCoordinates, getHexFromCanvasCoordinates, onHexClick, paintMode, paintTile, bucketFill, activeTool, isCtrlPressed, isAltPressed, isShiftPressed, isEyedropperActive, onEyedropperClick, pathDrawingId, onAddPointToPath, getWorldCoordinates]);

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { setIsPainting(false); setLastPaintedHex(null); }
    if (e.button === 2 || e.button === 1) {
      if (isPanning) {
        setIsPanning(false);
        setView({...viewRef.current});
      }
    }
  };
  
  const handleMouseLeave = () => {
    if (isPanning) {
        setIsPanning(false);
        setView({...viewRef.current});
    }
    setIsPainting(false); 
    setLastPaintedHex(null); 
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (isPanning) {
        const dx = x - lastPanPointRef.current.x;
        const dy = y - lastPanPointRef.current.y;
        lastPanPointRef.current = { x, y };
        viewRef.current.x += dx;
        viewRef.current.y += dy;
        requestAnimationFrame(draw);
        return;
    }
    
    if (isPainting && activeTool === 'paint') {
        const currentHex = getHexFromCanvasCoordinates(x, y);
        if (currentHex) {
            if (!lastPaintedHex || (currentHex.q !== lastPaintedHex.q || currentHex.r !== lastPaintedHex.r)) {
                const currentPaintMode = isShiftPressed ? 'erase' : paintMode;
                paintTile(currentHex, currentPaintMode);
                setLastPaintedHex(currentHex);
            }
        }
    }
  }, [isPanning, getCanvasCoordinates, paintMode, isPainting, paintTile, activeTool, draw, lastPaintedHex, isShiftPressed, getHexFromCanvasCoordinates]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const currentView = viewRef.current;
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? currentView.zoom * zoomFactor : currentView.zoom / zoomFactor;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - (rect.width / 2 + currentView.x)) / currentView.zoom;
    const worldY = (mouseY - (rect.height / 2 + currentView.y)) / currentView.zoom;
    
    const newX = mouseX - worldX * newZoom - rect.width / 2;
    const newY = mouseY - worldY * newZoom - rect.height / 2;
    
    const finalZoom = Math.max(0.1, Math.min(5, newZoom));

    viewRef.current = { x: newX, y: newY, zoom: finalZoom };
    setView({ x: newX, y: newY, zoom: finalZoom });
  };
  
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touches = e.touches;
    const {x, y} = getCanvasCoordinates(e);

    if (touches.length === 1) {
      if (activeTool === 'path' && pathDrawingId) {
          const worldPos = getWorldCoordinates(x, y);
          onAddPointToPath(worldPos);
          return;
      }
      
      const tappedHex = getHexFromCanvasCoordinates(x, y);
      if (isEyedropperActive) {
          if (tappedHex) onEyedropperClick(tappedHex);
          return;
      }
      
      setIsPanning(true);
      lastPanPointRef.current = { x, y };

      if (activeTool === 'paint' && (paintMode === 'brush' || paintMode === 'erase')) {
          if(tappedHex) {
              setIsPainting(true);
              paintTile(tappedHex, paintMode);
              setLastPaintedHex(tappedHex);
          }
      } else {
        if (tappedHex) onHexClick(tappedHex);
      }
    } else if (touches.length === 2) {
      setIsPanning(true);
      setIsPinching(true);
      const t1 = touches[0];
      const t2 = touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setLastTouchDistance(dist);
      const rect = canvasRef.current!.getBoundingClientRect();
      lastPanPointRef.current = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
    }
  }, [getCanvasCoordinates, getHexFromCanvasCoordinates, isEyedropperActive, onEyedropperClick, activeTool, paintMode, paintTile, onHexClick, pathDrawingId, onAddPointToPath, getWorldCoordinates]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touches = e.touches;
    const rect = canvasRef.current!.getBoundingClientRect();

    if (touches.length === 1 && !isPinching) {
        const {x, y} = getCanvasCoordinates(e);
        const dx = x - lastPanPointRef.current.x;
        const dy = y - lastPanPointRef.current.y;
        
        if (isPainting && activeTool === 'paint') {
            const currentHex = getHexFromCanvasCoordinates(x, y);
            if (currentHex) {
              if (!lastPaintedHex || currentHex.q !== lastPaintedHex.q || currentHex.r !== lastPaintedHex.r) {
                  paintTile(currentHex, paintMode);
                  setLastPaintedHex(currentHex);
              }
            }
        } else if (isPanning) {
            viewRef.current.x += dx;
            viewRef.current.y += dy;
            requestAnimationFrame(draw);
        }
        lastPanPointRef.current = { x, y };
    } else if (touches.length === 2 && isPanning) {
        const t1 = touches[0];
        const t2 = touches[1];
        const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const newMidPoint = {
            x: (t1.clientX + t2.clientX) / 2 - rect.left,
            y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        const zoomFactor = newDist / lastTouchDistance;
        const newZoom = Math.max(0.1, Math.min(5, viewRef.current.zoom * zoomFactor));

        const worldX = (newMidPoint.x - (rect.width / 2 + viewRef.current.x)) / viewRef.current.zoom;
        const worldY = (newMidPoint.y - (rect.height / 2 + viewRef.current.y)) / viewRef.current.zoom;
        
        const newX = newMidPoint.x - worldX * newZoom - rect.width / 2;
        const newY = newMidPoint.y - worldY * newZoom - rect.height / 2;
        
        viewRef.current = { x: newX, y: newY, zoom: newZoom };
        setView({ x: newX, y: newY, zoom: newZoom });
        
        setLastTouchDistance(newDist);
        lastPanPointRef.current = newMidPoint;
    }
  }, [isPanning, isPinching, isPainting, lastTouchDistance, draw, getCanvasCoordinates, getHexFromCanvasCoordinates, paintTile, paintMode, lastPaintedHex, activeTool]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      setIsPanning(false);
      setIsPinching(false);
      setIsPainting(false);
      setLastPaintedHex(null);
  }, []);


  return <canvas 
            ref={canvasRef} 
            className={className}
            style={style}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        />;
};

export default HexGrid;


    