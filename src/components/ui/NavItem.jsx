import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';


export default function NavItem({
  to,
  icon: Icon,
  label,
  end = false,
  onClick,
  className = '',
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `dm-hover-dark relative group flex items-center justify-start px-4 py-3 rounded-figma text-[15px] transition-colors duration-150 select-none mx-1 w-[calc(100%-0.5rem)] ${
          isActive
            ? 'text-white font-semibold shadow-none'
            : 'text-ink font-semibold hover:bg-black/5'
        } ${className}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebarNavIndicator"
              className="absolute inset-0 bg-[#303030] rounded-figma z-0"
              transition={{ type: 'spring', bounce: 0.08, duration: 0.38 }}
            />
          )}
          <div className="relative z-10 flex items-center gap-3">
            {Icon && (
              <Icon
                className={`w-[18px] h-[18px] stroke-[2] shrink-0 transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-ink'
                }`}
              />
            )}
            <span className="truncate">{label}</span>
          </div>
        </>
      )}
    </NavLink>
  );
}
