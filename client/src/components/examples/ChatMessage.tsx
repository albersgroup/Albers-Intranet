import ChatMessage from "../ChatMessage";

export default function ChatMessageExample() {
  return (
    <div className="flex flex-col gap-4 p-6 bg-background">
      <ChatMessage
        role="agent"
        message="Hello! I'm your BOU Training Agent. I can help you understand our capture processes, guide you through Gates 1-3, and answer questions about SOPs and procedures. How can I assist you today?"
        timestamp="10:23 AM"
      />
      <ChatMessage
        role="user"
        message="What documents do I need to prepare before Gate 1 review?"
        timestamp="10:24 AM"
      />
      <ChatMessage
        role="agent"
        message="For Gate 1 review, you need to complete the GovDash Analysis questions and generate a report. This should include the Capes Matrix review, alignment assessment, and initial intel. You'll also need to update your Salesforce record and attach the GovDash report before submitting the Gate 1 request."
        timestamp="10:24 AM"
      />
    </div>
  );
}
