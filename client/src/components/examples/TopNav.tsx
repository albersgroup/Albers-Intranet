import { useState } from "react";
import TopNav from "../TopNav";

export default function TopNavExample() {
  const [activeTab, setActiveTab] = useState("sops");
  
  return (
    <div className="bg-background">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
