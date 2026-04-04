import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ThankYou() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If user navigates directly to /thank-you without going through payment, redirect to home
    const fromPayment = sessionStorage.getItem("fromPayment");
    if (!fromPayment) {
      setLocation("/");
    }
    sessionStorage.removeItem("fromPayment");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="w-16 h-16 text-blue-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Thank you for your payment. Congratulations, you've secured your Founders seat.
        </h1>

        <p className="text-gray-600 mb-4">
          A receipt will be emailed to you shortly.
        </p>

        <p className="text-gray-600 mb-8">
          Here's what happens next — an email with details will be sent to you shortly. Welcome aboard. Exciting.
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
