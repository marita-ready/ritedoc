import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Star,
} from "lucide-react";

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string;
const WAITLIST_LIST_ID = 2;

async function submitToBrevoWaitlist(firstName: string, email: string) {
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      "Origin": "https://app.b

