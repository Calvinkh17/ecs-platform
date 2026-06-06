import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Gradebook</h1>
          <p className="mt-2 text-gray-500">School gradebook platform</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/teacher"
            className="px-8 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Teacher Dashboard
          </Link>
          <Link
            href="/parent"
            className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Parent View
          </Link>
        </div>
      </div>
    </div>
  );
}
