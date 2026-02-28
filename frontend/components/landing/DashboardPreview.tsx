"use client";

import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";

export function DashboardPreview() {
    return (
        <section className="relative overflow-hidden -mt-32">
            <ContainerScroll
                titleComponent={
                    <>
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-4 block">
                            The Dashboard
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">
                            See your agents in action <br />
                            <span className="text-4xl md:text-[5rem] font-bold mt-1 leading-none gradient-text">
                                Real-Time
                            </span>
                        </h2>
                    </>
                }
            >
                <Image
                    src="/dashboard-preview.png"
                    alt="AWE Dashboard — AI Chat Interface"
                    height={720}
                    width={1400}
                    className="mx-auto rounded-2xl object-cover h-full object-left-top"
                    draggable={false}
                />
            </ContainerScroll>
        </section>
    );
}
