"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
    const pathname = usePathname();
    const [displayChildren, setDisplayChildren] = useState(children);
    const [transitionStage, setTransitionStage] = useState("fadeIn");

    useEffect(() => {
        if (pathname !== displayChildren.key) {
            setTransitionStage("fadeOut");
        }
    }, [pathname, displayChildren.key]);

    const handleTransitionEnd = () => {
        if (transitionStage === "fadeOut") {
            setDisplayChildren(children);
            setTransitionStage("fadeIn");
        }
    };

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className={`page-transition ${transitionStage}`}
            style={{
                width: "100%",
                minHeight: "100vh",
                transition: "opacity 0.4s ease",
                opacity: transitionStage === "fadeIn" ? 1 : 0,
            }}
        >
            {displayChildren}
            <style jsx>{`
                .page-transition {
                    will-change: opacity;
                }
            `}</style>
        </div>
    );
}
