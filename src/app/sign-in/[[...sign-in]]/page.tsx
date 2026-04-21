import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" forceRedirectUrl="/" />
    </div>
  );
}
