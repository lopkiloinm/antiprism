'use client'

import React from 'react'

interface TabBarProps {
  selectedIndex: number
  onTabClicked: (index: number) => void
  children: React.ReactNode
}

export const TabBar: React.FC<TabBarProps> = ({ selectedIndex, onTabClicked, children }) => {
  return (
    <div className="tab-bar">
      {React.Children.map(children, (child, index) => (
        <div
          className={`tab ${index === selectedIndex ? 'active' : ''}`}
          onClick={() => onTabClicked(index)}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
