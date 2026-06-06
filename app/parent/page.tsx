import ParentSearch from "./ParentSearch";
import AppNav from "@/components/AppNav";

export default function ParentPage() {
  return (
    <div className="min-h-screen">
      <AppNav title="Parent View" />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <ParentSearch />
      </main>
    </div>
  );
}
