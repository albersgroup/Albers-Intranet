import FloatingChatbot from "../FloatingChatbot";

export default function FloatingChatbotExample() {
  return (
    <div className="h-screen bg-background">
      <FloatingChatbot />
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">Click the chatbot in the corner</h2>
        <p className="text-muted-foreground">
          The floating chatbot appears in the bottom-right corner and can be opened/closed.
        </p>
      </div>
    </div>
  );
}
