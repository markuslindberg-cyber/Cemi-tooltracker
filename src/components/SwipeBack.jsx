import React, { useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const EDGE_ZONE = 30;       // px from left edge to start listening
const SWIPE_THRESHOLD = 80; // px of horizontal drag to trigger back
const ROOT_PATHS = ['/', '/Inventory', '/HandTools', '/Team', '/Dashboard'];

export default function SwipeBack({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartRef = useRef(null);
  const overlayRef = useRef(null);

  const isRoot = ROOT_PATHS.includes(location.pathname);

  const handleTouchStart = useCallback((e) => {
    if (isRoot) return;
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_ZONE) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, [isRoot]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    // If vertical movement exceeds horizontal, cancel the swipe
    if (dy > Math.abs(dx)) {
      touchStartRef.current = null;
      if (overlayRef.current) overlayRef.current.style.opacity = '0';
      return;
    }

    // Show visual indicator
    if (overlayRef.current && dx > 10) {
      const progress = Math.min(dx / SWIPE_THRESHOLD, 1);
      overlayRef.current.style.opacity = String(progress * 0.3);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const elapsed = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;
    if (overlayRef.current) overlayRef.current.style.opacity = '0';

    // Trigger if dragged far enough or fast enough
    if (dx > SWIPE_THRESHOLD || (dx > 40 && elapsed < 300)) {
      navigate(-1);
    }
  }, [navigate]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Subtle left-edge indicator during swipe */}
      <div
        ref={overlayRef}
        className="fixed top-0 left-0 w-1 h-full bg-[#8B1E1E] z-50 pointer-events-none transition-opacity duration-100 lg:hidden"
        style={{ opacity: 0 }}
      />
      {children}
    </div>
  );
}