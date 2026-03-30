import {
  House, CalendarCheck, ChartLineUp, Books, Exam,
  Notepad, Sparkle, Brain, ChartBar
} from '@phosphor-icons/react';

/**
 * Single source of truth for all sidebar/navbar navigation items.
 * Every page should import from here instead of defining its own NAV_ITEMS.
 *
 * Usage:
 *   import { getNavItems } from '@/lib/navItems';
 *   const NAV_ITEMS = getNavItems('/dashboard');  // pass current pathname
 */

const ALL_NAV_ITEMS = [
  { label: 'Dashboard',       icon: House,        href: '/dashboard' },
  { label: 'Daily Plan',      icon: CalendarCheck, href: '/schedule' },
  { label: 'Progress',        icon: ChartLineUp,  href: '/progress' },
  { label: 'Study Library',   icon: Books,        href: '/syllabus' },
  { label: 'Study Resources', icon: Books,        href: '/resources' },
  { label: 'Practice Tests',  icon: Exam,         href: '/practice' },
  { label: 'Tests',           icon: Notepad,      href: '/tests' },
  { label: 'Custom Test',     icon: Sparkle,      href: '/custom-test' },
  { label: 'Smart Revision',  icon: Brain,        href: '/smart-revision' },
  { label: 'Tracker',         icon: ChartBar,     href: '/tracker' },
];

/**
 * Returns the full nav items list with the `active` flag set
 * for the item matching the current pathname.
 *
 * @param {string} currentPath - The current route (e.g. '/tests', '/dashboard')
 * @returns {Array} Nav items with `active` boolean
 */
export function getNavItems(currentPath) {
  return ALL_NAV_ITEMS.map(item => ({
    ...item,
    active: currentPath === item.href || currentPath?.startsWith(item.href + '/'),
  }));
}

export default ALL_NAV_ITEMS;
