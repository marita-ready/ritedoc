import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Star,
} from "lucide-react";



async function submitToBrevoWaitlist(firstName: string, email: string) {
  const res = await fetch("/api/join-beta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      name: firstName,
    }),
  });
  if (!res.ok && res.status !== 400) {
    throw new Error("Failed to add to waitlist");
  }
}


