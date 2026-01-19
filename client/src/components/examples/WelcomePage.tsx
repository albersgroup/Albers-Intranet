import WelcomePage from "../WelcomePage";

export default function WelcomePageExample() {
  return (
    <div className="bg-background">
      <WelcomePage onGetStarted={() => console.log("Get Started clicked")} />
    </div>
  );
}
