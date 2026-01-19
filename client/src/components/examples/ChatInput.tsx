import ChatInput from "../ChatInput";

export default function ChatInputExample() {
  return (
    <div className="bg-background">
      <ChatInput
        onSendMessage={(msg, files) => {
          console.log("Message sent:", msg);
          console.log("Files attached:", files?.length || 0);
        }}
      />
    </div>
  );
}
