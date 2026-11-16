import React from 'react';
import type { NavTab } from '../types/smp';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'smp-dashboard', label: '시세 대시보드', icon: 'monitoring' },
  { id: 'smp-forecast', label: 'SMP 예측', icon: 'insights' },
  { id: 'beginner-guide', label: '입문 가이드', icon: 'menu_book' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 w-full max-w-[480px] z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(30,41,59,0.06)]">
      <div className="flex justify-around items-center h-16 px-space-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-space-xs min-w-[76px] h-12 px-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-primary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-label-ui whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
