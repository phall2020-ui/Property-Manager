import { useEventContext } from '../contexts/EventContext';

export default function LiveIndicator() {
  const { isConnected } = useEventContext();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-green-700 font-medium">Live</span>
    </div>
  );
}
