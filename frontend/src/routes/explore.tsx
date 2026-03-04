import { Compass } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 py-32">
      <Compass size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Explore
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Interactive data exploration — coming in Prompt 15
      </p>
    </div>
  );
}
