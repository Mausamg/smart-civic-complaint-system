import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { PublicNavbar } from "./PublicNavbar";

export function PublicLayout({children}: {children: ReactNode}) {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicNavbar />
            <main className="flex-grow">{children}</main>
            <Footer/>
        </div>
    )
}