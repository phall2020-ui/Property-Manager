interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: string[];
}

export default function TabBar({ activeTab, onTabChange, tabs = ['Overview', 'Tenancies', 'Finance', 'Maintenance', 'Compliance', 'Documents'] }: TabBarProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const tabKey = tab.toLowerCase();
        const isActive = activeTab === tabKey;
        
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tabKey)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-white shadow-card text-brand-text'
                : 'bg-white/60 hover:bg-white text-brand-subtle hover:text-brand-text'
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
