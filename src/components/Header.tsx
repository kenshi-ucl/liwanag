import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Home,
  Menu,
  X,
  BarChart3,
  Upload,
  LogOut,
} from 'lucide-react'

import logoImg from '../logo.png'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="Liwanag" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
              Liwanag
            </span>
          </Link>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Liwanag" className="w-8 h-8 rounded-lg" />
            <h2 className="text-xl font-bold">Liwanag</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <BarChart3 size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/upload"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Upload size={20} />
            <span className="font-medium">Upload Subscribers</span>
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              localStorage.removeItem('liwanag_user');
              window.location.href = '/signin';
            }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-600/20 text-red-400 transition-colors w-full mb-4"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
          <p className="text-xs text-gray-500 text-center">
            Dark Funnel Intelligence Engine
          </p>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
