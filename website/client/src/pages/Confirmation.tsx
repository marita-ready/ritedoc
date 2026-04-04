import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Confirmation() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If user navigates directly to /confirmation without going through form, redirect to waitlist
    const fromWaitlist = sessionStorage.getItem("fromWaitlist");
    if (!fromWaitlist) {
      setLocation("/waitlist");
    }
    sessionStorage.removeItem("fromWaitlist");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="w-16 h-16 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          You're on the waiting list.
        </h1>

        <p className="text-gray-600 mb-8">
          An email will be sent to you shortly with what happens next. Exciting.
        </p>

        <button
          onClick={() => setLocation("/")}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
