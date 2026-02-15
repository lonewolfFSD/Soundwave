import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="relative flex items-center justify-center">
          {/* Static Background Ring */}
          <div className="w-16 h-16 border-4 border-white/5 rounded-full" />
          
          {/* Spinning Gradient Ring */}
          <div className="absolute w-16 h-16 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
          
          {/* Reverse Spinning Inner Ring */}
          <div className="absolute w-10 h-10 border-2 border-b-white/20 border-t-transparent border-l-transparent border-r-transparent rounded-full animate-spin-slow-reverse" />
        </div>

        {/* Text */}
        <p 
          className="mt-6 text-xs font-bold tracking-[0.3em] text-white/40 animate-pulse"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          LOADING
        </p>

        {/* Custom Animation Style for reverse spin */}
        <style>{`
          @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          .animate-spin-slow-reverse {
            animation: spin-reverse 2s linear infinite;
          }
        `}</style>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default ProtectedRoute