import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07080a] text-[#cdcdcd] p-4 selection:bg-white/10 selection:text-white">
      <Card className="w-full max-w-md mx-4 bg-[#0d0d0d] border border-[#242728] rounded-[10px] shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center mb-4 gap-3">
            <AlertCircle className="h-6 w-6 text-[#ff6161]" />
            <h1 className="text-xl font-semibold text-[#f4f4f6]">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-xs text-[#9c9c9d] leading-relaxed">
            The page you are looking for does not exist. Did you forget to add the page to the router?
          </p>

          <Button asChild className="mt-6 w-full bg-white hover:bg-[#e8e8e8] text-black font-semibold h-9 rounded-[8px] border-0 transition-colors shadow-none">
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
