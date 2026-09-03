import type {ReactNode} from "react";
import {PublicNavbar} from "./PublicNavbar";
import { Footer } from "./Footer";

export function PublicLayout({children}: {children: ReactNode}) {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicNavbar />
            <main className="flex-grow">{children}</main>
            <Footer/>
        </div>
    )
}