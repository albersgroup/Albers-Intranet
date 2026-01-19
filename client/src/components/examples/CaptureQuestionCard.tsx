import CaptureQuestionCard from "../CaptureQuestionCard";

export default function CaptureQuestionCardExample() {
  return (
    <div className="p-6 bg-background space-y-4">
      <CaptureQuestionCard
        question="What is the customer's budget?"
        example="e.g. The funding originates from a federal grant earmarked for improving cybersecurity infrastructure."
        onResponseChange={(response) => console.log("Response updated:", response)}
      />
      <CaptureQuestionCard
        question="What companies are critical?"
        example="e.g. The incumbent contractor, ABC Solutions, currently maintains the system and is likely to be a key competitor."
      />
    </div>
  );
}
