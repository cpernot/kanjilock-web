"use client";
import Composer from "@/components/Composer";
import Link from "next/link";

export default function ComposePage() {
    return (
        <div>
            <div style={{ marginBottom: "10px" }}>
                <Link href="/">← Back to Home</Link>
            </div>
            <Composer />
        </div>
    );
}
