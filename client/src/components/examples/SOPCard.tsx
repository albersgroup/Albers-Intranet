import SOPCard from "../SOPCard";
import { Clipboard, TrendingUp, Users } from "lucide-react";

export default function SOPCardExample() {
  return (
    <div className="p-6 bg-background space-y-4 max-w-md">
      <SOPCard
        title="Gate 1 Workflow – Qualification Review"
        description="Gate 1 ensures only aligned, viable opportunities advance beyond the Discover phase. Learn the requirements for shaping, customer engagement, and teaming decisions."
        category="Gate Process"
        usedCount={12}
        icon={<Clipboard className="w-6 h-6 text-primary" />}
        onView={() => console.log("View SOP")}
      />
      
      <SOPCard
        title="Bid/No-Bid Decision Framework"
        description="A structured method for deciding whether to pursue or decline an opportunity, designed to preserve resources and ensure alignment with company strategy."
        category="Decision Process"
        usedCount={8}
        icon={<TrendingUp className="w-6 h-6 text-primary" />}
        onView={() => console.log("View SOP")}
      />
    </div>
  );
}
