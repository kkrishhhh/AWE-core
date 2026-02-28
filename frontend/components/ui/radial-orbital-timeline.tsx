"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, _setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, _setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 240; // Increased radius to give more space for cards
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };



  return (
    <div
      className="w-full h-screen flex flex-col items-center justify-center bg-transparent overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Center glowing core */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary animate-pulse-ring flex items-center justify-center z-10 shadow-lg shadow-primary/20 dark:shadow-primary/10">
            <div className="absolute w-20 h-20 rounded-full border border-primary/30 dark:border-primary/40 animate-ping opacity-70"></div>
            <div
              className="absolute w-28 h-28 rounded-full border border-primary/20 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-md"></div>
          </div>

          {/* Orbital path outline */}
          <div className="absolute w-[30rem] h-[30rem] rounded-full border border-primary/20 dark:border-primary/10 border-dashed"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => { nodeRefs.current[item.id] = el; }}
                className="absolute transition-all duration-700 cursor-pointer group"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Node Energy Aura */}
                <div
                  className={`absolute rounded-full -inset-1 z-0 bg-primary/10 dark:bg-primary/30 blur-[12px] opacity-80 ${isPulsing ? "animate-pulse duration-1000" : ""
                    }`}
                  style={{
                    width: `${item.energy * 0.5 + 50}px`,
                    height: `${item.energy * 0.5 + 50}px`,
                    left: `-${(item.energy * 0.5 + 50 - 48) / 2}px`,
                    top: `-${(item.energy * 0.5 + 50 - 48) / 2}px`,
                  }}
                ></div>

                {/* Main Node Icon */}
                <div
                  className={`
                  relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                  ${isExpanded
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/40 dark:shadow-primary/50"
                      : isRelated
                        ? "bg-accent/15 dark:bg-accent/40 text-foreground dark:text-white border-accent animate-pulse"
                        : "bg-background text-foreground border-primary/20 dark:border-primary/40 group-hover:border-primary group-hover:scale-110 shadow-sm shadow-primary/10"
                    }
                  border-2 transition-all duration-300 transform
                  ${isExpanded ? "scale-150" : ""}
                `}
                >
                  <Icon size={isExpanded ? 14 : 18} />
                </div>

                {/* Node Label (when not expanded) */}
                <div
                  className={`
                  absolute top-[3.75rem] left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[11px] font-bold tracking-wider uppercase text-foreground/90 dark:text-white/90
                  transition-all duration-300 bg-background/80 dark:bg-background/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-border/50 shadow-sm
                  ${isExpanded ? "opacity-0 invisible pointer-events-none scale-50" : "opacity-100 scale-100 group-hover:-translate-y-1"}
                `}
                >
                  {item.title}
                </div>

                {/* Expanded Card Popup */}
                {isExpanded && (
                  <Card className="absolute top-24 left-1/2 -translate-x-1/2 w-[22rem] bg-card/95 backdrop-blur-xl border-primary/20 dark:border-primary/30 shadow-2xl shadow-primary/15 overflow-visible z-50">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-primary/40"></div>
                    <CardHeader className="pb-2 border-b border-border/50">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                          {item.category}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-3">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-foreground/80 pt-4 leading-relaxed">
                      <p>{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="flex items-center mb-3">
                            <Link size={12} className="text-muted-foreground mr-1.5" />
                            <h4 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                              Synergistic Tools
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs rounded border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={10}
                                    className="ml-1.5 opacity-70"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
