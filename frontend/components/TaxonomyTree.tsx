'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface TaxonomyTreeProps {
  tree: any;
}

function TreeNode({ name, children, level }: { name: string; children: any; level: number }) {
  const [isOpen, setIsOpen] = useState(level < 2);

  const hasChildren = children && (typeof children === 'object') && Object.keys(children).length > 0;

  const indent = level * 20;

  if (Array.isArray(children)) {
    return (
      <div style={{ marginLeft: `${indent}px` }} className="my-1">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-blue-600 font-medium">{name}</span>
        </div>
        {children.map((item: any, idx: number) => (
          <div key={idx} style={{ marginLeft: '20px' }} className="text-sm text-gray-700">
            <span className="font-semibold">{item.species}</span>
            {item.common_name && <span className="text-gray-500 ml-2">({item.common_name})</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${indent}px` }} className="my-1">
      <div
        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : (
          <span className="w-4" />
        )}
        <span className="font-medium text-gray-800">{name}</span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {Object.entries(children).map(([key, value]) => (
            <TreeNode key={key} name={key} children={value} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyTree({ tree }: TaxonomyTreeProps) {
  return (
    <div className="overflow-auto max-h-[800px]">
      {Object.entries(tree).map(([kingdom, children]) => (
        <TreeNode key={kingdom} name={kingdom} children={children} level={0} />
      ))}
    </div>
  );
}
